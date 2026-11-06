/**
 * Agent "Lia": Kundenservice im Shop-Chat.
 * Darf: Produkte suchen, Bestellungen nach Prüfung (Bestellnummer + E-Mail) zeigen,
 * Retouren starten, Shop-Infos geben, an Menschen übergeben.
 * Darf nicht: Daten ohne Nachweis zeigen, Preise ändern, Erstattungen auslösen, etwas versprechen.
 */
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { SHOP } from "@/config/shop";
import { formatEuro } from "@/domain/money";
import { STAGE_LABEL, type ReturnStage } from "@/domain/returns";
import { searchProducts } from "@/lib/search";
import { requestReturn, ReturnError } from "../returns";
import { runAgent, tool, type AgentTool } from "./core";

const INFO: Record<string, string> = {
  versand: `Versand innerhalb Deutschlands ${formatEuro(SHOP.shippingCents)}, ab ${formatEuro(SHOP.freeShippingFromCents)} kostenlos. Lieferzeit steht bei jedem Artikel. Bestellungen mit Artikeln verschiedener Lager kommen in mehreren Paketen.`,
  diskretion: "Pakete werden neutral verpackt, ohne Hinweis auf den Inhalt. Mails nennen keine Produktnamen im Betreff.",
  retoure: "Widerruf innerhalb von 14 Tagen nach Zustellung. Versiegelte Hygieneartikel nur mit unbeschädigter Versiegelung. Defekte oder falsch gelieferte Ware nehmen wir immer zurück. Retouren starten über den Chat oder unter /retoure.",
  zahlung: "Die Zahlungsarten werden gerade eingerichtet.",
  datenschutz: "Bestelldaten nutzen wir nur zur Abwicklung. Details stehen in der Datenschutzerklärung.",
};

async function verifiedOrder(orderNumber: number, email: string) {
  const [o] = await db.select().from(s.orders).where(eq(s.orders.number, orderNumber));
  if (!o || o.email.toLowerCase() !== email.trim().toLowerCase()) throw new Error("Keine Bestellung zu dieser Nummer und E-Mail gefunden.");
  return o;
}

const OrderAuth = { order_number: z.number().int().positive(), email: z.string().email().max(200) };
const orderAuthSchema = {
  order_number: { type: "integer", description: "Bestellnummer" },
  email: { type: "string", description: "E-Mail-Adresse der Bestellung" },
} as const;

export const SUPPORT_TOOLS: AgentTool[] = [
  tool({
    name: "produkte_suchen",
    description: "Sucht Artikel im Shop. Versteht Preisgrenzen wie 'unter 30 Euro'. Gibt Titel, Preis, Verfügbarkeit und Link zurück.",
    input: z.object({ suchbegriff: z.string().min(1).max(200) }),
    schema: { type: "object", properties: { suchbegriff: { type: "string" } }, required: ["suchbegriff"], additionalProperties: false },
    run: async ({ suchbegriff }) => {
      const { items } = await searchProducts(suchbegriff, 6);
      return items.map((p) => ({ titel: p.title, preis: formatEuro(p.priceCents), verfuegbar: p.inStock, kurz: p.shortDescription, link: `/produkt/${p.slug}`, demo: p.isDemo }));
    },
  }),
  tool({
    name: "bestellung_abfragen",
    description: "Zeigt Status, Artikel, Sendungen und Retouren einer Bestellung. Nur mit Bestellnummer UND E-Mail-Adresse der Bestellung.",
    input: z.object(OrderAuth),
    schema: { type: "object", properties: orderAuthSchema, required: ["order_number", "email"], additionalProperties: false },
    run: async ({ order_number, email }) => {
      const o = await verifiedOrder(order_number, email);
      const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, o.id)).orderBy(s.orderItems.id);
      const fs = await db.select().from(s.fulfillments).where(eq(s.fulfillments.orderId, o.id));
      const ships = fs.length ? await db.select().from(s.shipments).where(inArray(s.shipments.fulfillmentId, fs.map((f) => f.id))) : [];
      const rets = await db.select().from(s.returns).where(eq(s.returns.orderId, o.id));
      return {
        bestellnummer: o.number,
        status: o.status,
        summe: formatEuro(o.totalCents),
        artikel: items.map((i, idx) => ({ position: idx + 1, titel: i.titleSnapshot, menge: i.quantity })),
        sendungen: ships.map((sh) => ({ versanddienst: sh.carrier, sendungsnummer: sh.trackingNumber, zugestellt: !!sh.deliveredAt })),
        retouren: rets.map((r) => ({ nummer: r.reference, stand: STAGE_LABEL[r.stage as ReturnStage] ?? r.stage })),
      };
    },
  }),
  tool({
    name: "retoure_starten",
    description: "Meldet eine Retoure an. Vorher mit bestellung_abfragen die Positionen ermitteln und mit der Kundin bzw. dem Kunden bestätigen, welche Artikel und warum.",
    input: z.object({
      ...OrderAuth,
      positionen: z.array(z.object({ position: z.number().int().positive(), menge: z.number().int().positive() })).min(1).max(20),
      grund: z.enum(["widerruf", "defekt", "falsch_geliefert", "beschaedigt"]),
      versiegelung_intakt: z.boolean().nullable(),
    }),
    schema: {
      type: "object",
      properties: {
        ...orderAuthSchema,
        positionen: { type: "array", items: { type: "object", properties: { position: { type: "integer" }, menge: { type: "integer" } }, required: ["position", "menge"], additionalProperties: false } },
        grund: { type: "string", enum: ["widerruf", "defekt", "falsch_geliefert", "beschaedigt"] },
        versiegelung_intakt: { anyOf: [{ type: "boolean" }, { type: "null" }], description: "Nur bei Hygieneartikeln: ist die Versiegelung unbeschädigt? Sonst null." },
      },
      required: ["order_number", "email", "positionen", "grund", "versiegelung_intakt"],
      additionalProperties: false,
    },
    run: async ({ order_number, email, positionen, grund, versiegelung_intakt }) => {
      const o = await verifiedOrder(order_number, email);
      const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, o.id)).orderBy(s.orderItems.id);
      const mapped = positionen.map((p) => {
        const it = items[p.position - 1];
        if (!it) throw new Error(`Position ${p.position} gibt es nicht.`);
        return { orderItemId: it.id, quantity: Math.min(p.menge, it.quantity) };
      });
      try {
        const res = await requestReturn(db, { orderNumber: order_number, email, items: mapped, reason: grund, sealIntact: versiegelung_intakt ?? undefined, source: "agent:lia" });
        return res.map((r) => ({ retourennummer: r.reference, entscheidung: r.decision, hinweis: r.message }));
      } catch (e) {
        if (e instanceof ReturnError) return { fehler: e.message };
        throw e;
      }
    },
  }),
  tool({
    name: "shop_info",
    description: "Liefert verbindliche Shop-Informationen zu einem Thema.",
    input: z.object({ thema: z.enum(["versand", "diskretion", "retoure", "zahlung", "datenschutz"]) }),
    schema: { type: "object", properties: { thema: { type: "string", enum: ["versand", "diskretion", "retoure", "zahlung", "datenschutz"] } }, required: ["thema"], additionalProperties: false },
    run: async ({ thema }) => ({ info: INFO[thema] }),
  }),
  tool({
    name: "an_mensch_uebergeben",
    description: "Erstellt ein Ticket für das Team, wenn du nicht weiterhelfen kannst, die Person es wünscht oder es um Beschwerden, Zahlungen, Rechtliches oder Gesundheit geht.",
    input: z.object({ email: z.string().email().max(200), order_number: z.number().int().positive().nullable(), thema: z.string().min(2).max(80), zusammenfassung: z.string().min(10).max(1500) }),
    schema: {
      type: "object",
      properties: { email: { type: "string" }, order_number: { anyOf: [{ type: "integer" }, { type: "null" }] }, thema: { type: "string" }, zusammenfassung: { type: "string" } },
      required: ["email", "order_number", "thema", "zusammenfassung"],
      additionalProperties: false,
    },
    run: async ({ email, order_number, thema, zusammenfassung }) => {
      const [t] = await db.insert(s.supportTickets).values({ email, orderNumber: order_number, topic: thema, summary: zusammenfassung, source: "agent:lia" }).returning({ id: s.supportTickets.id });
      await db.insert(s.notifications).values({ level: "info", kind: "support_ticket", message: `Neues Ticket #${t.id}: ${thema}`, data: { ticketId: t.id } });
      return { ticket: t.id, antwort_per_mail: "innerhalb von zwei Werktagen" };
    },
  })
];

const SYSTEM = `Du bist Lia, die Kundenberaterin von ${SHOP.name}, einem Onlineshop für Erotikspielzeug, Dessous und Pflege für Erwachsene.

Ton: warm, diskret, unverkrampft, auf Deutsch, per du. Kurze Antworten, die auf ein Handy passen. Keine Gedankenstriche.

So arbeitest du:
- Produktfragen: suche mit produkte_suchen und empfiehl nur Artikel aus den Ergebnissen, mit Link. Erfinde keine Eigenschaften, Materialien, Maße oder Wirkungen.
- Bestellungen: nur mit Bestellnummer und E-Mail-Adresse über bestellung_abfragen. Ohne beides gibst du keine Bestelldaten heraus.
- Retouren: erst Bestellung abfragen, Artikel und Grund mit der Person klären, bei Hygieneartikeln nach der Versiegelung fragen, dann retoure_starten. Gib das Ergebnis wörtlich weiter.
- Regeln zu Versand, Retoure, Diskretion, Zahlung: nur aus shop_info.
- Übergib an das Team (an_mensch_uebergeben) bei Beschwerden, Zahlungsfragen, rechtlichen Fragen, wenn etwas nicht klappt oder die Person es möchte. Frag vorher nach der E-Mail-Adresse.
- Gesundheit: allgemeine Hinweise zu Pflege und Material sind ok; bei Schmerzen, Allergien oder medizinischen Fragen empfiehlst du ärztlichen Rat.
- Keine expliziten sexuellen Beschreibungen. Der Shop richtet sich an Erwachsene; wirkt jemand minderjährig, beendest du die Beratung freundlich.
- Versprich nichts, was die Werkzeuge nicht bestätigen (keine Rabatte, Liefertermine, Kulanz).
${SHOP.demoMode ? "- Der Shop ist im Demo-Modus: Artikel sind Testdaten, echte Bestellungen sind noch nicht möglich. Erwähne das, wenn jemand kaufen möchte." : ""}`;

export type ChatTurn = { role: "user" | "assistant"; text: string };

export async function supportChat(history: ChatTurn[]) {
  return runAgent({
    agent: "lia-kundenservice",
    system: SYSTEM,
    tools: SUPPORT_TOOLS,
    effort: "low",
    maxTurns: 8,
    messages: history.map((t) => ({ role: t.role, content: t.text })),
  });
}

