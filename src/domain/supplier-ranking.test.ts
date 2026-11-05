import { describe, expect, it } from "vitest";
import { pickBestOffer, type Offer } from "./supplier-ranking";

const base = { stock: 10, reliabilityScore: 80, supplierActive: true, manualOrder: false };

describe("Lieferantenauswahl (Beispiel aus dem Briefing)", () => {
  const offers: Offer[] = [
    { ...base, supplierProductId: 1, supplierId: 1, costCents: 1000, shippingCents: 400, deliveryDays: 2 },
    { ...base, supplierProductId: 2, supplierId: 2, costCents: 800, shippingCents: 800, deliveryDays: 6 },
    { ...base, supplierProductId: 3, supplierId: 3, costCents: 900, shippingCents: 300, deliveryDays: 3 },
  ];

  it("wählt C: günstigste Gesamtkosten bei kurzer Lieferzeit", () => {
    expect(pickBestOffer(offers)?.supplierId).toBe(3);
  });
  it("ignoriert Lieferanten ohne Bestand", () => {
    const o = offers.map((x) => (x.supplierId === 3 ? { ...x, stock: 0 } : x));
    expect(pickBestOffer(o)?.supplierId).toBe(1);
  });
  it("ignoriert inaktive Lieferanten", () => {
    expect(pickBestOffer(offers.map((x) => ({ ...x, supplierActive: false })))).toBeNull();
  });
  it("prüft Bestand gegen Bestellmenge", () => {
    const o = offers.map((x) => (x.supplierId === 3 ? { ...x, stock: 1 } : x));
    expect(pickBestOffer(o, 2)?.supplierId).not.toBe(3);
  });
});
