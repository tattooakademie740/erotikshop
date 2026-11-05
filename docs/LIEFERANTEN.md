# Lieferanten-Recherche

Stand der Recherche: **05.11.2026**. Arbeitstitel des Shops: **Shopname**.

> Grundregel dieses Dokuments: Es steht hier nur, was auf einer offiziellen Seite oder in einer klar genannten Quelle gefunden wurde. Alles andere ist als **nicht verifiziert** markiert. Keine Annahmen zu Preisen, Produktzahlen, APIs oder Konditionen. Vor jeder Integration müssen die Angaben schriftlich vom Lieferanten bestätigt werden (siehe E-Mail-Vorlage unten).

## Methodik

- Rund 15 Websuchen und Seitenabrufe (offizielle Websites, Hilfecenter, Fachpresse).
- Viele Händlerportale sind nur nach Login mit Gewerbenachweis einsehbar. Konditionen, Feeds und Dropshipping-Bedingungen stehen meist dort und konnten daher **nicht** öffentlich geprüft werden.
- Einige Seiten waren zum Recherchezeitpunkt nicht abrufbar (HTTP 403/503). Das ist jeweils vermerkt.

## Klassifizierung

| Typ | Bedeutung |
|---|---|
| echtes Dropshipping | Lieferant versendet im Namen des Shops direkt an Endkunden |
| Händlerprogramm | Registrierter B2B-Account mit Händlerkonditionen |
| Großhandel | Verkauf an Wiederverkäufer, Versand an den Händler |
| Hersteller | Marke/Produzent, Vertrieb meist über Distributoren |
| Marktplatz | Plattform, über die mehrere Anbieter verkaufen |
| Fulfillment | Lagerung und Versand eigener Ware durch Dienstleister |
| API-basiert | Daten und/oder Bestellungen technisch per Schnittstelle |
| manuell | Bestellung per E-Mail, Portal oder Telefon |

## Prioritäten

| Priorität | Kriterium |
|---|---|
| **A** | Dropshipping **und** Produktfeed/API aus offizieller Quelle bestätigt |
| **B** | Feed/API **oder** Dropshipping offiziell bestätigt, der andere Teil offen |
| **C** | Relevanter Erotik-Großhändler, aber Dropshipping und Feed nicht verifiziert |
| **D** | Hersteller oder unklarer Status, nur über Distributor oder nach Klärung sinnvoll |

**Ergebnis:** Zum Stand 05.11.2026 erfüllt **kein** Kandidat Priorität A. Dropshipping konnte bei keinem Kandidaten aus einer offiziellen öffentlichen Quelle bestätigt werden.

## Übersichtstabelle

| Lieferant | Land | Dropshipping | API | Produkte | Versand | Bestellung automatisierbar | Status |
|---|---|---|---|---|---|---|---|
| SCALA (SCALA 2.0 BV) | NL | nicht verifiziert | **ja, Partner API (Bestand, Produktinfos, Bilder)** | nicht verifiziert | Versand DDU außerhalb EU belegt, neutral nicht verifiziert | nicht verifiziert (API-Seite nennt nur Datenabruf) | **B**, anfragen |
| ONE-DC B.V. (ehem. EDC Wholesale und Eropartner, EQOM Group) | NL | nicht verifiziert | nicht verifiziert | nicht verifiziert | Bereich „Shipping and discretion“ existiert, Inhalt nicht abrufbar | nicht verifiziert | **C**, anfragen |
| ORION Versand GmbH & Co. KG (B2B Shop) | DE | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | **C**, anfragen |
| SHOTS | NL | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | **C**, anfragen |
| ST RUBBER | DE | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | **C**, Seite nicht erreichbar |
| Nmc | DE (laut Domain, nicht verifiziert) | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | **C**, Seite nicht erreichbar |
| Dreamlove | ES (nicht verifiziert) | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | **C**, Seite nicht erreichbar |
| JOYDIVISION | DE | nicht verifiziert | nicht verifiziert | Seite nennt „mehr als 250 Produkte“ | nicht verifiziert | nicht verifiziert | **D**, Hersteller/Marke |
| FUN FACTORY | DE | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | **D**, Status klären |
| Satisfyer | DE/NL (Markeninhaberschaft nicht verifiziert) | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | nicht verifiziert | **D**, über Distributor |

## Lieferanten im Detail

### SCALA (SCALA 2.0 BV), Niederlande

- **Website:** https://www.scala-nl.com/
- **Typ:** Großhandel, Händlerprogramm, API-basiert (Datenabruf). Private-Label-Partner.
- **Priorität: B.** Eine offizielle Partner API für Produktdaten ist bestätigt. Dropshipping und Bestellübermittlung per API sind nicht bestätigt.

| Thema | Bestätigt (Quelle, abgerufen 05.11.2026) |
|---|---|
| Selbstbeschreibung | „Europe's Leading Erotic Wholesaler, Adult Product Distributor & Private Label Partner“ (https://www.scala-nl.com/) |
| Partner API | „Save time and keep your product data up to date with the SCALA Partner API“, Abruf von „real-time inventory, product information, descriptions and product images“ (https://www.scala-nl.com/ und https://www.scala-nl.com/pages/partner-api) |
| API-Zugang | „To use our API system, log in to your account portal and click Partner API.“ (https://www.scala-nl.com/pages/partner-api) |
| Versand | Versand DDU („duties and taxes unpaid“) an Lieferadressen außerhalb der EU erwähnt (https://www.scala-nl.com/policies/shipping-policy) |
| Kontakt | sales@scala-nl.com, +31 (0)24 202 2390 (https://www.scala-nl.com/) |

**Nicht verifiziert:** Dropshipping an Endkunden, neutraler Versand, Bestellübermittlung per API, Tracking-Rückmeldung, Feed-Format (XML/CSV), Aktualisierungsfrequenz, Produktanzahl, Konditionen, Mindestbestellwert, Bildrechte, GPSR-Daten.

### ONE-DC B.V. (ehemals EDC Wholesale und Eropartner), Niederlande

- **Website:** https://www.one-dc.com/
- **Typ:** Großhandel, Händlerprogramm.
- **Priorität: C.**

| Thema | Bestätigt (Quelle, abgerufen 05.11.2026) |
|---|---|
| Weiterleitung | https://www.edcwholesale.com/ leitet per HTTP 301 auf https://www.one-dc.com/ weiter. https://www.eropartner.com/ leitet per HTTP 301 auf https://www.one-dc.com/en/ weiter. |
| Betreiber | Footer: „Copyright 2026 ONE-DC B.V.“ und „ONE-DC is part of the EQOM Group.“ (https://www.one-dc.com/) |
| Diskretion | Supportkategorie „Shipping and discretion“ verlinkt (https://support.one-dc.com/hc/en-001/categories/15603413268637), Inhalt beim Abruf HTTP 403, daher **nicht verifiziert** |
| Fachpresse | Zusammenschluss EDC Wholesale und Eropartner Distribution berichtet (https://www.erotictradeonly.com/edc-wholesale-and-eropartner-distribution-join-forces-to-create-european-super-supplier/), Fachpresse, keine offizielle Konditionsquelle |
| Drittanbieter | Webshopimporter beschreibt Shop-Anbindungen für „Eropartner“ (Shopify, CCV, Lightspeed, Magento, WooCommerce) (https://webshopimporter.zohodesk.eu/portal/en/kb/articles/how-to-connect-eropartner-to-your-shopify-shop). Die Seite nennt **kein** Dropshipping, keine Bestellweiterleitung, keine Bestandssynchronisation. Ob dieser Weg nach der Umfirmierung noch gilt: nicht verifiziert. |

**Nicht verifiziert:** Dropshipping, neutraler Versand, Feed-Format, API, Bestellübermittlung, Produktanzahl, Konditionen.

### ORION Versand GmbH & Co. KG (B2B), Deutschland (Flensburg laut Auftrag, Sitz nicht separat geprüft)

- **Website:** https://www.orion-wholesale.com/ (https://www.orion-grosshandel.de/ leitet per HTTP 301 dorthin)
- **Typ:** Großhandel, Händlerprogramm.
- **Priorität: C.**

| Thema | Bestätigt (Quelle, abgerufen 05.11.2026) |
|---|---|
| B2B | „Dies ist der ORION Shop für alle B2B-Händler.“ Sortiment für „den Fachhandel und gewerbliche Wiederverkäufer“ (https://www.orion-wholesale.com/) |
| Registrierung | Registrierung erfordert „eine gültige Gewerbeanmeldung“ (https://www.orion-wholesale.com/) |
| Betreiber | „© ORION Versand GmbH & Co. KG“ (https://www.orion-wholesale.com/) |
| Kontakt | +49 (0)461 50 40 308, Kontaktformular unter /formular/contact |

**Nicht verifiziert:** Dropshipping, Datenfeed, API, neutraler Versand, Konditionen. Hinweis: ORION betreibt auch einen eigenen Endkundenshop (orion.de), also potenziell ein Wettbewerber im Endkundengeschäft.

**Achtung Namensverwechslung:** Suchergebnisse zu „Orion Wholesale“ mit API und Dropshipping (z. B. Flxpoint, Celerant) betreffen einen **US-Händler für Schusswaffen und Outdoor**, nicht ORION Flensburg.

### SHOTS, Niederlande

- **Website:** https://www.shots.nl/
- **Typ:** Großhandel, Händlerprogramm, eigene Marken (laut Selbstbeschreibung „European excellence in products and development“).
- **Priorität: C.**
- **Bestätigt:** Seite enthält „Become a Shots B2B customer“ und „Swift Global Delivery“ (https://www.shots.nl/, https://www.shots.nl/en/customer-support, abgerufen 05.11.2026).
- **Nicht verifiziert:** Dropshipping, Feed, API, neutraler Versand, Registrierungsbedingungen.

### ST RUBBER, Deutschland

- **Website:** https://www.strubber.com/ (beim Abruf HTTP 503)
- **Typ:** Großhandel (laut Auftrag), nicht verifiziert.
- **Priorität: C.**
- **Bestätigt:** nichts. Eine Websuche nach Dropshipping/Datenfeed ergab keine Treffer zu ST RUBBER.
- **Nicht verifiziert:** alles.

### Nmc, Deutschland

- **Website:** https://www.nmc.de/ (beim Abruf HTTP 503)
- **Priorität: C.** **Nicht verifiziert:** Unternehmensart, Dropshipping, Feed, API, Versand.

### Dreamlove, Spanien (Land nicht verifiziert)

- **Website:** https://www.dreamlove.es/ (beim Abruf HTTP 403)
- **Bestätigt:** Fachpresse berichtet über eine Partnerschaft mit FUN FACTORY (https://www.erotictradeonly.com/dreamlove-and-fun-factory-strengthen-strategic-partnership/).
- **Priorität: C.** **Nicht verifiziert:** Dropshipping, Feed, API, Versand nach DE.

### JOYDIVISION, Deutschland

- **Website:** https://www.joydivision.de/
- **Typ:** Hersteller/Marke.
- **Priorität: D.** Bezug voraussichtlich über Großhändler, Direktbezug klären.
- **Bestätigt (05.11.2026):** „Seit 1994 entwickelt JOYDIVISION Produkte für die Bereiche Sexual Wellness und Intimate Care.“ Sortiment „mehr als 250 Produkte“, vertrieben „international über Handelspartner in zahlreichen Ländern“. Kontakt info@amor.ag. Produktauskunft/Rückrufprüfung unter https://produktauskunft.joydivision.eu/ (alle Angaben von https://www.joydivision.de/).
- **Nicht verifiziert:** B2B-Direktkonto, Dropshipping, Feed, neutraler Versand.

### FUN FACTORY, Deutschland

- **Typ:** Hersteller.
- **Priorität: D.**
- **Bestätigt:** Pressemitteilung vom 08.07.2021 zum Start eines B2B-Onlineshops (https://cdn.shopify.com/s/files/1/0336/0522/2538/files/20210708_FF_Pressemitteilung_B2B_Shop_Launch_DE_digital.pdf). Ob das heute noch gilt: nicht verifiziert.
- **Offen:** Ein Wikipedia-Spiegel nennt das Unternehmen 2024 als nicht mehr aktiv, andere Quellen zeigen weitere Aktivität. **Aktuellen Unternehmensstatus vor Kontaktaufnahme prüfen.**
- **Nicht verifiziert:** Dropshipping, Feed, Konditionen.

### Satisfyer / EIS GmbH, Deutschland

- **Typ:** Hersteller/Marke. EIS GmbH ist zugleich Betreiber des Endkundenshops eis.de, also direkter Wettbewerber.
- **Priorität: D.**
- **Bestätigt:** keine offizielle B2B-Seite gefunden.
- **Hinweise ohne offizielle Bestätigung:** Eine Händlerseite (shop-apotheke.at/marken/satisfyer) ordnet die Marke EDC Wholesale B.V. zu, ein Interview spricht von Präsenz in vielen Läden (storerotica.com). Beides **nicht verifiziert**, keine Grundlage für Planung.
- **Empfehlung:** Satisfyer-Produkte über einen autorisierten Großhändler beziehen, Vertriebsberechtigung (auch für Marktplätze) schriftlich klären.

## Weitere Wege (nicht recherchiert, nur als Prüfpunkte)

- Drittanbieter-Integratoren (z. B. Webshopimporter, Droppery, Base.com) können Feeds bündeln. Rolle, Kosten und Datenqualität jeweils nicht verifiziert.
- Kostenpflichtige Lieferantenverzeichnisse (z. B. lieferanten.de) listen Dropshipping-Anbieter. Aktualität nicht geprüft.

## Empfehlung für das Vorgehen

1. E-Mail-Vorlage an SCALA, ONE-DC, ORION, SHOTS, ST RUBBER senden (zuerst B, dann C).
2. Antworten in einer Tabelle `suppliers` mit Feld `verified_at` und Quelle festhalten.
3. Erst nach schriftlicher Bestätigung von Dropshipping, Feed und Bestellweg einen Adapter bauen.
4. Lieferanten ohne API im System als **manueller Bestellmodus** führen (siehe ARCHITEKTUR.md, Abschnitt 5).

## E-Mail-Vorlage an Lieferanten

```text
Betreff: Anfrage Händlerkonto und Dropshipping-Zusammenarbeit

Sehr geehrte Damen und Herren,

wir bauen derzeit den Onlineshop „Shopname“ für Erotik- und Wellnessprodukte
mit Sitz in Deutschland auf und möchten Ihr Sortiment gern aufnehmen.
Eine Gewerbeanmeldung liegt vor bzw. reichen wir auf Wunsch ein.

Bitte teilen Sie uns zu folgenden Punkten Ihre Bedingungen mit:

1. Händlerkonto: Welche Unterlagen benötigen Sie für die Freischaltung?
2. Dropshipping: Versenden Sie im Auftrag des Händlers direkt an Endkunden?
   Zu welchen Bedingungen (Gebühr pro Paket, Versandkosten, Länder)?
3. Neutraler und diskreter Versand: Erfolgt der Versand ohne Ihr Logo,
   ohne Rechnung/Preise im Paket und mit neutralem oder unserem Absender?
4. Produktdaten: In welchem Format stellen Sie Daten bereit (XML, CSV, API)?
   Wie oft werden Bestand und Preise aktualisiert? Gibt es eine Dokumentation
   oder einen Testzugang?
5. Bestellübermittlung: Per API, E-Mail, Portal oder Datei-Upload (z. B. FTP)?
6. Tracking: Wie und wann erhalten wir Sendungsnummer und Versandstatus zurück?
7. Bild- und Textrechte: Dürfen wir Ihre Produktbilder und Produkttexte im
   eigenen Shop und auf Marktplätzen verwenden?
8. GPSR: Stellen Sie die Angaben zu Hersteller bzw. verantwortlicher Person
   in der EU, Sicherheitshinweise und Warnhinweise je Produkt bereit?
9. Mindestbestellwert oder Mindestumsatz: Gibt es diese, und in welcher Höhe?
10. Zahlungsbedingungen: Vorkasse, Lastschrift, Rechnung, Zahlungsziel?
11. Retouren: Wie läuft die Retourenabwicklung bei Dropshipping-Sendungen
    (Rücksendeadresse, Fristen, Erstattung, Umgang mit geöffneter Hygieneware)?

Über eine Rückmeldung und gegebenenfalls Ihre Händlerunterlagen freuen wir uns.

Mit freundlichen Grüßen
[Name]
[Firma, Anschrift]
[Telefon, E-Mail]
```

## Quellen (abgerufen 05.11.2026)

- https://www.scala-nl.com/
- https://www.scala-nl.com/pages/partner-api
- https://www.scala-nl.com/policies/shipping-policy
- https://www.one-dc.com/
- https://www.orion-wholesale.com/
- https://www.shots.nl/ und https://www.shots.nl/en/customer-support
- https://www.joydivision.de/
- https://webshopimporter.zohodesk.eu/portal/en/kb/articles/how-to-connect-eropartner-to-your-shopify-shop
- https://www.erotictradeonly.com/edc-wholesale-and-eropartner-distribution-join-forces-to-create-european-super-supplier/
- https://www.erotictradeonly.com/dreamlove-and-fun-factory-strengthen-strategic-partnership/
- https://cdn.shopify.com/s/files/1/0336/0522/2538/files/20210708_FF_Pressemitteilung_B2B_Shop_Launch_DE_digital.pdf
- Nicht abrufbar: https://www.strubber.com/ (503), https://www.nmc.de/ (503), https://www.dreamlove.es/ (403), https://support.one-dc.com/ (403)
