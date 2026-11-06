/**
 * Automatischer Retourenablauf zwischen Kunde, Shop und Lieferant.
 *
 * 1. Kunde meldet Retoure (Formular oder Chat-Agent), Bestellnummer + E-Mail als Nachweis
 * 2. Regeln prüfen (domain/returns.ts): annehmen, ablehnen oder an Menschen
 * 3. Je Lieferant eine Retoure, Anfrage per Mail an den Lieferanten (RETOURE-<id>)
 * 4. Lieferant antwortet (Mail → Lieferanten-Agent): Rücksendeadresse/RMA → Kunde bekommt Anleitung
 * 5. Lieferant bestätigt Eingang → Erstattung (Zahlungsanbieter) → Kunde informiert
 * Antwortet ein Lieferant nicht, wird zweimal erinnert, danach übernimmt ein Mensch.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { db as Db } from "@/db";
import * as s from "@/db/schema";
import { SHOP } from "@/config/shop";
import { customerReturnEmail, supplierReturnRequestEmail } from "@/domain/emails";
import { formatEuro } from "@/domain/money";
import { canMove, checkEligibility, refundAmount, returnReference, type ReturnReason, type ReturnStage } from "@/domain/returns";
import { enqueue } from "./jobs/queue";
import { queueEmail } from "./mailer";

type DB = typeof Db;

export class ReturnError extends Error {}

const REASON_LABEL: Record<ReturnReason, string> = {
  widerruf: "Widerruf",
  defekt: "Artikel defekt",
  falsch_geliefert: "Falscher Artikel geliefert",
  beschaedigt: "Beim Versand beschädigt",
};

async function mailCustomer(db: DB, ret: { id: number; orderId: string }, kind: Parameters<typeof customerReturnEmail>[0]["kind"], extra: Partial<Parameters<typeof customerReturnEmail>[0]> = {}) {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, ret.orderId));
  const mail = customerReturnEmail({ shopName: SHOP.name, firstName: order.shippingAddress.firstName, returnRef: returnReference(ret.id), kind, ...extra });
  const id = await queueEmail(db, { kind: `customer_return_${kind}`, to: order.email, ...mail, relatedType: "return", relatedId: String(ret.id) });
  await enqueue(db, "email.send", { emailId: id });
}

export async function moveReturn(db: DB, id: number, to: ReturnStage, by: string, patch: Partial<typeof s.returns.$inferInsert> = {}) {
  const [r] = await db.select().from(s.returns).where(eq(s.returns.id, id));
  if (!r) throw new ReturnError("Retoure nicht gefunden");
  const from = r.stage as ReturnStage;
  if (from === to) return r;
  if (!canMove(from, to)) throw new ReturnError(`Retoure ${id}: ${from} → ${to} nicht erlaubt`);
  const status: (typeof s.returnStatus.enumValues)[number] =
    to === "rejected" ? "rejected" : to === "refunded" ? "refunded" : to === "received" || to === "refund_pending" ? "received" : to === "needs_manual" ? "needs_manual" : to === "requested" ? "requested" : "approved";
  const [updated] = await db
    .update(s.returns)
    .set({ ...patch, stage: to, status, timeline: [...r.timeline, { at: new Date().toISOString(), event: to, by }] })
    .where(eq(s.returns.id, id))
    .returning();
  return updated;
}

export async function requestReturn(
  db: DB,
  input: {
    orderNumber: number;
    email: string;
    items: { orderItemId: number; quantity: number }[];
    reason: ReturnReason;
    sealIntact?: boolean;
    note?: string;
    source: string;
  },
) {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.number, input.orderNumber));
  // Gleiche Meldung für "gibt es nicht" und "falsche E-Mail": verrät keine fremden Bestellungen
  if (!order || order.email.toLowerCase() !== input.email.trim().toLowerCase()) throw new ReturnError("Bestellung nicht gefunden. Bitte Bestellnummer und E-Mail prüfen.");
  if (order.paymentStatus !== "captured") throw new ReturnError("Für diese Bestellung ist keine Zahlung eingegangen.");
  if (input.items.length === 0) throw new ReturnError("Bitte mindestens einen Artikel wählen.");

  const rows = await db
    .select({ item: s.orderItems, policy: s.products.returnPolicy, f: s.fulfillments })
    .from(s.orderItems)
    .innerJoin(s.variants, eq(s.variants.id, s.orderItems.variantId))
    .innerJoin(s.products, eq(s.products.id, s.variants.productId))
    .leftJoin(s.fulfillments, eq(s.fulfillments.id, s.orderItems.fulfillmentId))
    .where(and(eq(s.orderItems.orderId, order.id), inArray(s.orderItems.id, input.items.map((i) => i.orderItemId))));
  if (rows.length !== input.items.length) throw new ReturnError("Mindestens ein Artikel gehört nicht zu dieser Bestellung.");

  // offene Retouren für dieselben Artikel verhindern
  const open = await db
    .select({ orderItemId: s.returnItems.orderItemId })
    .from(s.returnItems)
    .innerJoin(s.returns, eq(s.returns.id, s.returnItems.returnId))
    .where(and(eq(s.returns.orderId, order.id), inArray(s.returns.stage, ["requested", "approved", "supplier_requested", "instructions_sent", "received", "refund_pending", "needs_manual"])));
  if (rows.some((r) => open.some((o) => o.orderItemId === r.item.id))) throw new ReturnError("Für mindestens einen Artikel läuft bereits eine Retoure.");

  // Zustellung: frühester Zustelltermin der betroffenen Sendungen
  const shipments = await db
    .select({ fulfillmentId: s.shipments.fulfillmentId, deliveredAt: s.shipments.deliveredAt, shippedAt: s.shipments.shippedAt })
    .from(s.shipments)
    .where(inArray(s.shipments.fulfillmentId, rows.map((r) => r.f?.id ?? -1)));

  const created: { id: number; reference: string; decision: string; message: string }[] = [];
  const byFulfillment = new Map<number, typeof rows>();
  for (const r of rows) {
    const key = r.f?.id ?? 0;
    byFulfillment.set(key, [...(byFulfillment.get(key) ?? []), r]);
  }

  for (const [fulfillmentId, group] of byFulfillment) {
    const sh = shipments.find((x) => x.fulfillmentId === fulfillmentId);
    const deliveredAt = sh?.deliveredAt ?? null;
    // strengste Entscheidung je Gruppe gewinnt: reject > manual > approve
    const results = group.map((g) =>
      checkEligibility({ reason: input.reason, policy: g.policy as "standard", deliveredAt, now: new Date(), sealIntact: input.sealIntact }),
    );
    const decision = results.find((r) => r.decision === "reject") ?? results.find((r) => r.decision === "manual") ?? results[0];
    const refund = refundAmount({
      items: group.map((g) => ({ unitPriceCents: g.item.unitPriceCents, quantity: g.item.quantity, returnQuantity: Math.min(g.item.quantity, input.items.find((i) => i.orderItemId === g.item.id)!.quantity) })),
      shippingCents: byFulfillment.size === 1 ? order.shippingCents : 0,
      reason: input.reason,
    });

    const [ret] = await db
      .insert(s.returns)
      .values({
        orderId: order.id,
        reason: input.reason,
        customerNote: input.note?.slice(0, 1000) ?? null,
        refundCents: refund,
        fulfillmentId: fulfillmentId || null,
        supplierId: group[0].f?.supplierId ?? null,
        timeline: [{ at: new Date().toISOString(), event: "requested", by: input.source }],
      })
      .returning();
    await db.update(s.returns).set({ reference: returnReference(ret.id) }).where(eq(s.returns.id, ret.id));
    await db.insert(s.returnItems).values(group.map((g) => ({ returnId: ret.id, orderItemId: g.item.id, quantity: input.items.find((i) => i.orderItemId === g.item.id)!.quantity })));

    if (decision.decision === "approve") {
      await moveReturn(db, ret.id, "approved", "regeln");
      await mailCustomer(db, ret, "approved");
      await enqueue(db, "return.process", { returnId: ret.id }, { dedupeKey: `return.process:${ret.id}` });
    } else if (decision.decision === "reject") {
      await moveReturn(db, ret.id, "rejected", "regeln");
      await mailCustomer(db, ret, "rejected", { message: decision.message });
    } else {
      await moveReturn(db, ret.id, "needs_manual", "regeln");
      await mailCustomer(db, ret, "manual");
      await db.insert(s.notifications).values({ level: "warning", kind: "return_needs_manual", message: `Retoure ${returnReference(ret.id)}: ${decision.message}`, data: { returnId: ret.id } });
    }
    created.push({ id: ret.id, reference: returnReference(ret.id), decision: decision.decision, message: decision.message });
  }
  return created;
}

/** Schritt 3: Lieferanten anfragen. Wiederholt sich als Erinnerung, falls keine Antwort kommt. */
export async function processReturn(db: DB, returnId: number) {
  const [r] = await db.select().from(s.returns).where(eq(s.returns.id, returnId));
  if (!r) return;
  if (r.stage === "approved") {
    const [sup] = r.supplierId ? await db.select().from(s.suppliers).where(eq(s.suppliers.id, r.supplierId)) : [];
    if (!sup?.orderEmail) {
      await moveReturn(db, r.id, "needs_manual", "system", {});
      await db.insert(s.notifications).values({ level: "critical", kind: "return_needs_manual", message: `Retoure ${r.reference}: kein Lieferantenkontakt hinterlegt.`, data: { returnId: r.id } });
      return;
    }
    const lines = await db
      .select({ supplierSku: s.supplierProducts.supplierSku, title: s.orderItems.titleSnapshot, quantity: s.returnItems.quantity })
      .from(s.returnItems)
      .innerJoin(s.orderItems, eq(s.orderItems.id, s.returnItems.orderItemId))
      .leftJoin(s.supplierProducts, eq(s.supplierProducts.id, s.orderItems.supplierProductId))
      .where(eq(s.returnItems.returnId, r.id));
    const [order] = await db.select().from(s.orders).where(eq(s.orders.id, r.orderId));
    const [f] = r.fulfillmentId ? await db.select().from(s.fulfillments).where(eq(s.fulfillments.id, r.fulfillmentId)) : [];
    const mail = supplierReturnRequestEmail({
      shopName: SHOP.name,
      returnRef: r.reference!,
      orderRef: f?.externalRef ?? null,
      reason: REASON_LABEL[r.reason as ReturnReason] ?? r.reason,
      lines: lines.map((l) => ({ ...l, supplierSku: l.supplierSku ?? "?" })),
      customerName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
    });
    const id = await queueEmail(db, { kind: "supplier_return_request", to: sup.orderEmail, ...mail, relatedType: "return", relatedId: String(r.id) });
    await enqueue(db, "email.send", { emailId: id });
    await moveReturn(db, r.id, "supplier_requested", "system");
    await enqueue(db, "return.process", { returnId: r.id, reminder: 1 }, { runAt: new Date(Date.now() + 3 * 86_400_000), dedupeKey: `return.reminder:${r.id}:1` });
    return;
  }
  if (r.stage === "supplier_requested") {
    // Erinnerung (wird nur ausgeführt, wenn noch keine Antwort kam)
    const sent = await db.select({ id: s.outboundEmails.id }).from(s.outboundEmails).where(and(eq(s.outboundEmails.relatedType, "return"), eq(s.outboundEmails.relatedId, String(r.id)), eq(s.outboundEmails.kind, "supplier_return_request")));
    if (sent.length >= 3) {
      await moveReturn(db, r.id, "needs_manual", "system");
      await db.insert(s.notifications).values({ level: "critical", kind: "return_supplier_silent", message: `Retoure ${r.reference}: Lieferant antwortet nach zwei Erinnerungen nicht.`, data: { returnId: r.id } });
      return;
    }
    const [last] = await db.select().from(s.outboundEmails).where(eq(s.outboundEmails.id, sent[sent.length - 1].id));
    const id = await queueEmail(db, { kind: "supplier_return_request", to: last.to, subject: `Erinnerung: ${last.subject}`, text: last.text, relatedType: "return", relatedId: String(r.id) });
    await enqueue(db, "email.send", { emailId: id });
    await enqueue(db, "return.process", { returnId: r.id }, { runAt: new Date(Date.now() + 3 * 86_400_000), dedupeKey: `return.reminder:${r.id}:${sent.length + 1}` });
  }
}

/** Schritt 4: Lieferant hat Rücksendeadresse/RMA geliefert. */
export async function applySupplierReturnInstructions(db: DB, returnId: number, data: { rma?: string | null; returnAddress?: string | null }, by: string) {
  if (!data.returnAddress) throw new ReturnError("Rücksendeadresse fehlt");
  const r = await moveReturn(db, returnId, "instructions_sent", by, { supplierRma: data.rma ?? null, returnAddress: data.returnAddress });
  await mailCustomer(db, r, "instructions", { returnAddress: data.returnAddress, supplierRma: data.rma });
}

/** Schritt 5: Lieferant bestätigt den Eingang → Erstattung anstoßen. */
export async function markReturnReceived(db: DB, returnId: number, by: string) {
  await moveReturn(db, returnId, "received", by);
  const r = await moveReturn(db, returnId, "refund_pending", "system");
  await enqueue(db, "return.refund", { returnId: r.id }, { dedupeKey: `return.refund:${r.id}` });
}

/**
 * Erstattung über den Zahlungsanbieter. Solange keiner angebunden ist, entsteht eine
 * Aufgabe im Admin ("Erstattung auslösen"). Kein Geld wird ohne Anbieter "simuliert" erstattet.
 */
export async function refundReturn(db: DB, returnId: number) {
  const [r] = await db.select().from(s.returns).where(eq(s.returns.id, returnId));
  if (!r || r.stage !== "refund_pending") return;
  await db.insert(s.notifications).values({
    level: "critical",
    kind: "refund_needs_manual",
    message: `Retoure ${r.reference}: Erstattung über ${formatEuro(r.refundCents ?? 0)} auslösen. Es ist noch kein Zahlungsanbieter angebunden.`,
    data: { returnId: r.id },
  });
}

/** Admin bestätigt eine von Hand ausgelöste Erstattung. */
export async function confirmRefund(db: DB, returnId: number, by: string) {
  const r = await moveReturn(db, returnId, "refunded", by);
  await mailCustomer(db, r, "refunded", { refundCents: r.refundCents });
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, r.orderId));
  const all = await db.select({ stage: s.returns.stage }).from(s.returns).where(eq(s.returns.orderId, order.id));
  if (all.every((x) => x.stage === "refunded")) await db.update(s.orders).set({ paymentStatus: "partially_refunded" }).where(eq(s.orders.id, order.id));
}
