import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PHOTOS } from "@/config/photos";

const PAGES: Record<string, string> = {
  impressum: "Impressum",
  datenschutz: "Datenschutzerklärung",
  agb: "Allgemeine Geschäftsbedingungen",
  widerruf: "Widerrufsbelehrung",
  versand: "Versand & Zahlung",
  jugendschutz: "Jugendschutz",
  bildnachweise: "Bildnachweise",
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/rechtliches/[slug]">): Promise<Metadata> {
  const t = PAGES[(await params).slug];
  return t ? { title: t, robots: { index: false } } : {};
}

async function Legal({ params }: PageProps<"/rechtliches/[slug]">) {
  const slug = (await params).slug;
  const title = PAGES[slug];
  if (!title) notFound();
  if (slug === "bildnachweise") return <Credits />;
  return (
    <>
      <h1 className="font-display text-4xl">{title}</h1>
      <div role="note" className="mt-6 rounded-3xl bg-surface p-6 ring-1 ring-line">
        <p className="font-semibold">Platzhalter</p>
        <p className="mt-2 text-muted">
          Dieser Rechtstext wird erst veröffentlicht, wenn er anwaltlich geprüft oder über einen
          Rechtstexte-Dienst bereitgestellt ist. Offene Punkte stehen in docs/RECHT-PRUEFLISTE.md.
        </p>
      </div>
    </>
  );
}

export default function LegalPage(props: PageProps<"/rechtliches/[slug]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <Suspense fallback={null}>
        <Legal {...props} />
      </Suspense>
    </div>
  );
}

function Credits() {
  return (
    <>
      <h1 className="font-display text-4xl">Bildnachweise</h1>
      <p className="mt-4 text-muted">Stimmungsfotos von Unsplash, genutzt unter der Unsplash-Lizenz. Produktbilder im Demo-Shop sind gezeichnete Platzhalter.</p>
      <ul className="mt-6 divide-y divide-line rounded-3xl bg-surface ring-1 ring-line">
        {Object.values(PHOTOS).map((p) => (
          <li key={p.src} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
            <span>{p.alt}</span>
            <a href={p.url} className="text-plum underline" rel="noopener" target="_blank">Foto: {p.by} / Unsplash</a>
          </li>
        ))}
      </ul>
    </>
  );
}
