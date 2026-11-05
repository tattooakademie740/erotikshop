import Link from "next/link";
import { SHOP } from "@/config/shop";
import { getCategories } from "@/lib/catalog";
import { CartBadge } from "./cart";
import { HeartShape } from "./love-background";
import { WishlistBadge } from "./wishlist";

export function SearchForm({ defaultValue, large = false }: { defaultValue?: string; large?: boolean }) {
  return (
    <form action="/suche" role="search" className="relative w-full">
      <label htmlFor={large ? "q-hero" : "q"} className="sr-only">
        Suche
      </label>
      <input
        id={large ? "q-hero" : "q"}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={large ? "Wonach suchst du? z. B. leiser Vibrator unter 40 €" : "Suchen"}
        autoComplete="off"
        enterKeyHint="search"
        className={`w-full rounded-full bg-surface pl-5 pr-14 text-ink ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-plum ${large ? "h-16 text-lg" : "h-11 text-[15px]"}`}
      />
      <button
        type="submit"
        aria-label="Suche starten"
        className={`absolute right-1.5 top-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-plum text-white hover:bg-plum-hover ${large ? "h-13 w-13" : "h-8 w-8"}`}
      >
        <svg viewBox="0 0 24 24" className={large ? "h-6 w-6" : "h-4 w-4"} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

export async function SiteHeader() {
  const categories = await getCategories();
  return (
    <header className="z-40 border-b border-line bg-bg/90 backdrop-blur md:sticky md:top-0">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-1.5 font-display text-2xl font-semibold tracking-tight text-plum">
          <HeartShape className="h-5 w-5 text-[#c2386d] transition group-hover:scale-125" />
          {SHOP.name}
        </Link>
        <div className="ml-auto hidden flex-1 md:block md:max-w-md">
          <SearchForm />
        </div>
        <Link href="/ratgeber" className="ml-auto hidden text-sm font-medium hover:text-plum sm:block md:ml-0">
          Ratgeber
        </Link>
        <Link href="/merkliste" className="relative ml-auto grid h-11 w-11 place-items-center rounded-full ring-1 ring-line hover:ring-plum sm:ml-0" aria-label="Merkliste">
          <HeartShape className="h-5 w-5 text-transparent [&_path]:stroke-ink [&_path]:stroke-[1.8]" />
          <WishlistBadge />
        </Link>
        <Link href="/warenkorb" className="relative grid h-11 w-11 place-items-center rounded-full ring-1 ring-line hover:ring-plum sm:ml-0" aria-label="Warenkorb">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
          </svg>
          <CartBadge />
        </Link>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
        <SearchForm />
      </div>
      <nav aria-label="Kategorien" className="mx-auto max-w-6xl">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
          {categories.map((c) => (
            <li key={c.slug} className="shrink-0">
              <Link
                href={`/kategorie/${c.slug}`}
                className="block rounded-full bg-surface px-4 py-2 text-sm font-medium ring-1 ring-line transition hover:bg-plum hover:text-white hover:ring-plum"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
