import { describe, expect, it } from "vitest";
import { customerShippedEmail, supplierOrderEmail } from "./emails";

const address = { firstName: "Max", lastName: "Muster", street: "Weg 1", zip: "12345", city: "Stadt", country: "DE" };

describe("Lieferanten-Bestellmail", () => {
  it("enthält Referenz, Artikel, Adresse und Hinweis auf neutralen Versand", () => {
    const m = supplierOrderEmail({
      shopName: "Lustviora",
      orderNumber: 1001,
      fulfillmentId: 7,
      lines: [{ supplierSku: "N-1001", title: "Testartikel", quantity: 2, gtin: "02000000000015" }],
      address,
    });
    expect(m.ref).toBe("LUSTVIORA-1001-7");
    expect(m.text).toContain("2 x N-1001");
    expect(m.text).toContain("EAN 2000000000015");
    expect(m.text).toContain("12345 Stadt");
    expect(m.text).toMatch(/Neutraler Versand/);
  });
});

describe("Versandmail an Kunden", () => {
  it("nennt keinen Produktnamen im Betreff", () => {
    const m = customerShippedEmail({ shopName: "Lustviora", firstName: "Max", orderNumber: 1001, trackingNumber: "ABC", partial: false });
    expect(m.subject).toBe("Deine Bestellung 1001 ist unterwegs");
    expect(m.text).toContain("ABC");
  });
  it("erklärt Teillieferungen", () => {
    const m = customerShippedEmail({ shopName: "Lustviora", firstName: "Max", orderNumber: 1, partial: true });
    expect(m.text).toMatch(/Teil deiner Bestellung/);
  });
});
