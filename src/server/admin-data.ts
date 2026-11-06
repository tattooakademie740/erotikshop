/** Lesezugriffe für den Admin-Bereich. Immer frisch, nie gecacht. */
import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

export async function getDashboard() {
  const [kpi] = await db.execute<{
    orders_7d: number;
    revenue_7d: number;
    revenue_net_7d: number;
    cost_7d: number;
    shipping_cost_7d: number;
    fees_7d: number;
    discounts_7d: number;
    avg_cart: number | null;
  }>(sql`
    with o as (
      select * from orders where payment_status = 'captured' and created_at > now() - interval '7 days'
    )
    select
      (select count(*)::int from o) as orders_7d,
      coalesce((select sum(total_cents)::int from o), 0) as revenue_7d,
      coalesce((select sum(total_cents - tax_cents)::int from o), 0) as revenue_net_7d,
      coalesce((select sum(oi.unit_cost_cents * oi.quantity)::int from order_items oi join o on o.id = oi.order_id), 0) as cost_7d,
      coalesce((select sum(f.shipping_cost_cents)::int from fulfillments f join o on o.id = f.order_id), 0) as shipping_cost_7d,
      coalesce((select sum(p.fee_cents)::int from payments p join o on o.id = p.order_id), 0) as fees_7d,
      coalesce((select sum(discount_cents)::int from o), 0) as discounts_7d,
      (select avg(total_cents)::int from o) as avg_cart`);

  const [tasks] = await db.execute<{ manual: number; review: number; critical: number; dead: number; products: number; suppliers: number; low_stock: number }>(sql`
    select
      (select count(*)::int from fulfillments where status in ('needs_manual', 'failed')) as manual,
      (select count(*)::int from review_queue where status = 'open') as review,
      (select count(*)::int from notifications where read_at is null and level = 'critical') as critical,
      (select count(*)::int from automation_jobs where status = 'dead') as dead,
      (select count(*)::int from products where status = 'active') as products,
      (select count(*)::int from suppliers where is_active) as suppliers,
      (select count(*)::int from variants v join products p on p.id = v.product_id where p.status = 'active' and v.stock_available between 1 and 3) as low_stock`);

  const topProducts = await db.execute<{ title: string; qty: number; revenue: number }>(sql`
    select oi.title_snapshot as title, sum(oi.quantity)::int as qty, sum(oi.unit_price_cents * oi.quantity)::int as revenue
    from order_items oi join orders o on o.id = oi.order_id
    where o.payment_status = 'captured' and o.created_at > now() - interval '30 days'
    group by 1 order by 2 desc limit 5`);

  const contribution = kpi.revenue_net_7d - kpi.cost_7d - kpi.shipping_cost_7d - kpi.fees_7d;
  return { kpi, tasks, topProducts: [...topProducts], contribution };
}

export async function getManualTasks() {
  const rows = await db
    .select({ f: s.fulfillments, supplier: { name: s.suppliers.name, orderMode: s.suppliers.orderMode, website: s.suppliers.website }, order: { id: s.orders.id, number: s.orders.number, address: s.orders.shippingAddress, createdAt: s.orders.createdAt } })
    .from(s.fulfillments)
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.fulfillments.supplierId))
    .innerJoin(s.orders, eq(s.orders.id, s.fulfillments.orderId))
    .where(inArray(s.fulfillments.status, ["needs_manual", "failed", "submitted", "accepted"]))
    .orderBy(asc(s.fulfillments.createdAt));
  const ids = rows.map((r) => r.f.id);
  const lines = ids.length
    ? await db
        .select({ fulfillmentId: s.orderItems.fulfillmentId, qty: s.orderItems.quantity, title: s.orderItems.titleSnapshot, sku: s.supplierProducts.supplierSku })
        .from(s.orderItems)
        .leftJoin(s.supplierProducts, eq(s.supplierProducts.id, s.orderItems.supplierProductId))
        .where(inArray(s.orderItems.fulfillmentId, ids))
    : [];
  return rows.map((r) => ({ ...r, lines: lines.filter((l) => l.fulfillmentId === r.f.id) }));
}

export async function getOrders(limit = 100) {
  return db
    .select({ id: s.orders.id, number: s.orders.number, email: s.orders.email, status: s.orders.status, payment: s.orders.paymentStatus, total: s.orders.totalCents, createdAt: s.orders.createdAt, name: sql<string>`${s.orders.shippingAddress}->>'firstName' || ' ' || (${s.orders.shippingAddress}->>'lastName')` })
    .from(s.orders)
    .orderBy(desc(s.orders.createdAt))
    .limit(limit);
}

export async function getOrder(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [order] = await db.select().from(s.orders).where(eq(s.orders.id, id));
  if (!order) return null;
  const [items, fulfillments, shipments, mails] = await Promise.all([
    db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id)),
    db.select({ f: s.fulfillments, supplier: s.suppliers.name }).from(s.fulfillments).innerJoin(s.suppliers, eq(s.suppliers.id, s.fulfillments.supplierId)).where(eq(s.fulfillments.orderId, id)),
    db.select().from(s.shipments).innerJoin(s.fulfillments, eq(s.fulfillments.id, s.shipments.fulfillmentId)).where(eq(s.fulfillments.orderId, id)),
    db.select({ kind: s.outboundEmails.kind, to: s.outboundEmails.to, subject: s.outboundEmails.subject, status: s.outboundEmails.status, at: s.outboundEmails.createdAt }).from(s.outboundEmails).where(or(eq(s.outboundEmails.relatedId, id), inArray(s.outboundEmails.relatedId, sql`(select id::text from fulfillments where order_id = ${id})`))),
  ]);
  return { order, items, fulfillments, shipments: shipments.map((x) => x.shipments), mails };
}

export async function getNotifications(onlyUnread = false) {
  return db
    .select()
    .from(s.notifications)
    .where(onlyUnread ? isNull(s.notifications.readAt) : undefined)
    .orderBy(desc(s.notifications.createdAt))
    .limit(200);
}

export async function getReviewQueue() {
  return db
    .select({ r: s.reviewQueue, product: { id: s.products.id, title: s.products.title, slug: s.products.slug, categoryId: s.products.categoryId }, supplier: s.suppliers.name })
    .from(s.reviewQueue)
    .leftJoin(s.products, eq(s.products.id, s.reviewQueue.productId))
    .leftJoin(s.supplierProducts, eq(s.supplierProducts.id, s.reviewQueue.supplierProductId))
    .leftJoin(s.suppliers, eq(s.suppliers.id, s.supplierProducts.supplierId))
    .where(eq(s.reviewQueue.status, "open"))
    .orderBy(asc(s.reviewQueue.createdAt));
}

export async function getSuppliersWithStats() {
  const rows = await db.execute<{
    id: number; name: string; slug: string; country: string | null; integration_type: string; order_mode: string; priority: string;
    is_active: boolean; is_demo: boolean; verified: boolean; reliability_score: number;
    offers: number; mapped: number; fulfillments: number; failed: number; shipped: number; revenue_cost: number; last_import: Date | null; last_import_status: string | null;
  }>(sql`
    select s.id, s.name, s.slug, s.country, s.integration_type, s.order_mode, s.priority, s.is_active, s.is_demo, s.verified, s.reliability_score,
      (select count(*)::int from supplier_products sp where sp.supplier_id = s.id) as offers,
      (select count(*)::int from variants v join supplier_products sp on sp.id = v.preferred_supplier_product_id where sp.supplier_id = s.id) as mapped,
      (select count(*)::int from fulfillments f where f.supplier_id = s.id) as fulfillments,
      (select count(*)::int from fulfillments f where f.supplier_id = s.id and f.status in ('failed', 'needs_manual')) as failed,
      (select count(*)::int from fulfillments f where f.supplier_id = s.id and f.status in ('shipped', 'delivered')) as shipped,
      coalesce((select sum(f.cost_cents)::int from fulfillments f where f.supplier_id = s.id), 0) as revenue_cost,
      (select max(started_at) from import_runs ir where ir.supplier_id = s.id) as last_import,
      (select status from import_runs ir where ir.supplier_id = s.id order by started_at desc limit 1) as last_import_status
    from suppliers s order by s.is_active desc, s.name`);
  return [...rows];
}

export async function getPriceRules() {
  return db.select().from(s.priceRules).orderBy(asc(s.priceRules.minCostCents));
}

export async function searchProducts(q: string, status?: string) {
  const where = and(
    q ? or(ilike(s.products.title, `%${q.replace(/[%_]/g, "")}%`), eq(s.products.gtin, q.padStart(14, "0"))) : undefined,
    status && ["active", "inactive", "review", "blocked", "draft"].includes(status) ? eq(s.products.status, status as "active") : undefined,
  );
  return db
    .select({ id: s.products.id, title: s.products.title, slug: s.products.slug, status: s.products.status, isDemo: s.products.isDemo, price: sql<number>`min(${s.variants.priceCents})::int`, stock: sql<number>`max(${s.variants.stockAvailable})::int`, cost: sql<number | null>`min(${s.supplierProducts.costCents})::int` })
    .from(s.products)
    .leftJoin(s.variants, eq(s.variants.productId, s.products.id))
    .leftJoin(s.supplierProducts, eq(s.supplierProducts.id, s.variants.preferredSupplierProductId))
    .where(where)
    .groupBy(s.products.id)
    .orderBy(asc(s.products.title))
    .limit(200);
}
