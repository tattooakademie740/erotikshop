import { eq } from "drizzle-orm";
import type { db as Db } from "@/db";
import * as s from "@/db/schema";
import type { FeedConfig } from "@/domain/feeds/types";
import { markMissingOffers, runImport } from "../import-pipeline";
import { deliverEmail } from "../mailer";
import { handleOrderPaid, markFulfillmentFailed, recordShipment, submitFulfillment } from "../orders";
import { API_ADAPTERS, NoApiAdapterError } from "../suppliers/adapters";
import { processReturn, refundReturn } from "../returns";
import { agentsEnabled } from "../agents/core";
import { enrichProduct } from "../agents/product-data";
import { processInboundEmail } from "../agents/supplier-mail";
import { enqueue, type ClaimedJob, type JobType } from "./queue";

type DB = typeof Db;
type Handler = (db: DB, payload: Record<string, unknown>) => Promise<void>;

/** Feed-Konfiguration eines Lieferanten (in suppliers.config, ohne Secrets). */
export type SupplierFeedSettings = FeedConfig & {
  feedUrl?: string;
  /** Header für die Zugangsdaten, Wert kommt aus der Env-Variable suppliers.credentials_env */
  authHeader?: string;
  authPrefix?: string;
  categoryMap?: Record<string, number>;
  importEveryMinutes?: number;
};

async function fetchFeed(supplier: typeof s.suppliers.$inferSelect, cfg: SupplierFeedSettings) {
  if (!cfg.feedUrl) throw new Error(`Lieferant ${supplier.slug}: keine Feed-URL konfiguriert`);
  const headers: Record<string, string> = { "user-agent": "Lustviora-Import/1.0" };
  if (supplier.credentialsEnv) {
    const secret = process.env[supplier.credentialsEnv];
    if (!secret) throw new Error(`Env-Variable ${supplier.credentialsEnv} fehlt`);
    headers[cfg.authHeader ?? "authorization"] = `${cfg.authPrefix ?? "Bearer "}${secret}`;
  }
  const res = await fetch(cfg.feedUrl, { headers, signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`Feed ${supplier.slug}: HTTP ${res.status}`);
  return res.text();
}

export const HANDLERS: Record<JobType, Handler> = {
  "supplier.import": async (db, p) => {
    const [supplier] = await db.select().from(s.suppliers).where(eq(s.suppliers.id, Number(p.supplierId)));
    if (!supplier || !supplier.isActive) return;
    const cfg = supplier.config as SupplierFeedSettings;
    const content = await fetchFeed(supplier, cfg);
    const { importRunId } = await runImport(db, supplier.id, content, cfg, { categoryMap: cfg.categoryMap ?? {}, isDemo: supplier.isDemo });
    await markMissingOffers(db, supplier.id, importRunId);
    if (agentsEnabled()) {
      // Neue Artikel dieses Imports: fehlende Filter-Merkmale vom Produktdaten-Agenten ergänzen lassen
      const fresh = await db.selectDistinct({ id: s.products.id }).from(s.products)
        .innerJoin(s.variants, eq(s.variants.productId, s.products.id))
        .innerJoin(s.supplierProducts, eq(s.supplierProducts.variantId, s.variants.id))
        .where(eq(s.supplierProducts.lastImportRunId, importRunId));
      for (const f of fresh.slice(0, 500)) await enqueue(db, "product.enrich", { productId: f.id }, { dedupeKey: `product.enrich:${f.id}` });
    }
    await revalidateShop(["catalog"]);
  },
  "order.paid": async (db, p) => handleOrderPaid(db, String(p.orderId)),
  "fulfillment.submit": async (db, p) => {
    try {
      await submitFulfillment(db, Number(p.fulfillmentId));
    } catch (e) {
      // Ohne API-Adapter hilft kein Wiederholen: sofort an einen Menschen übergeben.
      if (e instanceof NoApiAdapterError) return markFulfillmentFailed(db, Number(p.fulfillmentId), e.message);
      throw e;
    }
  },
  "tracking.check": async (db, p) => {
    const [row] = await db
      .select({ f: s.fulfillments, supplier: s.suppliers })
      .from(s.fulfillments)
      .innerJoin(s.suppliers, eq(s.suppliers.id, s.fulfillments.supplierId))
      .where(eq(s.fulfillments.id, Number(p.fulfillmentId)));
    if (!row || row.f.status === "shipped" || row.f.status === "delivered" || !row.f.externalRef) return;
    const adapter = API_ADAPTERS[row.supplier.slug];
    const t = await adapter?.fetchTracking?.(row.f.externalRef, { ...row.supplier, config: row.supplier.config });
    if (t) return recordShipment(db, { fulfillmentId: row.f.id, ...t });
    throw new Error("Noch keine Sendungsnummer"); // erneuter Versuch mit Backoff
  },
  "email.send": async (db, p) => deliverEmail(db, Number(p.emailId)),
  "return.process": async (db, p) => processReturn(db, Number(p.returnId)),
  "return.refund": async (db, p) => refundReturn(db, Number(p.returnId)),
  "inbound.process": async (db, p) => {
    if (!agentsEnabled()) {
      await db.update(s.inboundEmails).set({ status: "needs_manual" }).where(eq(s.inboundEmails.id, Number(p.inboundEmailId)));
      await db.insert(s.notifications).values({ level: "warning", kind: "inbound_email_manual", message: "Lieferanten-Mail eingegangen, KI-Agent ist nicht konfiguriert.", data: p });
      return;
    }
    await processInboundEmail(db, Number(p.inboundEmailId));
  },
  "product.enrich": async (db, p) => {
    if (agentsEnabled()) await enrichProduct(db, Number(p.productId));
  },
};

/** Nach endgültigem Scheitern: Folgen sauber abschließen. */
export async function onDead(db: DB, job: ClaimedJob) {
  if (job.type === "fulfillment.submit") {
    await markFulfillmentFailed(db, Number((job.payload as Record<string, unknown>).fulfillmentId), job.lastError ?? "unbekannt");
  }
}

export async function revalidateShop(tags: string[]) {
  const secret = process.env.REVALIDATE_SECRET;
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !base) return;
  await fetch(new URL("/api/intern/revalidate", base), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ tags }),
  }).catch(() => undefined);
}
