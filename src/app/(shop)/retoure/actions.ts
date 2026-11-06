"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as s from "@/db/schema";
import { requestReturn, ReturnError } from "@/server/returns";

const Auth = z.object({ orderNumber: z.coerce.number().int().positive(), email: z.string().email().max(200) });

export async function lookupOrderItems(input: { orderNumber: number; email: string }) {
  const a = Auth.safeParse(input);
  if (!a.success) return { error: "Bitte Bestellnummer und E-Mail prüfen." };
  const [o] = await db.select().from(s.orders).where(eq(s.orders.number, a.data.orderNumber));
  if (!o || o.email.toLowerCase() !== a.data.email.trim().toLowerCase()) return { error: "Bestellung nicht gefunden. Bitte Bestellnummer und E-Mail prüfen." };
  const items = await db.select({ id: s.orderItems.id, title: s.orderItems.titleSnapshot, quantity: s.orderItems.quantity }).from(s.orderItems).where(eq(s.orderItems.orderId, o.id)).orderBy(s.orderItems.id);
  return { items };
}

const Submit = Auth.extend({
  items: z.array(z.object({ orderItemId: z.number().int().positive(), quantity: z.number().int().positive() })).min(1).max(20),
  reason: z.enum(["widerruf", "defekt", "falsch_geliefert", "beschaedigt"]),
  sealIntact: z.boolean().optional(),
  note: z.string().max(1000).optional(),
});

export async function submitReturn(input: z.input<typeof Submit>) {
  const d = Submit.safeParse(input);
  if (!d.success) return { error: "Bitte alle Angaben prüfen." };
  try {
    const res = await requestReturn(db, { ...d.data, source: "formular" });
    return { results: res };
  } catch (e) {
    if (e instanceof ReturnError) return { error: e.message };
    throw e;
  }
}
