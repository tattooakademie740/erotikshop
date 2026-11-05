/**
 * Lesezugriffe auf den Katalog für das Frontend.
 * Gecacht mit "use cache" und Tags, damit Importe gezielt invalidieren können
 * (revalidateTag("catalog") nach einem Import).
 */
import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import * as s from "@/db/schema";

export type ProductCard = {
  id: number;
  slug: string;
  title: string;
  shortDescription: string | null;
  brand: string | null;
  categorySlug: string | null;
  priceCents: number;
  rrpCents: number | null;
  inStock: boolean;
  image: string | null;
  isDemo: boolean;
  unitContent: number | null;
  unitMeasure: string | null;
};

const cardSelect = {
  id: s.products.id,
  slug: s.products.slug,
  title: s.products.title,
  shortDescription: s.products.shortDescription,
  brand: sql<string | null>`${s.brands.name}`.as("brand"),
  categorySlug: sql<string | null>`${s.categories.slug}`.as("category_slug"),
  priceCents: s.variants.priceCents,
  rrpCents: s.variants.rrpCents,
  stock: s.variants.stockAvailable,
  isDemo: s.products.isDemo,
  unitContent: s.variants.unitContent,
  unitMeasure: s.variants.unitMeasure,
  image: sql<string | null>`(select url from ${s.productImages} pi where pi.product_id = ${s.products.id} order by pi.sort limit 1)`.as("image"),
};

function toCard(r: { stock: number } & Omit<ProductCard, "inStock">): ProductCard {
  const { stock, ...rest } = r;
  return { ...rest, inStock: stock > 0 };
}

/** Nur aktive, veröffentlichte Artikel mit kaufbarer Variante. Eine Variante je Artikel (die günstigste). */
function baseQuery() {
  return db
    .selectDistinctOn([s.products.id], cardSelect)
    .from(s.products)
    .innerJoin(s.variants, and(eq(s.variants.productId, s.products.id), eq(s.variants.isActive, true)))
    .leftJoin(s.brands, eq(s.brands.id, s.products.brandId))
    .leftJoin(s.categories, eq(s.categories.id, s.products.categoryId));
}

const visible = () => and(eq(s.products.status, "active"), sql`${s.variants.priceCents} > 0`);

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const rows = await db
    .select({
      id: s.categories.id,
      slug: s.categories.slug,
      name: s.categories.name,
      description: s.categories.description,
      // Tabellenname ausgeschrieben: Drizzle lässt ihn bei Ein-Tabellen-Abfragen weg.
      count: sql<number>`(select count(*)::int from products p where p.category_id = "categories"."id" and p.status = 'active')`,
    })
    .from(s.categories)
    .where(eq(s.categories.isActive, true))
    .orderBy(asc(s.categories.sort));
  return rows;
}

export async function getCategory(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const [c] = await db.select().from(s.categories).where(eq(s.categories.slug, slug));
  return c ?? null;
}

export type SortKey = "beliebt" | "preis-auf" | "preis-ab" | "neu";

export type ListParams = {
  categoryId?: number;
  filters?: Record<string, string>;
  minCents?: number;
  maxCents?: number;
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

export async function listProducts(p: ListParams) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const perPage = p.perPage ?? 24;
  const page = Math.max(1, p.page ?? 1);
  const where: SQL[] = [visible()!];
  if (p.categoryId) where.push(eq(s.products.categoryId, p.categoryId));
  if (p.minCents) where.push(gte(s.variants.priceCents, p.minCents));
  if (p.maxCents) where.push(lte(s.variants.priceCents, p.maxCents));
  for (const [key, value] of Object.entries(p.filters ?? {})) {
    if (!/^[a-z_]+$/.test(key)) continue; // nur bekannte Schlüssel-Form
    where.push(sql`${s.products.attributes}->>${key} = ${value}`);
  }

  const inner = baseQuery()
    .where(and(...where))
    .orderBy(s.products.id, asc(s.variants.priceCents))
    .as("cards");

  const order =
    p.sort === "preis-auf"
      ? [asc(inner.priceCents)]
      : p.sort === "preis-ab"
        ? [desc(inner.priceCents)]
        : p.sort === "neu"
          ? [desc(inner.id)]
          : [desc(sql`(${inner.stock} > 0)`), asc(inner.id)];

  const rows = await db
    .select()
    .from(inner)
    .orderBy(...order)
    .limit(perPage)
    .offset((page - 1) * perPage);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(inner);
  return { items: rows.map(toCard), total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

/** Werte und Anzahl je Filter-Attribut in einer Kategorie. */
export async function getFacets(categoryId: number, keys: string[]) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const out: Record<string, { value: string; count: number }[]> = {};
  for (const key of keys) {
    if (!/^[a-z_]+$/.test(key)) continue;
    const rows = await db.execute<{ value: string; count: number }>(sql`
      select attributes->>${key} as value, count(*)::int as count
      from products
      where category_id = ${categoryId} and status = 'active' and attributes ? ${key}
      group by 1 order by 1`);
    out[key] = [...rows];
  }
  return out;
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", `product:${slug}`);
  const [row] = await db
    .select({
      product: s.products,
      brand: s.brands,
      category: { slug: s.categories.slug, name: s.categories.name },
    })
    .from(s.products)
    .leftJoin(s.brands, eq(s.brands.id, s.products.brandId))
    .leftJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .where(and(eq(s.products.slug, slug), inArray(s.products.status, ["active", "inactive"])));
  if (!row) return null;

  const [variantRows, images] = await Promise.all([
    db
      .select({
        id: s.variants.id,
        sku: s.variants.sku,
        title: s.variants.title,
        options: s.variants.options,
        priceCents: s.variants.priceCents,
        rrpCents: s.variants.rrpCents,
        stock: s.variants.stockAvailable,
        deliveryDaysMin: s.variants.deliveryDaysMin,
        deliveryDaysMax: s.variants.deliveryDaysMax,
        unitContent: s.variants.unitContent,
        unitMeasure: s.variants.unitMeasure,
        gtin: s.variants.gtin,
      })
      .from(s.variants)
      .where(and(eq(s.variants.productId, row.product.id), eq(s.variants.isActive, true)))
      .orderBy(asc(s.variants.priceCents)),
    db
      .select({ url: s.productImages.url, alt: s.productImages.alt })
      .from(s.productImages)
      .where(eq(s.productImages.productId, row.product.id))
      .orderBy(asc(s.productImages.sort)),
  ]);

  return { ...row, variants: variantRows, images };
}

export async function getRelated(productId: number, categoryId: number | null, limit = 4) {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  if (!categoryId) return [];
  const rows = await baseQuery()
    .where(and(visible(), eq(s.products.categoryId, categoryId), sql`${s.products.id} <> ${productId}`))
    .orderBy(s.products.id, asc(s.variants.priceCents))
    .limit(limit);
  return rows.map(toCard);
}

export async function getHomeSections() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const [newest, under20] = await Promise.all([
    listProducts({ sort: "neu", perPage: 8 }),
    listProducts({ maxCents: 1999, sort: "preis-ab", perPage: 8 }),
  ]);
  return { newest: newest.items, under20: under20.items };
}

export async function getGuides() {
  "use cache";
  cacheLife("hours");
  cacheTag("content");
  return db
    .select({ slug: s.contentPages.slug, title: s.contentPages.title, excerpt: s.contentPages.excerpt })
    .from(s.contentPages)
    .where(and(eq(s.contentPages.type, "ratgeber"), eq(s.contentPages.isPublished, true)))
    .orderBy(asc(s.contentPages.id));
}

export async function getGuide(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("content");
  const [g] = await db
    .select()
    .from(s.contentPages)
    .where(and(eq(s.contentPages.slug, slug), eq(s.contentPages.isPublished, true)));
  return g ?? null;
}

export async function getSitemapEntries() {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const [products, cats, guides] = await Promise.all([
    db
      .select({ slug: s.products.slug, updatedAt: s.products.updatedAt })
      .from(s.products)
      .where(eq(s.products.status, "active")),
    db.select({ slug: s.categories.slug, updatedAt: s.categories.updatedAt }).from(s.categories).where(eq(s.categories.isActive, true)),
    db
      .select({ slug: s.contentPages.slug, updatedAt: s.contentPages.updatedAt })
      .from(s.contentPages)
      .where(and(eq(s.contentPages.type, "ratgeber"), eq(s.contentPages.isPublished, true))),
  ]);
  return { products, cats, guides };
}
