import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product-card";
import { SearchForm } from "@/components/site-header";
import { formatEuro } from "@/domain/money";
import { listProducts } from "@/lib/catalog";
import { searchProducts } from "@/lib/search";

export const metadata: Metadata = { title: "Suche", robots: { index: false } };

async function Results({ searchParams }: PageProps<"/suche">) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 200) ?? "";
  const { parsed, items } = q
    ? await searchProducts(q)
    : { parsed: { terms: [] as string[] }, items: (await listProducts({ sort: "neu", perPage: 48 })).items };

  return (
    <>
      <div className="max-w-2xl">
        <SearchForm defaultValue={q} large />
      </div>
      <div className="mt-6" aria-live="polite">
        {q ? (
          <p className="text-muted">
            {items.length} Treffer für <strong className="text-ink">„{q}“</strong>
            {"maxCents" in parsed && parsed.maxCents ? ` · bis ${formatEuro(parsed.maxCents)}` : ""}
            {"minCents" in parsed && parsed.minCents ? ` · ab ${formatEuro(parsed.minCents)}` : ""}
          </p>
        ) : (
          <p className="text-muted">Alle Artikel, neueste zuerst.</p>
        )}
      </div>
      <div className="mt-6">
        {items.length ? (
          <ProductGrid items={items} />
        ) : (
          <div className="rounded-3xl bg-surface p-8 ring-1 ring-line">
            <p className="font-display text-2xl">Nichts gefunden.</p>
            <p className="mt-2 text-muted">Versuch es mit einem allgemeineren Begriff oder stöbere in den Kategorien.</p>
            <Link href="/" className="mt-4 inline-block font-semibold text-plum underline">Zur Startseite</Link>
          </div>
        )}
      </div>
    </>
  );
}

export default function SearchPage(props: PageProps<"/suche">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="sr-only">Suche</h1>
      <Suspense fallback={<p className="text-muted">Suche läuft …</p>}>
        <Results {...props} />
      </Suspense>
    </div>
  );
}
