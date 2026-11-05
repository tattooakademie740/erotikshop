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
| Auftragsaufteilung + Fulfillment-Zustände | Logik fertig, noch kein Bestellprozess |
| Shop: Start, Kategorien mit Filtern, Suche, Produkt, Warenkorb | fertig (Demo) |
| SEO: Sitemap, robots, Canonical, Product/Breadcrumb/Organization-Schema | fertig (im Demo-Modus noindex) |
| Kasse und Zahlung | offen, Zahlungsanbieter für Erotik muss bestätigt werden |
| Kundenkonto, Admin, Bestellweiterleitung, Mails | offen (nächste Phase) |
| Echte Lieferanten | offen, Anfragen siehe docs/LIEFERANTEN.md |

## Lokal starten
```bash
cp .env.example .env.local        # DATABASE_URL und REVALIDATE_SECRET setzen
npm install
npm run db:migrate                # Tabellen anlegen
npm run db:seed                   # DEMO-Daten über die echte Import-Pipeline
npm run dev
```

## Prüfen
```bash
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
