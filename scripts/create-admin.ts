/**
 * Admin-Zugang anlegen oder Passwort setzen.
 * Aufruf: ADMIN_PASSWORD='…' npm run admin:create -- name@lustviora.de [ROLLE]
 * Das Passwort kommt aus einer Umgebungsvariable, damit es nicht in der Shell-Historie steht.
 */
import { randomBytes, scrypt as _scrypt } from "node:crypto";
import { promisify } from "node:util";
import { db } from "../src/db";
import * as s from "../src/db/schema";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

async function main() {
  const email = process.argv[2]?.toLowerCase();
  const role = (process.argv[3] ?? "ADMIN") as (typeof s.userRole.enumValues)[number];
  const pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw) throw new Error("Aufruf: ADMIN_PASSWORD='…' npm run admin:create -- email [ROLLE]");
  if (pw.length < 12) throw new Error("Passwort muss mindestens 12 Zeichen haben");
  if (!s.userRole.enumValues.includes(role)) throw new Error(`Unbekannte Rolle ${role}`);
  const salt = randomBytes(16);
  const hash = ["scrypt", salt.toString("base64"), (await scrypt(pw, salt, 64)).toString("base64")].join("$");
  await db
    .insert(s.users)
    .values({ email, passwordHash: hash, role })
    .onConflictDoUpdate({ target: s.users.email, set: { passwordHash: hash, role } });
  console.log(`Zugang ${email} (${role}) gespeichert.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
