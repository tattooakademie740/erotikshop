"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart";
import { ProductVisual } from "@/components/product-visual";
import { SHOP } from "@/config/shop";
import { formatEuro } from "@/domain/money";
import { getCartLines } from "./actions";

type Line = Awaited<ReturnType<typeof getCartLines>>[number];

export function CartView() {
  const { lines, ready, setQty, remove } = useCart();
  const [details, setDetails] = useState<Line[] | null>(null);
  const key = lines.map((l) => l.variantId).sort().join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    getCartLines(key ? key.split(",").map(Number) : []).then((d) => !cancelled && setDetails(d));
    return () => {
      cancelled = true;
    };
  }, [key, ready]);

  if (!ready || details === null) return <p className="text-muted" aria-busy="true">Warenkorb wird geladen …</p>;

  const rows = lines
    .map((l) => ({ ...l, d: details.find((d) => d.variantId === l.variantId) }))
    .filter((r): r is typeof r & { d: Line } => !!r.d);
  const missing = lines.length - rows.length;

  if (rows.length === 0)
    return (
      <div className="rounded-3xl bg-surface p-10 text-center ring-1 ring-line">
        <p className="font-display text-2xl">Dein Warenkorb ist leer.</p>
        <Link href="/" className="mt-4 inline-block rounded-full bg-plum px-6 py-3 font-semibold text-white hover:bg-plum-hover">
          Weiter stöbern
        </Link>
      </div>
    );

  const subtotal = rows.reduce((n, r) => n + r.d.priceCents * r.qty, 0);
  const shipping = subtotal >= SHOP.freeShippingFromCents ? 0 : SHOP.shippingCents;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {missing > 0 ? (
          <p role="alert" className="mb-4 rounded-2xl bg-[#fde4dc] p-4 text-sm">
            {missing} Artikel {missing === 1 ? "ist" : "sind"} nicht mehr verfügbar und wurde ausgeblendet.
          </p>
        ) : null}
        <ul className="divide-y divide-line rounded-3xl bg-surface ring-1 ring-line">
          {rows.map((r) => (
            <li key={r.variantId} className="flex gap-4 p-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
                <ProductVisual src={r.d.image} alt={r.d.title} />
              </div>
              <div className="flex flex-1 flex-col">
                <Link href={`/produkt/${r.d.slug}`} className="font-display text-lg leading-snug hover:text-plum">
                  {r.d.title}
                </Link>
                <p className="text-sm text-muted tabular-nums">{formatEuro(r.d.priceCents)} je Stück</p>
                {r.qty > r.d.stock ? <p className="text-sm text-rust">Nur noch {r.d.stock} verfügbar</p> : null}
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-full ring-1 ring-line">
                    <button type="button" aria-label="Menge verringern" onClick={() => setQty(r.variantId, r.qty - 1)} className="h-10 w-10 rounded-full hover:bg-bg">−</button>
                    <span className="w-8 text-center tabular-nums" aria-label={`Menge ${r.qty}`}>{r.qty}</span>
                    <button type="button" aria-label="Menge erhöhen" onClick={() => setQty(r.variantId, r.qty + 1)} className="h-10 w-10 rounded-full hover:bg-bg">+</button>
                  </div>
                  <button type="button" onClick={() => remove(r.variantId)} className="text-sm text-muted underline hover:text-rust">
                    Entfernen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="h-fit rounded-3xl bg-surface p-6 ring-1 ring-line lg:sticky lg:top-40">
        <h2 className="font-display text-2xl">Übersicht</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Zwischensumme</dt><dd className="tabular-nums">{formatEuro(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Versand</dt><dd className="tabular-nums">{shipping ? formatEuro(shipping) : "kostenlos"}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Gesamt</dt><dd className="tabular-nums">{formatEuro(subtotal + shipping)}</dd></div>
        </dl>
        <p className="mt-1 text-xs text-muted">inkl. MwSt.</p>
        {shipping ? (
          <p className="mt-3 text-sm text-muted">Noch {formatEuro(SHOP.freeShippingFromCents - subtotal)} bis zum kostenlosen Versand.</p>
        ) : null}
        <button type="button" disabled className="mt-6 h-14 w-full rounded-full bg-muted font-semibold text-white">
          Zur Kasse
        </button>
        <p className="mt-3 text-xs text-muted">
          Die Kasse folgt, sobald ein Zahlungsanbieter für Erotikartikel bestätigt ist. Im Demo-Shop sind keine Bestellungen möglich.
        </p>
      </aside>
    </div>
  );
}
