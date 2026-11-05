import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { SearchForm } from "@/components/site-header";
import { getCategories, getGuides, getHomeSections } from "@/lib/catalog";

const QUICK = [
  ["Leise Vibratoren", "/kategorie/vibratoren?lautstaerke=leise"],
  ["Gleitgel auf Wasserbasis", "/kategorie/gleitgel-pflege?basis=Wasser"],
  ["Für Paare", "/kategorie/fuer-paare"],
  ["Geschenke unter 30 €", "/suche?q=geschenk+unter+30+euro"],
  ["Latexfreie Kondome", "/kategorie/kondome?latexfrei=ja"],
] as const;

const TONES = ["bg-[#f3dbe6]", "bg-[#fde4dc]", "bg-[#e5eee6]", "bg-[#fbf1e6]", "bg-[#e6f1f4]", "bg-[#f6dce8]"];

export default async function Home() {
  const [categories, sections, guides] = await Promise.all([getCategories(), getHomeSections(), getGuides()]);

  return (
    <>
      {/* Suche zuerst */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-apricot/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-32 top-40 h-72 w-72 rounded-full bg-plum/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-10 sm:pt-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-plum">Lust auf mehr</p>
          <h1 className="mt-3 max-w-3xl font-display text-[2.6rem] leading-[1.05] tracking-tight sm:text-7xl">
            Finde, was <em className="font-normal italic text-plum">dir</em> gefällt.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Toys, Dessous und Pflege mit klaren Angaben zu Material, Inhaltsstoffen und Hersteller.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchForm large />
          </div>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Beliebte Suchen">
            {QUICK.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="block rounded-full px-4 py-2 text-sm font-medium ring-1 ring-line transition hover:bg-surface hover:ring-plum">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Orientierung: Kategorien als ungleichmäßiges Raster */}
      <section aria-labelledby="kat" className="mx-auto max-w-6xl px-4">
        <h2 id="kat" className="font-display text-3xl">Kategorien</h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {categories.map((c, i) => (
            <li key={c.slug} className={i === 0 ? "col-span-2 row-span-2" : i === 3 ? "sm:col-span-2" : ""}>
              <Link
                href={`/kategorie/${c.slug}`}
                className={`group flex h-full min-h-32 flex-col justify-between rounded-3xl p-5 ring-1 ring-line/60 transition hover:ring-plum ${TONES[i % TONES.length]} ${i === 0 ? "sm:min-h-72" : ""}`}
              >
                <span className={`font-display leading-tight ${i === 0 ? "text-4xl sm:text-5xl" : "text-xl"}`}>{c.name}</span>
                <span className="mt-4 flex items-center justify-between text-sm text-muted">
                  {c.count} Artikel
                  <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="neu" className="mx-auto mt-20 max-w-6xl px-4">
        <div className="flex items-end justify-between">
          <h2 id="neu" className="font-display text-3xl">Neu im Sortiment</h2>
          <Link href="/suche?q=&sort=neu" className="text-sm font-semibold text-plum hover:underline">
            Alle ansehen
          </Link>
        </div>
        <div className="mt-6">
          <ProductGrid items={sections.newest} />
        </div>
      </section>

      {/* Vertrauen: nur, was wir wirklich zusagen können */}
      <section className="mx-auto mt-20 max-w-6xl px-4">
        <div className="grid gap-6 rounded-[2rem] bg-ink p-8 text-surface sm:grid-cols-3 sm:p-12">
          {[
            ["Klare Angaben", "Material, Inhaltsstoffe und Herstellerangaben stehen bei jedem Artikel. Fehlt etwas, geht der Artikel nicht online."],
            ["Diskret", "Neutraler Versand wird mit jedem Lieferanten vereinbart, bevor er angebunden wird."],
            ["Ehrliche Bewertungen", "Bewerten kann nur, wer den Artikel auch gekauft hat."],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-display text-2xl text-apricot">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-surface/85">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="klein" className="mx-auto mt-20 max-w-6xl px-4">
        <h2 id="klein" className="font-display text-3xl">Kleine Freuden unter 20 €</h2>
        <div className="mt-6">
          <ProductGrid items={sections.under20} />
        </div>
      </section>

      {guides.length ? (
        <section aria-labelledby="rat" className="mx-auto mt-20 max-w-6xl px-4">
          <h2 id="rat" className="font-display text-3xl">Ratgeber</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={`/ratgeber/${g.slug}`} className="block h-full rounded-3xl bg-surface p-6 ring-1 ring-line transition hover:ring-plum">
                  <h3 className="font-display text-xl">{g.title}</h3>
                  <p className="mt-2 text-sm text-muted">{g.excerpt}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
