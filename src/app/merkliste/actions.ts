"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import type { ProductCard } from "@/lib/catalog";

export async function getWishlistProducts(ids: number[]): Promise<ProductCard[]> {
  const clean = z.array(z.number().int().positive()).max(200).parse(ids);
  if (clean.length === 0) return [];
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
    })
    .from(s.products)
    .innerJoin(s.variants, and(eq(s.variants.productId, s.products.id), eq(s.variants.isActive, true)))
    .leftJoin(s.brands, eq(s.brands.id, s.products.brandId))
    .leftJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .where(and(inArray(s.products.id, clean), inArray(s.products.status, ["active", "inactive"])))
    .groupBy(s.products.id, s.brands.name, s.categories.slug);
  const byId = new Map(rows.map(({ stock, ...r }) => [r.id, { ...r, inStock: stock > 0 } as ProductCard]));
  return clean.map((id) => byId.get(id)).filter((x): x is ProductCard => !!x);
}
