/**
 * Datenmodell des Shops.
 *
 * Grundsätze:
 * - Geld immer als Integer in Cent (keine Rundungsfehler).
 * - Lieferantendaten (supplier_products) sind getrennt vom Shop-Katalog
 *   (products/variants). Ein Shop-Artikel kann mehrere Lieferantenangebote haben.
 * - Alles, was automatisch passiert, hinterlässt Spuren (import_runs,
 *   automation_jobs, audit_logs).
 * - is_demo markiert Testdaten. Testdaten dürfen nie als echt erscheinen.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ───────────── Enums ───────────── */

export const userRole = pgEnum("user_role", [
  "ADMIN",
  "MANAGER",
  "PRODUCT_MANAGER",
  "CUSTOMER_SUPPORT",
  "CONTENT_MANAGER",
  "CUSTOMER",
]);

export const productStatus = pgEnum("product_status", [
  "draft",
  "review", // in der Review Queue, nicht sichtbar
  "active",
  "inactive", // z. B. kein Bestand
  "blocked", // manuell gesperrt
]);

export const integrationType = pgEnum("integration_type", [
  "api",
  "xml_feed",
  "csv_feed",
  "json_feed",
  "manual",
]);

/** Wie Bestellungen beim Lieferanten ankommen. */
export const orderMode = pgEnum("order_mode", [
  "api", // nur wenn dokumentierte Bestell-API existiert
  "email", // Bestellung per E-Mail an Lieferanten
  "portal_manual", // Mitarbeiter bestellt im Händlerportal
]);

export const supplierPriority = pgEnum("supplier_priority", ["A", "B", "C", "D"]);

export const imageRights = pgEnum("image_rights", [
  "unknown",
  "supplier_licensed", // Lieferant erlaubt Nutzung laut Händlervertrag
  "own", // eigene Fotos
  "rejected",
]);

export const orderStatus = pgEnum("order_status", [
  "pending_payment",
  "paid",
  "processing",
  "partially_shipped",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "authorized",
  "captured",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const fulfillmentStatus = pgEnum("fulfillment_status", [
  "pending",
  "submitted",
  "accepted",
  "shipped",
  "delivered",
  "cancelled",
  "failed",
  "needs_manual",
]);

export const returnStatus = pgEnum("return_status", [
  "requested",
  "approved",
  "rejected",
  "received",
  "refunded",
  "needs_manual",
]);

export const reviewStatus = pgEnum("review_status", ["pending", "approved", "rejected"]);

export const queueStatus = pgEnum("queue_status", ["open", "resolved", "dismissed"]);

export const jobStatus = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed", // wird erneut versucht
  "dead", // max. Versuche erreicht, manueller Eingriff nötig
]);

/* ───────────── Nutzer ───────────── */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  role: userRole("role").notNull().default("CUSTOMER"),
  /** Zeitpunkt einer echten Altersprüfung (nicht nur Klick). */
  ageVerifiedAt: timestamp("age_verified_at", { withTimezone: true }),
  ageVerificationMethod: text("age_verification_method"),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // gehashter Token
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/* ───────────── Katalog ───────────── */

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    parentId: integer("parent_id"),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    sort: integer("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    /** Welche Attribute in dieser Kategorie als Filter erscheinen. */
    filterSchema: jsonb("filter_schema").$type<CategoryFilter[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [index("categories_parent_idx").on(t.parentId)],
);

export type CategoryFilter = {
  key: string; // Attribut-Schlüssel in products.attributes
  label: string;
  type: "select" | "boolean" | "range";
  unit?: string;
};

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** GPSR: Hersteller bzw. verantwortliche Person in der EU. */
  manufacturerName: text("manufacturer_name"),
  manufacturerAddress: text("manufacturer_address"),
  manufacturerContact: text("manufacturer_contact"),
  euResponsiblePerson: text("eu_responsible_person"),
  isDemo: boolean("is_demo").notNull().default(false),
  ...timestamps,
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    shortDescription: text("short_description"),
    description: text("description"),
    brandId: integer("brand_id").references(() => brands.id),
    categoryId: integer("category_id").references(() => categories.id),
    status: productStatus("status").notNull().default("draft"),
    gtin: text("gtin"),
    mpn: text("mpn"), // Herstellerartikelnummer
    /** Strukturierte Attribute, z. B. { material: "Silikon", wasserdicht: true }. */
    attributes: jsonb("attributes").$type<Record<string, string | number | boolean>>().notNull().default({}),
    /** Herkunft jedes Attributs: "feed", "manual", "ai:<model>" (nachvollziehbar). */
    attributeSources: jsonb("attribute_sources").$type<Record<string, string>>().notNull().default({}),
    /** Widerruf: "standard", "hygiene_sealed" (Ausschluss nur bei entfernter Versiegelung), "excluded_other". Anwaltlich prüfen. */
    returnPolicy: text("return_policy").notNull().default("standard"),
    safetyInfo: text("safety_info"),
    careInstructions: text("care_instructions"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    isDemo: boolean("is_demo").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    search: tsvector("search").generatedAlwaysAs(
      sql`setweight(to_tsvector('german', coalesce(title, '')), 'A') || setweight(to_tsvector('german', coalesce(short_description, '')), 'B') || setweight(to_tsvector('german', coalesce(description, '')), 'C')`,
    ),
    ...timestamps,
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categoryId, t.status),
    index("products_gtin_idx").on(t.gtin),
    index("products_search_idx").using("gin", t.search),
    index("products_attributes_idx").using("gin", t.attributes),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    sort: integer("sort").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    sourceSupplierId: integer("source_supplier_id"),
    rights: imageRights("rights").notNull().default("unknown"),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(), // eigene SKU
    title: text("title").notNull().default("Standard"),
    options: jsonb("options").$type<Record<string, string>>().notNull().default({}),
    gtin: text("gtin"),
    priceCents: integer("price_cents").notNull(),
    /** UVP, nur anzeigen wenn belegt. */
    rrpCents: integer("rrp_cents"),
    /** Grundpreis-Angabe (PAngV), z. B. 100 ml. */
    unitContent: integer("unit_content"),
    unitMeasure: text("unit_measure"), // "ml" | "g" | "Stück"
    /** Gewählter Lieferant, bestimmt durch das Ranking. */
    preferredSupplierProductId: integer("preferred_supplier_product_id"),
    stockAvailable: integer("stock_available").notNull().default(0),
    deliveryDaysMin: smallint("delivery_days_min"),
    deliveryDaysMax: smallint("delivery_days_max"),
    isActive: boolean("is_active").notNull().default(true),
    priceLocked: boolean("price_locked").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("variants_product_idx").on(t.productId), index("variants_gtin_idx").on(t.gtin)],
);

/* ───────────── Lieferanten ───────────── */

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  website: text("website"),
  country: text("country"),
  integrationType: integrationType("integration_type").notNull(),
  orderMode: orderMode("order_mode").notNull(),
  priority: supplierPriority("priority").notNull().default("C"),
  isActive: boolean("is_active").notNull().default(false),
  /** Nicht-geheime Konfiguration: Feed-URL-Muster, Spaltenzuordnung usw. */
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  /** Name der Environment-Variable mit Zugangsdaten. Niemals das Secret selbst. */
  credentialsEnv: text("credentials_env"),
  orderEmail: text("order_email"),
  shippingCostCents: integer("shipping_cost_cents"),
  freeShippingFromCents: integer("free_shipping_from_cents"),
  minOrderCents: integer("min_order_cents"),
  avgDeliveryDays: smallint("avg_delivery_days"),
  /** 0..100, wird aus Fulfillment-Historie berechnet. */
  reliabilityScore: smallint("reliability_score").notNull().default(50),
  blindShipping: boolean("blind_shipping"),
  /** Wurden die Angaben aus offizieller Quelle bestätigt? */
  verified: boolean("verified").notNull().default(false),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  sourceUrl: text("source_url"),
  notes: text("notes"),
  isDemo: boolean("is_demo").notNull().default(false),
  ...timestamps,
});

export const supplierProducts = pgTable(
  "supplier_products",
  {
    id: serial("id").primaryKey(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    supplierSku: text("supplier_sku").notNull(),
    /** Zuordnung zum Shop-Artikel (null = noch nicht gemappt). */
    variantId: integer("variant_id").references(() => variants.id),
    gtin: text("gtin"),
    mpn: text("mpn"),
    brand: text("brand"),
    title: text("title").notNull(),
    costCents: integer("cost_cents").notNull(),
    rrpCents: integer("rrp_cents"),
    shippingCents: integer("shipping_cents"),
    stock: integer("stock").notNull().default(0),
    deliveryDays: smallint("delivery_days"),
    /** Normalisierter Datensatz und Originaldaten zur Nachvollziehbarkeit. */
    normalized: jsonb("normalized").notNull(),
    raw: jsonb("raw"),
    isAvailable: boolean("is_available").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastImportRunId: integer("last_import_run_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("supplier_products_sku_uq").on(t.supplierId, t.supplierSku),
    index("supplier_products_gtin_idx").on(t.gtin),
    index("supplier_products_variant_idx").on(t.variantId),
  ],
);

export const importRuns = pgTable("import_runs", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  kind: text("kind").notNull(), // "full" | "stock" | "price"
  status: text("status").notNull().default("running"), // running | succeeded | failed
  stats: jsonb("stats").$type<Record<string, number>>().notNull().default({}),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const reviewQueue = pgTable(
  "review_queue",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
    supplierProductId: integer("supplier_product_id").references(() => supplierProducts.id),
    issues: jsonb("issues").$type<{ code: string; message: string; blocking: boolean }[]>().notNull(),
    status: queueStatus("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("review_queue_status_idx").on(t.status)],
);

/* ───────────── Preise ───────────── */

export const priceRules = pgTable("price_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => categories.id), // null = global
  minCostCents: integer("min_cost_cents").notNull().default(0),
  maxCostCents: integer("max_cost_cents"),
  marginPercent: integer("margin_percent").notNull(), // Zielmarge auf den Verkaufspreis netto
  minMarginCents: integer("min_margin_cents").notNull().default(0),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const priceHistory = pgTable(
  "price_history",
  {
    id: serial("id").primaryKey(),
    variantId: integer("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    costCents: integer("cost_cents"),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("price_history_variant_idx").on(t.variantId, t.createdAt)],
);

/* ───────────── Bestellungen ───────────── */

export type Address = {
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  zip: string;
  city: string;
  country: string; // ISO 3166-1 alpha-2
};

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  kind: text("kind").notNull(), // "percent" | "fixed" | "free_shipping"
  value: integer("value").notNull(),
  minOrderCents: integer("min_order_cents").notNull().default(0),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: serial("number").notNull().unique(),
    userId: uuid("user_id").references(() => users.id),
    email: text("email").notNull(),
    status: orderStatus("status").notNull().default("pending_payment"),
    paymentStatus: paymentStatus("payment_status").notNull().default("pending"),
    currency: text("currency").notNull().default("EUR"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    couponId: integer("coupon_id").references(() => coupons.id),
    shippingAddress: jsonb("shipping_address").$type<Address>().notNull(),
    billingAddress: jsonb("billing_address").$type<Address>().notNull(),
    /** Neutraler Versand ist Standard. */
    discreetShipping: boolean("discreet_shipping").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_user_idx").on(t.userId)],
);

export const fulfillments = pgTable(
  "fulfillments",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    status: fulfillmentStatus("status").notNull().default("pending"),
    mode: orderMode("mode").notNull(),
    externalRef: text("external_ref"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    costCents: integer("cost_cents").notNull().default(0),
    shippingCostCents: integer("shipping_cost_cents").notNull().default(0),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("fulfillments_status_idx").on(t.status), index("fulfillments_order_idx").on(t.orderId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: integer("variant_id")
      .notNull()
      .references(() => variants.id),
    supplierProductId: integer("supplier_product_id").references(() => supplierProducts.id),
    fulfillmentId: integer("fulfillment_id").references(() => fulfillments.id),
    titleSnapshot: text("title_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    unitCostCents: integer("unit_cost_cents"),
    taxRate: integer("tax_rate").notNull().default(19),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const shipments = pgTable(
  "shipments",
  {
    id: serial("id").primaryKey(),
    fulfillmentId: integer("fulfillment_id")
      .notNull()
      .references(() => fulfillments.id),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    status: text("status").notNull().default("in_transit"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("shipments_fulfillment_idx").on(t.fulfillmentId)],
);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  provider: text("provider").notNull(),
  providerRef: text("provider_ref"),
  status: paymentStatus("status").notNull().default("pending"),
  amountCents: integer("amount_cents").notNull(),
  feeCents: integer("fee_cents"),
  ...timestamps,
});

export const returns = pgTable("returns", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  status: returnStatus("status").notNull().default("requested"),
  reason: text("reason").notNull(),
  customerNote: text("customer_note"),
  refundCents: integer("refund_cents"),
  /** Feinere Stufe im automatischen Ablauf, siehe domain/returns.ts */
  stage: text("stage").notNull().default("requested"),
  fulfillmentId: integer("fulfillment_id").references(() => fulfillments.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  /** Retourennummer: RETOURE-<id>, steht in allen Mails */
  reference: text("reference"),
  supplierRma: text("supplier_rma"),
  returnAddress: text("return_address"),
  timeline: jsonb("timeline").$type<{ at: string; event: string; by: string }[]>().notNull().default([]),
  ...timestamps,
});

export const returnItems = pgTable(
  "return_items",
  {
    returnId: integer("return_id")
      .notNull()
      .references(() => returns.id, { onDelete: "cascade" }),
    orderItemId: integer("order_item_id")
      .notNull()
      .references(() => orderItems.id),
    quantity: integer("quantity").notNull(),
  },
  (t) => [primaryKey({ columns: [t.returnId, t.orderItemId] })],
);

/* ───────────── Bewertungen & Inhalte ───────────── */

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    /** Nur gesetzt, wenn der Kauf über eine echte Bestellung belegt ist. */
    orderItemId: integer("order_item_id").references(() => orderItems.id),
    rating: smallint("rating").notNull(),
    title: text("title"),
    body: text("body"),
    status: reviewStatus("status").notNull().default("pending"),
    ...timestamps,
  },
  (t) => [index("reviews_product_idx").on(t.productId, t.status)],
);

export const contentPages = pgTable("content_pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull(), // "ratgeber" | "rechtliches" | "info"
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  body: text("body").notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  isPublished: boolean("is_published").notNull().default(false),
  /** Rechtstexte erst nach anwaltlicher Prüfung veröffentlichen. */
  legalReviewed: boolean("legal_reviewed").notNull().default(false),
  ...timestamps,
});

export const searchSynonyms = pgTable("search_synonyms", {
  id: serial("id").primaryKey(),
  term: text("term").notNull().unique(),
  synonyms: text("synonyms").array().notNull(),
});

/* ───────────── Automatisierung & Betrieb ───────────── */

export const automationJobs = pgTable(
  "automation_jobs",
  {
    id: serial("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    /** Verhindert doppelte Aufträge, z. B. "fulfillment.submit:42". */
    dedupeKey: text("dedupe_key"),
    status: jobStatus("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastError: text("last_error"),
    ...timestamps,
  },
  (t) => [
    index("automation_jobs_pick_idx").on(t.status, t.runAt),
    uniqueIndex("automation_jobs_dedupe_uq").on(t.dedupeKey).where(sql`status in ('queued', 'running', 'failed')`),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: uuid("actor_id"),
    actorType: text("actor_type").notNull(), // "user" | "system"
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_entity_idx").on(t.entity, t.entityId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    level: text("level").notNull(), // "info" | "warning" | "critical"
    kind: text("kind").notNull(), // z. B. "fulfillment_failed", "stock_low"
    message: text("message").notNull(),
    data: jsonb("data"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_unread_idx").on(t.readAt)],
);

/** Ausgehende E-Mails (Outbox): erst speichern, dann senden. Nichts geht verloren, alles ist nachvollziehbar. */
export const outboundEmails = pgTable(
  "outbound_emails",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // "supplier_order" | "customer_shipped" | ...
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    text: text("text").notNull(),
    status: text("status").notNull().default("queued"), // queued | sent | failed | dev_logged
    error: text("error"),
    relatedType: text("related_type"),
    relatedId: text("related_id"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("outbound_emails_status_idx").on(t.status)],
);

/** Protokoll jedes KI-Agenten-Laufs: was gefragt, welche Werkzeuge, Kosten, Ergebnis. */
export const agentRuns = pgTable(
  "agent_runs",
  {
    id: serial("id").primaryKey(),
    agent: text("agent").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull(), // ok | refusal | error | max_turns
    toolCalls: jsonb("tool_calls").$type<{ name: string; ok: boolean }[]>().notNull().default([]),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    error: text("error"),
    relatedType: text("related_type"),
    relatedId: text("related_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("agent_runs_agent_idx").on(t.agent, t.createdAt)],
);

/** Übergaben an Menschen, z. B. vom Kundenservice-Agenten. */
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: serial("id").primaryKey(),
    email: text("email"),
    orderNumber: integer("order_number"),
    topic: text("topic").notNull(),
    summary: text("summary").notNull(),
    status: text("status").notNull().default("open"), // open | answered | closed
    source: text("source").notNull(), // "chat" | "email" | "agent:<name>"
    ...timestamps,
  },
  (t) => [index("support_tickets_status_idx").on(t.status)],
);

/** Eingehende E-Mails (z. B. Antworten von Lieferanten), roh gespeichert und vom Agenten ausgewertet. */
export const inboundEmails = pgTable(
  "inbound_emails",
  {
    id: serial("id").primaryKey(),
    from: text("from").notNull(),
    subject: text("subject").notNull(),
    text: text("text").notNull(),
    status: text("status").notNull().default("new"), // new | processed | needs_manual | ignored
    parsed: jsonb("parsed"),
    actions: jsonb("actions"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("inbound_emails_status_idx").on(t.status)],
);
