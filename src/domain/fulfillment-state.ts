/**
 * Zustandsautomat für Fulfillment-Aufträge.
 * Ungültige Übergänge werden abgelehnt, damit kein Auftrag "verloren" geht.
 */
export type FulfillmentStatus =
  | "pending"
  | "submitted"
  | "accepted"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "failed"
  | "needs_manual";

const transitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  pending: ["submitted", "failed", "needs_manual", "cancelled"],
  submitted: ["accepted", "shipped", "failed", "needs_manual", "cancelled"],
  accepted: ["shipped", "needs_manual", "cancelled"],
  shipped: ["delivered", "needs_manual"],
  delivered: [],
  cancelled: [],
  failed: ["pending", "needs_manual", "cancelled"], // pending = erneuter Versuch
  needs_manual: ["submitted", "accepted", "shipped", "cancelled"],
};

export function canTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: FulfillmentStatus, to: FulfillmentStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Ungültiger Statuswechsel: ${from} → ${to}`);
  }
}

/** Exponentielles Backoff für erneute Versuche: 1, 2, 4, 8 … Minuten, max. 6 h. */
export function nextRetryDelayMs(attempt: number): number {
  return Math.min(2 ** Math.max(0, attempt - 1) * 60_000, 6 * 60 * 60_000);
}

/** Gesamtstatus der Kundenbestellung aus ihren Fulfillments. */
export function aggregateOrderStatus(
  statuses: FulfillmentStatus[],
): "processing" | "partially_shipped" | "shipped" | "delivered" | "cancelled" {
  const live = statuses.filter((s) => s !== "cancelled");
  if (live.length === 0) return "cancelled";
  if (live.every((s) => s === "delivered")) return "delivered";
  if (live.every((s) => s === "shipped" || s === "delivered")) return "shipped";
  if (live.some((s) => s === "shipped" || s === "delivered")) return "partially_shipped";
  return "processing";
}
