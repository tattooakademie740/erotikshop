# Lustviora auf Railway online stellen

Alles geht im Browser, auch am Handy. Dauer: etwa 20 Minuten. Preise: bitte aktuell bei Railway prüfen.

Aufbau: **shop** (die Website), **worker** (Hintergrund: Bestellungen, Mails, Importe), **Postgres** (Datenbank).
Beim ersten Build legt der Shop automatisch Tabellen, DEMO-Daten und deinen Admin-Zugang an.

## 1. Konto und Projekt
1. railway.com öffnen, **Login mit GitHub**.
2. **New Project** → **Deploy from GitHub repo** → `tattooakademie740/erotikshop` wählen.
   Falls das Repo fehlt: „Configure GitHub App“ und Zugriff auf `erotikshop` erlauben.
3. Der erste Build darf fehlschlagen, die Einstellungen kommen jetzt.

## 2. Datenbank
1. Im Projekt **+ Create** → **Database** → **PostgreSQL**.

## 3. Shop-Dienst einstellen (der Dienst mit dem Repo-Namen, umbenennen in `shop`)
**Settings**
- Region: **EU West (Amsterdam)** oder eine andere EU-Region
- Build Command: `npm run railway:build`
- Start Command: `npm start`
- Healthcheck Path: `/api/health`

**Variables** (jede Zeile einzeln anlegen, Werte mit `${{…}}` genau so eintippen)
| Name | Wert |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BUILD_DATABASE_URL` | `${{Postgres.DATABASE_PUBLIC_URL}}` |
| `NEXT_PUBLIC_SITE_URL` | erst nach Schritt 4 eintragen (deine Railway-Adresse mit https://) |
| `ADMIN_BOOTSTRAP_EMAIL` | deine E-Mail für den Admin |
| `ADMIN_BOOTSTRAP_PASSWORD` | ein langes Passwort (mind. 12 Zeichen, z. B. aus dem Passwort-Manager) |

## 4. Adresse erzeugen
**Settings → Networking → Generate Domain**. Die Adresse (z. B. `shop-production-xxxx.up.railway.app`)
mit `https://` davor als `NEXT_PUBLIC_SITE_URL` eintragen. Dann **Deploy** auslösen.

## 5. Ausprobieren
- Adresse öffnen: Demo-Shop mit Testdaten
- `/admin` öffnen, mit E-Mail und Passwort aus Schritt 3 anmelden
- **Danach `ADMIN_BOOTSTRAP_PASSWORD` in den Variables löschen.** Der Zugang bleibt bestehen.
- Am Handy: Seite öffnen → Teilen → „Zum Home-Bildschirm“ → Lustviora als App

## 6. Worker (Hintergrund-Abläufe)
1. **+ Create → GitHub Repo →** wieder `erotikshop`, Dienst `worker` nennen.
2. Settings: gleiche EU-Region, Build Command `echo ok`, Start Command `npm run worker:prod`,
   kein Healthcheck, keine Domain.
3. Variables: `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`, `NEXT_PUBLIC_SITE_URL` wie beim Shop.

## 7. Später (wenn so weit)
| Variable | Wofür | Wo eintragen |
|---|---|---|
| `REVALIDATE_SECRET` | Shop aktualisiert sich sofort nach Importen | shop + worker, gleicher Wert, 32+ Zeichen |
| `ANTHROPIC_API_KEY` | KI-Agenten (Lia, Lieferanten-Postfach, Produktdaten) | shop + worker |
| `SMTP_URL`, `MAIL_FROM` | echter Mailversand | shop + worker |
| `TRACKING_WEBHOOK_SECRET` | Sendungsnummern per Webhook | shop |
| `INBOUND_EMAIL_SECRET` | Lieferanten-Mails an den Shop weiterleiten | shop |
| `SEED_DEMO=false` | keine Demo-Daten bei leerer Datenbank | shop |

**Eigene Domain lustviora.de:** Shop → Settings → Networking → Custom Domain → `lustviora.de`,
dann den angezeigten DNS-Eintrag bei deinem Domain-Anbieter setzen und `NEXT_PUBLIC_SITE_URL` umstellen.

## Hinweise
- Datenschutz: Mit Railway einen Auftragsverarbeitungsvertrag abschließen (siehe docs/RECHT-PRUEFLISTE.md).
- Der Demo-Modus (`src/config/shop.ts`, `demoMode`) blendet „Testdaten“ ein und verbietet Suchmaschinen das Indexieren.
- Railway-Doku zu Konfiguration als Code: https://docs.railway.com/infrastructure-as-code
