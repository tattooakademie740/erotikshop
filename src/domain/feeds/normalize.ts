import { XMLParser } from "fast-xml-parser";
import { csvToRecords } from "./csv";
import type { FeedConfig, FieldMapping, NormalizedOffer, ParseResult } from "./types";

type Flat = Record<string, unknown>;

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Flat)[key];
    return undefined;
  }, obj);
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "object") {
    const t = (v as Flat)["#text"];
    return t === undefined ? undefined : String(t).trim() || undefined;
  }
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export function parseMoney(v: string | undefined, decimalComma = false): number | undefined {
  if (!v) return undefined;
  let s = v.replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return undefined;
  if (decimalComma) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : undefined;
}

function parseIntSafe(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

function mapRecord(
  rec: unknown,
  m: FieldMapping,
  opts: { decimalComma?: boolean; imageSeparator?: string },
): NormalizedOffer {
  const get = (key: keyof FieldMapping): string | undefined => {
    const src = m[key];
    return typeof src === "string" ? str(getPath(rec, src)) : undefined;
  };

  const sku = get("supplierSku");
  const title = get("title");
  const cost = parseMoney(get("cost"), opts.decimalComma);
  if (!sku) throw new Error("Lieferanten-SKU fehlt");
  if (!title) throw new Error(`Titel fehlt (SKU ${sku})`);
  if (cost === undefined) throw new Error(`Einkaufspreis fehlt oder ungültig (SKU ${sku})`);

  let images: string[] = [];
  if (m.images) {
    const raw = getPath(rec, m.images);
    if (Array.isArray(raw)) images = raw.map(str).filter((x): x is string => !!x);
    else {
      const s = str(raw);
      if (s) images = s.split(opts.imageSeparator ?? "|").map((x) => x.trim()).filter(Boolean);
    }
  }

  const attributes: Record<string, string> = {};
  for (const [target, src] of Object.entries(m.attributes ?? {})) {
    const v = str(getPath(rec, src));
    if (v) attributes[target] = v;
  }

  return {
    supplierSku: sku,
    title,
    gtin: get("gtin"),
    mpn: get("mpn"),
    brand: get("brand"),
    manufacturer: get("manufacturer"),
    description: get("description"),
    shortDescription: get("shortDescription"),
    category: get("category"),
    costCents: cost,
    rrpCents: parseMoney(get("rrp"), opts.decimalComma),
    stock: parseIntSafe(get("stock")) ?? 0,
    deliveryDays: parseIntSafe(get("deliveryDays")),
    images,
    weightGrams: parseIntSafe(get("weightGrams")),
    material: get("material"),
    color: get("color"),
    size: get("size"),
    unitContent: parseIntSafe(get("unitContent")),
    unitMeasure: get("unitMeasure"),
    safetyInfo: get("safetyInfo"),
    attributes,
  };
}

/** Wandelt einen Lieferantenfeed (CSV oder XML) in das einheitliche Modell um. */
export function parseFeed(content: string, config: FeedConfig): ParseResult {
  let records: unknown[];
  if (config.format === "csv") {
    records = csvToRecords(content, config.delimiter ?? ",");
  } else {
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });
    const doc = parser.parse(content);
    const items = getPath(doc, config.itemPath);
    records = Array.isArray(items) ? items : items ? [items] : [];
  }

  const offers: NormalizedOffer[] = [];
  const errors: ParseResult["errors"] = [];
  records.forEach((rec, i) => {
    try {
      offers.push(mapRecord(rec, config.mapping, config));
    } catch (e) {
      errors.push({ row: i + 1, message: (e as Error).message });
    }
  });
  return { offers, errors };
}
