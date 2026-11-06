/**
 * DEMO / TEST-Daten.
 *
 * Erzeugt Kategorien, Preisregeln, Suchsynonyme, zwei DEMO-Lieferanten und
 * zwei DEMO-Feeds (CSV und XML), die durch die echte Import-Pipeline laufen.
 * Alle Lieferanten, Marken, Preise und EANs sind erfunden und als Demo markiert.
 * EANs nutzen den Präfix 200 (GS1: nur für interne Zwecke, keine echten Produkte).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import * as s from "../src/db/schema";
import type { FeedConfig } from "../src/domain/feeds/types";
import { runImport } from "../src/server/import-pipeline";

function gtin13(n: number): string {
  const base = `200${String(n).padStart(9, "0")}`;
  const sum = base
    .split("")
    .map(Number)
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return base + ((10 - (sum % 10)) % 10);
}

const CATEGORIES: (Omit<typeof s.categories.$inferInsert, "id"> & { feedKey: string })[] = [
  {
    feedKey: "toys/vibratoren",
    slug: "vibratoren",
    name: "Vibratoren",
    description: "Auflegevibratoren, Massagestäbe und Klassiker. Mit Angaben zu Material, Akku und Lautstärke.",
    sort: 1,
    filterSchema: [
      { key: "material", label: "Material", type: "select" },
      { key: "antrieb", label: "Energie", type: "select" },
      { key: "wasserdicht", label: "Wasserdicht", type: "select" },
      { key: "lautstaerke", label: "Lautstärke", type: "select" },
    ],
  },
  {
    feedKey: "toys/dildos",
    slug: "dildos",
    name: "Dildos",
    description: "Formen aus Silikon, Glas und Edelstahl.",
    sort: 2,
    filterSchema: [
      { key: "material", label: "Material", type: "select" },
      { key: "laenge_cm", label: "Länge", type: "select", unit: "cm" },
    ],
  },
  {
    feedKey: "toys/paare",
    slug: "fuer-paare",
    name: "Für Paare",
    description: "Spielzeug, das für zwei gedacht ist.",
    sort: 3,
    filterSchema: [
      { key: "material", label: "Material", type: "select" },
      { key: "antrieb", label: "Energie", type: "select" },
    ],
  },
  {
    feedKey: "toys/ihn",
    slug: "fuer-ihn",
    name: "Für Ihn",
    description: "Ringe, Masturbatoren und mehr.",
    sort: 4,
    filterSchema: [{ key: "material", label: "Material", type: "select" }],
  },
  {
    feedKey: "waesche",
    slug: "dessous",
    name: "Dessous & Wäsche",
    description: "Spitze, Satin und Netz in vielen Größen.",
    sort: 5,
    filterSchema: [
      { key: "groesse", label: "Größe", type: "select" },
      { key: "farbe", label: "Farbe", type: "select" },
    ],
  },
  {
    feedKey: "pflege/gleitgel",
    slug: "gleitgel-pflege",
    name: "Gleitgel & Pflege",
    description: "Auf Wasser-, Silikon- oder Ölbasis. Mit Grundpreis und Inhaltsstoffen.",
    sort: 6,
    filterSchema: [{ key: "basis", label: "Basis", type: "select" }],
  },
  {
    feedKey: "pflege/massage",
    slug: "massage",
    name: "Massage & Wellness",
    description: "Öle, Kerzen und Zubehör für entspannte Abende.",
    sort: 7,
    filterSchema: [{ key: "duft", label: "Duft", type: "select" }],
  },
  {
    feedKey: "kondome",
    slug: "kondome",
    name: "Kondome",
    description: "Verschiedene Größen, auch latexfrei.",
    sort: 8,
    filterSchema: [
      { key: "breite_mm", label: "Breite", type: "select", unit: "mm" },
      { key: "latexfrei", label: "Latexfrei", type: "select" },
    ],
  },
  {
    feedKey: "fetisch",
    slug: "fetisch-bondage",
    name: "Fetisch & Bondage",
    description: "Augenbinden, Fesseln und Einsteigersets.",
    sort: 9,
    filterSchema: [{ key: "material", label: "Material", type: "select" }],
  },
  {
    feedKey: "sets",
    slug: "geschenke-sets",
    name: "Geschenke & Sets",
    description: "Zusammengestellte Sets zum Verschenken.",
    sort: 10,
    filterSchema: [],
  },
];

type DemoItem = {
  n: number;
  title: string;
  cat: string;
  brand: string;
  cost: number; // Euro netto
  rrp?: number;
  material?: string;
  color?: string;
  shape: "wave" | "arc" | "drop" | "ring" | "pill" | "box" | "fold" | "orb";
  short: string;
  attrs?: Record<string, string>;
  unit?: [number, string];
  /** in welchen Feeds: N = Nord (CSV), S = Süd (XML), NS = beide */
  feeds: "N" | "S" | "NS";
  /** absichtlich unvollständig → Review Queue */
  incomplete?: boolean;
};

const ITEMS: DemoItem[] = [
  { n: 1, title: "Auflegevibrator Welle", cat: "toys/vibratoren", brand: "Demo Marke Aurel", cost: 18.5, rrp: 49.95, material: "Silikon", color: "Pflaume", shape: "wave", short: "Flach, leise und mit zehn Stufen.", attrs: { antrieb: "Akku (USB)", wasserdicht: "ja", lautstaerke: "leise" }, feeds: "NS" },
  { n: 2, title: "Massagestab Classic", cat: "toys/vibratoren", brand: "Demo Marke Aurel", cost: 32, rrp: 79.95, material: "Silikon", color: "Creme", shape: "orb", short: "Kräftiger Massagestab mit flexiblem Kopf.", attrs: { antrieb: "Akku (USB)", wasserdicht: "spritzwassergeschützt", lautstaerke: "mittel" }, feeds: "N" },
  { n: 3, title: "Minivibrator Pebble", cat: "toys/vibratoren", brand: "Demo Marke Nuvo", cost: 9.9, rrp: 24.95, material: "Silikon", color: "Koralle", shape: "drop", short: "Klein, diskret und reisetauglich.", attrs: { antrieb: "Batterie", wasserdicht: "ja", lautstaerke: "leise" }, feeds: "NS" },
  { n: 4, title: "Rabbit Vibrator Duo", cat: "toys/vibratoren", brand: "Demo Marke Nuvo", cost: 24, rrp: 59.95, material: "Silikon", color: "Beere", shape: "arc", short: "Zwei Motoren, getrennt steuerbar.", attrs: { antrieb: "Akku (USB)", wasserdicht: "ja", lautstaerke: "mittel" }, feeds: "S" },
  { n: 5, title: "G-Punkt Vibrator Curve", cat: "toys/vibratoren", brand: "Demo Marke Aurel", cost: 16, rrp: 39.95, material: "Silikon", color: "Salbei", shape: "arc", short: "Gebogene Spitze, sieben Muster.", attrs: { antrieb: "Akku (USB)", wasserdicht: "ja", lautstaerke: "leise" }, feeds: "N" },
  { n: 6, title: "Druckwellen Stimulator Breeze", cat: "toys/vibratoren", brand: "Demo Marke Nuvo", cost: 27, rrp: 69.95, material: "Silikon", color: "Pflaume", shape: "drop", short: "Berührungslose Stimulation über Luftdruck.", attrs: { antrieb: "Akku (USB)", wasserdicht: "ja", lautstaerke: "leise" }, feeds: "NS" },
  { n: 7, title: "Dildo Glas Spirale", cat: "toys/dildos", brand: "Demo Marke Lumen", cost: 14, rrp: 34.95, material: "Borosilikatglas", color: "Klar", shape: "pill", short: "Temperaturspiel möglich, leicht zu reinigen.", attrs: { laenge_cm: "18" }, feeds: "S" },
  { n: 8, title: "Dildo Silikon Soft 18 cm", cat: "toys/dildos", brand: "Demo Marke Aurel", cost: 12.5, rrp: 29.95, material: "Silikon", color: "Haut", shape: "pill", short: "Weich, mit Saugfuß.", attrs: { laenge_cm: "18" }, feeds: "N" },
  { n: 9, title: "Dildo Edelstahl Pure", cat: "toys/dildos", brand: "Demo Marke Lumen", cost: 29, rrp: 69.95, material: "Edelstahl", color: "Silber", shape: "pill", short: "Schwer, glatt und langlebig.", attrs: { laenge_cm: "16" }, feeds: "S" },
  { n: 10, title: "Paarvibrator Tandem", cat: "toys/paare", brand: "Demo Marke Nuvo", cost: 34, rrp: 89.95, material: "Silikon", color: "Pflaume", shape: "arc", short: "Mit Fernbedienung, für beide gleichzeitig.", attrs: { antrieb: "Akku (USB)" }, feeds: "NS" },
  { n: 11, title: "Vibro Ei mit Fernbedienung", cat: "toys/paare", brand: "Demo Marke Nuvo", cost: 15, rrp: 39.95, material: "Silikon", color: "Koralle", shape: "drop", short: "Reichweite bis zu zehn Meter laut Hersteller.", attrs: { antrieb: "Akku (USB)" }, feeds: "S" },
  { n: 12, title: "Spielkarten für Paare", cat: "toys/paare", brand: "Demo Marke Fabel", cost: 5.5, rrp: 14.95, material: "Papier", color: "Bunt", shape: "box", short: "52 Karten mit Ideen für Gespräche und Spiel.", feeds: "N" },
  { n: 13, title: "Penisring Silikon Dreierset", cat: "toys/ihn", brand: "Demo Marke Aurel", cost: 4.5, rrp: 12.95, material: "Silikon", color: "Schwarz", shape: "ring", short: "Drei Größen, dehnbar.", feeds: "NS" },
  { n: 14, title: "Vibrierender Penisring", cat: "toys/ihn", brand: "Demo Marke Nuvo", cost: 9, rrp: 24.95, material: "Silikon", color: "Schwarz", shape: "ring", short: "Mit kleinem Vibrationsmotor.", feeds: "S" },
  { n: 15, title: "Masturbator Soft Sleeve", cat: "toys/ihn", brand: "Demo Marke Fabel", cost: 11, rrp: 29.95, material: "TPE", color: "Transparent", shape: "pill", short: "Strukturierter Kanal, wiederverwendbar.", feeds: "N" },
  { n: 16, title: "Body Spitze Elegance", cat: "waesche", brand: "Demo Marke Seda", cost: 14, rrp: 39.95, material: "Polyamid, Elasthan", color: "Schwarz", shape: "fold", short: "Feine Spitze, verstellbare Träger.", attrs: { groesse: "S, M, L, XL" }, feeds: "N" },
  { n: 17, title: "Babydoll Satin", cat: "waesche", brand: "Demo Marke Seda", cost: 11, rrp: 29.95, material: "Polyester", color: "Weinrot", shape: "fold", short: "Fließender Satin mit Spitzenkante.", attrs: { groesse: "S, M, L" }, feeds: "S" },
  { n: 18, title: "Strumpfhalter Set Netz", cat: "waesche", brand: "Demo Marke Seda", cost: 8, rrp: 19.95, material: "Polyamid", color: "Schwarz", shape: "fold", short: "Strumpfhalter mit passenden Netzstrümpfen.", attrs: { groesse: "One Size" }, feeds: "N" },
  { n: 19, title: "Morgenmantel Kimono Satin", cat: "waesche", brand: "Demo Marke Seda", cost: 16, rrp: 44.95, material: "Polyester", color: "Pflaume", shape: "fold", short: "Leichter Kimono mit Gürtel.", attrs: { groesse: "S/M, L/XL" }, feeds: "S" },
  { n: 20, title: "Gleitgel Wasserbasis 100 ml", cat: "pflege/gleitgel", brand: "Demo Marke Pura", cost: 3.2, rrp: 9.95, shape: "drop", color: "Klar", short: "Kondomgeeignet, parfümfrei.", attrs: { basis: "Wasser", inhaltsstoffe: "DEMO: Aqua, Glycerin, Hydroxyethylcellulose" }, unit: [100, "ml"], feeds: "NS" },
  { n: 21, title: "Gleitgel Silikonbasis 50 ml", cat: "pflege/gleitgel", brand: "Demo Marke Pura", cost: 4.8, rrp: 14.95, shape: "drop", color: "Klar", short: "Lang anhaltend, auch für Massagen.", attrs: { basis: "Silikon", inhaltsstoffe: "DEMO: Dimethicone, Dimethiconol" }, unit: [50, "ml"], feeds: "N" },
  { n: 22, title: "Gleitgel Aloe Vera 150 ml", cat: "pflege/gleitgel", brand: "Demo Marke Pura", cost: 4.1, rrp: 12.95, shape: "drop", color: "Klar", short: "Mit Aloe Vera, auf Wasserbasis.", attrs: { basis: "Wasser", inhaltsstoffe: "DEMO: Aqua, Aloe Barbadensis Leaf Juice, Glycerin" }, unit: [150, "ml"], feeds: "S" },
  { n: 23, title: "Toy Reiniger Spray 150 ml", cat: "pflege/gleitgel", brand: "Demo Marke Pura", cost: 3, rrp: 8.95, shape: "drop", color: "Klar", short: "Für Spielzeug aus Silikon, Glas und Metall.", attrs: { basis: "Wasser", inhaltsstoffe: "DEMO: Aqua, Alcohol" }, unit: [150, "ml"], feeds: "N" },
  { n: 24, title: "Massageöl Mandel 100 ml", cat: "pflege/massage", brand: "Demo Marke Pura", cost: 3.9, rrp: 11.95, shape: "drop", color: "Gold", short: "Mildes Mandelöl, leicht duftend.", attrs: { duft: "Mandel", inhaltsstoffe: "DEMO: Prunus Amygdalus Dulcis Oil" }, unit: [100, "ml"], feeds: "NS" },
  { n: 25, title: "Massagekerze Vanille", cat: "pflege/massage", brand: "Demo Marke Pura", cost: 5.5, rrp: 16.95, shape: "orb", color: "Creme", short: "Wird zu warmem Massageöl.", attrs: { duft: "Vanille", inhaltsstoffe: "DEMO: Glycine Soja Oil, Butyrospermum Parkii Butter" }, unit: [150, "g"], feeds: "S" },
  { n: 26, title: "Massagestein Set", cat: "pflege/massage", brand: "Demo Marke Fabel", cost: 7, rrp: 19.95, material: "Basalt", color: "Schwarz", shape: "orb", short: "Vier Steine zum Erwärmen.", attrs: { duft: "ohne" }, feeds: "N" },
  { n: 27, title: "Kondome Natur 12 Stück", cat: "kondome", brand: "Demo Marke Pura", cost: 3.5, rrp: 9.95, material: "Naturkautschuklatex", shape: "box", color: "Natur", short: "Standardgröße, mit Gleitbeschichtung.", attrs: { breite_mm: "53", latexfrei: "nein" }, unit: [12, "Stück"], feeds: "NS" },
  { n: 28, title: "Kondome latexfrei 10 Stück", cat: "kondome", brand: "Demo Marke Pura", cost: 5, rrp: 13.95, material: "Polyisopren", shape: "box", color: "Natur", short: "Für Menschen mit Latexallergie.", attrs: { breite_mm: "53", latexfrei: "ja" }, unit: [10, "Stück"], feeds: "S" },
  { n: 29, title: "Kondome XL 12 Stück", cat: "kondome", brand: "Demo Marke Pura", cost: 4, rrp: 10.95, material: "Naturkautschuklatex", shape: "box", color: "Natur", short: "Größere Breite für mehr Komfort.", attrs: { breite_mm: "57", latexfrei: "nein" }, unit: [12, "Stück"], feeds: "N" },
  { n: 30, title: "Augenbinde Satin", cat: "fetisch", brand: "Demo Marke Velo", cost: 3, rrp: 9.95, material: "Satin", color: "Schwarz", shape: "fold", short: "Weich gepolstert, mit Gummiband.", feeds: "NS" },
  { n: 31, title: "Handfesseln Kunstleder", cat: "fetisch", brand: "Demo Marke Velo", cost: 7.5, rrp: 19.95, material: "Kunstleder", color: "Schwarz", shape: "ring", short: "Gepolstert, mit Schnellverschluss.", feeds: "S" },
  { n: 32, title: "Einsteigerset Bondage 5 teilig", cat: "fetisch", brand: "Demo Marke Velo", cost: 15, rrp: 39.95, material: "Kunstleder, Satin", color: "Schwarz", shape: "box", short: "Augenbinde, Fesseln, Seil, Feder und Tasche.", feeds: "N" },
  { n: 33, title: "Geschenkset Wellness Abend", cat: "sets", brand: "Demo Marke Fabel", cost: 14, rrp: 39.95, shape: "box", color: "Creme", short: "Massageöl, Kerze und Augenbinde in einer Box.", feeds: "S" },
  { n: 34, title: "Adventskalender Erotik", cat: "sets", brand: "Demo Marke Fabel", cost: 28, rrp: 79.95, shape: "box", color: "Pflaume", short: "24 Türchen mit Pflege, Spiel und Wäsche.", feeds: "N" },
  // absichtlich unvollständig: landen in der Review Queue
  { n: 35, title: "Vibrator ohne Herstellerangaben", cat: "toys/vibratoren", brand: "Demo Marke Unbekannt", cost: 6, shape: "wave", short: "DEMO für die Review Queue.", feeds: "N", incomplete: true },
  { n: 36, title: "Gleitgel ohne Bilder", cat: "pflege/gleitgel", brand: "Demo Marke Pura", cost: 2.5, shape: "drop", short: "DEMO für die Review Queue.", feeds: "S", incomplete: true },
];

function description(i: DemoItem): string {
  return [
    `DEMO-Artikel. ${i.short}`,
    i.material ? `Material: ${i.material}.` : "",
    "Dieser Text ist ein Platzhalter und wird durch geprüfte Herstellerangaben ersetzt, sobald ein echter Lieferant angebunden ist.",
  ]
    .filter(Boolean)
    .join(" ");
}

function nordCsv(): string {
  // Lieferant Nord: Semikolon, deutsches Zahlenformat
  const head = "artnr;ean;marke;hersteller;bezeichnung;kurztext;langtext;warengruppe;ek_netto;uvp;bestand;lieferzeit_tage;bilder;material;farbe;inhalt;einheit;attribute_json";
  const esc = (v: string | number | undefined) => {
    const s = v === undefined ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = ITEMS.filter((i) => i.feeds.includes("N")).map((i) =>
    [
      `N-${1000 + i.n}`,
      gtin13(i.n),
      i.brand,
      i.incomplete ? "" : `${i.brand.replace("Demo Marke ", "DEMO ")} GmbH, Musterstraße 1, 00000 Demostadt`,
      i.title,
      i.short,
      description(i),
      i.cat,
      i.cost.toFixed(2).replace(".", ","),
      i.rrp?.toFixed(2).replace(".", ","),
      i.n % 7 === 0 ? 0 : 5 + ((i.n * 13) % 40),
      2,
      i.incomplete && i.cat.startsWith("pflege") ? "" : `demo:${i.shape}:${i.color ?? "Creme"}`,
      i.material,
      i.color,
      i.unit?.[0],
      i.unit?.[1],
      "",
    ]
      .map(esc)
      .join(";"),
  );
  return [head, ...rows].join("\n") + "\n";
}

function suedXml(): string {
  // Lieferant Süd: XML, Punkt als Dezimaltrenner, leicht teurer aber oft anders
  const x = (s: string | number | undefined) =>
    s === undefined ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const items = ITEMS.filter((i) => i.feeds.includes("S")).map((i) => {
    const cost = i.feeds === "NS" ? i.cost * (i.n % 2 === 0 ? 0.93 : 1.08) : i.cost;
    const attrs = Object.entries(i.attrs ?? {})
      .map(([k, v]) => `<attr name="${k}">${x(v)}</attr>`)
      .join("");
    return `<product>
  <sku>S-${2000 + i.n}</sku><gtin>${gtin13(i.n)}</gtin><brand>${x(i.brand)}</brand>
  <manufacturer>${i.incomplete ? "" : x(`${i.brand.replace("Demo Marke ", "DEMO ")} GmbH, Musterstraße 1, 00000 Demostadt`)}</manufacturer>
  <name>${x(i.title)}</name><teaser>${x(i.short)}</teaser><text>${x(description(i))}</text>
  <category>${i.cat}</category>
  <price><purchase>${cost.toFixed(2)}</purchase><rrp>${i.rrp?.toFixed(2) ?? ""}</rrp></price>
  <stock>${10 + ((i.n * 7) % 30)}</stock><shipping_days>4</shipping_days>
  <images>${i.incomplete && i.cat.startsWith("pflege") ? "" : `<image>demo:${i.shape}:${i.color ?? "Creme"}</image>`}</images>
  <material>${x(i.material)}</material><color>${x(i.color)}</color>
  <content>${i.unit?.[0] ?? ""}</content><unit>${i.unit?.[1] ?? ""}</unit>
  <attributes>${attrs}</attributes>
</product>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<catalog><products>\n${items.join("\n")}\n</products></catalog>\n`;
}

const NORD_CONFIG: FeedConfig = {
  format: "csv",
  delimiter: ";",
  decimalComma: true,
  mapping: {
    supplierSku: "artnr",
    gtin: "ean",
    brand: "marke",
    manufacturer: "hersteller",
    title: "bezeichnung",
    shortDescription: "kurztext",
    description: "langtext",
    category: "warengruppe",
    cost: "ek_netto",
    rrp: "uvp",
    stock: "bestand",
    deliveryDays: "lieferzeit_tage",
    images: "bilder",
    material: "material",
    color: "farbe",
    unitContent: "inhalt",
    unitMeasure: "einheit",
  },
};

const SUED_CONFIG: FeedConfig = {
  format: "xml",
  itemPath: "catalog.products.product",
  mapping: {
    supplierSku: "sku",
    gtin: "gtin",
    brand: "brand",
    manufacturer: "manufacturer",
    title: "name",
    shortDescription: "teaser",
    description: "text",
    category: "category",
    cost: "price.purchase",
    rrp: "price.rrp",
    stock: "stock",
    deliveryDays: "shipping_days",
    images: "images.image",
    material: "material",
    color: "color",
    unitContent: "content",
    unitMeasure: "unit",
  },
};

/** Attribute aus dem Demo-Katalog direkt ergänzen (Demo-Feeds tragen sie nicht vollständig). */
async function applyDemoAttributes() {
  for (const i of ITEMS) {
    if (!i.attrs) continue;
    await db.execute(sql`
      update products set
        attributes = attributes || ${JSON.stringify(i.attrs)}::jsonb,
        attribute_sources = attribute_sources || ${JSON.stringify(Object.fromEntries(Object.keys(i.attrs).map((k) => [k, "demo-seed"])))}::jsonb
      where gtin = ${gtin13(i.n).padStart(14, "0")}`);
  }
}

async function main() {
  console.log("DEMO-Daten werden angelegt …");
  await db.execute(sql`truncate table
    review_queue, price_history, product_images, return_items, returns, shipments, order_items, fulfillments, payments, orders,
    reviews, supplier_products, variants, products, brands, import_runs, suppliers, price_rules, categories,
    search_synonyms, content_pages, notifications, automation_jobs, audit_logs,
    outbound_emails, inbound_emails, agent_runs, support_tickets, sessions restart identity cascade`);

  const cats = await db
    .insert(s.categories)
    .values(CATEGORIES.map(({ feedKey: _k, ...c }) => ({ ...c, seoTitle: `${c.name} diskret bestellen`, seoDescription: c.description })))
    .returning({ id: s.categories.id, slug: s.categories.slug });
  const categoryMap = Object.fromEntries(
    CATEGORIES.map((c) => [c.feedKey, cats.find((x) => x.slug === c.slug)!.id]),
  );

  await db.insert(s.priceRules).values([
    { name: "Kleinteile bis 5 €", minCostCents: 0, maxCostCents: 500, marginPercent: 50, minMarginCents: 300, priority: 0 },
    { name: "5 bis 20 €", minCostCents: 500, maxCostCents: 2000, marginPercent: 42, minMarginCents: 400, priority: 0 },
    { name: "20 bis 50 €", minCostCents: 2000, maxCostCents: 5000, marginPercent: 35, minMarginCents: 0, priority: 0 },
    { name: "ab 50 €", minCostCents: 5000, maxCostCents: null, marginPercent: 28, minMarginCents: 0, priority: 0 },
  ]);

  await db.insert(s.searchSynonyms).values([
    { term: "gleitmittel", synonyms: ["gleitgel"] },
    { term: "lube", synonyms: ["gleitgel"] },
    { term: "massagestab", synonyms: ["massagestab", "wand"] },
    { term: "wand", synonyms: ["massagestab"] },
    { term: "paar", synonyms: ["paare", "paarvibrator"] },
    { term: "cockring", synonyms: ["penisring"] },
    { term: "unterwaesche", synonyms: ["dessous", "body", "babydoll"] },
    { term: "dessous", synonyms: ["body", "babydoll", "strumpfhalter"] },
    { term: "fesseln", synonyms: ["handfesseln", "bondage"] },
    { term: "geschenk", synonyms: ["geschenkset", "set", "adventskalender"] },
  ]);

  const [nord, sued] = await db
    .insert(s.suppliers)
    .values([
      {
        slug: "demo-nord",
        name: "DEMO Lieferant Nord",
        country: "DE",
        integrationType: "csv_feed",
        orderMode: "email",
        priority: "C",
        isActive: true,
        config: NORD_CONFIG as unknown as Record<string, unknown>,
        shippingCostCents: 390,
        avgDeliveryDays: 2,
        reliabilityScore: 85,
        blindShipping: true,
        orderEmail: "bestellung@demo-nord.invalid",
        notes: "DEMO / TEST. Kein echter Lieferant.",
        isDemo: true,
      },
      {
        slug: "demo-sued",
        name: "DEMO Lieferant Süd",
        country: "AT",
        integrationType: "xml_feed",
        orderMode: "portal_manual",
        priority: "C",
        isActive: true,
        config: SUED_CONFIG as unknown as Record<string, unknown>,
        shippingCostCents: 450,
        avgDeliveryDays: 4,
        reliabilityScore: 70,
        blindShipping: true,
        notes: "DEMO / TEST. Kein echter Lieferant.",
        isDemo: true,
      },
    ])
    .returning();

  const csv = nordCsv();
  const xml = suedXml();
  mkdirSync("fixtures/demo-feeds", { recursive: true });
  writeFileSync("fixtures/demo-feeds/demo-nord.csv", csv);
  writeFileSync("fixtures/demo-feeds/demo-sued.xml", xml);

  const a = await runImport(db, nord.id, csv, NORD_CONFIG, { categoryMap, isDemo: true });
  console.log("Nord (CSV):", a.stats);
  const b = await runImport(db, sued.id, xml, SUED_CONFIG, { categoryMap, isDemo: true });
  console.log("Süd (XML):", b.stats);

  await applyDemoAttributes();

  await db.insert(s.contentPages).values([
    {
      slug: "erstes-toy-finden",
      type: "ratgeber",
      title: "Das erste Toy finden",
      excerpt: "Worauf es bei Material, Größe und Lautstärke ankommt.",
      body: "DEMO-Ratgeber. Dieser Text ist ein Platzhalter für einen redaktionell geprüften Artikel.",
      isPublished: true,
      legalReviewed: false,
    },
    {
      slug: "gleitgel-richtig-waehlen",
      type: "ratgeber",
      title: "Welches Gleitgel passt?",
      excerpt: "Wasser, Silikon oder Öl: Unterschiede und Verträglichkeit mit Toys und Kondomen.",
      body: "DEMO-Ratgeber. Dieser Text ist ein Platzhalter für einen redaktionell geprüften Artikel.",
      isPublished: true,
      legalReviewed: false,
    },
    {
      slug: "toys-reinigen",
      type: "ratgeber",
      title: "Toys richtig reinigen und lagern",
      excerpt: "So bleiben Silikon, Glas und Edelstahl lange schön.",
      body: "DEMO-Ratgeber. Dieser Text ist ein Platzhalter für einen redaktionell geprüften Artikel.",
      isPublished: true,
      legalReviewed: false,
    },
  ]);

  // Laufenden Shop informieren, falls erreichbar (sonst greift die normale Cache-Laufzeit).
  const secret = process.env.REVALIDATE_SECRET;
  if (secret) {
    await fetch(new URL("/api/intern/revalidate", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"), {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ tags: ["catalog", "content", "search"] }),
    }).then((r) => console.log("Cache geleert:", r.status), () => console.log("Shop nicht erreichbar, Cache nicht geleert."));
  }

  const counts = await db.execute(sql`select status, count(*)::int as n from products group by status order by status`);
  console.log("Artikel nach Status:", counts);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
