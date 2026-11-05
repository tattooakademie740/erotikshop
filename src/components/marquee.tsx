import Link from "next/link";
import { HeartShape } from "./love-background";

/** Laufband mit Kategorien. Doppelte Liste für nahtlose Schleife, zweite Hälfte für Screenreader verborgen. */
export function CategoryMarquee({ items }: { items: { slug: string; name: string }[] }) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((c) => (
        <li key={c.slug} className="flex items-center gap-8">
          <Link
            href={`/kategorie/${c.slug}`}
            tabIndex={hidden ? -1 : undefined}
            className="font-display text-4xl italic text-surface/95 transition hover:text-apricot sm:text-6xl"
          >
            {c.name}
          </Link>
          <HeartShape className="h-5 w-5 text-apricot" />
        </li>
      ))}
    </ul>
  );
  return (
    <nav aria-label="Alle Kategorien" className="marquee relative overflow-hidden bg-plum py-6 sm:py-8">
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </nav>
  );
}
