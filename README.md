# Lustviora

Online-Shop für Erotik- und Wellnessartikel mit Dropshipping von mehreren Lieferanten.
Ausgelegt auf 100.000+ Artikel, automatischen Import, Preisberechnung und Bestellweiterleitung.

> **Status: Demo.** Alle Artikel, Marken, Lieferanten und Preise sind Testdaten und als DEMO markiert.
> Bestellungen sind noch nicht möglich.

## Dokumentation
- [Architektur, Roadmap, Kosten](docs/ARCHITEKTUR.md)
- [Lieferantenrecherche und Anfrage-Vorlage](docs/LIEFERANTEN.md)
- [Rechtliche Prüfliste (keine Rechtsberatung)](docs/RECHT-PRUEFLISTE.md)
- [Design-Richtungen und Entscheidung](docs/DESIGN.md)

## Stand
| Bereich | Status |
|---|---|
| Datenmodell (Produkte, Lieferanten, Bestellungen, Fulfillment, Retouren, Jobs, Logs) | fertig, migriert |
| Feed-Import CSV/XML → einheitliches Modell | fertig, getestet |
| Qualitätsprüfung + Review Queue | fertig, getestet |
| Duplikaterkennung (EAN, Marke+MPN, Titelähnlichkeit) | fertig, getestet |
| Lieferantenauswahl + Preisregeln | fertig, getestet |
| Bestellautomatik: Aufteilung, Weiterleitung, Sendungsnummern, Kundenmails | fertig, mit DEMO-Lieferanten getestet (`npm run demo:order`) |
| Worker mit Wiederholung, Duplikatschutz, Fehlermeldungen | fertig (`npm run worker`) |
| Lieferanten-Weiterleitung per E-Mail | fertig, echter Versand sobald `SMTP_URL` gesetzt ist |
| Lieferanten-Weiterleitung per API | vorbereitet, Adapter je Lieferant sobald API-Doku vorliegt |
| Shop: Start, Kategorien mit Filtern, Suche, Produkt, Warenkorb | fertig (Demo) |
| SEO: Sitemap, robots, Canonical, Product/Breadcrumb/Organization-Schema | fertig (im Demo-Modus noindex) |
| Kasse und Zahlung | offen, Zahlungsanbieter für Erotik muss bestätigt werden |
| Admin: Übersicht, Aufgaben, Bestellungen, Meldungen, Prüfliste, Produkte, Lieferanten, Preisregeln | fertig, mit Rollen und Audit-Log |
| Kundenkonto | offen (nächste Phase) |
| Echte Lieferanten | offen, Anfragen siehe docs/LIEFERANTEN.md |

## Lokal starten
```bash
cp .env.example .env.local        # DATABASE_URL und REVALIDATE_SECRET setzen
npm install
npm run db:migrate                # Tabellen anlegen
npm run db:seed                   # DEMO-Daten über die echte Import-Pipeline
npm run dev
```

## Automatik
```bash
npm run worker        # läuft dauerhaft: Importe, Bestellungen, Mails, Sendungsnummern
npm run demo:order    # DEMO: komplette Bestellung von Kasse bis Versandmail
```
Ablauf: Zahlung bestätigt → Lieferant je Artikel gewählt → je Lieferant ein Auftrag →
Bestellung per E-Mail, API oder Portal-Aufgabe → Sendungsnummer über
`POST /api/intern/tracking` → Kundenmail. Fehler werden wiederholt (1, 2, 4 … Minuten)
und nach dem letzten Versuch als kritische Meldung gespeichert.

## Admin
```bash
ADMIN_PASSWORD='mindestens-12-zeichen' npm run admin:create -- du@lustviora.de ADMIN
```
Dann unter `/admin` anmelden. Rollen: ADMIN, MANAGER, PRODUCT_MANAGER, CUSTOMER_SUPPORT, CONTENT_MANAGER.
Jede Aktion prüft die Rolle serverseitig und wird im Audit-Log gespeichert. Nach 5 Fehlversuchen
ist die Anmeldung 15 Minuten gesperrt.

## Prüfen
```bash
BASE=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run e2e   # kompletter Durchlauf im Browser (55 Prüfungen + Barrierefreiheit)
npm test          # Domain-Logik (Vitest)
npm run lint
npm run build
```

## Aufbau
```
src/domain/        reine Geschäftslogik, ohne Datenbank, voll getestet
src/server/        Import-Pipeline (Datenbank)
src/db/            Drizzle-Schema und Verbindung
src/lib/           gecachte Lesezugriffe für das Frontend, Suche
src/app/           Seiten (Next.js App Router)
scripts/seed.ts    DEMO-Daten
fixtures/          erzeugte DEMO-Feeds zur Ansicht
drizzle/           SQL-Migrationen
```

Name (Lustviora) und Domain (lustviora.de) stehen zentral in `src/config/shop.ts`.
