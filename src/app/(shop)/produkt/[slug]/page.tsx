import { atLeastOne } from "@/lib/static-params";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AddToCart } from "@/components/cart";
import { Price } from "@/components/price";
import { ProductGrid } from "@/components/product-card";
import { ProductVisual } from "@/components/product-visual";
import { WishlistButton } from "@/components/wishlist";
import { SHOP } from "@/config/shop";
import { formatEuro } from "@/domain/money";
import { getProduct, getRelated, listProducts } from "@/lib/catalog";

const LABELS: Record<string, string> = {
  material: "Material",
  farbe: "Farbe",
  antrieb: "Energie",
  wasserdicht: "Wasserdicht",
  lautstaerke: "Lautstärke",
  laenge_cm: "Länge (cm)",
  basis: "Basis",
  inhaltsstoffe: "Inhaltsstoffe",
  duft: "Duft",
  breite_mm: "Nominale Breite (mm)",
  latexfrei: "Latexfrei",
  groesse: "Größen",
};

export async function generateStaticParams() {
  // Einige Artikel vorab rendern, der Rest entsteht beim ersten Aufruf.
  const { items } = await listProducts({ perPage: 12 });
  return atLeastOne(items);
}

export async function generateMetadata({ params }: PageProps<"/produkt/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) return {};
  const p = data.product;
  return {
    title: p.seoTitle ?? p.title,
    description: p.seoDescription ?? p.shortDescription ?? undefined,
    alternates: { canonical: `/produkt/${p.slug}` },
  };
}

async function ProductContent({ params }: PageProps<"/produkt/[slug]">) {
  const { slug } = await params;
  const data = await getProduct(slug);
  if (!data) notFound();
  const { product: p, brand, category, variants, images } = data;
  const v = variants[0];
  if (!v) notFound();
  const inStock = p.status === "active" && v.stock > 0;
  const related = await getRelated(p.id, p.categoryId);
  const attrs = Object.entries(p.attributes).filter(([k]) => LABELS[k]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.shortDescription ?? undefined,
    sku: v.sku,
    gtin: v.gtin ?? undefined,
    brand: brand ? { "@type": "Brand", name: brand.name } : undefined,
    offers: {
      "@type": "Offer",
      url: new URL(`/produkt/${p.slug}`, SHOP.url).toString(),
      priceCurrency: "EUR",
      price: (v.priceCents / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <Breadcrumbs
        items={[
          ...(category ? [{ name: category.name, href: `/kategorie/${category.slug}` }] : []),
          { name: p.title, href: `/produkt/${p.slug}` },
        ]}
      />
      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative overflow-hidden rounded-[2rem] ring-1 ring-line lg:sticky lg:top-36 lg:self-start">
          <div className="aspect-square">
            <ProductVisual src={images[0]?.url ?? null} alt={images[0]?.alt ?? p.title} />
          </div>
          {p.isDemo ? (
            <span className="absolute left-4 top-4 rounded-full bg-ink px-3 py-1 text-xs font-bold tracking-wide text-surface">
              DEMO-ARTIKEL
            </span>
          ) : null}
        </div>

        <div>
          {brand ? <p className="text-sm font-semibold uppercase tracking-wider text-muted">{brand.name}</p> : null}
          <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">{p.title}</h1>
          {p.shortDescription ? <p className="mt-3 text-lg text-muted">{p.shortDescription}</p> : null}

          <div className="mt-6">
            <Price cents={v.priceCents} rrpCents={v.rrpCents} unitContent={v.unitContent} unitMeasure={v.unitMeasure} size="lg" />
            <p className="mt-1 text-xs text-muted">inkl. MwSt., zzgl. Versand ({formatEuro(SHOP.shippingCents)}, ab {formatEuro(SHOP.freeShippingFromCents)} versandkostenfrei)</p>
          </div>

          <p className={`mt-4 flex items-center gap-2 text-sm font-medium ${inStock ? "text-[#2f6b3a]" : "text-rust"}`}>
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${inStock ? "bg-[#2f6b3a]" : "bg-rust"}`} />
            {inStock
              ? `Auf Lager, Lieferzeit ${v.deliveryDaysMin ?? 2} bis ${v.deliveryDaysMax ?? 5} Werktage`
              : "Derzeit nicht lieferbar"}
          </p>

          <div className="mt-6 flex items-start gap-3">
            <div className="flex-1">
              <AddToCart variantId={v.id} disabled={!inStock} />
            </div>
            <WishlistButton productId={p.id} title={p.title} size="lg" />
          </div>

          <ul className="mt-6 grid gap-2 rounded-3xl bg-surface p-5 text-sm ring-1 ring-line">
            <li>Diskreter Versand: Neutralität wird vor jeder Lieferantenanbindung vertraglich geklärt.</li>
            <li>Rückgabe: Hinweise zum Widerruf, auch zu versiegelten Hygieneartikeln, stehen in der <Link className="font-semibold text-plum underline" href="/rechtliches/widerruf">Widerrufsbelehrung</Link>.</li>
          </ul>

          <div className="mt-10 space-y-8">
            {p.description ? (
              <section>
                <h2 className="font-display text-2xl">Beschreibung</h2>
                <p className="mt-3 leading-relaxed text-ink/90">{p.description}</p>
              </section>
            ) : null}

            {attrs.length ? (
              <section>
                <h2 className="font-display text-2xl">Technische Daten</h2>
                <dl className="mt-3 divide-y divide-line rounded-3xl bg-surface ring-1 ring-line">
                  {attrs.map(([k, val]) => (
                    <div key={k} className="grid grid-cols-2 gap-4 px-5 py-3 text-sm">
                      <dt className="text-muted">{LABELS[k]}</dt>
                      <dd>{String(val)}</dd>
                    </div>
                  ))}
                  {v.gtin ? (
                    <div className="grid grid-cols-2 gap-4 px-5 py-3 text-sm">
                      <dt className="text-muted">EAN</dt>
                      <dd className="tabular-nums">{v.gtin.replace(/^0+/, "")}</dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            <section>
              <h2 className="font-display text-2xl">Sicherheit und Hersteller</h2>
              <div className="mt-3 space-y-2 text-sm text-ink/90">
                <p>{p.safetyInfo ?? "Sicherheitshinweise des Herstellers werden ergänzt, sobald sie vom Lieferanten vorliegen."}</p>
                {brand?.manufacturerName ? (
                  <p>
                    <span className="text-muted">Hersteller: </span>
                    {brand.manufacturerName}
                  </p>
                ) : null}
              </div>
            </section>

            <section>
              <h2 className="font-display text-2xl">Bewertungen</h2>
              <p className="mt-3 text-sm text-muted">Noch keine Bewertungen. Bewerten kann nur, wer diesen Artikel gekauft hat.</p>
            </section>
          </div>
        </div>
      </div>

      {related.length ? (
        <section aria-labelledby="aehnlich" className="mt-20">
          <h2 id="aehnlich" className="font-display text-3xl">Das könnte dir auch gefallen</h2>
          <div className="mt-6">
            <ProductGrid items={related} />
          </div>
        </section>
      ) : null}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}

export default function ProductPage(props: PageProps<"/produkt/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <Suspense fallback={<div aria-busy="true" className="mt-10 aspect-square max-w-xl animate-pulse rounded-[2rem] bg-surface ring-1 ring-line" />}>
        <ProductContent {...props} />
      </Suspense>
    </div>
  );
}
