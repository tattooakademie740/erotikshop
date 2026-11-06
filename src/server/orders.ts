/**
 * Bestellablauf von der Kasse bis zur Zustellung.
 *
 * createOrder      Kunde schließt Bestellung ab (Preise immer aus der Datenbank)
 * markPaid         Zahlungsanbieter bestätigt → Auftrag "order.paid"
 * handleOrderPaid  Lieferant je Artikel wählen, aufteilen, je Lieferant ein Fulfillment
 * submitFulfillment Bestellung an Lieferanten (E-Mail, Portal-Aufgabe oder API)
 * recordShipment   Sendungsnummer eintragen → Kundenmail, Gesamtstatus aktualisieren
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import type { db as Db } from "@/db";
import * as s from "@/db/schema";
import { SHOP } from "@/config/shop";
import { customerOrderReceivedEmail, customerShippedEmail, supplierOrderEmail } from "@/domain/emails";
import { aggregateOrderStatus, assertTransition, type FulfillmentStatus } from "@/domain/fulfillment-state";
import { net } from "@/domain/money";
import { splitOrder } from "@/domain/order-split";
import { enqueue } from "./jobs/queue";
import { queueEmail } from "./mailer";
import { API_ADAPTERS, NoApiAdapterError, type SubmitContext } from "./suppliers/adapters";

type DB = typeof Db;

export class OrderError extends Error {}

export async function createOrder(
  db: DB,
  input: { email: string; lines: { variantId: number; qty: number }[]; shipping: s.Address; billing?: s.Address },
) {
  if (input.lines.length === 0) throw new OrderError("Warenkorb ist leer");
  const ids = input.lines.map((l) => l.variantId);
  const variants = await db
    .select({ v: s.variants, title: s.products.title, status: s.products.status })
    .from(s.variants)
    .innerJoin(s.products, eq(s.products.id, s.variants.productId))
    .where(inArray(s.variants.id, ids));

  const items = input.lines.map((l) => {
    const row = variants.find((r) => r.v.id === l.variantId);
    if (!row || row.status !== "active" || !row.v.isActive) throw new OrderError(`Artikel ${l.variantId} nicht verfügbar`);
    if (row.v.stockAvailable < l.qty) throw new OrderError(`Nicht genug Bestand für ${row.title}`);
    return { row, qty: l.qty };
  });

  const subtotal = items.reduce((n, i) => n + i.row.v.priceCents * i.qty, 0);
  const shipping = subtotal >= SHOP.freeShippingFromCents ? 0 : SHOP.shippingCents;
  const total = subtotal + shipping;
  const tax = total - net(total);

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(s.orders)
      .values({
        email: input.email,
        subtotalCents: subtotal,
        shippingCents: shipping,
        taxCents: tax,
        totalCents: total,
        shippingAddress: input.shipping,
        billingAddress: input.billing ?? input.shipping,
      })
      .returning();
    await tx.insert(s.orderItems).values(
      items.map((i) => ({
        orderId: order.id,
        variantId: i.row.v.id,
        titleSnapshot: i.row.title,
        quantity: i.qty,
        unitPriceCents: i.row.v.priceCents,
      })),
    );
    return order;
  });
}

export async function markPaid(db: DB, orderId: string, payment: { provider: string; providerRef: string; amountCents: number; feeCents?: number }) {
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (!order) throw new OrderError("Bestellung nicht gefunden");
  if (payment.amountCents !== order.totalCents) {
    await db.insert(s.notifications).values({
      level: "critical",
      kind: "payment_mismatch",
      message: `Zahlbetrag passt nicht zu Bestellung ${order.number}`,
      data: { orderId, expected: order.totalCents, got: payment.amountCents },
    });
    throw new OrderError("Zahlbetrag stimmt nicht");
  }
  if (order.paymentStatus === "captured") return order; // doppelte Bestätigung ignorieren
  await db.insert(s.payments).values({ orderId, status: "captured", ...payment });
  await db.update(s.orders).set({ paymentStatus: "captured", status: "paid" }).where(eq(s.orders.id, orderId));
  const first = order.shippingAddress.firstName;
  const mail = customerOrderReceivedEmail({ shopName: SHOP.name, firstName: first, orderNumber: order.number, totalCents: order.totalCents });
  const mailId = await queueEmail(db, { kind: "customer_order_received", to: order.email, ...mail, relatedType: "order", relatedId: orderId });
  await enqueue(db, "email.send", { emailId: mailId });
  await enqueue(db, "order.paid", { orderId }, { dedupeKey: `order.paid:${orderId}` });
  return order;
}

/** Lieferant je Artikel festlegen und in Fulfillments aufteilen. */
export async function handleOrderPaid(db: DB, orderId: string) {
  const existing = await db.select({ id: s.fulfillments.id }).from(s.fulfillments).where(eq(s.fulfillments.orderId, orderId));
  if (existing.length) return; // schon verarbeitet (Wiederholung nach Absturz)

  const rows = await db
    .select({ item: s.orderItems, variant: s.variants, sp: s.supplierProducts, supplier: s.suppliers })
    .from(s.orderItems)
    .innerJoin(s.variants, eq(s.variants.id, s.orderItems.variantId))
    .leftJoin(s.supplierProducts, eq(s.supplierProducts.id, s.variants.preferredSupplierProductId))
    .leftJoin(s.suppliers, eq(s.suppliers.id, s.supplierProducts.supplierId))
    .where(eq(s.orderItems.orderId, orderId));

  const missing = rows.filter((r) => !r.sp || !r.supplier || !r.supplier.isActive || r.sp.stock < r.item.quantity);
  if (missing.length) {
    await db.insert(s.notifications).values({
      level: "critical",
      kind: "fulfillment_no_supplier",
      message: `Bestellung ${orderId}: kein lieferfähiger Lieferant für ${missing.length} Artikel. Manueller Eingriff erforderlich.`,
      data: { orderId, items: missing.map((m) => m.item.id) },
    });
  }
  const routable = rows.filter((r) => !missing.includes(r));
  const plans = splitOrder(
    routable.map((r) => ({
      orderItemId: r.item.id,
      supplierId: r.supplier!.id,
      orderMode: r.supplier!.orderMode,
      quantity: r.item.quantity,
      unitCostCents: r.sp!.costCents,
    })),
  );

  await db.transaction(async (tx) => {
    for (const plan of plans) {
      const supplier = routable.find((r) => r.supplier!.id === plan.supplierId)!.supplier!;
      const [f] = await tx
        .insert(s.fulfillments)
        .values({ orderId, supplierId: plan.supplierId, mode: plan.mode, costCents: plan.costCents, shippingCostCents: supplier.shippingCostCents ?? 0 })
        .returning({ id: s.fulfillments.id });
      for (const it of plan.items) {
        const r = routable.find((x) => x.item.id === it.orderItemId)!;
        await tx
          .update(s.orderItems)
          .set({ fulfillmentId: f.id, supplierProductId: r.sp!.id, unitCostCents: r.sp!.costCents })
          .where(eq(s.orderItems.id, it.orderItemId));
      }
      await tx.insert(s.automationJobs).values({ type: "fulfillment.submit", payload: { fulfillmentId: f.id }, dedupeKey: `fulfillment.submit:${f.id}` });
    }
    await tx.update(s.orders).set({ status: "processing" }).where(eq(s.orders.id, orderId));
  });
}

async function setFulfillmentStatus(db: DB, id: number, to: FulfillmentStatus, extra: Partial<typeof s.fulfillments.$inferInsert> = {}) {
  const [f] = await db.select().from(s.fulfillments).where(eq(s.fulfillments.id, id));
  if (!f) throw new OrderError(`Fulfillment ${id} fehlt`);
  if (f.status !== to) assertTransition(f.status, to);
  await db.update(s.fulfillments).set({ status: to, ...extra }).where(eq(s.fulfillments.id, id));
  return f;
}

export async function submitFulfillment(db: DB, fulfillmentId: number) {
  const [row] = await db
    .select({ f: s.fulfillments, supplier: s.suppliers, order: s.orders })
    .from(s.fulfillments)
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.fulfillments.supplierId))
    .innerJoin(s.orders, eq(s.orders.id, s.fulfillments.orderId))
    .where(eq(s.fulfillments.id, fulfillmentId));
  if (!row) throw new OrderError(`Fulfillment ${fulfillmentId} fehlt`);
  if (row.f.status !== "pending" && row.f.status !== "failed") return; // bereits übermittelt

  const lines = await db
    .select({ supplierSku: s.supplierProducts.supplierSku, title: s.orderItems.titleSnapshot, quantity: s.orderItems.quantity, gtin: s.supplierProducts.gtin })
    .from(s.orderItems)
    .innerJoin(s.supplierProducts, eq(s.supplierProducts.id, s.orderItems.supplierProductId))
    .where(eq(s.orderItems.fulfillmentId, fulfillmentId));

  const ctx: SubmitContext = {
    supplier: { ...row.supplier, config: row.supplier.config },
    fulfillmentId,
    orderNumber: row.order.number,
    lines,
    address: row.order.shippingAddress,
  };
  await db.update(s.fulfillments).set({ attempts: sql`${s.fulfillments.attempts} + 1` }).where(eq(s.fulfillments.id, fulfillmentId));

  if (row.supplier.orderMode === "email") {
    if (!row.supplier.orderEmail) {
      await setFulfillmentStatus(db, fulfillmentId, "needs_manual", { lastError: "Keine Bestell-E-Mail beim Lieferanten hinterlegt" });
      await notifyManual(db, row.order.number, fulfillmentId, row.supplier.name, "Keine Bestell-E-Mail hinterlegt");
      return;
    }
    const mail = supplierOrderEmail({
      shopName: SHOP.name,
      customerNumber: (row.supplier.config.customerNumber as string | undefined) ?? undefined,
      orderNumber: row.order.number,
      fulfillmentId,
      lines,
      address: row.order.shippingAddress,
    });
    const mailId = await queueEmail(db, {
      kind: "supplier_order",
      to: row.supplier.orderEmail,
      subject: mail.subject,
      text: mail.text,
      relatedType: "fulfillment",
      relatedId: String(fulfillmentId),
    });
    await enqueue(db, "email.send", { emailId: mailId });
    await setFulfillmentStatus(db, fulfillmentId, "submitted", { externalRef: mail.ref, submittedAt: new Date(), lastError: null });
    return;
  }

  if (row.supplier.orderMode === "portal_manual") {
    await setFulfillmentStatus(db, fulfillmentId, "needs_manual", { lastError: "Lieferant erfordert Bestellung im Händlerportal" });
    await notifyManual(db, row.order.number, fulfillmentId, row.supplier.name, "Bitte im Händlerportal bestellen", { lines, address: row.order.shippingAddress });
    return;
  }

  // API
  const adapter = API_ADAPTERS[row.supplier.slug];
  if (!adapter) throw new NoApiAdapterError(row.supplier.slug);
  const res = await adapter.submitOrder(ctx);
  if (res.status === "submitted") {
    await setFulfillmentStatus(db, fulfillmentId, "submitted", { externalRef: res.externalRef, submittedAt: new Date(), lastError: null });
    await enqueue(db, "tracking.check", { fulfillmentId }, { runAt: new Date(Date.now() + 6 * 3600_000), dedupeKey: `tracking.check:${fulfillmentId}` });
  } else {
    await setFulfillmentStatus(db, fulfillmentId, "needs_manual", { lastError: res.reason });
    await notifyManual(db, row.order.number, fulfillmentId, row.supplier.name, res.reason);
  }
}

/** Wird aufgerufen, wenn alle automatischen Versuche gescheitert sind. */
export async function markFulfillmentFailed(db: DB, fulfillmentId: number, reason: string) {
  const [f] = await db.select().from(s.fulfillments).where(eq(s.fulfillments.id, fulfillmentId));
  if (!f || f.status === "needs_manual") return;
  await db.update(s.fulfillments).set({ status: "needs_manual", lastError: reason }).where(eq(s.fulfillments.id, fulfillmentId));
  await notifyManual(db, null, fulfillmentId, `Lieferant ${f.supplierId}`, `Fulfillment fehlgeschlagen: ${reason}`);
}

async function notifyManual(db: DB, orderNumber: number | null, fulfillmentId: number, supplierName: string, reason: string, data: Record<string, unknown> = {}) {
  await db.insert(s.notifications).values({
    level: "critical",
    kind: "fulfillment_needs_manual",
    message: `Bestellung ${orderNumber ?? "?"} / Auftrag ${fulfillmentId} bei ${supplierName}: ${reason}. Manueller Eingriff erforderlich.`,
    data: { fulfillmentId, ...data },
  });
}

/** Sendungsnummer eintragen. Quelle: Lieferanten-API, Webhook, Tracking-Feed oder Admin. */
export async function recordShipment(
  db: DB,
  input: { fulfillmentId?: number; externalRef?: string; carrier?: string; trackingNumber: string; trackingUrl?: string },
) {
  const where = input.fulfillmentId ? eq(s.fulfillments.id, input.fulfillmentId) : eq(s.fulfillments.externalRef, input.externalRef ?? "");
  const [f] = await db.select().from(s.fulfillments).where(where);
  if (!f) throw new OrderError("Auftrag zur Sendungsnummer nicht gefunden");
  const dup = await db
    .select({ id: s.shipments.id })
    .from(s.shipments)
    .where(and(eq(s.shipments.fulfillmentId, f.id), eq(s.shipments.trackingNumber, input.trackingNumber)));
  if (dup.length) return; // schon bekannt

  await db.insert(s.shipments).values({
    fulfillmentId: f.id,
    carrier: input.carrier ?? null,
    trackingNumber: input.trackingNumber,
    trackingUrl: input.trackingUrl ?? null,
    shippedAt: new Date(),
  });
  if (f.status !== "shipped") await setFulfillmentStatus(db, f.id, "shipped");

  const all = await db.select({ status: s.fulfillments.status }).from(s.fulfillments).where(eq(s.fulfillments.orderId, f.orderId));
  const status = aggregateOrderStatus(all.map((a) => a.status));
  const [order] = await db.update(s.orders).set({ status }).where(eq(s.orders.id, f.orderId)).returning();

  const mail = customerShippedEmail({
    shopName: SHOP.name,
    firstName: order.shippingAddress.firstName,
    orderNumber: order.number,
    carrier: input.carrier,
    trackingNumber: input.trackingNumber,
    trackingUrl: input.trackingUrl,
    partial: status === "partially_shipped",
  });
  const mailId = await queueEmail(db, { kind: "customer_shipped", to: order.email, ...mail, relatedType: "fulfillment", relatedId: String(f.id) });
  await enqueue(db, "email.send", { emailId: mailId });
}

export async function recordDelivered(db: DB, fulfillmentId: number) {
  await setFulfillmentStatus(db, fulfillmentId, "delivered");
  await db.update(s.shipments).set({ status: "delivered", deliveredAt: new Date() }).where(eq(s.shipments.fulfillmentId, fulfillmentId));
  const [f] = await db.select().from(s.fulfillments).where(eq(s.fulfillments.id, fulfillmentId));
  const all = await db.select({ status: s.fulfillments.status }).from(s.fulfillments).where(eq(s.fulfillments.orderId, f.orderId));
  await db.update(s.orders).set({ status: aggregateOrderStatus(all.map((a) => a.status)) }).where(eq(s.orders.id, f.orderId));
}
