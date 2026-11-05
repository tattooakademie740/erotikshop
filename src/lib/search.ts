import { and, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";
import { buildTsQuery, parseSearchQuery } from "@/domain/search-query";
import type { ProductCard } from "./catalog";

async function loadSynonyms(): Promise<Record<string, string[]>> {
  "use cache";
  cacheLife("hours");
  cacheTag("search");
  const rows = await db.select().from(s.searchSynonyms);
  return Object.fromEntries(rows.map((r) => [r.term, r.synonyms]));
}

/** Grober Wortstamm für die Teilwortsuche ("Vibratoren" → "vibrator"). */
const stem = (a: string) => (a.length > 5 ? a.replace(/(en|er|e|n|s)$/, "") : a);

export async function searchProducts(q: string, limit = 48) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const parsed = parseSearchQuery(q);
  const syn = await loadSynonyms();
  const tsq = buildTsQuery(parsed.terms, syn);
  if (!tsq && !parsed.maxCents && !parsed.minCents) return { parsed, items: [] as ProductCard[] };

  // Je Suchbegriff (UND-verknüpft): Volltext-Treffer ODER Teilwort im Titel
  // (deutsche Komposita wie "Auflegevibrator") ODER Kategoriename.
  // Bei großem Katalog: pg_trgm-GIN-Index auf products.title anlegen.
  const perTerm = parsed.terms.map((t) => {
    const alts = [t, ...(syn[t] ?? [])].map((a) => `%${stem(a)}%`);
    const tq = buildTsQuery([t], syn)!;
    return sql`(${s.products.search} @@ to_tsquery('german', ${tq})
      or to_tsvector('german', coalesce(${s.categories.name}, '')) @@ to_tsquery('german', ${tq})
      or ${s.products.title} ilike any(${sql.param(alts)}::text[]))`;
  });
  const textMatch = perTerm.length ? and(...perTerm)! : sql`true`;
  const rank = tsq ? sql<number>`ts_rank(${s.products.search}, to_tsquery('german', ${tsq}))` : sql<number>`0`;

  const rows = await db
    .select({
      id: s.products.id,
      slug: s.products.slug,
      title: s.products.title,
      shortDescription: s.products.shortDescription,
      brand: s.brands.name,
      categorySlug: s.categories.slug,
      priceCents: sql<number>`min(${s.variants.priceCents})::int`,
      rrpCents: sql<number | null>`min(${s.variants.rrpCents})::int`,
      stock: sql<number>`max(${s.variants.stockAvailable})::int`,
      isDemo: s.products.isDemo,
      unitContent: sql<number | null>`min(${s.variants.unitContent})::int`,
      unitMeasure: sql<string | null>`min(${s.variants.unitMeasure})`,
      image: sql<string | null>`(select url from ${s.productImages} pi where pi.product_id = ${s.products.id} order by pi.sort limit 1)`,
      rank: sql<number>`max(${rank})`,
    })
    .from(s.products)
    .innerJoin(s.variants, and(eq(s.variants.productId, s.products.id), eq(s.variants.isActive, true)))
    .leftJoin(s.brands, eq(s.brands.id, s.products.brandId))
    .leftJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .where(
      and(
        eq(s.products.status, "active"),
        textMatch,
        parsed.maxCents ? sql`${s.variants.priceCents} <= ${parsed.maxCents}` : undefined,
        parsed.minCents ? sql`${s.variants.priceCents} >= ${parsed.minCents}` : undefined,
      ),
    )
    .groupBy(s.products.id, s.brands.name, s.categories.slug)
    .orderBy(sql`max(${rank}) desc`, sql`min(${s.variants.priceCents})`)
    .limit(limit);

  return {
    parsed,
    items: rows.map(({ stock, rank: _r, ...r }) => ({ ...r, inStock: stock > 0 }) as ProductCard),
  };
}
