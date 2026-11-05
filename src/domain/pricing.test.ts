import { describe, expect, it } from "vitest";
import { calculatePrice, pickRule, roundPsychological, unitPrice, type PriceRule } from "./pricing";

const rules: PriceRule[] = [
  { id: 1, categoryId: null, minCostCents: 0, maxCostCents: 1000, marginPercent: 45, minMarginCents: 300, priority: 0 },
  { id: 2, categoryId: null, minCostCents: 1000, maxCostCents: 5000, marginPercent: 35, minMarginCents: 0, priority: 0 },
  { id: 3, categoryId: null, minCostCents: 5000, maxCostCents: null, marginPercent: 25, minMarginCents: 0, priority: 0 },
  { id: 4, categoryId: 7, minCostCents: 0, maxCostCents: null, marginPercent: 20, minMarginCents: 0, priority: 0 },
];

describe("pickRule", () => {
  it("bevorzugt Kategorieregeln", () => {
    expect(pickRule(rules, { costCents: 2000, shippingCents: 0, categoryId: 7 })?.id).toBe(4);
  });
  it("wählt Staffel nach Einkaufspreis", () => {
    expect(pickRule(rules, { costCents: 500, shippingCents: 0, categoryId: 1 })?.id).toBe(1);
    expect(pickRule(rules, { costCents: 9000, shippingCents: 0, categoryId: 1 })?.id).toBe(3);
  });
});

describe("roundPsychological", () => {
  it("rundet auf Preispunkte", () => {
    expect(roundPsychological(1234)).toBe(1299);
    expect(roundPsychological(1299)).toBe(1299);
    expect(roundPsychological(4512)).toBe(4595);
    expect(roundPsychological(12340)).toBe(12900);
    expect(roundPsychological(12900)).toBe(12900);
  });
});

describe("calculatePrice", () => {
  it("deckt Kosten und Zielmarge", () => {
    const r = calculatePrice({ costCents: 2000, shippingCents: 400, categoryId: 1 }, rules);
    expect(r.ruleId).toBe(2);
    expect(r.marginPercent).toBeGreaterThanOrEqual(35);
    expect(r.marginCents).toBeGreaterThan(0);
  });
  it("günstige Artikel bekommen höhere prozentuale Marge als teure", () => {
    const cheap = calculatePrice({ costCents: 500, shippingCents: 0, categoryId: 1 }, rules);
    const pricey = calculatePrice({ costCents: 8000, shippingCents: 0, categoryId: 1 }, rules);
    expect(cheap.marginPercent).toBeGreaterThan(pricey.marginPercent);
  });
  it("sichert Mindestmarge in Euro", () => {
    const r = calculatePrice({ costCents: 100, shippingCents: 0, categoryId: 1 }, rules);
    expect(r.marginCents).toBeGreaterThanOrEqual(300);
  });
  it("warnt, wenn der Preis über der UVP liegt", () => {
    const r = calculatePrice({ costCents: 2000, shippingCents: 0, categoryId: 1, rrpCents: 2500 }, rules);
    expect(r.warnings.join()).toMatch(/UVP/);
  });
});

describe("unitPrice", () => {
  it("rechnet Grundpreis pro Liter bzw. Kilogramm", () => {
    expect(unitPrice(1299, 50, "ml")).toEqual({ cents: 25980, per: "1 l" });
    expect(unitPrice(1695, 150, "g")).toEqual({ cents: 11300, per: "1 kg" });
    expect(unitPrice(1999, 500, "ml")).toEqual({ cents: 3998, per: "1 l" });
    expect(unitPrice(999, null, null)).toBeNull();
  });
});
