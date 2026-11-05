/**
 * Qualitätsprüfung vor der Veröffentlichung.
 * Blockierende Probleme schicken den Artikel in die Review Queue.
 */
import { normalizeGtin } from "./gtin";
import type { NormalizedOffer } from "./feeds/types";

export type QualityIssue = { code: string; message: string; blocking: boolean };

export type QualityContext = {
  /** Marken, die nicht verkauft werden sollen (z. B. ungeklärte Rechte). */
  blockedBrands?: string[];
  /** Hersteller-/GPSR-Angaben für die Marke vorhanden? */
  hasManufacturerInfo?: boolean;
  /** Kategorien, für die Inhaltsangaben Pflicht sind (Gleitgel, Kosmetik). */
  requiresIngredients?: boolean;
  /** Vergleichspreise zur Plausibilitätsprüfung (Median ähnlicher Artikel). */
  categoryMedianCostCents?: number;
};

export function checkQuality(o: NormalizedOffer, ctx: QualityContext = {}): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const add = (code: string, message: string, blocking = true) =>
    issues.push({ code, message, blocking });

  if (o.images.length === 0) add("no_images", "Keine Produktbilder");
  else if (o.images.some((u) => !/^https:\/\//.test(u))) add("insecure_image", "Bild-URL ohne HTTPS", false);

  if (!o.gtin) add("no_gtin", "EAN/GTIN fehlt", false);
  else if (!normalizeGtin(o.gtin)) add("invalid_gtin", "EAN/GTIN ungültig (Prüfziffer)");

  if (!o.brand) add("no_brand", "Marke fehlt", false);
  if (!o.manufacturer && !ctx.hasManufacturerInfo)
    add("no_manufacturer", "Herstellerangaben fehlen (GPSR)");
  if (!o.description || o.description.length < 80)
    add("thin_description", "Beschreibung fehlt oder ist zu kurz", false);
  if (!o.material) add("no_material", "Material fehlt (wichtig bei Körperkontakt)", false);
  if (ctx.requiresIngredients && !o.attributes.inhaltsstoffe)
    add("no_ingredients", "Inhaltsstoffe fehlen");
  if (o.deliveryDays === undefined) add("no_delivery_time", "Lieferzeit fehlt", false);

  if (o.costCents <= 0) add("invalid_price", "Einkaufspreis ist 0 oder negativ");
  if (o.rrpCents && o.costCents > o.rrpCents) add("cost_above_rrp", "Einkaufspreis über UVP");
  if (ctx.categoryMedianCostCents) {
    const ratio = o.costCents / ctx.categoryMedianCostCents;
    if (ratio < 0.1 || ratio > 10) add("price_outlier", "Preis ungewöhnlich im Kategorievergleich");
  }

  if (o.brand && ctx.blockedBrands?.some((b) => b.toLowerCase() === o.brand!.toLowerCase()))
    add("blocked_brand", `Marke gesperrt: ${o.brand}`);

  if (/\b(replica|fake|kopie|nachbau)\b/i.test(o.title))
    add("suspicious_title", "Titel deutet auf Nachahmung hin");

  return issues;
}

export const isPublishable = (issues: QualityIssue[]) => !issues.some((i) => i.blocking);
