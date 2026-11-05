import Link from "next/link";
import { SHOP } from "@/config/shop";

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  const all = [{ name: "Start", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: new URL(it.href, SHOP.url).toString() })),
  };
  return (
    <nav aria-label="Brotkrümel" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {all.map((it, i) => (
          <li key={it.href} className="flex items-center gap-1.5">
            {i > 0 ? <span aria-hidden>/</span> : null}
            {i === all.length - 1 ? (
              <span aria-current="page" className="text-ink">{it.name}</span>
            ) : (
              <Link href={it.href} className="hover:text-plum hover:underline">{it.name}</Link>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
}
