/** Zentrale Shop-Einstellungen. */
export const SHOP = {
  name: "Lustviora",
  claim: "Diskret. Erwachsen. Gut beraten.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://lustviora.de",
  /** Solange true, ist keine echte Bestellung möglich und ein Hinweis sichtbar. */
  demoMode: true,
  freeShippingFromCents: 4900,
  shippingCents: 495,
};
