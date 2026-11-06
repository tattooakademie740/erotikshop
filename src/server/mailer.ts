/**
 * E-Mail-Versand über die Outbox.
 * Ohne SMTP_URL wird nichts verschickt, sondern als "dev_logged" gespeichert.
 * Mit SMTP_URL (z. B. smtps://user:pass@smtp.example.com:465) wird echt gesendet.
 */
import { eq } from "drizzle-orm";
import type { db as Db } from "@/db";
import * as s from "@/db/schema";

type DB = typeof Db;

export async function queueEmail(
  db: DB,
  mail: { kind: string; to: string; subject: string; text: string; relatedType?: string; relatedId?: string },
) {
  const [row] = await db.insert(s.outboundEmails).values(mail).returning({ id: s.outboundEmails.id });
  return row.id;
}

export async function deliverEmail(db: DB, id: number) {
  const [mail] = await db.select().from(s.outboundEmails).where(eq(s.outboundEmails.id, id));
  if (!mail || mail.status === "sent" || mail.status === "dev_logged") return;
  const smtp = process.env.SMTP_URL;
  if (!smtp) {
    await db.update(s.outboundEmails).set({ status: "dev_logged", sentAt: new Date() }).where(eq(s.outboundEmails.id, id));
    return;
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(smtp);
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? "Lustviora <bestellung@lustviora.de>",
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
    });
    await db.update(s.outboundEmails).set({ status: "sent", sentAt: new Date(), error: null }).where(eq(s.outboundEmails.id, id));
  } catch (e) {
    await db.update(s.outboundEmails).set({ status: "failed", error: (e as Error).message }).where(eq(s.outboundEmails.id, id));
    throw e;
  }
}
