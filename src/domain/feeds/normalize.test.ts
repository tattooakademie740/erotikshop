import { describe, expect, it } from "vitest";
import { parseFeed, parseMoney } from "./normalize";
import { parseCsv } from "./csv";

describe("CSV", () => {
  it("versteht Anführungszeichen und Zeilenumbrüche", () => {
    const rows = parseCsv('a;b\n"x;1";"Zeile\nzwei"\n', ";");
    expect(rows).toEqual([["a", "b"], ["x;1", "Zeile\nzwei"]]);
  });
});

describe("parseMoney", () => {
  it("liest deutsche und englische Formate", () => {
    expect(parseMoney("1.234,56", true)).toBe(123456);
    expect(parseMoney("12.90")).toBe(1290);
    expect(parseMoney("abc")).toBeUndefined();
  });
});

describe("parseFeed", () => {
  it("CSV und XML landen im selben Modell", () => {
    const csv = "sku;name;ek;bestand;bilder\nA1;Testartikel;9,90;5;https://x/1.jpg|https://x/2.jpg\n";
    const xml = `<feed><items><item><id>A1</id><name>Testartikel</name><price>9.90</price><qty>5</qty><img>https://x/1.jpg</img><img>https://x/2.jpg</img></item></items></feed>`;

    const a = parseFeed(csv, {
      format: "csv",
      delimiter: ";",
      decimalComma: true,
      mapping: { supplierSku: "sku", title: "name", cost: "ek", stock: "bestand", images: "bilder" },
    });
    const b = parseFeed(xml, {
      format: "xml",
      itemPath: "feed.items.item",
      mapping: { supplierSku: "id", title: "name", cost: "price", stock: "qty", images: "img" },
    });
    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
    expect(a.offers[0]).toEqual(b.offers[0]);
    expect(a.offers[0].costCents).toBe(990);
  });

  it("meldet fehlerhafte Zeilen, statt sie still zu verwerfen", () => {
    const r = parseFeed("sku;name;ek\nA;;1\nB;Ok;\n", {
      format: "csv",
      delimiter: ";",
      mapping: { supplierSku: "sku", title: "name", cost: "ek" },
    });
    expect(r.offers).toHaveLength(0);
    expect(r.errors).toHaveLength(2);
  });
});
