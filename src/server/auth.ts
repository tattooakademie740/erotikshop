/**
 * Anmeldung für den Admin-Bereich.
 * - Passwörter: scrypt mit zufälligem Salt
 * - Sitzung: zufälliger Token im httpOnly-Cookie, in der Datenbank nur als SHA-256-Hash
 * - Rollen: jede Seite und jede Aktion prüft die nötige Berechtigung serverseitig
 * - Schutz vor Durchprobieren: max. 5 Fehlversuche je E-Mail und IP in 15 Minuten
 */
import "server-only";
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as s from "@/db/schema";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "lv_admin";
const SESSION_HOURS = 12;

export type Role = (typeof s.userRole.enumValues)[number];
export type Permission = "dashboard" | "orders" | "tasks" | "notifications" | "products" | "review" | "pricing" | "suppliers";

const PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ["dashboard", "orders", "tasks", "notifications", "products", "review", "pricing", "suppliers"],
  MANAGER: ["dashboard", "orders", "tasks", "notifications", "products", "review", "pricing", "suppliers"],
  PRODUCT_MANAGER: ["dashboard", "products", "review", "pricing", "suppliers", "notifications"],
  CUSTOMER_SUPPORT: ["dashboard", "orders", "tasks", "notifications"],
  CONTENT_MANAGER: ["dashboard"],
  CUSTOMER: [],
};

export const can = (role: Role, p: Permission) => PERMISSIONS[role].includes(p);

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return ["scrypt", salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored?.startsWith("scrypt$")) return false;
  const [, saltB64, keyB64] = stored.split("$");
  const key = await scrypt(pw, Buffer.from(saltB64, "base64"), 64);
  const want = Buffer.from(keyB64, "base64");
  return key.length === want.length && timingSafeEqual(key, want);
}

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

// Ein fester Pseudo-Hash, damit unbekannte E-Mails genauso lange brauchen wie bekannte.
const DUMMY_HASH = ["scrypt", Buffer.alloc(16).toString("base64"), Buffer.alloc(64).toString("base64")].join("$");

// Fehlversuche im Speicher (pro Server-Instanz). Bei mehreren Instanzen später nach Redis verschieben.
const attempts = new Map<string, { n: number; until: number }>();
function limited(key: string) {
  const a = attempts.get(key);
  return !!a && a.until > Date.now() && a.n >= 5;
}
function countFail(key: string) {
  const a = attempts.get(key);
  const fresh = !a || a.until < Date.now();
  attempts.set(key, { n: fresh ? 1 : a!.n + 1, until: fresh ? Date.now() + 15 * 60_000 : a!.until });
}

export async function login(email: string, password: string): Promise<"ok" | "invalid" | "locked"> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${email.toLowerCase()}|${ip}`;
  if (limited(key)) return "locked";

  const [user] = await db.select().from(s.users).where(eq(s.users.email, email.toLowerCase()));
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok || user.role === "CUSTOMER") {
    countFail(key);
    return "invalid";
  }
  attempts.delete(key);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await db.insert(s.sessions).values({ id: sha(token), userId: user.id, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !process.env.ALLOW_INSECURE_COOKIE,
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
  await audit(user.id, "login", "user", user.id);
  return "ok";
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(s.sessions).where(eq(s.sessions.id, sha(token)));
  jar.delete(COOKIE);
}

export type AdminUser = { id: string; email: string; name: string | null; role: Role };

export async function currentAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: s.users.id, email: s.users.email, name: s.users.name, role: s.users.role })
    .from(s.sessions)
    .innerJoin(s.users, eq(s.users.id, s.sessions.userId))
    .where(and(eq(s.sessions.id, sha(token)), gt(s.sessions.expiresAt, sql`now()`)));
  if (!row || row.role === "CUSTOMER") return null;
  return row;
}

/** Für Seiten und Server Actions: leitet zur Anmeldung um oder verweigert. */
export async function requirePermission(p: Permission): Promise<AdminUser> {
  const user = await currentAdmin();
  if (!user) redirect("/admin/login");
  if (!can(user.role, p)) redirect("/admin?kein-zugriff=1");
  return user;
}

export async function audit(actorId: string | null, action: string, entity: string, entityId?: string, data?: unknown) {
  await db.insert(s.auditLogs).values({
    actorId,
    actorType: actorId ? "user" : "system",
    action,
    entity,
    entityId: entityId ?? null,
    data: data ?? null,
  });
}
