import type { MetadataRoute } from "next";
import { SHOP } from "@/config/shop";
import { getSitemapEntries } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, cats, guides } = await getSitemapEntries();
  const u = (p: string) => new URL(p, SHOP.url).toString();
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    ...cats.map((c) => ({ url: u(`/kategorie/${c.slug}`), lastModified: c.updatedAt, priority: 0.8 })),
    ...products.map((p) => ({ url: u(`/produkt/${p.slug}`), lastModified: p.updatedAt, priority: 0.6 })),
    ...guides.map((g) => ({ url: u(`/ratgeber/${g.slug}`), lastModified: g.updatedAt, priority: 0.5 })),
  ];
}
