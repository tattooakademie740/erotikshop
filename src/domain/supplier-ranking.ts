/**
 * Lieferantenauswahl, wenn mehrere Lieferanten denselben Artikel anbieten.
 *
 * Bewertet wird nach "effektiven Kosten": Einkauf + Versand, plus Aufschläge
 * für lange Lieferzeit und geringe Zuverlässigkeit. Ohne Bestand kein Kandidat.
 */
import type { Cents } from "./money";

export type Offer = {
  supplierProductId: number;
  supplierId: number;
  costCents: Cents;
  shippingCents: Cents;
  stock: number;
  deliveryDays: number | null;
  reliabilityScore: number; // 0..100
  supplierActive: boolean;
  /** Bestellungen nur per Hand möglich: kleiner Aufschlag für Aufwand. */
  manualOrder: boolean;
};

export type RankingWeights = {
  centsPerDeliveryDay: Cents; // Wert eines Tages schnellerer Lieferung
  defaultDeliveryDays: number;
  reliabilityPenaltyCents: Cents; // Aufschlag bei Score 0, linear bis 100
  manualOrderPenaltyCents: Cents;
};

export const DEFAULT_WEIGHTS: RankingWeights = {
  centsPerDeliveryDay: 50,
  defaultDeliveryDays: 7,
  reliabilityPenaltyCents: 300,
  manualOrderPenaltyCents: 150,
};

export type RankedOffer = Offer & { score: number; reasons: string[] };

export function rankOffers(
  offers: Offer[],
  quantity = 1,
  w: RankingWeights = DEFAULT_WEIGHTS,
): RankedOffer[] {
  return offers
    .filter((o) => o.supplierActive && o.stock >= quantity)
    .map((o) => {
      const days = o.deliveryDays ?? w.defaultDeliveryDays;
      const reasons: string[] = [];
      const landed = o.costCents * quantity + o.shippingCents;
      const delivery = days * w.centsPerDeliveryDay;
      const reliability = Math.round(((100 - o.reliabilityScore) / 100) * w.reliabilityPenaltyCents);
      const manual = o.manualOrder ? w.manualOrderPenaltyCents : 0;
      reasons.push(`Kosten ${landed}`, `Lieferzeit +${delivery}`, `Zuverlässigkeit +${reliability}`);
      if (manual) reasons.push(`manuelle Bestellung +${manual}`);
      return { ...o, score: landed + delivery + reliability + manual, reasons };
    })
    .sort((a, b) => a.score - b.score || b.stock - a.stock);
}

export function pickBestOffer(offers: Offer[], quantity = 1, w?: RankingWeights): RankedOffer | null {
  return rankOffers(offers, quantity, w)[0] ?? null;
}
