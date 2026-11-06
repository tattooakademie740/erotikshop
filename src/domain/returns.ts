/**
 * Retourenregeln. Rechtlich nicht geprüft: Fristen und Hygiene-Ausnahme stehen in
 * docs/RECHT-PRUEFLISTE.md und müssen anwaltlich bestätigt werden.
 *
 * Ablauf (stage):
 * requested → approved → supplier_requested → instructions_sent → received → refund_pending → refunded
 * Seitenwege: rejected, needs_manual
 */
export type ReturnReason = "widerruf" | "defekt" | "falsch_geliefert" | "beschaedigt";
export type ReturnPolicy = "standard" | "hygiene_sealed" | "excluded_other";

export type ReturnStage =
  | "requested"
  | "approved"
  | "supplier_requested"
  | "instructions_sent"
  | "received"
  | "refund_pending"
  | "refunded"
  | "rejected"
  | "needs_manual";

export const STAGE_LABEL: Record<ReturnStage, string> = {
  requested: "Angefragt",
  approved: "Genehmigt",
  supplier_requested: "Beim Lieferanten angefragt",
  instructions_sent: "Rücksendedaten verschickt",
  received: "Beim Lieferanten angekommen",
  refund_pending: "Erstattung in Arbeit",
  refunded: "Erstattet",
  rejected: "Abgelehnt",
  needs_manual: "Wird von Hand geprüft",
};

const NEXT: Record<ReturnStage, ReturnStage[]> = {
  requested: ["approved", "rejected", "needs_manual"],
  approved: ["supplier_requested", "needs_manual"],
  supplier_requested: ["instructions_sent", "needs_manual", "rejected"],
  instructions_sent: ["received", "needs_manual"],
  received: ["refund_pending", "needs_manual"],
  refund_pending: ["refunded", "needs_manual"],
  refunded: [],
  rejected: ["needs_manual"],
  needs_manual: ["approved", "supplier_requested", "instructions_sent", "received", "refund_pending", "refunded", "rejected"],
};

export function canMove(from: ReturnStage, to: ReturnStage) {
  return NEXT[from].includes(to);
}

export const WITHDRAWAL_DAYS = 14;
export const WARRANTY_DAYS = 730;

export type EligibilityInput = {
  reason: ReturnReason;
  policy: ReturnPolicy;
  /** Zustellung; null = noch nicht zugestellt */
  deliveredAt: Date | null;
  now: Date;
  /** Kunde bestätigt: Versiegelung unbeschädigt (nur bei Hygieneartikeln relevant) */
  sealIntact?: boolean;
};

export type Eligibility = { decision: "approve" | "reject" | "manual"; message: string };

const days = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 86_400_000;

export function checkEligibility(i: EligibilityInput): Eligibility {
  const defect = i.reason !== "widerruf";
  if (defect) {
    // Gewährleistung: unabhängig von Hygiene-Ausnahme
    if (i.deliveredAt && days(i.deliveredAt, i.now) > WARRANTY_DAYS) {
      return { decision: "manual", message: "Gewährleistungsfrist möglicherweise abgelaufen, wird geprüft." };
    }
    return { decision: "approve", message: "Reklamation angenommen." };
  }
  if (i.policy === "excluded_other") {
    return { decision: "manual", message: "Für diesen Artikel prüfen wir den Widerruf persönlich." };
  }
  if (i.deliveredAt && days(i.deliveredAt, i.now) > WITHDRAWAL_DAYS) {
    return { decision: "reject", message: `Die Widerrufsfrist von ${WITHDRAWAL_DAYS} Tagen ist abgelaufen.` };
  }
  if (i.policy === "hygiene_sealed" && i.sealIntact !== true) {
    return {
      decision: "reject",
      message: "Bei versiegelten Hygieneartikeln ist ein Widerruf nur möglich, solange die Versiegelung unbeschädigt ist.",
    };
  }
  return { decision: "approve", message: "Widerruf angenommen." };
}

/** Erstattung: Artikelpreise; Hinversand nur, wenn die ganze Bestellung zurückgeht. */
export function refundAmount(p: {
  items: { unitPriceCents: number; quantity: number; returnQuantity: number }[];
  shippingCents: number;
  reason: ReturnReason;
}) {
  const goods = p.items.reduce((n, i) => n + i.unitPriceCents * Math.min(i.returnQuantity, i.quantity), 0);
  const full = p.items.every((i) => i.returnQuantity >= i.quantity);
  const shipping = full || p.reason !== "widerruf" ? p.shippingCents : 0;
  return goods + shipping;
}

export const returnReference = (id: number) => `RETOURE-${id}`;
export const orderReference = /LUSTVIORA-(\d+)-(\d+)/i;
export const returnReferencePattern = /RETOURE-(\d+)/i;
