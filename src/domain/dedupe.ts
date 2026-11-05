/**
 * Duplikaterkennung über Lieferanten hinweg.
 * Reihenfolge der Sicherheit: GTIN > Marke + Herstellernummer > Titelähnlichkeit.
 * Titelähnlichkeit führt nie zu automatischem Zusammenführen, sondern in die Review Queue.
 */
import { normalizeGtin } from "./gtin";

export type DedupeCandidate = {
  id: number | string;
  gtin?: string | null;
  brand?: string | null;
  mpn?: string | null;
  title: string;
};

export type MatchResult =
  | { kind: "exact"; by: "gtin" | "brand_mpn"; matchId: DedupeCandidate["id"] }
  | { kind: "similar"; score: number; matchId: DedupeCandidate["id"] }
  | { kind: "none" };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function matchKey(c: DedupeCandidate): string | null {
  const g = normalizeGtin(c.gtin);
  if (g) return `gtin:${g}`;
  if (c.brand && c.mpn) return `mpn:${norm(c.brand)}:${norm(c.mpn)}`;
  return null;
}

function trigrams(s: string): Set<string> {
  const t = `  ${norm(s)} `;
  const out = new Set<string>();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
}

/** Jaccard-Ähnlichkeit auf Zeichen-Trigrammen, 0..1. */
export function titleSimilarity(a: string, b: string): number {
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function findMatch(
  item: DedupeCandidate,
  existing: DedupeCandidate[],
  similarityThreshold = 0.65,
): MatchResult {
  const g = normalizeGtin(item.gtin);
  if (g) {
    const hit = existing.find((e) => normalizeGtin(e.gtin) === g);
    if (hit) return { kind: "exact", by: "gtin", matchId: hit.id };
  }
  if (item.brand && item.mpn) {
    const key = matchKey({ ...item, gtin: null });
    const hit = existing.find((e) => e.brand && e.mpn && matchKey({ ...e, gtin: null }) === key);
    if (hit) return { kind: "exact", by: "brand_mpn", matchId: hit.id };
  }
  let best: { score: number; id: DedupeCandidate["id"] } | null = null;
  for (const e of existing) {
    if (item.brand && e.brand && norm(item.brand) !== norm(e.brand)) continue;
    const score = titleSimilarity(item.title, e.title);
    if (!best || score > best.score) best = { score, id: e.id };
  }
  if (best && best.score >= similarityThreshold) {
    return { kind: "similar", score: Math.round(best.score * 100) / 100, matchId: best.id };
  }
  return { kind: "none" };
}
