/**
 * Preisberechnung.
 *
 * Nicht einfach "Einkauf + 30 %". Der Verkaufspreis deckt:
 * Einkauf, Versand, Zahlungsgebühren, erwartete Retourenkosten und die
 * Zielmarge laut Preisregel. Danach psychologische Rundung und Prüfung gegen UVP.
 */
import { gross, net, type Cents } from "./money";

export type PriceRule = {
  id: number;
  categoryId: number | null;
  minCostCents: Cents;
  maxCostCents: Cents | null;
  /** Zielmarge in Prozent vom Netto-Verkaufspreis. */
  marginPercent: number;
  minMarginCents: Cents;
  priority: number;
};

export type CostInput = {
  costCents: Cents; // Einkauf netto
  shippingCents: Cents; // Versand netto, anteilig pro Artikel
  categoryId: number | null;
  rrpCents?: Cents | null; // UVP brutto
};

export type PricingSettings = {
  vatPercent: number;
  paymentFeePercent: number; // z. B. 2.5
  paymentFeeFixedCents: Cents; // z. B. 25
  expectedReturnRatePercent: number; // erwartete Retourenquote
  returnCostCents: Cents; // Kosten je Retoure
};

export const DEFAULT_SETTINGS: PricingSettings = {
  vatPercent: 19,
  paymentFeePercent: 2.5,
  paymentFeeFixedCents: 25,
  expectedReturnRatePercent: 3,
  returnCostCents: 600,
};

export type PriceResult = {
  priceCents: Cents; // brutto, gerundet
  netCents: Cents;
  marginCents: Cents; // nach allen Kosten, netto
  marginPercent: number;
  ruleId: number | null;
  warnings: string[];
};

/** Passende Regel: Kategorie schlägt global, dann höchste Priorität. */
export function pickRule(rules: PriceRule[], input: CostInput): PriceRule | null {
  const fits = rules.filter(
    (r) =>
      input.costCents >= r.minCostCents &&
      (r.maxCostCents === null || input.costCents < r.maxCostCents) &&
      (r.categoryId === null || r.categoryId === input.categoryId),
  );
  fits.sort((a, b) => {
    const cat = Number(b.categoryId !== null) - Number(a.categoryId !== null);
    return cat !== 0 ? cat : b.priority - a.priority;
  });
  return fits[0] ?? null;
}

/** Psychologische Preispunkte: x,99 unter 20 €, x,95 bis 100 €, darüber volle 9er. */
export function roundPsychological(grossCents: Cents): Cents {
  if (grossCents < 2000) return Math.ceil((grossCents + 1) / 100) * 100 - 1;
  if (grossCents < 10000) return Math.ceil((grossCents + 5) / 100) * 100 - 5;
  // ab 100 €: auf nächste Zahl mit Endziffer 9 aufrunden, z. B. 123,40 → 129,00
  const euros = Math.ceil(grossCents / 100);
  const up = euros + ((9 - (euros % 10) + 10) % 10);
  return up * 100;
}

export function calculatePrice(
  input: CostInput,
  rules: PriceRule[],
  settings: PricingSettings = DEFAULT_SETTINGS,
): PriceResult {
  const warnings: string[] = [];
  const rule = pickRule(rules, input);
  const marginPercent = rule?.marginPercent ?? 30;
  const minMargin = rule?.minMarginCents ?? 0;
  if (!rule) warnings.push("Keine Preisregel gefunden, Standardmarge 30 % verwendet.");

  const landed = input.costCents + input.shippingCents;
  const returnReserve = Math.round(
    (settings.expectedReturnRatePercent / 100) * settings.returnCostCents,
  );
  const fixed = landed + returnReserve + settings.paymentFeeFixedCents;

  // Netto-Preis P so, dass: P - fixed - fee% * brutto(P) >= margin% * P
  // Zahlungsgebühr fällt auf den Bruttobetrag an.
  const feeOnNet = (settings.paymentFeePercent / 100) * (1 + settings.vatPercent / 100);
  const denom = 1 - marginPercent / 100 - feeOnNet;
  if (denom <= 0) throw new Error("Marge und Gebühren übersteigen 100 % des Preises.");
  let netTarget = Math.ceil(fixed / denom);
  // Mindestmarge in Euro absichern
  const marginAt = (p: number) => p - fixed - Math.round(feeOnNet * p);
  if (marginAt(netTarget) < minMargin) {
    netTarget = Math.ceil((fixed + minMargin) / (1 - feeOnNet));
  }

  const priceCents = roundPsychological(gross(netTarget, settings.vatPercent));
  const netCents = net(priceCents, settings.vatPercent);
  const marginCents = marginAt(netCents);

  if (input.rrpCents && priceCents > input.rrpCents) {
    warnings.push("Berechneter Preis liegt über der UVP. Bitte prüfen.");
  }
  if (marginCents < 0) warnings.push("Negative Marge.");

  return {
    priceCents,
    netCents,
    marginCents,
    marginPercent: netCents > 0 ? Math.round((marginCents / netCents) * 1000) / 10 : 0,
    ruleId: rule?.id ?? null,
    warnings,
  };
}

/**
 * Grundpreis nach PAngV (seit 28.05.2022 je 1 l bzw. 1 kg, auch bei kleinen Mengen).
 * Rechtliche Details siehe docs/RECHT-PRUEFLISTE.md.
 */
export function unitPrice(
  priceCents: Cents,
  content: number | null | undefined,
  measure: string | null | undefined,
): { cents: Cents; per: string } | null {
  if (!content || !measure) return null;
  if (measure === "ml" || measure === "g") {
    return { cents: Math.round((priceCents / content) * 1000), per: measure === "ml" ? "1 l" : "1 kg" };
  }
  return null;
}
