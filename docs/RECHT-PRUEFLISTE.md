# Rechtliche Prüfliste Deutschland / EU

> **Keine Rechtsberatung.** Diese Liste ist eine technische Planungshilfe für den Shop „Shopname“. Sie ersetzt keine anwaltliche Prüfung. **Jeder Punkt ist durch eine Anwältin oder einen Anwalt (idealerweise mit Schwerpunkt E-Commerce und Jugendmedienschutz) prüfen zu lassen**, bevor der Shop live geht.
>
> Stand: 05.11.2026. Alle Punkte haben den Status **offen**, bis sie anwaltlich freigegeben sind.

## Legende

- **Status:** offen / in Prüfung / freigegeben
- **Frage an Anwalt:** konkrete Frage für das Erstgespräch
- **Komponente:** betroffener Teil des Systems (siehe ARCHITEKTUR.md)

## 1. Pflichtangaben und Verträge

| # | Thema | Status | Frage an Anwalt | Komponente |
|---|---|---|---|---|
| 1.1 | Impressum (§ 5 DDG) | offen | Vollständigkeit der Angaben, Erreichbarkeit von jeder Seite, Angaben zur Streitbeilegung (VSBG) | `content_pages`, Footer |
| 1.2 | Datenschutzerklärung (DSGVO Art. 13) | offen | Welche Verarbeitungen (Zahlung, Versand, Altersprüfung, Newsletter, Analyse) müssen genannt werden? Rechtsgrundlagen? | `content_pages`, alle Formulare |
| 1.3 | Auftragsverarbeitung (Art. 28 DSGVO) | offen | AV-Verträge mit Hosting, E-Mail, Zahlung, Altersprüfung, Lieferanten nötig? Lieferanten als Empfänger der Kundenadresse? | `suppliers`, Infrastruktur |
| 1.4 | Sensible Daten | offen | Lassen Bestellungen Rückschlüsse auf das Sexualleben zu (Art. 9 DSGVO)? Folgen für Speicherung, Zugriff, Löschfristen? | `orders`, `audit_logs`, Rollen |
| 1.5 | Cookie-Consent (§ 25 TDDDG, früher TTDSG) | offen | Welche Cookies/Skripte sind technisch notwendig? Ist ein Banner nötig, wenn nur notwendige Cookies gesetzt werden? | Frontend, Consent-Komponente |
| 1.6 | AGB | offen | Vertragsschluss, Lieferzeiten bei Dropshipping (mehrere Lieferanten, Teillieferungen), Eigentumsvorbehalt, Gewährleistung | Checkout, `content_pages` |
| 1.7 | Button-Lösung (§ 312j BGB) | offen | Ist „Zahlungspflichtig bestellen“ und die Zusammenfassung im Checkout korrekt? | Checkout |
| 1.8 | Bestellbestätigung / Vertragstext | offen | Inhalt der Bestätigungsmail auf dauerhaftem Datenträger (AGB, Widerrufsbelehrung als Anhang?) | `notifications`, E-Mail |

## 2. Widerrufsrecht und Hygieneausnahme

| # | Thema | Status | Frage an Anwalt | Komponente |
|---|---|---|---|---|
| 2.1 | Widerrufsbelehrung und Muster-Widerrufsformular | offen | Korrekte Belehrung bei Teillieferungen durch mehrere Lieferanten (Fristbeginn) | `content_pages`, `returns` |
| 2.2 | Hygieneausnahme § 312g Abs. 2 Nr. 3 BGB | offen | Gilt der Ausschluss für versiegelte Waren, die aus Gesundheitsschutz- oder Hygienegründen nicht zur Rückgabe geeignet sind, wenn die Versiegelung entfernt wurde, **für jede Produktart einzeln**? | `products.return_policy`, Produktseite, `returns` |
| 2.3 | Rechtsprechungslage | offen | OLG Hamm (22.11.2016, 4 U 65/15) sah Sexspielzeug als Hygieneartikel. EuGH C-681/17 und BGH VIII ZR 194/16 (Matratzen) bejahen Widerruf trotz geöffneter Versiegelung. Wie ist die aktuelle Bewertung für Sexspielzeug? (Quelle: IT-Recht Kanzlei, siehe unten) | `returns` |
| 2.4 | Was ist eine „Versiegelung“? | offen | Reicht Folie, Siegelaufkleber, verschweißte Verpackung? Wer stellt die Versiegelung sicher, wenn der Lieferant versendet? | Lieferantenvertrag, `supplier_products` |
| 2.5 | Hinweis vor Vertragsschluss | offen | Wie und wo muss auf das mögliche Erlöschen hingewiesen werden (Produktseite, Checkout)? | Produktseite, Checkout |

**Offene Einordnung je Produkttyp (Entwurf, vom Anwalt zu bestätigen):**

| Produkttyp | Vorschlag Behandlung | Status |
|---|---|---|
| Vibratoren, Dildos, Plugs (Körperkontakt) | Hygieneausnahme bei geöffneter Versiegelung prüfen | offen |
| Gleitgel, Massageöl, Kosmetik | Hygieneausnahme bei geöffneter Versiegelung prüfen | offen |
| Kondome | Hygieneausnahme bei geöffneter Versiegelung prüfen | offen |
| Dessous und Wäsche | offen, ggf. mit Hygieneschutz (z. B. Slip-Einlage) | offen |
| Fesseln, Augenbinden, Accessoires | voraussichtlich normales Widerrufsrecht | offen |
| Bücher, Spiele, Geschenksets | voraussichtlich normales Widerrufsrecht | offen |

Systemanforderung: Feld `return_policy` je Produkt (`standard`, `hygiene_sealed`, `excluded_other`) mit Begründung und Freigabedatum.

## 3. Preisangaben

| # | Thema | Status | Frage an Anwalt | Komponente |
|---|---|---|---|---|
| 3.1 | Gesamtpreis inkl. MwSt., Versandkosten | offen | Darstellung bei Versand durch mehrere Lieferanten (eine oder mehrere Versandpauschalen?) | Warenkorb, `price_rules` |
| 3.2 | Grundpreis (PAngV) | offen | Gleitgel, Massageöl und ähnliche Ware nach Volumen: Grundpreis **je Liter** anzugeben. Laut IT-Recht Kanzlei entfiel zum 28.05.2022 die frühere Ausnahme (Angabe je 100 ml bei Packungen bis 250 ml). Ist das korrekt umgesetzt? | `variants.content_amount`, `content_unit`, Listing, Produktseite |
| 3.3 | Grundpreis überall | offen | Laut IT-Recht Kanzlei auch in Trefferlisten, Kategorieseiten und Cross-Selling nötig, nicht nur auf der Produktseite | Kategorie, Suche, Empfehlungen |
| 3.4 | Streichpreise (§ 11 PAngV) | offen | Niedrigster Preis der letzten 30 Tage bei Preisermäßigung | `price_history` |

Hinweis: Im Auftrag stand „Grundpreis je 100 ml“. Nach der zitierten Quelle ist seit 2022 je Liter anzugeben. **Mit Anwalt klären.**

## 4. Produktsicherheit und Produktrecht

| # | Thema | Status | Frage an Anwalt | Komponente |
|---|---|---|---|---|
| 4.1 | GPSR (VO (EU) 2023/988) | offen | Welche Angaben müssen im Onlineangebot stehen (Hersteller, Anschrift, ggf. verantwortliche Person in der EU, Produktkennung, Warn- und Sicherheitshinweise)? Was gilt, wenn der Lieferant sie nicht liefert? | `products.gpsr_*`, `brands`, `review_queue` |
| 4.2 | Importe aus Drittländern | offen | Wer ist verantwortliche Person in der EU, wenn der Hersteller außerhalb der EU sitzt? | `brands`, `suppliers` |
| 4.3 | Kosmetikverordnung (VO (EG) 1223/2009) | offen | Gleitgel und Massageöl teils Kosmetik: Pflichtangaben (Inhaltsstoffe, verantwortliche Person, Mindesthaltbarkeit) im Shop? | `products.attributes`, Produktseite |
| 4.4 | Medizinprodukte (MDR, VO (EU) 2017/745) | offen | Manche Gleitgele und **Kondome** sind Medizinprodukte. Welche Pflichten hat ein Händler (Art. 14 MDR), welche Werbeeinschränkungen (HWG)? | `products.regulatory_class`, Content |
| 4.5 | ElektroG | offen | Vibratoren mit Elektronik sind Elektrogeräte. Ist der Shop bei Dropshipping Vertreiber, und muss der Hersteller bei der **stiftung ear** registriert sein (Prüfpflicht des Händlers)? Rücknahmepflichten für Altgeräte? | `brands.ear_number`, `supplier_products` |
| 4.6 | Batterien (BattDG, EU-Batterieverordnung) | offen | Pflichten bei Geräten mit eingebauten Akkus oder beiliegenden Batterien, Hinweistexte | `products.attributes`, `content_pages` |
| 4.7 | Verpackungsgesetz (LUCID) | offen | Muss der Shop sich bei LUCID registrieren und an einem dualen System beteiligen, wenn der Lieferant versendet? Wer ist „Erstinverkehrbringer“ der Versandverpackung? | Unternehmensebene, Lieferantenvertrag |
| 4.8 | Produktrückrufe | offen | Ablauf bei Rückruf (Kundeninformation, Sperre) | `products.status`, `notifications` |

## 5. Jugendschutz

| # | Thema | Status | Frage an Anwalt | Komponente |
|---|---|---|---|---|
| 5.1 | Sexspielzeug ohne Altersgrenze? | offen | Laut IT-Recht Kanzlei ist Sexspielzeug selbst „noch relativ unproblematisch“, also grundsätzlich nicht altersbeschränkt. Gilt das für das gesamte geplante Sortiment? | Sortiment |
| 5.2 | Pornografische Inhalte | offen | Filme, Magazine, Cover oder pornografische Produktbilder nur in einer geschlossenen Benutzergruppe (§ 4 Abs. 2 JMStV) mit echter Altersverifikation. Rechtsprechung laut Auftrag BGH I ZR 165/05: Fundstelle bitte bestätigen. **Empfehlung: solche Produkte im MVP nicht führen.** | Sortiment, `review_queue` |
| 5.3 | Lieferung pornografischer Ware | offen | Laut IT-Recht Kanzlei Versandweg mit Altersprüfung bei Übergabe (z. B. Ident-Services der Paketdienste) nötig. Bei Dropshipping umsetzbar? | `shipments`, Lieferantenvertrag |
| 5.4 | Entwicklungsbeeinträchtigende Inhalte | offen | Können Produktbilder (z. B. Dessous-Models, realistische Toys) als entwicklungsbeeinträchtigend gelten (§ 5 JMStV)? Braucht es Bildrichtlinien, Verpixelung oder Altersklick? | `product_images`, Bildprüfung |
| 5.5 | Jugendschutzbeauftragter (§ 7 JMStV) | offen | Ist ein Jugendschutzbeauftragter (intern oder extern) für den Shop Pflicht? Laut IT-Recht Kanzlei kann das Fehlen ein Bußgeld bis 500.000 Euro auslösen. | Unternehmensebene, Impressum |
| 5.6 | Werbung | offen | Keine Werbung mit solchen Produkten, die Minderjährige unangemessen erreicht. Regeln für Newsletter, Social Media, Suchmaschinenwerbung | Marketing, `content_pages` |

## 6. Werbung, Marketing, Bewertungen

| # | Thema | Status | Frage an Anwalt | Komponente |
|---|---|---|---|---|
| 6.1 | Werbebeschränkungen | offen | Was gilt für Werbeplattformen (Google, Meta) und Affiliate? (Plattformrichtlinien separat prüfen) | Marketing |
| 6.2 | Gesundheitsbezogene Aussagen | offen | Keine Heilversprechen (HWG, UWG), besonders bei Gleitgel, Kondomen, „Wellness“ | Produkttexte, KI-Texte |
| 6.3 | Newsletter (§ 7 UWG) | offen | Double-Opt-In, Bestandskundenausnahme | `users`, `notifications` |
| 6.4 | Bewertungen (UWG, § 5b Abs. 3 UWG) | offen | Hinweis, ob und wie geprüft wird, dass Bewertungen von echten Käufern stammen. Keine gekauften oder gefälschten Bewertungen. Kennzeichnung „verifizierter Kauf“ | `reviews.verified_purchase`, Produktseite |
| 6.5 | Lieferantenbewertungen übernehmen? | offen | Dürfen Bewertungen aus Feeds übernommen werden? Empfehlung: nein | Import |

## 7. Zahlung

| # | Thema | Status | Frage an Anwalt / Anbieter | Komponente |
|---|---|---|---|---|
| 7.1 | Zulässigkeit Erotiksortiment bei Zahlungsanbietern | offen | Stripe, PayPal, Klarna, Mollie und andere haben eigene Richtlinien für Erwachseneninhalte. **Ob und unter welchen Bedingungen sie dieses Sortiment akzeptieren, ist beim jeweiligen Anbieter schriftlich zu bestätigen.** In dieser Dokumentation wird dazu bewusst nichts behauptet. | `payments`, Zahlungsadapter |
| 7.2 | Kontoauszug | offen | Neutraler Händlername in der Abbuchung (statement descriptor) zulässig und beim Anbieter einstellbar? | `payments` |
| 7.3 | Zahlung auf Rechnung | offen | Bonitätsprüfung, Datenschutz | `payments` |

## 8. Diskreter Versand

| # | Thema | Status | Frage an Anwalt | Komponente |
|---|---|---|---|---|
| 8.1 | Neutraler Absender | offen | Darf ein neutraler Absendername genutzt werden, oder muss der Absender erkennbar sein? Was gilt für Rücksendeadressen? | `shipments`, Lieferantenvertrag |
| 8.2 | Werbeaussage „diskret“ | offen | Nur bewerben, was alle Lieferanten vertraglich zusichern | Content, `suppliers.neutral_shipping_verified` |

## 9. Marken, Bilder, Texte

| # | Thema | Status | Frage an Anwalt | Komponente |
|---|---|---|---|---|
| 9.1 | Bildrechte | offen | Nutzungsrechte an Lieferantenbildern schriftlich? Auch für Marktplätze und Werbung? | `product_images.license_source` |
| 9.2 | Produkttexte | offen | Übernahme von Herstellertexten erlaubt? Duplicate Content ist SEO-Thema, Urheberrecht ist Rechtsthema | `products.description_source` |
| 9.3 | Markennamen | offen | Nutzung von Markennamen in URLs, Filtern, Werbung (Erschöpfungsgrundsatz) | SEO, `brands` |
| 9.4 | Selektiver Vertrieb | offen | Haben Marken Vertriebsbeschränkungen (z. B. kein Verkauf auf Marktplätzen)? | `brands`, `supplier_products` |
| 9.5 | Shopname und Domain | offen | Markenrecherche für „Shopname“ vor Anmeldung | Unternehmensebene |

## 10. Steuer und Sonstiges (Steuerberatung)

| # | Thema | Status | Frage | Komponente |
|---|---|---|---|---|
| 10.1 | Umsatzsteuer, OSS bei EU-Versand | offen | Steuerberatung | `orders`, Rechnungen |
| 10.2 | Rechnungsstellung bei Dropshipping | offen | Wer stellt welche Rechnung, Reihengeschäft? | `orders`, `fulfillments` |
| 10.3 | Aufbewahrungsfristen vs. Löschpflichten | offen | Anwalt und Steuerberatung | Datenhaltung |

## Quellen

- IT-Recht Kanzlei, „Verkauf von Erotikartikeln: Leitfaden“, Beitrag vom 23.01.2024, abgerufen 05.11.2026: https://www.it-recht-kanzlei.de/verkauf-von-erotikartikeln-leitfaden.html (Jugendschutz, Produktbilder, Hygieneausnahme mit OLG Hamm 4 U 65/15, EuGH C-681/17, BGH VIII ZR 194/16, Grundpreis je Liter, § 7 JMStV)
- Gesetzestexte (nicht im Rahmen dieser Recherche abgerufen, Fassung vom Anwalt prüfen): BGB, DDG, TDDDG, PAngV, UWG, JMStV, JuSchG, ElektroG, BattDG, VerpackG, VO (EU) 2023/988 (GPSR), VO (EG) 1223/2009, VO (EU) 2017/745 (MDR), DSGVO.
