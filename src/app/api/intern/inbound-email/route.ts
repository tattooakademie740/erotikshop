/**
 * Eingang für E-Mails an bestellung@… (z. B. per Inbound-Webhook des Mail-Anbieters).
 * POST mit "Authorization: Bearer $INBOUND_EMAIL_SECRET", Body: { from, subject, text }
 * Die Mail wird gespeichert und vom Agenten "Lieferanten-Postfach" ausgewertet.
 */
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { enqueue } from "@/server/jobs/queue";

const Body = z.object({ from: z.string().min(3).max(320), subject: z.string().max(500), text: z.string().max(200_000) });

function authorized(req: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || secret.length < 32) return false;
  const got = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "invalid" }, { status: 400 });
  const [row] = await db.insert(s.inboundEmails).values(body.data).returning({ id: s.inboundEmails.id });
  await enqueue(db, "inbound.process", { inboundEmailId: row.id }, { dedupeKey: `inbound.process:${row.id}` });
  return Response.json({ ok: true, id: row.id });
}
