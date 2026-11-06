/**
 * DEMO: spielt eine komplette Bestellung durch, ohne echte Zahlung und ohne echten Versand.
 * 1. Bestellung mit Artikeln von zwei DEMO-Lieferanten
 * 2. Zahlung bestätigt (simuliert)
 * 3. Worker teilt auf und übermittelt (Nord per E-Mail, Süd per Portal-Aufgabe)
 * 4. Sendungsnummer kommt rein → Kundenmail
 */
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../src/db";
import * as s from "../src/db/schema";
import { runOnce } from "../src/server/jobs/worker";
import { createOrder, markPaid, recordShipment } from "../src/server/orders";

const quiet = { info: () => {}, warn: console.warn } as unknown as Console;
async function drain() {
  for (let i = 0; i < 20; i++) if ((await runOnce(db, quiet)) === 0) break;
}

async function main() {
  // je ein Artikel, dessen bester Lieferant Nord bzw. Süd ist
  const picks = await db
    .select({ variantId: s.variants.id, supplier: s.suppliers.slug, title: s.products.title })
    .from(s.variants)
    .innerJoin(s.products, eq(s.products.id, s.variants.productId))
    .innerJoin(s.supplierProducts, eq(s.supplierProducts.id, s.variants.preferredSupplierProductId))
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.supplierProducts.supplierId))
    .where(eq(s.products.status, "active"));
  const nord = picks.filter((p) => p.supplier === "demo-nord").slice(0, 2);
  const sued = picks.filter((p) => p.supplier === "demo-sued").slice(0, 1);
  const lines = [...nord, ...sued].map((p) => ({ variantId: p.variantId, qty: 1 }));

  const order = await createOrder(db, {
    email: "kunde@demo.invalid",
    lines,
    shipping: { firstName: "Demo", lastName: "Kundin", street: "Testweg 1", zip: "12345", city: "Demostadt", country: "DE" },
  });
  console.log(`1. Bestellung ${order.number} angelegt, ${lines.length} Artikel, Summe ${(order.totalCents / 100).toFixed(2)} €`);

  await markPaid(db, order.id, { provider: "demo", providerRef: `demo-${order.number}`, amountCents: order.totalCents });
  console.log("2. Zahlung bestätigt (DEMO)");
  await drain();

  const fs = await db
    .select({ id: s.fulfillments.id, status: s.fulfillments.status, ref: s.fulfillments.externalRef, supplier: s.suppliers.name, err: s.fulfillments.lastError })
    .from(s.fulfillments)
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.fulfillments.supplierId))
    .where(eq(s.fulfillments.orderId, order.id));
  console.log("3. Aufgeteilt in Lieferaufträge:");
  for (const f of fs) console.log(`   - ${f.supplier}: ${f.status}${f.ref ? ` (Ref ${f.ref})` : ""}${f.err ? `, Hinweis: ${f.err}` : ""}`);

  const submitted = fs.find((f) => f.status === "submitted");
  if (submitted) {
    await recordShipment(db, { externalRef: submitted.ref!, carrier: "DHL", trackingNumber: "DEMO00001234", trackingUrl: "https://example.invalid/track/DEMO00001234" });
    await drain();
    const [o] = await db.select({ status: s.orders.status }).from(s.orders).where(eq(s.orders.id, order.id));
    console.log(`4. Sendungsnummer eingetragen, Bestellstatus jetzt: ${o.status}`);
  }

  const mails = await db
    .select({ kind: s.outboundEmails.kind, to: s.outboundEmails.to, subject: s.outboundEmails.subject, status: s.outboundEmails.status })
    .from(s.outboundEmails)
    .where(inArray(s.outboundEmails.relatedId, [order.id, ...fs.map((f) => String(f.id))]));
  console.log("5. E-Mails (ohne SMTP nur protokolliert):");
  for (const m of mails) console.log(`   - [${m.status}] ${m.kind} an ${m.to}: ${m.subject}`);

  const notes = await db.select({ level: s.notifications.level, message: s.notifications.message }).from(s.notifications).orderBy(desc(s.notifications.id)).limit(3);
  console.log("6. Neueste Admin-Benachrichtigungen:");
  for (const n of notes) console.log(`   - [${n.level}] ${n.message}`);

  const [supplierMail] = await db.select().from(s.outboundEmails).where(eq(s.outboundEmails.kind, "supplier_order")).orderBy(desc(s.outboundEmails.id)).limit(1);
  if (supplierMail) console.log(`\n--- Bestellmail an Lieferant ---\nAn: ${supplierMail.to}\nBetreff: ${supplierMail.subject}\n\n${supplierMail.text}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
