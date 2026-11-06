/**
 * Stimmungsfotos für den Demo-Shop. Alle unter der Unsplash-Lizenz (frei, auch kommerziell,
 * Nennung freiwillig). Keine Produktfotos: Produktbilder kommen später vom Lieferanten.
 * Geprüft am 06.11.2026: keine fremden Logos, keine Gesichter erkennbar.
 */
export const PHOTOS = {
  seide: { src: "/show/seide.jpg", w: 1400, h: 1050, alt: "Cremefarbene Seide in weichen Falten", by: "Susan Wilkinson", url: "https://unsplash.com/photos/zp6wHVSm-0c" },
  haende1: { src: "/show/haende-1.jpg", w: 935, h: 1400, alt: "Zwei Menschen halten sich an den Händen", by: "Mariana Beltrán", url: "https://unsplash.com/photos/xN34wcMUWtA" },
  haende2: { src: "/show/haende-2.jpg", w: 933, h: 1400, alt: "Zwei Hände greifen ineinander, im Hintergrund das Meer", by: "Seljan Salim", url: "https://unsplash.com/photos/VPgH8enlKD4" },
  kerzen: { src: "/show/kerzen.jpg", w: 933, h: 1400, alt: "Kerzen und ein Duftdiffusor in hellem Licht", by: "Mediamodifier", url: "https://unsplash.com/photos/EUl-7LZ9EZo" },
  bett: { src: "/show/bett.jpg", w: 1205, h: 1400, alt: "Weiches, zerwühltes Bett in Abendlicht", by: "Susan Wilkinson", url: "https://unsplash.com/photos/9I4gTSe3_Po" },
  blumen: { src: "/show/blumen.jpg", w: 1400, h: 970, alt: "Rosa Kerzen und eine Rose auf weißem Stoff", by: "Walls.io", url: "https://unsplash.com/photos/UvyF41KjqI8" },
} as const;

export type PhotoKey = keyof typeof PHOTOS;
