/**
 * Next.js verlangt mit Cache Components mindestens einen Eintrag aus generateStaticParams.
 * Bei leerer Datenbank (z. B. erster Deploy) ein Platzhalter, der beim Aufruf 404 liefert.
 */
export function atLeastOne<T extends { slug: string }>(list: T[]): { slug: string }[] {
  return list.length ? list.map((x) => ({ slug: x.slug })) : [{ slug: "platzhalter-leer" }];
}
