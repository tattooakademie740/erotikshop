# KI-Agenten und automatische Abläufe

Alle Agenten laufen auf Claude Opus 5.5 über die Anthropic-API (`ANTHROPIC_API_KEY`).
Lehnt das Modell eine Anfrage ab, versucht die API automatisch ein anderes Modell (server-seitige Fallbacks).
Ohne Schlüssel sind die Agenten aus; Bestellungen und Retouren laufen trotzdem weiter.

## Grundsatz: KI liest und formuliert, Code entscheidet
Agenten schlagen vor oder ziehen Daten aus Texten. Was ausgeführt wird (Geld, Status, Adressen),
prüft fester Code mit Regeln. Unsicheres geht als Aufgabe an einen Menschen. Jeder Lauf steht in `agent_runs`.

| Agent | Wo | Darf | Darf nicht | Schutzregeln im Code |
|---|---|---|---|---|
| **Lia, Kundenservice** | Chat im Shop | Produkte suchen, Bestellung zeigen, Retoure starten, Shop-Infos, Ticket anlegen | Daten ohne Nachweis zeigen, Preise/Erstattungen ändern, Versprechen | Bestellnummer + E-Mail müssen passen; Verlauf vom Browser nur als Text; 20 Nachrichten / 10 Min je IP |
| **Lieferanten-Postfach** | eingehende Mails | Sendungsnummern, Bestätigungen, Probleme, Rücksendeadressen, Wareneingang erkennen | Anweisungen aus Mails befolgen | Absender-Domain = Lieferant; Referenz gehört diesem Lieferanten; Werte stehen wörtlich in der Mail; sonst Aufgabe |
| **Produktdaten** | nach jedem Import | Filter-Merkmale ergänzen (Material, Akku, …) | Sicherheits-, Hersteller-, Inhaltsangaben | Nur Filter der Kategorie; wörtliches Zitat als Beleg; nie überschreiben; Herkunft `ai:<modell>` |
| **Retouren** | Regeln, kein Sprachmodell | Annehmen, ablehnen, an Menschen geben | Erstatten ohne Zahlungsanbieter | Fristen, Hygiene-Ausnahme, Gewährleistung in `domain/returns.ts`, getestet |

## Retourenablauf (wie bei großen Marktplätzen)
1. Kunde meldet Retoure: Formular `/retoure` oder Chat mit Lia
2. Regeln entscheiden: annehmen / ablehnen / Mensch
3. Je Lieferant eine Retoure `RETOURE-<nr>`, Anfrage per Mail an den Lieferanten
4. Lieferant antwortet → Agent erkennt Rücksendeadresse/RMA → Kunde bekommt Anleitung
5. Lieferant bestätigt Eingang → Erstattung → Kunde bekommt Bestätigung
6. Keine Antwort: zwei Erinnerungen im Abstand von 3 Tagen, danach Aufgabe im Admin

Erstattungen laufen erst automatisch, wenn ein Zahlungsanbieter angebunden ist. Bis dahin entsteht
die Aufgabe „Erstattung auslösen“, die im Admin mit einem Klick bestätigt wird.

## Einrichten
- `ANTHROPIC_API_KEY` setzen (Konto unter platform.claude.com)
- Eingehende Mails: beim Mail-Anbieter einen Inbound-Webhook auf `POST /api/intern/inbound-email`
  mit `Authorization: Bearer $INBOUND_EMAIL_SECRET` einrichten (Felder `from`, `subject`, `text`)
- Kosten im Blick: Admin → KI & Service zeigt Läufe und Tokens je Agent der letzten 30 Tage

## Testen ohne Kosten
`npm run demo:return` spielt Retoure, Lieferanten-Mails (auch eine gefälschte) und einen Lia-Chat mit
einem TEST-Modell durch, das feste Antworten liefert. Es ruft keine echte KI auf.
