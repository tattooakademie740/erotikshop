"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { z } from "zod";

const Input = z.array(z.number().int().positive()).max(50);

/** Aktuelle Preise und Verfügbarkeit für den Warenkorb, immer aus der Datenbank. */
export async function getCartLines(variantIds: number[]) {
  const ids = Input.parse(variantIds);
  if (ids.length === 0) return [];
  return db
    .select({
      variantId: s.variants.id,
      title: s.products.title,
      slug: s.products.slug,
      priceCents: s.variants.priceCents,
      stock: s.variants.stockAvailable,
      image: s.productImages.url,
    })
    .from(s.variants)
    .innerJoin(s.products, and(eq(s.products.id, s.variants.productId), eq(s.products.status, "active")))
    .leftJoin(s.productImages, and(eq(s.productImages.productId, s.products.id), eq(s.productImages.sort, 0)))
    .where(and(inArray(s.variants.id, ids), eq(s.variants.isActive, true)));
}
