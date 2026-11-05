import { describe, expect, it } from "vitest";
import { splitOrder } from "./order-split";
import { aggregateOrderStatus, assertTransition, canTransition, nextRetryDelayMs } from "./fulfillment-state";

describe("splitOrder", () => {
  it("teilt 5 Artikel von 3 Lieferanten in 3 Aufträge", () => {
    const items = [
      { orderItemId: 1, supplierId: 1, orderMode: "api" as const, quantity: 1, unitCostCents: 500 },
      { orderItemId: 2, supplierId: 1, orderMode: "api" as const, quantity: 2, unitCostCents: 300 },
      { orderItemId: 3, supplierId: 2, orderMode: "email" as const, quantity: 1, unitCostCents: 900 },
      { orderItemId: 4, supplierId: 3, orderMode: "portal_manual" as const, quantity: 1, unitCostCents: 100 },
      { orderItemId: 5, supplierId: 3, orderMode: "portal_manual" as const, quantity: 1, unitCostCents: 200 },
    ];
    const plans = splitOrder(items);
    expect(plans).toHaveLength(3);
    expect(plans[0].items.map((i) => i.orderItemId)).toEqual([1, 2]);
    expect(plans[0].costCents).toBe(1100);
    expect(plans[2].mode).toBe("portal_manual");
  });
});

describe("Fulfillment-Zustände", () => {
  it("erlaubt nur gültige Übergänge", () => {
    expect(canTransition("pending", "submitted")).toBe(true);
    expect(canTransition("delivered", "pending")).toBe(false);
    expect(() => assertTransition("shipped", "pending")).toThrow();
  });
  it("Backoff wächst und ist gedeckelt", () => {
    expect(nextRetryDelayMs(1)).toBe(60_000);
    expect(nextRetryDelayMs(3)).toBe(240_000);
    expect(nextRetryDelayMs(30)).toBe(6 * 60 * 60_000);
  });
  it("Gesamtstatus der Bestellung", () => {
    expect(aggregateOrderStatus(["shipped", "pending"])).toBe("partially_shipped");
    expect(aggregateOrderStatus(["shipped", "delivered"])).toBe("shipped");
    expect(aggregateOrderStatus(["delivered", "cancelled"])).toBe("delivered");
    expect(aggregateOrderStatus(["cancelled"])).toBe("cancelled");
  });
});
