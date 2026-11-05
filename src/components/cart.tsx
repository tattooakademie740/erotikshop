"use client";

/**
 * Warenkorb im Browser (localStorage). Preise werden auf der Warenkorbseite
 * immer serverseitig neu geladen, nie aus dem Browser übernommen.
 */
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { variantId: number; qty: number };

type Ctx = {
  lines: CartLine[];
  count: number;
  add: (variantId: number, qty?: number) => void;
  setQty: (variantId: number, qty: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<Ctx | null>(null);
const KEY = "cart:v1";

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((l) => Number.isInteger(l?.variantId) && Number.isInteger(l?.qty) && l.qty > 0).slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Nach dem ersten Rendern aus dem Speicher laden (Server kennt den Warenkorb nicht).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLines(read());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* privater Modus: Warenkorb bleibt nur für diese Seite erhalten */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.qty, 0),
      add: (variantId, qty = 1) => {
        const cur = read();
        const hit = cur.find((l) => l.variantId === variantId);
        persist(
          hit
            ? cur.map((l) => (l.variantId === variantId ? { ...l, qty: Math.min(10, l.qty + qty) } : l))
            : [...cur, { variantId, qty }],
        );
      },
      setQty: (variantId, qty) =>
        persist(read().map((l) => (l.variantId === variantId ? { ...l, qty: Math.max(1, Math.min(10, qty)) } : l))),
      remove: (variantId) => persist(read().filter((l) => l.variantId !== variantId)),
      clear: () => persist([]),
    }),
    [lines, ready, persist],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const c = useContext(CartContext);
  if (!c) throw new Error("useCart außerhalb von CartProvider");
  return c;
}

export function CartBadge() {
  const { count, ready } = useCart();
  return (
    <span aria-live="polite" className="tabular-nums">
      {ready && count > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-plum px-1 text-[11px] font-bold text-white">
          {count}
          <span className="sr-only"> Artikel im Warenkorb</span>
        </span>
      ) : null}
    </span>
  );
}

export function AddToCart({ variantId, disabled }: { variantId: number; disabled?: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          add(variantId);
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        }}
        className="h-14 flex-1 rounded-full bg-plum px-6 text-base font-semibold text-white transition hover:bg-plum-hover disabled:cursor-not-allowed disabled:bg-muted"
      >
        {disabled ? "Derzeit nicht lieferbar" : added ? "Im Warenkorb ✓" : "In den Warenkorb"}
      </button>
      <Link
        href="/warenkorb"
        onClick={() => !disabled && add(variantId)}
        aria-disabled={disabled}
        className={`grid h-14 flex-1 place-items-center rounded-full px-6 text-base font-semibold ring-2 ring-plum text-plum transition hover:bg-plum/5 ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        Sofort kaufen
      </Link>
      <span role="status" className="sr-only">
        {added ? "Artikel wurde in den Warenkorb gelegt" : ""}
      </span>
    </div>
  );
}
