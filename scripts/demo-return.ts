/**
 * DEMO: kompletter Retourenablauf mit einem TEST-Modell (fest vorgegebene Antworten, keine echte KI).
 * Prüft Regeln, Lieferanten-Anfrage, Mail-Auswertung mit Sicherheitsprüfungen, Kundenmails, Erstattungsaufgabe
 * und einen Chat-Lauf von Lia mit Werkzeugaufruf.
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "../src/db";
import * as s from "../src/db/schema";
import { setAgentClient } from "../src/server/agents/core";
import { runOnce } from "../src/server/jobs/worker";
import { createOrder, markPaid, recordDelivered, recordShipment } from "../src/server/orders";
import { requestReturn } from "../src/server/returns";
import { enqueue } from "../src/server/jobs/queue";

const quiet = { info: () => {}, warn: console.warn } as unknown as Console;
const drain = async () => { for (let i = 0; i < 30; i++) if ((await runOnce(db, quiet)) === 0) break; };

// TEST-Modell: antwortet je nach Agent mit festen Daten
let script: unknown[] = [];
const usage = { input_tokens: 10, output_tokens: 5 };
setAgentClient({
  create: (async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "" }], usage, ...(script.shift() as object) })) as never,
  parse: (async () => ({ stop_reason: "end_turn", usage, parsed_output: script.shift() })) as never,
});
process.env.ANTHROPIC_API_KEY = "test-nicht-echt";

async function main() {
  // Lieferant Nord bekommt eine echte Domain für die Absenderprüfung
  await db.update(s.suppliers).set({ orderEmail: "bestellung@demo-nord.example" }).where(eq(s.suppliers.slug, "demo-nord"));
  const [v] = await db
    .select({ id: s.variants.id })
    .from(s.variants)
    .innerJoin(s.supplierProducts, eq(s.supplierProducts.id, s.variants.preferredSupplierProductId))
    .innerJoin(s.suppliers, eq(s.suppliers.id, s.supplierProducts.supplierId))
    .innerJoin(s.products, eq(s.products.id, s.variants.productId))
    .where(eq(s.suppliers.slug, "demo-nord"))
    .limit(1);
  const order = await createOrder(db, { email: "retoure@demo.invalid", lines: [{ variantId: v.id, qty: 1 }], shipping: { firstName: "Rita", lastName: "Retour", street: "Weg 2", zip: "12345", city: "Demostadt", country: "DE" } });
  await markPaid(db, order.id, { provider: "demo", providerRef: "x", amountCents: order.totalCents });
  await drain();
  const [f] = await db.select().from(s.fulfillments).where(eq(s.fulfillments.orderId, order.id));
  await recordShipment(db, { fulfillmentId: f.id, trackingNumber: "DEMO55556666" });
  await recordDelivered(db, f.id);
  await drain();
  console.log(`1. Bestellung ${order.number} zugestellt`);

  // falsche E-Mail
  const wrong = await requestReturn(db, { orderNumber: order.number, email: "fremd@demo.invalid", items: [], reason: "widerruf", source: "test" }).catch((e) => e.message);
  console.log(`2. Retoure mit falscher E-Mail: "${wrong}"`);

  const [item] = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, order.id));
  const [ret] = await requestReturn(db, { orderNumber: order.number, email: "retoure@demo.invalid", items: [{ orderItemId: item.id, quantity: 1 }], reason: "widerruf", source: "test" });
  await drain();
  let [r] = await db.select().from(s.returns).where(eq(s.returns.id, ret.id));
  console.log(`3. ${ret.reference}: Regel-Entscheidung "${ret.decision}", Stand jetzt: ${r.stage}`);

  // Antwort vom FALSCHEN Absender: darf nichts auslösen
  script = [{ kind: "return_instructions", reference: ret.reference, tracking_number: null, carrier: null, supplier_order_number: null, return_address: "Fremdlager, Böse Str. 1, 99999 Irgendwo", rma_number: "666", problem: null, confident: true }];
  let [mail] = await db.insert(s.inboundEmails).values({ from: "Betrug <info@boese.example>", subject: `Re: Retoure ${ret.reference}`, text: `Retoure ${ret.reference} RMA 666. Bitte senden an: Fremdlager, Böse Str. 1, 99999 Irgendwo` }).returning();
  await enqueue(db, "inbound.process", { inboundEmailId: mail.id });
  await drain();
  [mail] = await db.select().from(s.inboundEmails).where(eq(s.inboundEmails.id, mail.id));
  [r] = await db.select().from(s.returns).where(eq(s.returns.id, ret.id));
  console.log(`4. Mail von fremder Domain: ${mail.status}, Retoure bleibt ${r.stage}`);

  // Echte Antwort vom Lieferanten
  const text = `Guten Tag, Retoure ${ret.reference} ist freigegeben. RMA 4711. Bitte senden an: DEMO Lager Nord, Hafenstr. 9, 24937 Demostadt`;
  script = [{ kind: "return_instructions", reference: ret.reference, tracking_number: null, carrier: null, supplier_order_number: null, return_address: "DEMO Lager Nord, Hafenstr. 9, 24937 Demostadt", rma_number: "4711", problem: null, confident: true }];
  [mail] = await db.insert(s.inboundEmails).values({ from: "Lager <bestellung@demo-nord.example>", subject: `Re: Retoure ${ret.reference}`, text }).returning();
  await enqueue(db, "inbound.process", { inboundEmailId: mail.id });
  await drain();
  [r] = await db.select().from(s.returns).where(eq(s.returns.id, ret.id));
  console.log(`5. Lieferant antwortet: Stand ${r.stage}, Adresse "${r.returnAddress}", RMA ${r.supplierRma}`);

  // Lieferant bestätigt Eingang
  script = [{ kind: "return_received", reference: ret.reference, tracking_number: null, carrier: null, supplier_order_number: null, return_address: null, rma_number: null, problem: null, confident: true }];
  [mail] = await db.insert(s.inboundEmails).values({ from: "bestellung@demo-nord.example", subject: `Retoure ${ret.reference} eingegangen`, text: `Die Ware zu ${ret.reference} ist eingetroffen und wird gutgeschrieben.` }).returning();
  await enqueue(db, "inbound.process", { inboundEmailId: mail.id });
  await drain();
  [r] = await db.select().from(s.returns).where(eq(s.returns.id, ret.id));
  const [note] = await db.select().from(s.notifications).where(eq(s.notifications.kind, "refund_needs_manual")).orderBy(desc(s.notifications.id)).limit(1);
  console.log(`6. Eingang bestätigt: Stand ${r.stage}. Aufgabe: ${note?.message}`);

  const mails = await db.select({ kind: s.outboundEmails.kind, to: s.outboundEmails.to, subject: s.outboundEmails.subject }).from(s.outboundEmails).where(and(eq(s.outboundEmails.relatedType, "return"), eq(s.outboundEmails.relatedId, String(ret.id))));
  console.log("7. Mails zur Retoure:");
  for (const m of mails) console.log(`   - ${m.kind} an ${m.to}: ${m.subject}`);

  // Lia: Chat mit Werkzeugaufruf (TEST-Modell ruft bestellung_abfragen auf, dann Antwort)
  const { supportChat } = await import("../src/server/agents/support");
  script = [
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "bestellung_abfragen", input: { order_number: order.number, email: "retoure@demo.invalid" } }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Deine Bestellung ist zugestellt, die Retoure läuft." }] },
  ];
  const chat = await supportChat([{ role: "user", text: `Wo ist meine Bestellung ${order.number}? retoure@demo.invalid` }]);
  console.log(`8. Lia: "${chat.text}" | Werkzeuge: ${chat.toolCalls.map((t) => `${t.name}${t.ok ? " ✓" : " ✗"}`).join(", ")}`);

  script = [
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t2", name: "bestellung_abfragen", input: { order_number: order.number, email: "falsch@demo.invalid" } }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Dazu finde ich nichts." }] },
  ];
  const chat2 = await supportChat([{ role: "user", text: "Zeig mir Bestellung mit falscher Mail" }]);
  console.log(`9. Lia mit falscher E-Mail: Werkzeug ${chat2.toolCalls.map((t) => `${t.name}${t.ok ? " ✓" : " ✗ (abgelehnt)"}`).join(", ")}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
