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

export function supplierReturnRequestEmail(p: {
  shopName: string;
  returnRef: string;
  orderRef: string | null;
  reason: string;
  lines: SupplierOrderLine[];
  customerName: string;
}) {
  const text = [
    "Guten Tag,",
    "",
    `unsere Kundin bzw. unser Kunde möchte Ware aus einer Dropshipping-Lieferung zurückgeben.`,
    `Retourennummer: ${p.returnRef}`,
    p.orderRef ? `Ursprüngliche Bestellung: ${p.orderRef}` : null,
    `Grund: ${p.reason}`,
    "",
    "ARTIKEL",
    ...p.lines.map((l) => `- ${l.quantity} x ${l.supplierSku}  ${l.title}`),
    "",
    `Absender der Rücksendung: ${p.customerName}`,
    "",
    "Bitte antworten Sie mit:",
    "1. Ihrer Rücksendenummer (RMA), falls Sie eine vergeben",
    "2. der Rücksendeadresse oder einem Rücksendeetikett",
    `3. einer kurzen Bestätigung, sobald die Ware bei Ihnen eingetroffen ist, jeweils mit der Nummer ${p.returnRef}`,
    "",
    "Vielen Dank",
    p.shopName,
  ]
    .filter((x) => x !== null)
    .join("\n");
  return { subject: `Retoure ${p.returnRef}`, text };
}

export function customerReturnEmail(p: {
  shopName: string;
  firstName: string;
  returnRef: string;
  kind: "received" | "approved" | "rejected" | "instructions" | "refunded" | "manual";
  message?: string;
  returnAddress?: string | null;
  supplierRma?: string | null;
  refundCents?: number | null;
}) {
  const lines: (string | null)[] = [`Hallo ${p.firstName},`, ""];
  switch (p.kind) {
    case "received":
      lines.push(`wir haben deine Retoure ${p.returnRef} erhalten und prüfen sie gerade.`);
      break;
    case "approved":
      lines.push(`deine Retoure ${p.returnRef} ist genehmigt. Die Rücksendeadresse schicken wir dir in einer eigenen Mail, sobald sie vorliegt.`);
      break;
    case "rejected":
      lines.push(`deine Retoure ${p.returnRef} können wir leider nicht annehmen.`, p.message ?? null, "", "Wenn du Fragen hast, antworte einfach auf diese Mail.");
      break;
    case "manual":
      lines.push(`deine Retoure ${p.returnRef} schauen wir uns persönlich an und melden uns innerhalb von zwei Werktagen.`);
      break;
    case "instructions":
      lines.push(
        `so schickst du die Ware zurück (Retoure ${p.returnRef}):`,
        "",
        p.returnAddress ? `Adresse:\n${p.returnAddress}` : null,
        p.supplierRma ? `Bitte gut sichtbar auf das Paket schreiben: ${p.supplierRma} / ${p.returnRef}` : `Bitte gut sichtbar auf das Paket schreiben: ${p.returnRef}`,
        "",
        "Bewahre den Einlieferungsbeleg auf, bis die Erstattung da ist.",
      );
      break;
    case "refunded":
      lines.push(`die Erstattung für deine Retoure ${p.returnRef}${p.refundCents ? ` über ${formatEuro(p.refundCents)}` : ""} ist veranlasst. Je nach Zahlungsart dauert die Gutschrift einige Tage.`);
      break;
  }
  lines.push("", "Liebe Grüße", p.shopName);
  const subjects: Record<typeof p.kind, string> = {
    received: `Retoure ${p.returnRef} eingegangen`,
    approved: `Retoure ${p.returnRef} genehmigt`,
    rejected: `Zu deiner Retoure ${p.returnRef}`,
    manual: `Zu deiner Retoure ${p.returnRef}`,
    instructions: `Rücksendedaten zu ${p.returnRef}`,
    refunded: `Erstattung zu ${p.returnRef}`,
  };
  return { subject: subjects[p.kind], text: lines.filter((x) => x !== null).join("\n") };
}
