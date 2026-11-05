import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const PAGES: Record<string, string> = {
  impressum: "Impressum",
  datenschutz: "Datenschutzerklärung",
  agb: "Allgemeine Geschäftsbedingungen",
  widerruf: "Widerrufsbelehrung",
  versand: "Versand & Zahlung",
  jugendschutz: "Jugendschutz",
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/rechtliches/[slug]">): Promise<Metadata> {
  const t = PAGES[(await params).slug];
  return t ? { title: t, robots: { index: false } } : {};
}

async function Legal({ params }: PageProps<"/rechtliches/[slug]">) {
  const title = PAGES[(await params).slug];
  if (!title) notFound();
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
