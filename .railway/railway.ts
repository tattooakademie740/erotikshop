/**
 * Railway Infrastructure as Code für Lustviora (optional).
 * Der einfachste Weg ist die Einrichtung im Railway-Dashboard nach docs/DEPLOY-RAILWAY.md.
 * Diese Datei beschreibt denselben Aufbau für später (`railway config plan` / `apply`).
 * Vor dem ersten `apply` mit `railway config pull` gegen das echte Projekt abgleichen:
 * Die IaC-Schnittstelle von Railway ist neu, Details können abweichen.
 *
 * Secrets stehen hier nie im Klartext: preserve() übernimmt den in Railway gesetzten Wert.
 */
import { defineRailway, github, postgres, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");
  const source = github("tattooakademie740/erotikshop", { branch: "main" });

  const shop = service("shop", {
    source,
    build: "npm run railway:build",
    start: "npm start",
    healthcheck: "/api/health",
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      // Der Build rendert Seiten vor und braucht dafür die öffentliche Datenbankadresse
      BUILD_DATABASE_URL: db.env.DATABASE_PUBLIC_URL,
      NEXT_PUBLIC_SITE_URL: preserve(),
      REVALIDATE_SECRET: preserve(),
      TRACKING_WEBHOOK_SECRET: preserve(),
      INBOUND_EMAIL_SECRET: preserve(),
      ANTHROPIC_API_KEY: preserve(),
      SMTP_URL: preserve(),
      MAIL_FROM: preserve(),
    },
  });

  const worker = service("worker", {
    source,
    build: "echo Worker braucht keinen Next-Build",
    start: "npm run worker:prod",
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      NEXT_PUBLIC_SITE_URL: preserve(),
      REVALIDATE_SECRET: preserve(),
      ANTHROPIC_API_KEY: preserve(),
      SMTP_URL: preserve(),
      MAIL_FROM: preserve(),
    },
  });

  return project("lustviora", { resources: [shop, worker, db] });
});
