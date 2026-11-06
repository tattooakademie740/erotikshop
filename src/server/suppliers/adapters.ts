/**
 * Lieferanten-Adapter: wie eine Bestellung beim Lieferanten ankommt.
 *
 * - email: funktioniert mit jedem Lieferanten, der Bestellungen per E-Mail annimmt.
 * - portal_manual: Bestellung muss im Händlerportal von Hand ausgelöst werden.
 *   Das System erstellt eine Aufgabe mit allen Daten.
 * - api: nur für Lieferanten mit dokumentierter Bestell-API. Es gibt hier bewusst
 *   noch keinen einzigen API-Adapter, weil keine Lieferanten-API verifiziert ist.
 *   Neue Adapter werden in API_ADAPTERS registriert.
 */
import type { SupplierOrderLine, MailAddress } from "@/domain/emails";

export type SubmitContext = {
  supplier: { id: number; slug: string; name: string; orderEmail: string | null; credentialsEnv: string | null; config: Record<string, unknown> };
  fulfillmentId: number;
  orderNumber: number;
  lines: SupplierOrderLine[];
  address: MailAddress;
};

export type SubmitResult =
  | { status: "submitted"; externalRef: string }
  | { status: "needs_manual"; reason: string };

export interface ApiOrderAdapter {
  submitOrder(ctx: SubmitContext): Promise<SubmitResult>;
  /** Liefert Sendungsdaten, sobald vorhanden. */
  fetchTracking?(externalRef: string, ctx: SubmitContext["supplier"]): Promise<{ carrier?: string; trackingNumber: string; trackingUrl?: string } | null>;
}

/** Registrierte API-Adapter je Lieferanten-Slug. Leer, bis eine API dokumentiert vorliegt. */
export const API_ADAPTERS: Record<string, ApiOrderAdapter> = {};

export class NoApiAdapterError extends Error {
  constructor(slug: string) {
    super(`Für Lieferant "${slug}" ist keine Bestell-API angebunden.`);
  }
}
