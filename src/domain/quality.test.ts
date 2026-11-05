import { describe, expect, it } from "vitest";
import { checkQuality, isPublishable } from "./quality";
import { findMatch, titleSimilarity } from "./dedupe";
import { isValidGtin, normalizeGtin } from "./gtin";
import type { NormalizedOffer } from "./feeds/types";

const good: NormalizedOffer = {
  supplierSku: "X",
  title: "Auflegevibrator Welle",
  gtin: "4006381333931",
  brand: "Demo",
  manufacturer: "Demo GmbH",
  description: "x".repeat(100),
  material: "Silikon",
  costCents: 1500,
  stock: 3,
  deliveryDays: 2,
  images: ["https://example.com/a.jpg"],
  attributes: {},
};

describe("GTIN", () => {
  it("prüft Prüfziffern", () => {
    expect(isValidGtin("4006381333931")).toBe(true);
    expect(isValidGtin("4006381333932")).toBe(false);
    expect(normalizeGtin("400-6381-333931")).toBe("04006381333931");
  });
});

describe("Qualitätsprüfung", () => {
  it("vollständiger Artikel ist veröffentlichbar", () => {
    expect(isPublishable(checkQuality(good))).toBe(true);
  });
  it("fehlende Bilder und Herstellerangaben blockieren", () => {
    const issues = checkQuality({ ...good, images: [], manufacturer: undefined });
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["no_images", "no_manufacturer"]));
    expect(isPublishable(issues)).toBe(false);
  });
  it("gesperrte Marken und ungültige EAN blockieren", () => {
    expect(isPublishable(checkQuality({ ...good, brand: "Sperr" }, { blockedBrands: ["sperr"] }))).toBe(false);
    expect(isPublishable(checkQuality({ ...good, gtin: "123" }))).toBe(false);
  });
});

describe("Duplikate", () => {
  const existing = [
    { id: 1, gtin: "4006381333931", title: "Vibrator Welle Lila" },
    { id: 2, brand: "Demo", mpn: "AB-12", title: "Massageöl Mandel 100 ml" },
    { id: 3, brand: "Demo", title: "Gleitgel Wasserbasis 100 ml" },
  ];
  it("erkennt über GTIN, auch anders formatiert", () => {
    expect(findMatch({ id: "n", gtin: "04006381333931", title: "anders" }, existing)).toEqual({
      kind: "exact",
      by: "gtin",
      matchId: 1,
    });
  });
  it("erkennt über Marke und Herstellernummer", () => {
    expect(findMatch({ id: "n", brand: "DEMO", mpn: "ab-12", title: "x" }, existing)).toMatchObject({ by: "brand_mpn" });
  });
  it("ähnliche Titel werden nur als Verdacht gemeldet", () => {
    const r = findMatch({ id: "n", brand: "Demo", title: "Gleitgel auf Wasserbasis 100ml" }, existing);
    expect(r.kind).toBe("similar");
  });
  it("Ähnlichkeit ist symmetrisch und 1 bei gleichen Titeln", () => {
    expect(titleSimilarity("Ab", "ab")).toBe(1);
    expect(titleSimilarity("abc def", "xyz")).toBeLessThan(0.2);
  });
});
