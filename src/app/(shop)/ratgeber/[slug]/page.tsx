import { atLeastOne } from "@/lib/static-params";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getGuide, getGuides } from "@/lib/catalog";

export async function generateStaticParams() {
  return atLeastOne(await getGuides());
}

export async function generateMetadata({ params }: PageProps<"/ratgeber/[slug]">): Promise<Metadata> {
  const g = await getGuide((await params).slug);
  return g ? { title: g.seoTitle ?? g.title, description: g.seoDescription ?? g.excerpt ?? undefined, alternates: { canonical: `/ratgeber/${g.slug}` } } : {};
}

async function Guide({ params }: PageProps<"/ratgeber/[slug]">) {
  const g = await getGuide((await params).slug);
  if (!g) notFound();
  return (
    <article>
      <Breadcrumbs items={[{ name: "Ratgeber", href: "/ratgeber" }, { name: g.title, href: `/ratgeber/${g.slug}` }]} />
      <h1 className="mt-4 font-display text-5xl leading-tight">{g.title}</h1>
      {g.excerpt ? <p className="mt-4 text-xl text-muted">{g.excerpt}</p> : null}
      <div className="mt-8 whitespace-pre-line leading-relaxed">{g.body}</div>
    </article>
  );
}

export default function GuidePage(props: PageProps<"/ratgeber/[slug]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <Suspense fallback={null}>
        <Guide {...props} />
      </Suspense>
    </div>
  );
}
