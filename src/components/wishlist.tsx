"use client";

/** Merkliste im Browser (localStorage). Kein Konto nötig. */
import { useEffect, useState, useSyncExternalStore } from "react";
import { HeartShape } from "./love-background";

const KEY = "merkliste:v1";
const listeners = new Set<() => void>();
let cache: number[] | null = null;

function readIds(): number[] {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(v) ? v.filter(Number.isInteger).slice(0, 200) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(ids: number[]) {
  cache = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* privater Modus */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: number[] = [];
export function useWishlist() {
  const ids = useSyncExternalStore(subscribe, readIds, () => EMPTY);
  return {
    ids,
    has: (id: number) => ids.includes(id),
    toggle: (id: number) => write(ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids]),
  };
}

const BURST = [
  [-22, -26], [0, -34], [22, -26], [-30, 0], [30, 0], [-18, 22], [18, 22],
];

export function WishlistButton({ productId, title, size = "sm" }: { productId: number; title: string; size?: "sm" | "lg" }) {
  const { has, toggle } = useWishlist();
  const on = has(productId);
  const [anim, setAnim] = useState(0);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `${title} von der Merkliste entfernen` : `${title} merken`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!on) setAnim((n) => n + 1);
        toggle(productId);
      }}
      className={`relative z-10 grid place-items-center rounded-full bg-surface/90 ring-1 ring-line backdrop-blur transition hover:ring-plum ${size === "lg" ? "h-14 w-14" : "h-10 w-10"}`}
    >
      <span key={anim} className={anim ? "pop" : ""}>
        <HeartShape className={`${size === "lg" ? "h-7 w-7" : "h-5 w-5"} transition-colors ${on ? "text-[#c2386d]" : "text-transparent [&_path]:stroke-ink [&_path]:stroke-[1.8]"}`} />
      </span>
      {anim > 0 && on
        ? BURST.map(([bx, by], i) => (
            <span
              key={`${anim}-${i}`}
              aria-hidden
              className="burst pointer-events-none absolute h-2 w-2 rounded-full bg-[#e0729b]"
              style={{ "--bx": `${bx}px`, "--by": `${by}px` } as React.CSSProperties}
            />
          ))
        : null}
    </button>
  );
}

export function WishlistBadge() {
  const { ids } = useWishlist();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  if (!mounted || ids.length === 0) return null;
  return (
    <span key={ids.length} className="pop absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#c2386d] px-1 text-[11px] font-bold text-white">
      {ids.length}
      <span className="sr-only"> gemerkte Artikel</span>
    </span>
  );
}
