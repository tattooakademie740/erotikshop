import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductGrid } from "@/components/product-card";
import { getCategories, getCategory, getFacets, listProducts, type SortKey } from "@/lib/catalog";

export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/kategorie/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) return {};
  return {
    title: c.seoTitle ?? c.name,
    description: c.seoDescription ?? c.description ?? undefined,
    alternates: { canonical: `/kategorie/${c.slug}` },
  };
}

const SORTS: [SortKey, string][] = [
  ["beliebt", "Empfohlen"],
  ["preis-auf", "Preis aufsteigend"],
  ["preis-ab", "Preis absteigend"],
  ["neu", "Neueste"],
];

async function CategoryContent({ params, searchParams }: PageProps<"/kategorie/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategory(slug);
  if (!category) notFound();

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const keys = category.filterSchema.map((f) => f.key);
  const active: Record<string, string> = {};
  for (const k of keys) {
    const v = one(sp[k]);
    if (v) active[k] = v.slice(0, 60);
  }
  const sort = (SORTS.find(([k]) => k === one(sp.sort))?.[0] ?? "beliebt") as SortKey;
  const page = Number(one(sp.seite)) || 1;

  const [result, facets] = await Promise.all([
    listProducts({ categoryId: category.id, filters: active, sort, page }),
    getFacets(category.id, keys),
  ]);

  const href = (patch: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const merged = { ...active, ...(sort !== "beliebt" ? { sort } : {}), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const qs = q.toString();
    return `/kategorie/${slug}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <Breadcrumbs items={[{ name: category.name, href: `/kategorie/${slug}` }]} />
      <header className="mt-4 max-w-2xl">
        <h1 className="font-display text-4xl sm:text-5xl">{category.name}</h1>
        {category.description ? <p className="mt-3 text-muted">{category.description}</p> : null}
      </header>

      <div className="mt-8 flex flex-col gap-4">
        {category.filterSchema.length ? (
          <div className="flex flex-col gap-3" role="group" aria-label="Filter">
            {category.filterSchema.map((f) =>
              facets[f.key]?.length ? (
                <div key={f.key} className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-muted">{f.label}</span>
                  {facets[f.key].map((v) => {
                    const on = active[f.key] === v.value;
                    return (
                      <Link
                        key={v.value}
                        href={href({ [f.key]: on ? null : v.value, seite: null })}
                        aria-pressed={on}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-sm ring-1 transition ${on ? "bg-plum text-white ring-plum" : "bg-surface ring-line hover:ring-plum"}`}
                      >
                        {v.value}
                        {f.unit ? ` ${f.unit}` : ""} <span className={on ? "text-white/80" : "text-muted"}>({v.count})</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null,
            )}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
          <p className="text-sm text-muted" aria-live="polite">
            {result.total} {result.total === 1 ? "Artikel" : "Artikel"}
          </p>
          <div className="flex gap-1 overflow-x-auto no-scrollbar" aria-label="Sortierung">
            {SORTS.map(([k, label]) => (
              <Link
                key={k}
                href={href({ sort: k === "beliebt" ? null : k, seite: null })}
                aria-current={sort === k ? "true" : undefined}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${sort === k ? "bg-ink text-surface" : "hover:bg-surface"}`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        {result.items.length ? (
          <ProductGrid items={result.items} />
        ) : (
          <p className="rounded-3xl bg-surface p-8 text-center text-muted ring-1 ring-line">
            Keine Artikel mit diesen Filtern. <Link href={`/kategorie/${slug}`} className="font-semibold text-plum underline">Filter zurücksetzen</Link>
          </p>
        )}
      </div>

      {result.pages > 1 ? (
        <nav aria-label="Seiten" className="mt-10 flex justify-center gap-2">
          {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href({ seite: n === 1 ? null : String(n) })}
              aria-current={n === result.page ? "page" : undefined}
              className={`grid h-10 w-10 place-items-center rounded-full ${n === result.page ? "bg-plum text-white" : "ring-1 ring-line"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}

export default function CategoryPage(props: PageProps<"/kategorie/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <Suspense fallback={<GridSkeleton />}>
        <CategoryContent {...props} />
      </Suspense>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Lädt" className="mt-16 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-surface ring-1 ring-line" />
      ))}
    </div>
  );
}
