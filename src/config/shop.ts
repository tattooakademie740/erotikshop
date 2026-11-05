/** Zentrale Shop-Einstellungen. Name und Domain sind Platzhalter. */
export const SHOP = {
  name: "Shopname",
  claim: "Diskret. Erwachsen. Gut beraten.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Solange true, ist keine echte Bestellung möglich und ein Hinweis sichtbar. */
  demoMode: true,
  freeShippingFromCents: 4900,
  shippingCents: 495,
};
