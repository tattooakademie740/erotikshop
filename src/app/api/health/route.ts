/** Gesundheitscheck für das Hosting: antwortet 200, wenn App und Datenbank erreichbar sind. */
import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";

export async function GET() {
  await connection(); // immer zur Laufzeit ausführen, nie vorab rendern
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
