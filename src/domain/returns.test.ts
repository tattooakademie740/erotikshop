import { describe, expect, it } from "vitest";
import { canMove, checkEligibility, refundAmount } from "./returns";

const now = new Date("2026-11-06T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe("Retouren-Berechtigung", () => {
  it("Widerruf innerhalb von 14 Tagen wird angenommen", () => {
    expect(checkEligibility({ reason: "widerruf", policy: "standard", deliveredAt: daysAgo(5), now }).decision).toBe("approve");
  });
  it("Widerruf nach 14 Tagen wird abgelehnt", () => {
    expect(checkEligibility({ reason: "widerruf", policy: "standard", deliveredAt: daysAgo(20), now }).decision).toBe("reject");
  });
  it("Hygieneartikel nur mit intakter Versiegelung", () => {
    expect(checkEligibility({ reason: "widerruf", policy: "hygiene_sealed", deliveredAt: daysAgo(2), now }).decision).toBe("reject");
    expect(checkEligibility({ reason: "widerruf", policy: "hygiene_sealed", deliveredAt: daysAgo(2), now, sealIntact: true }).decision).toBe("approve");
  });
  it("Defekte Ware wird auch bei Hygieneartikeln angenommen", () => {
    expect(checkEligibility({ reason: "defekt", policy: "hygiene_sealed", deliveredAt: daysAgo(100), now }).decision).toBe("approve");
  });
  it("Sonderfälle gehen an einen Menschen", () => {
    expect(checkEligibility({ reason: "widerruf", policy: "excluded_other", deliveredAt: daysAgo(1), now }).decision).toBe("manual");
  });
});

describe("Erstattung", () => {
  const items = [
    { unitPriceCents: 2000, quantity: 1, returnQuantity: 1 },
    { unitPriceCents: 1000, quantity: 2, returnQuantity: 1 },
  ];
  it("Teilretoure ohne Versandkosten", () => {
    expect(refundAmount({ items, shippingCents: 495, reason: "widerruf" })).toBe(3000);
  });
  it("Komplette Retoure mit Hinversand", () => {
    expect(refundAmount({ items: items.map((i) => ({ ...i, returnQuantity: i.quantity })), shippingCents: 495, reason: "widerruf" })).toBe(4495);
  });
});

describe("Retouren-Stufen", () => {
  it("nur erlaubte Übergänge", () => {
    expect(canMove("requested", "approved")).toBe(true);
    expect(canMove("refunded", "requested")).toBe(false);
    expect(canMove("needs_manual", "refunded")).toBe(true);
  });
});
