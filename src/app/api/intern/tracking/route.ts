/**
 * Sendungsnummern melden (Lieferanten-Webhook, Automatisierungsdienste oder eigene Tools).
 * POST mit "Authorization: Bearer $TRACKING_WEBHOOK_SECRET"
 * Body: { externalRef | fulfillmentId, trackingNumber, carrier?, trackingUrl?, delivered? }
 */
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import { OrderError, recordDelivered, recordShipment } from "@/server/orders";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";

const Body = z.object({
  externalRef: z.string().max(100).optional(),
  fulfillmentId: z.number().int().positive().optional(),
  trackingNumber: z.string().min(4).max(60),
  carrier: z.string().max(40).optional(),
  trackingUrl: z.string().url().startsWith("https://").optional(),
  delivered: z.boolean().optional(),
});

function authorized(req: Request) {
  const secret = process.env.TRACKING_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) return false;
  const got = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.externalRef && !parsed.data.fulfillmentId)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  try {
    await recordShipment(db, parsed.data);
    if (parsed.data.delivered) {
      const where = parsed.data.fulfillmentId
        ? eq(s.fulfillments.id, parsed.data.fulfillmentId)
        : eq(s.fulfillments.externalRef, parsed.data.externalRef!);
      const [f] = await db.select({ id: s.fulfillments.id }).from(s.fulfillments).where(where);
      if (f) await recordDelivered(db, f.id);
    }
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof OrderError) return Response.json({ error: e.message }, { status: 404 });
    throw e;
  }
}
