import Link from "next/link";
import { SHOP } from "@/config/shop";
import { HeartShape } from "./love-background";

const LEGAL = [
  ["impressum", "Impressum"],
  ["datenschutz", "Datenschutz"],
  ["agb", "AGB"],
  ["widerruf", "Widerrufsbelehrung"],
  ["versand", "Versand & Zahlung"],
  ["jugendschutz", "Jugendschutz"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-1.5 font-display text-2xl text-plum">
            <HeartShape className="float-soft h-5 w-5 text-[#c2386d]" />
            {SHOP.name}
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted">{SHOP.claim}</p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider">Diskretion</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Geplant: neutrale Verpackung ohne Hinweis auf den Inhalt</li>
            <li>Geplant: neutraler Absender und Verwendungszweck</li>
            <li>Mails ohne Produktnamen im Betreff</li>
          </ul>
        </div>
        <nav aria-label="Rechtliches">
          <h2 className="text-sm font-bold uppercase tracking-wider">Rechtliches</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {LEGAL.map(([slug, label]) => (
              <li key={slug}>
                <Link href={`/rechtliches/${slug}`} className="text-muted underline-offset-4 hover:text-plum hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-t border-line px-4 py-6 text-center text-xs text-muted">
        Verkauf nur an Volljährige. {SHOP.demoMode ? "Demo-Version, keine echten Bestellungen." : null}
      </p>
    </footer>
  );
}

export function DemoBanner() {
  if (!SHOP.demoMode) return null;
  return (
    <div className="bg-ink px-4 py-2 text-center text-xs font-medium text-surface">
      Demo-Shop: Alle Artikel, Marken und Preise sind Testdaten. Bestellungen sind noch nicht möglich.
    </div>
  );
}
