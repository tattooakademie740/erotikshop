"use server";

/**
 * Admin-Aktionen. Jede Aktion prüft Rolle, Eingaben und schreibt ins Audit-Log.
 * CSRF: Server Actions prüfen den Origin, das Sitzungs-Cookie ist SameSite=strict.
 */
import { eq, inArray, isNull } from "drizzle-orm";
import { refresh, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { enqueue } from "@/server/jobs/queue";
import { refreshVariant } from "@/server/import-pipeline";
import { recordShipment } from "@/server/orders";
import { audit, login, logout, requirePermission } from "@/server/auth";

export type FormState = { error?: string; ok?: string; email?: string } | undefined;

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const data = z
    .object({ email: z.string().email().max(200), password: z.string().min(1).max(200) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  const email = String(form.get("email") ?? "").slice(0, 200);
  if (!data.success) return { error: "Bitte E-Mail und Passwort eingeben.", email };
  const res = await login(data.data.email, data.data.password);
  if (res === "locked") return { error: "Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.", email };
  if (res === "invalid") return { error: "E-Mail oder Passwort falsch.", email };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

/* ───────── Aufgaben / Fulfillments ───────── */

const Id = z.coerce.number().int().positive();

export async function markOrderedManually(form: FormData) {
  const user = await requirePermission("tasks");
  const id = Id.parse(form.get("fulfillmentId"));
  const ref = z.string().trim().min(2).max(100).parse(form.get("externalRef"));
  const [f] = await db.select().from(s.fulfillments).where(eq(s.fulfillments.id, id));
  if (!f || !["needs_manual", "failed", "pending"].includes(f.status)) return;
  await db.update(s.fulfillments).set({ status: "submitted", externalRef: ref, submittedAt: new Date(), lastError: null }).where(eq(s.fulfillments.id, id));
  await audit(user.id, "fulfillment.manual_submitted", "fulfillment", String(id), { ref });
  refresh();
}

export async function addTracking(form: FormData) {
  const user = await requirePermission("tasks");
  const id = Id.parse(form.get("fulfillmentId"));
  const trackingNumber = z.string().trim().min(4).max(60).parse(form.get("trackingNumber"));
  const carrier = z.string().trim().max(40).optional().parse(form.get("carrier") || undefined);
  await recordShipment(db, { fulfillmentId: id, trackingNumber, carrier });
  await audit(user.id, "fulfillment.tracking_added", "fulfillment", String(id), { trackingNumber, carrier });
  refresh();
}

export async function retryFulfillment(form: FormData) {
  const user = await requirePermission("tasks");
  const id = Id.parse(form.get("fulfillmentId"));
  await db.update(s.fulfillments).set({ status: "pending", lastError: null }).where(eq(s.fulfillments.id, id));
  await enqueue(db, "fulfillment.submit", { fulfillmentId: id }, { dedupeKey: `fulfillment.submit:${id}` });
  await audit(user.id, "fulfillment.retry", "fulfillment", String(id));
  refresh();
}

/* ───────── Meldungen ───────── */

export async function markNotificationsRead(form: FormData) {
  const user = await requirePermission("notifications");
  const ids = form.getAll("id").map((v) => Id.parse(v));
  const where = ids.length ? inArray(s.notifications.id, ids) : isNull(s.notifications.readAt);
  await db.update(s.notifications).set({ readAt: new Date() }).where(where);
  await audit(user.id, "notifications.read", "notification", ids.join(",") || "alle");
  refresh();
}

/* ───────── Review Queue ───────── */

export async function resolveReview(form: FormData) {
  const user = await requirePermission("review");
  const id = Id.parse(form.get("reviewId"));
  const decision = z.enum(["publish", "block", "dismiss"]).parse(form.get("decision"));
  const [r] = await db.select().from(s.reviewQueue).where(eq(s.reviewQueue.id, id));
  if (!r || r.status !== "open") return;
  if (r.productId) {
    if (decision === "publish") {
      const [p] = await db.select().from(s.products).where(eq(s.products.id, r.productId));
      if (!p?.categoryId) return; // ohne Kategorie nicht veröffentlichen
      await db.update(s.products).set({ status: "active", publishedAt: new Date() }).where(eq(s.products.id, r.productId));
    }
    if (decision === "block") await db.update(s.products).set({ status: "blocked" }).where(eq(s.products.id, r.productId));
  }
  await db
    .update(s.reviewQueue)
    .set({ status: decision === "dismiss" ? "dismissed" : "resolved", resolvedBy: user.id, resolvedAt: new Date() })
    .where(eq(s.reviewQueue.id, id));
  await audit(user.id, `review.${decision}`, "product", String(r.productId));
  revalidateTag("catalog", { expire: 0 });
  refresh();
}

/* ───────── Produkte ───────── */

export async function setProductStatus(form: FormData) {
  const user = await requirePermission("products");
  const id = Id.parse(form.get("productId"));
  const status = z.enum(["active", "inactive", "blocked"]).parse(form.get("status"));
  await db.update(s.products).set({ status, ...(status === "active" ? { publishedAt: new Date() } : {}) }).where(eq(s.products.id, id));
  await audit(user.id, "product.status", "product", String(id), { status });
  revalidateTag("catalog", { expire: 0 });
  refresh();
}

/* ───────── Preise ───────── */

export async function updatePriceRule(form: FormData) {
  const user = await requirePermission("pricing");
  const id = Id.parse(form.get("ruleId"));
  const marginPercent = z.coerce.number().int().min(0).max(80).parse(form.get("marginPercent"));
  const minMarginCents = Math.round(z.coerce.number().min(0).max(500).parse(form.get("minMarginEuro")) * 100);
  await db.update(s.priceRules).set({ marginPercent, minMarginCents }).where(eq(s.priceRules.id, id));
  await audit(user.id, "price_rule.update", "price_rule", String(id), { marginPercent, minMarginCents });
  refresh();
}

/** Alle Preise neu berechnen. Für sehr große Kataloge später als Hintergrundauftrag in Stapeln. */
export async function recalculatePrices() {
  const user = await requirePermission("pricing");
  const variants = await db.select({ id: s.variants.id }).from(s.variants).where(eq(s.variants.priceLocked, false));
  for (const v of variants) await refreshVariant(db, v.id);
  await audit(user.id, "prices.recalculate", "variant", undefined, { count: variants.length });
  revalidateTag("catalog", { expire: 0 });
  refresh();
}

/* ───────── Lieferanten ───────── */

export async function toggleSupplier(form: FormData) {
  const user = await requirePermission("suppliers");
  const id = Id.parse(form.get("supplierId"));
  const [sup] = await db.select().from(s.suppliers).where(eq(s.suppliers.id, id));
  if (!sup) return;
  await db.update(s.suppliers).set({ isActive: !sup.isActive }).where(eq(s.suppliers.id, id));
  // Varianten neu bewerten: ggf. anderer Lieferant oder ausverkauft
  const affected = await db.selectDistinct({ v: s.supplierProducts.variantId }).from(s.supplierProducts).where(eq(s.supplierProducts.supplierId, id));
  for (const a of affected) if (a.v) await refreshVariant(db, a.v);
  await audit(user.id, sup.isActive ? "supplier.deactivate" : "supplier.activate", "supplier", String(id));
  revalidateTag("catalog", { expire: 0 });
  refresh();
}

export async function triggerImport(form: FormData) {
  const user = await requirePermission("suppliers");
  const id = Id.parse(form.get("supplierId"));
  await enqueue(db, "supplier.import", { supplierId: id }, { dedupeKey: `supplier.import:${id}` });
  await audit(user.id, "supplier.import_requested", "supplier", String(id));
  refresh();
}
