/**
 * Worker: arbeitet Aufträge ab und plant wiederkehrende Importe.
 * Start: npm run worker   (läuft dauerhaft, beliebig viele Instanzen möglich)
 */
import { and, eq, sql } from "drizzle-orm";
import type { db as Db } from "@/db";
import * as s from "@/db/schema";
import { HANDLERS, onDead, type SupplierFeedSettings } from "./handlers";
import { claim, enqueue, fail, releaseStale, succeed } from "./queue";

type DB = typeof Db;

export async function runOnce(db: DB, log = console) {
  await releaseStale(db);
  const jobs = await claim(db, 10);
  for (const job of jobs) {
    const handler = HANDLERS[job.type as keyof typeof HANDLERS];
    try {
      if (!handler) throw new Error(`Unbekannter Auftragstyp ${job.type}`);
      await handler(db, job.payload as Record<string, unknown>);
      await succeed(db, job.id);
      log.info(`✓ ${job.type} #${job.id}`);
    } catch (e) {
      const r = await fail(db, job, e);
      log.warn(`✗ ${job.type} #${job.id} (${r}): ${(e as Error).message}`);
      if (r === "dead") await onDead(db, { ...job, lastError: (e as Error).message });
    }
  }
  return jobs.length;
}

/** Plant Importe je aktivem Lieferanten mit Feed-URL nach seinem Intervall (Standard 4 h). */
export async function scheduleImports(db: DB) {
  const suppliers = await db.select().from(s.suppliers).where(eq(s.suppliers.isActive, true));
  for (const sup of suppliers) {
    const cfg = sup.config as SupplierFeedSettings;
    if (!cfg.feedUrl) continue;
    const every = cfg.importEveryMinutes ?? 240;
    const [last] = await db
      .select({ at: sql<Date>`max(${s.importRuns.startedAt})` })
      .from(s.importRuns)
      .where(and(eq(s.importRuns.supplierId, sup.id)));
    if (!last?.at || Date.now() - new Date(last.at).getTime() > every * 60_000) {
      await enqueue(db, "supplier.import", { supplierId: sup.id }, { dedupeKey: `supplier.import:${sup.id}` });
    }
  }
}
