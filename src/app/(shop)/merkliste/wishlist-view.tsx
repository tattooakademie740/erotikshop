"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { HeartShape } from "@/components/love-background";
import { useWishlist } from "@/components/wishlist";
import type { ProductCard as Card } from "@/lib/catalog";
import { getWishlistProducts } from "./actions";

export function WishlistView() {
  const { ids } = useWishlist();
  const [items, setItems] = useState<Card[] | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    let cancelled = false;
    getWishlistProducts(key ? key.split(",").map(Number) : []).then((r) => !cancelled && setItems(r));
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (items === null) return <p className="text-muted" aria-busy="true">Merkliste wird geladen …</p>;
  // Entfernte Artikel sofort ausblenden, ohne auf den Server zu warten
  const visible = items.filter((p) => ids.includes(p.id));
  if (visible.length === 0)
    return (
      <div className="rounded-3xl bg-surface p-10 text-center ring-1 ring-line">
        <HeartShape className="float-soft mx-auto h-12 w-12 text-[#e0729b]" />
        <p className="mt-4 font-display text-2xl">Noch nichts gemerkt.</p>
        <p className="mt-2 text-muted">Tippe auf das Herz bei einem Artikel, um ihn hier zu sammeln.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-plum px-6 py-3 font-semibold text-white hover:bg-plum-hover">
          Stöbern
        </Link>
      </div>
    );
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {visible.map((p) => (
        <li key={p.id}>
          <ProductCard p={p} />
        </li>
      ))}
    </ul>
  );
}
