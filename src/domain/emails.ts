/**
 * Mail-Texte. Diskret: Kundenmails nennen keine Produktnamen im Betreff.
 */
import { formatEuro } from "./money";

export type MailAddress = {
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  zip: string;
  city: string;
  country: string;
};

export type SupplierOrderLine = { supplierSku: string; title: string; quantity: number; gtin?: string | null };

export function supplierOrderEmail(p: {
  shopName: string;
  customerNumber?: string;
  orderNumber: number;
  fulfillmentId: number;
  lines: SupplierOrderLine[];
  address: MailAddress;
}) {
  const ref = `${p.shopName.toUpperCase()}-${p.orderNumber}-${p.fulfillmentId}`;
  const a = p.address;
  const text = [
    "Guten Tag,",
    "",
    `bitte liefern Sie folgende Dropshipping-Bestellung direkt an unseren Kunden.`,
    `Unsere Referenz: ${ref}`,
    p.customerNumber ? `Unsere Kundennummer: ${p.customerNumber}` : null,
    "",
    "ARTIKEL",
    ...p.lines.map((l) => `- ${l.quantity} x ${l.supplierSku}  ${l.title}${l.gtin ? `  (EAN ${l.gtin.replace(/^0+/, "")})` : ""}`),
    "",
    "LIEFERADRESSE",
    `${a.firstName} ${a.lastName}`,
    a.company ?? null,
    a.street,
    `${a.zip} ${a.city}`,
    a.country,
    "",
    "WICHTIG",
    "- Neutraler Versand: keine Rechnung, kein Lieferschein mit Preisen, kein Hinweis auf den Inhalt außen.",
    `- Bitte senden Sie die Sendungsnummer an diese Adresse und nennen Sie die Referenz ${ref}.`,
    "",
    "Vielen Dank",
    p.shopName,
  ]
    .filter((x) => x !== null)
    .join("\n");
  return { subject: `Bestellung ${ref}`, text, ref };
}

export function customerShippedEmail(p: {
  shopName: string;
  firstName: string;
  orderNumber: number;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  partial: boolean;
}) {
  const text = [
    `Hallo ${p.firstName},`,
    "",
    p.partial
      ? `ein Teil deiner Bestellung ${p.orderNumber} ist unterwegs. Der Rest folgt in einem eigenen Paket.`
      : `deine Bestellung ${p.orderNumber} ist unterwegs.`,
    "",
    p.carrier ? `Versanddienst: ${p.carrier}` : null,
    p.trackingNumber ? `Sendungsnummer: ${p.trackingNumber}` : null,
    p.trackingUrl ? `Sendung verfolgen: ${p.trackingUrl}` : null,
    "",
    "Das Paket ist neutral verpackt.",
    "",
    `Liebe Grüße`,
    p.shopName,
  ]
    .filter((x) => x !== null)
    .join("\n");
  // Neutraler Betreff ohne Produktnamen
  return { subject: `Deine Bestellung ${p.orderNumber} ist unterwegs`, text };
}

export function customerOrderReceivedEmail(p: { shopName: string; firstName: string; orderNumber: number; totalCents: number }) {
  return {
    subject: `Danke für deine Bestellung ${p.orderNumber}`,
    text: [
      `Hallo ${p.firstName},`,
      "",
      `danke für deine Bestellung ${p.orderNumber} über ${formatEuro(p.totalCents)}.`,
      "Wir melden uns, sobald sie unterwegs ist.",
      "",
      "Liebe Grüße",
      p.shopName,
    ].join("\n"),
  };
}
