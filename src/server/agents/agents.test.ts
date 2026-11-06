import { describe, expect, it } from "vitest";
import { acceptAttributes } from "./product-data";
import { planActions, type SupplierMailParsed } from "./supplier-mail";

const base: SupplierMailParsed = {
  kind: "tracking",
  reference: "LUSTVIORA-12-7",
  tracking_number: "00340434161094042557",
  carrier: "DHL",
  supplier_order_number: null,
  return_address: null,
  rma_number: null,
  problem: null,
  confident: true,
};
const mailText = "Ihre Bestellung LUSTVIORA-12-7 wurde versendet. DHL Sendungsnummer 00340434161094042557";
const ctx = {
  senderDomain: "lieferant.example",
  supplier: { id: 3, domain: "lieferant.example" },
  fulfillment: { id: 7, supplierId: 3 },
  ret: null,
  mailText,
};

describe("Lieferanten-Postfach: Entscheidungen", () => {
  it("übernimmt Sendungsnummer vom richtigen Lieferanten", () => {
    expect(planActions(base, ctx)).toEqual([{ type: "shipment", fulfillmentId: 7, trackingNumber: "00340434161094042557", carrier: "DHL" }]);
  });
  it("fremde Absender-Domain geht an Menschen", () => {
    expect(planActions(base, { ...ctx, senderDomain: "boese.example" })[0].type).toBe("manual");
  });
  it("Auftrag eines anderen Lieferanten wird nicht angefasst", () => {
    expect(planActions(base, { ...ctx, fulfillment: { id: 7, supplierId: 99 } })[0].type).toBe("manual");
  });
  it("erfundene Sendungsnummer (nicht im Text) wird abgelehnt", () => {
    expect(planActions({ ...base, tracking_number: "XYZ999999" }, ctx)[0].type).toBe("manual");
  });
  it("unsichere Auswertung geht an Menschen", () => {
    expect(planActions({ ...base, confident: false }, ctx)[0].type).toBe("manual");
  });
  it("Rücksendeadresse für eigene Retoure wird übernommen", () => {
    const text = "Retoure RETOURE-5 genehmigt, RMA 4711. Bitte senden an: Lager Süd, Industriestr. 5, 12345 Demostadt";
    const a = planActions(
      { ...base, kind: "return_instructions", reference: "RETOURE-5", tracking_number: null, carrier: null, rma_number: "4711", return_address: "Lager Süd, Industriestr. 5, 12345 Demostadt" },
      { ...ctx, fulfillment: null, ret: { id: 5, supplierId: 3 }, mailText: text },
    );
    expect(a[0]).toMatchObject({ type: "return_instructions", returnId: 5, rma: "4711" });
  });
});

describe("Produktdaten: nur belegte Werte", () => {
  const source = "Auflegevibrator aus medizinischem Silikon, wasserdicht nach IPX7, Akku per USB";
  const opts = { allowedKeys: ["material", "wasserdicht", "antrieb"], source, existing: {} };
  it("akzeptiert belegte Werte", () => {
    const r = acceptAttributes([{ key: "material", value: "Silikon", quote: "aus medizinischem Silikon" }], opts);
    expect(r.accepted).toEqual({ material: "Silikon" });
  });
  it("lehnt erfundene Zitate, fremde Felder und Sicherheitsangaben ab", () => {
    const r = acceptAttributes(
      [
        { key: "material", value: "Glas", quote: "aus Glas" },
        { key: "laenge_cm", value: "18", quote: "Auflegevibrator" },
        { key: "inhaltsstoffe", value: "Silikon", quote: "Silikon" },
        { key: "antrieb", value: "Batterie", quote: "Akku per USB" },
      ],
      opts,
    );
    expect(r.accepted).toEqual({});
    expect(r.rejected.map((x) => x.why)).toEqual(["Zitat nicht im Text", "kein Filter dieser Kategorie", "verbotenes Feld", "Wert nicht im Zitat"]);
  });
  it("überschreibt keine bestehenden Werte", () => {
    const r = acceptAttributes([{ key: "material", value: "Silikon", quote: "Silikon" }], { ...opts, existing: { material: "TPE" } });
    expect(r.accepted).toEqual({});
  });
});
