/**
 * Läuft bei jedem Railway-Build nach den Migrationen.
 * - Leere Datenbank und SEED_DEMO != "false": DEMO-Daten anlegen (Demo-Shop zum Ausprobieren)
 * - ADMIN_BOOTSTRAP_EMAIL + ADMIN_BOOTSTRAP_PASSWORD gesetzt und noch kein ADMIN: Zugang anlegen.
 *   Danach die beiden Variablen in Railway wieder löschen.
 */
import { spawnSync } from "node:child_process";
import { randomBytes, scrypt as _scrypt } from "node:crypto";
import { promisify } from "node:util";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import * as s from "../src/db/schema";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

async function main() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.categories);
  if (n === 0 && process.env.SEED_DEMO !== "false") {
    console.log("Leere Datenbank: DEMO-Daten werden angelegt …");
    const r = spawnSync("npx", ["tsx", "scripts/seed.ts"], { stdio: "inherit", env: process.env });
    if (r.status !== 0) throw new Error("Seed fehlgeschlagen");
  }

  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
  const pw = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (email && pw) {
    const admins = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, "ADMIN"));
    if (admins.length === 0) {
      if (pw.length < 12) throw new Error("ADMIN_BOOTSTRAP_PASSWORD braucht mindestens 12 Zeichen");
      const salt = randomBytes(16);
      const hash = ["scrypt", salt.toString("base64"), (await scrypt(pw, salt, 64)).toString("base64")].join("$");
      await db.insert(s.users).values({ email, passwordHash: hash, role: "ADMIN" });
      console.log(`Admin-Zugang ${email} angelegt. Bitte ADMIN_BOOTSTRAP_PASSWORD jetzt in Railway löschen.`);
    } else {
      console.log("Admin existiert bereits, Bootstrap-Variablen werden ignoriert (bitte löschen).");
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
