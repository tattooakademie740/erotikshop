import type { MetadataRoute } from "next";
import { SHOP } from "@/config/shop";

export default function robots(): MetadataRoute.Robots {
  // Im Demo-Modus nichts indexieren lassen.
  if (SHOP.demoMode) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/warenkorb", "/suche", "/admin", "/konto"] },
    sitemap: new URL("/sitemap.xml", SHOP.url).toString(),
  };
}
