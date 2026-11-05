/**
 * Teilt eine Kundenbestellung in Fulfillment-Aufträge je Lieferant auf.
 * Der Kunde sieht weiterhin eine Gesamtbestellung.
 */
export type SplitItem = {
  orderItemId: number;
  supplierId: number;
  orderMode: "api" | "email" | "portal_manual";
  quantity: number;
  unitCostCents: number;
};

export type FulfillmentPlan = {
  supplierId: number;
  mode: SplitItem["orderMode"];
  items: SplitItem[];
  costCents: number;
};

export function splitOrder(items: SplitItem[]): FulfillmentPlan[] {
  const bySupplier = new Map<number, FulfillmentPlan>();
  for (const item of items) {
    let plan = bySupplier.get(item.supplierId);
    if (!plan) {
      plan = { supplierId: item.supplierId, mode: item.orderMode, items: [], costCents: 0 };
      bySupplier.set(item.supplierId, plan);
    }
    plan.items.push(item);
    plan.costCents += item.unitCostCents * item.quantity;
  }
  return [...bySupplier.values()].sort((a, b) => a.supplierId - b.supplierId);
}
