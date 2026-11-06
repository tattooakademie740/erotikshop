import type { MetadataRoute } from "next";
import { SHOP } from "@/config/shop";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SHOP.name,
    short_name: SHOP.name,
    description: "Toys, Dessous und Pflege, diskret und gut beraten.",
    lang: "de",
    start_url: "/?quelle=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6efe7",
    theme_color: "#6b1d4c",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Suche", url: "/suche", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Merkliste", url: "/merkliste", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Warenkorb", url: "/warenkorb", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
