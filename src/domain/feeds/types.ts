/**
 * Einheitliches Produktmodell, in das alle Lieferantenformate überführt werden.
 * Felder sind optional, weil Feeds unvollständig sein können. Fehlendes wird
 * nicht erfunden, sondern von der Qualitätsprüfung gemeldet.
 */
export type NormalizedOffer = {
  supplierSku: string;
  title: string;
  gtin?: string;
  mpn?: string;
  brand?: string;
  manufacturer?: string;
  description?: string;
  shortDescription?: string;
  category?: string; // Kategoriepfad des Lieferanten, wird gemappt
  costCents: number;
  rrpCents?: number;
  stock: number;
  deliveryDays?: number;
  images: string[];
  weightGrams?: number;
  material?: string;
  color?: string;
  size?: string;
  unitContent?: number;
  unitMeasure?: string;
  safetyInfo?: string;
  attributes: Record<string, string>;
};

/**
 * Zuordnung von Lieferantenfeldern zum Modell.
 * Für CSV: Spaltennamen. Für XML: Pfade relativ zum Artikel-Element (a.b.c).
 */
export type FieldMapping = Partial<
  Record<
    | "supplierSku"
    | "title"
    | "gtin"
    | "mpn"
    | "brand"
    | "manufacturer"
    | "description"
    | "shortDescription"
    | "category"
    | "cost"
    | "rrp"
    | "stock"
    | "deliveryDays"
    | "images"
    | "weightGrams"
    | "material"
    | "color"
    | "size"
    | "unitContent"
    | "unitMeasure"
    | "safetyInfo",
    string
  >
> & {
  /** Weitere Felder, die als Attribute übernommen werden: Zielname → Quellfeld */
  attributes?: Record<string, string>;
};

export type FeedConfig =
  | { format: "csv"; delimiter?: string; mapping: FieldMapping; decimalComma?: boolean; imageSeparator?: string }
  | { format: "xml"; itemPath: string; mapping: FieldMapping; decimalComma?: boolean; imageSeparator?: string };

export type ParseResult = { offers: NormalizedOffer[]; errors: { row: number; message: string }[] };
