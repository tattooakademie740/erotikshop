import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog";
import { Price } from "./price";
import { ProductVisual } from "./product-visual";
import { WishlistButton } from "./wishlist";

export function ProductCard({ p }: { p: Card }) {
  return (
    <article className="lift group relative flex h-full flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-line transition hover:ring-plum/40">
      <div className="relative aspect-square overflow-hidden">
        <ProductVisual src={p.image} alt={p.title} className="transition duration-500 group-hover:scale-[1.03]" />
        {p.isDemo ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold tracking-wide text-surface">
            DEMO
          </span>
        ) : null}
        <div className="absolute bottom-3 right-3">
          <WishlistButton productId={p.id} title={p.title} />
        </div>
        {!p.inStock ? (
          <span className="absolute right-3 top-3 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line">
            Ausverkauft
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {p.brand ? <p className="text-xs font-medium uppercase tracking-wider text-muted">{p.brand}</p> : null}
        <h3 className="font-display text-lg leading-snug">
          <Link href={`/produkt/${p.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {p.title}
          </Link>
        </h3>
        {p.shortDescription ? <p className="line-clamp-2 text-sm text-muted">{p.shortDescription}</p> : null}
        <div className="mt-auto pt-2">
          <Price cents={p.priceCents} rrpCents={p.rrpCents} unitContent={p.unitContent} unitMeasure={p.unitMeasure} />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items }: { items: Card[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {items.map((p) => (
        <li key={p.id} className="flex">
          <div className="w-full">
            <ProductCard p={p} />
          </div>
        </li>
      ))}
    </ul>
  );
}
