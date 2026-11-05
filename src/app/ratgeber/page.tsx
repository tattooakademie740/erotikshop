import type { Metadata } from "next";
import Link from "next/link";
import { getGuides } from "@/lib/catalog";

export const metadata: Metadata = { title: "Ratgeber", alternates: { canonical: "/ratgeber" } };

export default async function GuidesPage() {
  const guides = await getGuides();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <h1 className="font-display text-5xl">Ratgeber</h1>
      <ul className="mt-8 space-y-4">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={`/ratgeber/${g.slug}`} className="block rounded-3xl bg-surface p-6 ring-1 ring-line hover:ring-plum">
              <h2 className="font-display text-2xl">{g.title}</h2>
              <p className="mt-1 text-muted">{g.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
