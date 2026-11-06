/**
 * Agent "Produktdaten": ergänzt strukturierte Merkmale (Filter) aus dem Lieferantentext.
 *
 * Schutzregeln (im Code erzwungen, nicht nur im Prompt):
 * - Nur Merkmale, die die Kategorie als Filter kennt.
 * - Jeder Wert braucht ein wörtliches Zitat aus dem Quelltext, und der Wert muss im Zitat stehen.
 * - Sicherheits-, Hersteller- und Inhaltsangaben werden nie von der KI geschrieben.
 * - Bestehende Werte aus dem Feed oder von Menschen werden nicht überschrieben.
 * - Herkunft wird je Merkmal gespeichert: "ai:<modell>".
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { db as Db } from "@/db";
import * as s from "@/db/schema";
import { AGENT_MODEL, runStructured } from "./core";

type DB = typeof Db;

const FORBIDDEN = new Set(["inhaltsstoffe", "sicherheit", "hersteller", "warnhinweise", "ce", "allergene"]);

export const Extraction = z.object({
  attributes: z.array(z.object({ key: z.string(), value: z.string(), quote: z.string().describe("Wörtliches Zitat aus dem Text, das den Wert belegt") })),
});

const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();

/** Reine Prüflogik, testbar. */
export function acceptAttributes(
  proposed: z.infer<typeof Extraction>["attributes"],
  ctx: { allowedKeys: string[]; source: string; existing: Record<string, unknown> },
) {
  const src = norm(ctx.source);
  const accepted: Record<string, string> = {};
  const rejected: { key: string; why: string }[] = [];
  for (const a of proposed) {
    const key = a.key.trim().toLowerCase();
    if (FORBIDDEN.has(key)) rejected.push({ key, why: "verbotenes Feld" });
    else if (!ctx.allowedKeys.includes(key)) rejected.push({ key, why: "kein Filter dieser Kategorie" });
    else if (key in ctx.existing) rejected.push({ key, why: "schon vorhanden" });
    else if (!a.quote || !src.includes(norm(a.quote))) rejected.push({ key, why: "Zitat nicht im Text" });
    else if (!norm(a.quote).includes(norm(a.value))) rejected.push({ key, why: "Wert nicht im Zitat" });
    else accepted[key] = a.value.trim().slice(0, 80);
  }
  return { accepted, rejected };
}

export async function enrichProduct(db: DB, productId: number) {
  const [row] = await db
    .select({ p: s.products, filters: s.categories.filterSchema })
    .from(s.products)
    .leftJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .where(eq(s.products.id, productId));
  if (!row) return { accepted: {}, rejected: [] };
  const allowedKeys = (row.filters ?? []).map((f) => f.key).filter((k) => !FORBIDDEN.has(k));
  const missing = allowedKeys.filter((k) => !(k in row.p.attributes));
  if (missing.length === 0) return { accepted: {}, rejected: [] };

  const source = [row.p.title, row.p.shortDescription, row.p.description].filter(Boolean).join("\n");
  const res = await runStructured({
    agent: "produktdaten",
    system: `Du extrahierst Produktmerkmale für einen Onlineshop aus einem Lieferantentext.
Gesuchte Merkmale (key): ${missing.join(", ")}.
Gib nur Merkmale zurück, die im Text ausdrücklich stehen, mit wörtlichem Zitat als Beleg. Nichts ableiten, nichts schätzen.
Wenn ein Merkmal nicht im Text steht, lass es weg. Werte kurz und so, wie sie im Text stehen.`,
    input: source.slice(0, 15_000),
    schema: Extraction,
    related: { type: "product", id: String(productId) },
  });
  if (!res) return { accepted: {}, rejected: [] };

  const result = acceptAttributes(res.attributes, { allowedKeys: missing, source, existing: row.p.attributes });
  if (Object.keys(result.accepted).length) {
    const sources = Object.fromEntries(Object.keys(result.accepted).map((k) => [k, `ai:${AGENT_MODEL}`]));
    await db
      .update(s.products)
      .set({ attributes: { ...row.p.attributes, ...result.accepted }, attributeSources: { ...row.p.attributeSources, ...sources } })
      .where(eq(s.products.id, productId));
  }
  return result;
}
