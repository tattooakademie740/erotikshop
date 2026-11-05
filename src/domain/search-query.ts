/**
 * Zerlegt Suchanfragen in Text und Filter.
 * Beispiele: "vibrator unter 30 euro", "gleitgel bis 10€", "dessous ab 20 eur"
 */
export type ParsedQuery = { terms: string[]; minCents?: number; maxCents?: number };

const STOP = new Set(["fuer", "für", "mit", "und", "oder", "der", "die", "das", "ein", "eine", "auf", "von", "zum", "zur"]);

export function parseSearchQuery(raw: string): ParsedQuery {
  let q = raw.toLowerCase().slice(0, 200);
  const out: ParsedQuery = { terms: [] };

  const money = String.raw`(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)?`;
  const max = q.match(new RegExp(String.raw`(?:unter|bis|max(?:imal)?|<)\s*${money}`));
  if (max) {
    out.maxCents = Math.round(parseFloat(max[1].replace(",", ".")) * 100);
    q = q.replace(max[0], " ");
  }
  const min = q.match(new RegExp(String.raw`(?:ab|über|ueber|mindestens|>)\s*${money}`));
  if (min) {
    out.minCents = Math.round(parseFloat(min[1].replace(",", ".")) * 100);
    q = q.replace(min[0], " ");
  }

  out.terms = q
    .replace(/[^a-z0-9äöüß\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .slice(0, 8);
  return out;
}

/** Baut eine Postgres-tsquery: Begriffe UND-verknüpft, Synonyme ODER-verknüpft, Präfixsuche. */
export function buildTsQuery(terms: string[], synonyms: Record<string, string[]>): string | null {
  const clean = (t: string) => t.replace(/[^a-z0-9äöüß]/g, "");
  const groups = terms
    .map((t) => {
      const alts = [t, ...(synonyms[t] ?? [])].map(clean).filter(Boolean);
      return alts.length ? `(${[...new Set(alts)].map((a) => `${a}:*`).join(" | ")})` : null;
    })
    .filter(Boolean);
  return groups.length ? groups.join(" & ") : null;
}
