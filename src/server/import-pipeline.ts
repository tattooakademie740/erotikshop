/**
 * Import-Pipeline: Feed → Lieferantenangebote → Shop-Katalog.
 *
 * 1. Feed parsen und normalisieren (CSV/XML, siehe domain/feeds)
 * 2. Angebote je Lieferant speichern (upsert über supplier + SKU)
 * 3. Duplikate erkennen (GTIN > Marke+MPN > Titelähnlichkeit)
 * 4. Neue Artikel anlegen, Qualität prüfen, ggf. Review Queue
 * 5. Pro Variante besten Lieferanten wählen und Preis neu berechnen
 *
 * Nichts wird still verworfen: Fehler landen in import_runs.stats und notifications.
 */
import { and, eq, inArray } from "drizzle-orm";
import type { db as Db } from "@/db";
import * as s from "@/db/schema";
import { findMatch, type DedupeCandidate } from "@/domain/dedupe";
import { parseFeed } from "@/domain/feeds/normalize";
import type { FeedConfig, NormalizedOffer } from "@/domain/feeds/types";
import { normalizeGtin } from "@/domain/gtin";
import { SHOP } from "@/config/shop";
import { net } from "@/domain/money";
import { calculatePrice, type PriceRule } from "@/domain/pricing";
import { checkQuality, isPublishable } from "@/domain/quality";
import { pickBestOffer } from "@/domain/supplier-ranking";

type DB = typeof Db;

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type ImportOptions = {
  /** Lieferanten-Kategoriepfad → Shop-Kategorie-ID */
  categoryMap: Record<string, number>;
  isDemo?: boolean;
};

export async function runImport(
  db: DB,
  supplierId: number,
  content: string,
  config: FeedConfig,
  opts: ImportOptions,
) {
  const [run] = await db
    .insert(s.importRuns)
    .values({ supplierId, kind: "full" })
    .returning({ id: s.importRuns.id });

  const stats = { parsed: 0, parseErrors: 0, created: 0, matched: 0, review: 0, similar: 0 };
  try {
    const { offers, errors } = parseFeed(content, config);
    stats.parsed = offers.length;
    stats.parseErrors = errors.length;
    if (errors.length) {
      await db.insert(s.notifications).values({
        level: "warning",
        kind: "import_parse_errors",
        message: `${errors.length} fehlerhafte Zeilen im Feed von Lieferant ${supplierId}`,
        data: { importRunId: run.id, errors: errors.slice(0, 50) },
      });
    }

    for (const offer of offers) {
      const result = await importOffer(db, supplierId, offer, run.id, opts);
      stats[result]++;
    }

    await db
      .update(s.importRuns)
      .set({ status: "succeeded", stats, finishedAt: new Date() })
      .where(eq(s.importRuns.id, run.id));
    return { importRunId: run.id, stats };
  } catch (e) {
    await db
      .update(s.importRuns)
      .set({ status: "failed", stats, error: (e as Error).message, finishedAt: new Date() })
      .where(eq(s.importRuns.id, run.id));
    await db.insert(s.notifications).values({
      level: "critical",
      kind: "import_failed",
      message: `Import für Lieferant ${supplierId} fehlgeschlagen: ${(e as Error).message}`,
      data: { importRunId: run.id },
    });
    throw e;
  }
}

async function importOffer(
  db: DB,
  supplierId: number,
  offer: NormalizedOffer,
  importRunId: number,
  opts: ImportOptions,
): Promise<"created" | "matched" | "review" | "similar"> {
  const gtin = normalizeGtin(offer.gtin);
  const values = {
    supplierId,
    supplierSku: offer.supplierSku,
    gtin,
    mpn: offer.mpn ?? null,
    brand: offer.brand ?? null,
    title: offer.title,
    costCents: offer.costCents,
    rrpCents: offer.rrpCents ?? null,
    stock: offer.stock,
    deliveryDays: offer.deliveryDays ?? null,
    normalized: offer,
    isAvailable: offer.stock > 0,
    lastSeenAt: new Date(),
    lastImportRunId: importRunId,
  };
  const [sp] = await db
    .insert(s.supplierProducts)
    .values(values)
    .onConflictDoUpdate({
      target: [s.supplierProducts.supplierId, s.supplierProducts.supplierSku],
      set: values,
    })
    .returning();

  // Bereits zugeordnet: nur Ranking/Preis aktualisieren.
  if (sp.variantId) {
    await refreshVariant(db, sp.variantId);
    return "matched";
  }

  // Duplikat-Suche gegen bestehende Varianten
  const candidates: DedupeCandidate[] = gtin
    ? await db
        .select({ id: s.variants.id, gtin: s.variants.gtin, title: s.products.title })
        .from(s.variants)
        .innerJoin(s.products, eq(s.products.id, s.variants.productId))
        .where(eq(s.variants.gtin, gtin))
    : [];
  const match = findMatch({ id: sp.id, gtin, brand: offer.brand, mpn: offer.mpn, title: offer.title }, candidates);
  if (match.kind === "exact") {
    await db
      .update(s.supplierProducts)
      .set({ variantId: Number(match.matchId) })
      .where(eq(s.supplierProducts.id, sp.id));
    await refreshVariant(db, Number(match.matchId));
    return "matched";
  }

  // Neuer Artikel
  const brandId = offer.brand ? await ensureBrand(db, offer.brand, offer.manufacturer, opts.isDemo) : null;
  const categoryId = offer.category ? opts.categoryMap[offer.category] ?? null : null;
  const issues = checkQuality(offer);
  if (!categoryId) issues.push({ code: "unmapped_category", message: `Kategorie nicht zugeordnet: ${offer.category ?? "leer"}`, blocking: true });
  const publishable = isPublishable(issues);

  const baseSlug = slugify(`${offer.brand ?? ""} ${offer.title}`);
  const [product] = await db
    .insert(s.products)
    .values({
      slug: `${baseSlug}-${sp.id}`,
      title: offer.title,
      shortDescription: offer.shortDescription ?? null,
      description: offer.description ?? null,
      brandId,
      categoryId,
      status: publishable ? "active" : "review",
      gtin,
      mpn: offer.mpn ?? null,
      attributes: {
        ...offer.attributes,
        ...(offer.material ? { material: offer.material } : {}),
        ...(offer.color ? { farbe: offer.color } : {}),
      },
      attributeSources: Object.fromEntries(
        [...Object.keys(offer.attributes), offer.material && "material", offer.color && "farbe"]
          .filter(Boolean)
          .map((k) => [k as string, `feed:${supplierId}`]),
      ),
      safetyInfo: offer.safetyInfo ?? null,
      isDemo: !!opts.isDemo,
      publishedAt: publishable ? new Date() : null,
    })
    .returning();

  if (offer.images.length) {
    await db.insert(s.productImages).values(
      offer.images.map((url, i) => ({
        productId: product.id,
        url,
        alt: offer.title,
        sort: i,
        sourceSupplierId: supplierId,
      })),
    );
  }

  const [variant] = await db
    .insert(s.variants)
    .values({
      productId: product.id,
      sku: `SH-${product.id}`,
      gtin,
      priceCents: 0, // wird in refreshVariant gesetzt
      unitContent: offer.unitContent ?? null,
      unitMeasure: offer.unitMeasure ?? null,
    })
    .returning();
  await db.update(s.supplierProducts).set({ variantId: variant.id }).where(eq(s.supplierProducts.id, sp.id));
  await refreshVariant(db, variant.id);

  if (!publishable) {
    await db.insert(s.reviewQueue).values({ productId: product.id, supplierProductId: sp.id, issues });
  }
  return publishable ? "created" : "review";
}

async function ensureBrand(db: DB, name: string, manufacturer?: string, isDemo?: boolean) {
  const slug = slugify(name);
  const [b] = await db
    .insert(s.brands)
    .values({ slug, name, manufacturerName: manufacturer ?? null, isDemo: !!isDemo })
    .onConflictDoUpdate({ target: s.brands.slug, set: { name } })
    .returning({ id: s.brands.id });
  return b.id;
}

/**
 * Wählt den besten Lieferanten für eine Variante, übernimmt Bestand und
 * Lieferzeit und berechnet den Preis neu (außer der Preis ist gesperrt).
 */
export async function refreshVariant(db: DB, variantId: number) {
  const offers = await db
    .select({
      sp: s.supplierProducts,
      supplier: s.suppliers,
    })
    .from(s.supplierProducts)
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.supplierProducts.supplierId))
    .where(eq(s.supplierProducts.variantId, variantId));

  const best = pickBestOffer(
    offers.map(({ sp, supplier }) => ({
      supplierProductId: sp.id,
      supplierId: supplier.id,
      costCents: sp.costCents,
      shippingCents: sp.shippingCents ?? supplier.shippingCostCents ?? 0,
      stock: sp.isAvailable ? sp.stock : 0,
      deliveryDays: sp.deliveryDays ?? supplier.avgDeliveryDays,
      reliabilityScore: supplier.reliabilityScore,
      supplierActive: supplier.isActive,
      manualOrder: supplier.orderMode !== "api",
    })),
  );

  const [variant] = await db
    .select({ v: s.variants, categoryId: s.products.categoryId, productId: s.products.id, status: s.products.status })
    .from(s.variants)
    .innerJoin(s.products, eq(s.products.id, s.variants.productId))
    .where(eq(s.variants.id, variantId));
  if (!variant) return;

  if (!best) {
    // Kein Lieferant mit Bestand: Variante nicht kaufbar, Artikel inaktiv.
    await db.update(s.variants).set({ stockAvailable: 0, preferredSupplierProductId: null }).where(eq(s.variants.id, variantId));
    if (variant.status === "active") {
      await db.update(s.products).set({ status: "inactive" }).where(eq(s.products.id, variant.productId));
    }
    return;
  }

  const chosen = offers.find((o) => o.sp.id === best.supplierProductId)!;
  const rules = await loadRules(db);
  const price = calculatePrice(
    {
      costCents: best.costCents,
      // Der Kunde zahlt Versand selbst. Nur der ungedeckte Rest fließt in den Artikelpreis.
      shippingCents: Math.max(0, best.shippingCents - net(SHOP.shippingCents)),
      categoryId: variant.categoryId,
      rrpCents: chosen.sp.rrpCents,
    },
    rules,
  );

  const update: Partial<typeof s.variants.$inferInsert> = {
    preferredSupplierProductId: best.supplierProductId,
    stockAvailable: best.stock,
    deliveryDaysMin: best.deliveryDays ?? null,
    deliveryDaysMax: best.deliveryDays ? best.deliveryDays + 2 : null,
    rrpCents: chosen.sp.rrpCents,
  };
  if (!variant.v.priceLocked && variant.v.priceCents !== price.priceCents) {
    update.priceCents = price.priceCents;
    await db.insert(s.priceHistory).values({
      variantId,
      priceCents: price.priceCents,
      costCents: best.costCents,
      reason: `auto: Regel ${price.ruleId ?? "standard"}, Lieferant ${best.supplierId}`,
    });
    // Große Sprünge melden (mehr als 20 %)
    if (variant.v.priceCents > 0 && Math.abs(price.priceCents - variant.v.priceCents) / variant.v.priceCents > 0.2) {
      await db.insert(s.notifications).values({
        level: "warning",
        kind: "price_jump",
        message: `Preis von Variante ${variantId} ändert sich um mehr als 20 %`,
        data: { from: variant.v.priceCents, to: price.priceCents },
      });
    }
  }
  await db.update(s.variants).set(update).where(eq(s.variants.id, variantId));
  if (variant.status === "inactive") {
    // Wieder lieferbar: nur reaktivieren, wenn kein offener Review-Eintrag existiert
    const open = await db
      .select({ id: s.reviewQueue.id })
      .from(s.reviewQueue)
      .where(and(eq(s.reviewQueue.productId, variant.productId), eq(s.reviewQueue.status, "open")));
    if (open.length === 0) {
      await db.update(s.products).set({ status: "active" }).where(eq(s.products.id, variant.productId));
    }
  }
}

let rulesCache: { at: number; rules: PriceRule[] } | null = null;
async function loadRules(db: DB): Promise<PriceRule[]> {
  if (rulesCache && Date.now() - rulesCache.at < 60_000) return rulesCache.rules;
  const rows = await db.select().from(s.priceRules).where(eq(s.priceRules.isActive, true));
  rulesCache = { at: Date.now(), rules: rows };
  return rows;
}

/** Angebote, die im letzten Lauf nicht mehr im Feed waren, auf "nicht verfügbar" setzen. */
export async function markMissingOffers(db: DB, supplierId: number, importRunId: number) {
  const stale = await db
    .select({ id: s.supplierProducts.id, variantId: s.supplierProducts.variantId, last: s.supplierProducts.lastImportRunId })
    .from(s.supplierProducts)
    .where(eq(s.supplierProducts.supplierId, supplierId));
  const ids = stale.filter((r) => r.last !== importRunId).map((r) => r.id);
  if (ids.length === 0) return 0;
  await db.update(s.supplierProducts).set({ isAvailable: false, stock: 0 }).where(inArray(s.supplierProducts.id, ids));
  for (const r of stale) if (r.last !== importRunId && r.variantId) await refreshVariant(db, r.variantId);
  return ids.length;
}

