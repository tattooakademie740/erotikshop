/**
 * Leert den Katalog-Zwischenspeicher nach Importen, Preis- oder Bestandsänderungen.
 * Aufruf durch den Import-Worker: POST mit "Authorization: Bearer $REVALIDATE_SECRET".
 */
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

const ALLOWED = new Set(["catalog", "content", "search"]);

function authorized(req: Request): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || secret.length < 32) return false; // ohne starkes Secret abgeschaltet
  const got = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string" && ALLOWED.has(t)) : ["catalog"];
  // Preise und Bestand sofort ersetzen, keine veralteten Daten ausliefern.
  for (const t of tags) revalidateTag(t, { expire: 0 });
  return Response.json({ revalidated: tags });
}
