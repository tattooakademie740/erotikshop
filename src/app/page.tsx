import Link from "next/link";
import { HeartShape, LoveBackground } from "@/components/love-background";
import { CategoryMarquee } from "@/components/marquee";
import { Reveal, RotatingWord } from "@/components/motion";
import { ProductCard } from "@/components/product-card";
import { ProductVisual } from "@/components/product-visual";
import { SearchForm } from "@/components/site-header";
import { getCategories, getGuides, getHomeSections } from "@/lib/catalog";

const QUICK = [
  ["Leise Vibratoren", "/kategorie/vibratoren?lautstaerke=leise"],
  ["Gleitgel auf Wasserbasis", "/kategorie/gleitgel-pflege?basis=Wasser"],
  ["Für Paare", "/kategorie/fuer-paare"],
  ["Geschenke unter 30 €", "/suche?q=geschenk+unter+30+euro"],
  ["Latexfreie Kondome", "/kategorie/kondome?latexfrei=ja"],
] as const;

/** Farbe und Form je Kategorie-Kachel */
const TILE: Record<string, { bg: string; shape: string }> = {
  vibratoren: { bg: "bg-[#f3dbe6]", shape: "demo:wave:Pflaume" },
  dildos: { bg: "bg-[#fde4dc]", shape: "demo:pill:Koralle" },
  "fuer-paare": { bg: "bg-[#e5eee6]", shape: "demo:arc:Salbei" },
  "fuer-ihn": { bg: "bg-[#ece4e8]", shape: "demo:ring:Schwarz" },
  dessous: { bg: "bg-[#f5dfe2]", shape: "demo:fold:Weinrot" },
  "gleitgel-pflege": { bg: "bg-[#e6f1f4]", shape: "demo:drop:Klar" },
  massage: { bg: "bg-[#faefd9]", shape: "demo:orb:Gold" },
  kondome: { bg: "bg-[#f7ecdf]", shape: "demo:box:Natur" },
  "fetisch-bondage": { bg: "bg-[#ece4e8]", shape: "demo:ring:Schwarz" },
  "geschenke-sets": { bg: "bg-[#f6dce8]", shape: "demo:box:Beere" },
};

export default async function Home() {
  const [categories, sections, guides] = await Promise.all([getCategories(), getHomeSections(), getGuides()]);

  return (
    <>
      {/* Suche zuerst, eingebettet in einen lebendigen Hintergrund */}
      <section className="relative isolate overflow-hidden">
        <LoveBackground />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:pb-28 sm:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full bg-surface/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-plum ring-1 ring-line backdrop-blur">
            <HeartShape className="h-3.5 w-3.5 text-[#c2386d]" /> Mit Liebe ausgesucht
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-[2.9rem] leading-[1.02] tracking-tight sm:text-8xl">
            Finde, was <RotatingWord words={["dir", "euch", "uns", "heute"]} />
            <br className="hidden sm:block" /> gefällt.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink/80">
            Toys, Dessous und Pflege mit klaren Angaben zu Material, Inhaltsstoffen und Hersteller.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchForm large />
          </div>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Beliebte Suchen">
            {QUICK.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="block rounded-full bg-surface/70 px-4 py-2 text-sm font-medium ring-1 ring-line backdrop-blur transition hover:-translate-y-0.5 hover:bg-surface hover:ring-plum">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CategoryMarquee items={categories} />

      {/* Orientierung: Kategorien als ungleichmäßiges Raster mit schwebenden Formen */}
      <section aria-labelledby="kat" className="mx-auto mt-20 max-w-6xl px-4">
        <Reveal>
          <h2 id="kat" className="font-display text-4xl sm:text-5xl">Wonach ist dir?</h2>
        </Reveal>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {categories.map((c, i) => {
            const t = TILE[c.slug] ?? { bg: "bg-surface", shape: "demo:orb:Creme" };
            const big = i === 0;
            return (
              <Reveal as="li" key={c.slug} delay={(i % 4) * 70} className={big ? "col-span-2 row-span-2" : i === 3 ? "sm:col-span-2" : ""}>
                <Link
                  href={`/kategorie/${c.slug}`}
                  className={`lift group relative flex h-full min-h-36 flex-col justify-between overflow-hidden rounded-3xl p-5 ring-1 ring-line/60 hover:ring-plum ${t.bg} ${big ? "sm:min-h-80" : ""}`}
                >
                  <div aria-hidden className={`absolute -bottom-6 -right-6 transition duration-700 group-hover:-rotate-6 group-hover:scale-110 ${big ? "h-56 w-56 sm:h-72 sm:w-72" : "h-28 w-28"}`}>
                    <ProductVisual src={t.shape} alt="" className="[&>rect]:fill-transparent [&>circle]:hidden" />
                  </div>
                  <span className={`relative font-display leading-tight ${big ? "text-4xl sm:text-6xl" : "text-xl"}`}>{c.name}</span>
                  <span className="relative mt-4 flex items-center gap-2 text-sm text-ink/75">
                    {c.count} Artikel
                    <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="neu" className="mx-auto mt-24 max-w-6xl px-4">
        <Reveal className="flex items-end justify-between">
          <h2 id="neu" className="font-display text-4xl sm:text-5xl">Frisch eingetroffen</h2>
          <Link href="/suche" className="text-sm font-semibold text-plum hover:underline">
            Alle ansehen
          </Link>
        </Reveal>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {sections.newest.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 4) * 80}>
              <ProductCard p={p} />
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Für zwei: dunkle, warme Bühne mit leuchtendem Ring */}
      <section className="mx-auto mt-24 max-w-6xl px-4">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-[#22101c] px-6 py-14 text-surface sm:px-14 sm:py-20">
            <div aria-hidden className="spin-slow absolute -right-40 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-[conic-gradient(from_0deg,#6b1d4c,#f0b08a,#c2386d,#6b1d4c)] opacity-50 blur-3xl" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_80%,rgba(194,56,109,0.35),transparent_55%)]" />
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-apricot">Für zwei</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight sm:text-6xl">
              Mehr Nähe. Mehr Spiel. <em className="font-normal italic text-apricot">Mehr ihr.</em>
            </h2>
            <p className="mt-4 max-w-lg text-surface/85">
              Paarvibratoren, Massageöle, Spielkarten und kleine Überraschungen für gemeinsame Abende.
            </p>
            <Link href="/kategorie/fuer-paare" className="pulse-ring mt-8 inline-flex items-center gap-2 rounded-full bg-apricot px-7 py-4 font-semibold text-ink transition hover:bg-[#f6c3a4]">
              <HeartShape className="h-4 w-4 text-plum" /> Für Paare entdecken
            </Link>
          </div>
        </Reveal>
      </section>

      <section aria-labelledby="klein" className="mx-auto mt-24 max-w-6xl px-4">
        <Reveal>
          <h2 id="klein" className="font-display text-4xl sm:text-5xl">Kleine Freuden unter 20 €</h2>
        </Reveal>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {sections.under20.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 4) * 80}>
              <ProductCard p={p} />
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Vertrauen: nur, was wirklich zugesagt werden kann */}
      <section className="mx-auto mt-24 max-w-6xl px-4">
        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            ["Klare Angaben", "Material, Inhaltsstoffe und Herstellerangaben stehen bei jedem Artikel. Fehlt etwas, geht der Artikel nicht online."],
            ["Diskret", "Neutraler Versand wird mit jedem Lieferanten vereinbart, bevor er angebunden wird."],
            ["Ehrliche Bewertungen", "Bewerten kann nur, wer den Artikel auch gekauft hat."],
          ].map(([t, d], i) => (
            <Reveal as="li" key={t} delay={i * 100} className="rounded-3xl bg-surface p-7 ring-1 ring-line">
              <HeartShape className="float-soft h-8 w-8 text-[#c2386d]" />
              <h3 className="mt-4 font-display text-2xl">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
            </Reveal>
          ))}
        </ul>
      </section>

      {guides.length ? (
        <section aria-labelledby="rat" className="mx-auto mt-24 max-w-6xl px-4">
          <Reveal>
            <h2 id="rat" className="font-display text-4xl sm:text-5xl">Ratgeber</h2>
          </Reveal>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {guides.map((g, i) => (
              <Reveal as="li" key={g.slug} delay={i * 100}>
                <Link href={`/ratgeber/${g.slug}`} className="lift block h-full rounded-3xl bg-surface p-7 ring-1 ring-line hover:ring-plum">
                  <p className="text-xs font-bold uppercase tracking-widest text-plum">Ratgeber</p>
                  <h3 className="mt-3 font-display text-2xl">{g.title}</h3>
                  <p className="mt-2 text-sm text-muted">{g.excerpt}</p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
