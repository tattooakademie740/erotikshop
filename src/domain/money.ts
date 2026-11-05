/** Geld wird intern immer in Cent gerechnet. */
export type Cents = number;

const fmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatEuro(cents: Cents): string {
  return fmt.format(cents / 100);
}

/** Bruttopreis aus Netto (Standardsatz DE 19 %). */
export function gross(netCents: Cents, vatPercent = 19): Cents {
  return Math.round(netCents * (1 + vatPercent / 100));
}

export function net(grossCents: Cents, vatPercent = 19): Cents {
  return Math.round(grossCents / (1 + vatPercent / 100));
}
