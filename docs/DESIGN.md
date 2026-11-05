# Design: drei Richtungen und Entscheidung

Ziel: Der Shop soll wie ein etablierter, vertrauenswürdiger Händler wirken. Diskret,
erwachsen und warm, aber nicht schmuddelig und nicht nach billigem Dropshipping.
Die meisten Kunden kommen über das Handy, oft unterwegs. Darum gilt: Suche zuerst,
dann Orientierung, dann Vertrauen, dann Kauf.

## Richtung 1: Neon Nightlife
Schwarz, Pink, Neon-Verläufe, große Fotos.
- Plus: sofort als Erotik erkennbar
- Minus: wirkt austauschbar und billig, schreckt Paare und Neukunden ab, Kontrastprobleme
- Ergebnis: verworfen

## Richtung 2: Klinische Wellness
Weiß, Salbeigrün, runde Sans-Serif, wie eine Apotheken- oder Wellnessmarke.
- Plus: sehr vertrauenswürdig, gut für Pflegeprodukte
- Minus: kühl, wenig Begehren, Wäsche und Fetisch passen nicht hinein
- Ergebnis: teilweise übernommen (Klarheit, Produktinfos, Pflegehinweise)

## Richtung 3: Warmes Editorial („Nachtblüte“)
Leinenfarbener Grund, tiefe Pflaume als Tinte, Apricot als Akzent, eine weiche
Serif-Schrift für Überschriften, organische Formen statt expliziter Bilder.
- Plus: erwachsen, eigenständig, diskret (auch am Bildschirm in der Bahn),
  trägt Wäsche und Pflege gleichermaßen
- Minus: braucht gute Produktfotos, damit es nicht zu ruhig wirkt
- Ergebnis: **gewählt**, kombiniert mit der Informationsklarheit aus Richtung 2

## Umsetzung
| Token | Wert | Verwendung |
|---|---|---|
| `--bg` | #f6efe7 Leinen | Seitenhintergrund |
| `--surface` | #fffaf5 | Karten, Panels |
| `--ink` | #2b1626 | Text (Kontrast auf `--bg` ca. 15:1) |
| `--muted` | #6a5462 | Nebentext (ca. 6,3:1) |
| `--plum` | #6b1d4c | Buttons, Links (weiße Schrift ca. 10:1) |
| `--apricot` | #f0b08a | nur dekorativ, nie Textfarbe |
| `--rust` | #9c3418 | Preisreduzierung (ca. 6:1) |
| `--line` | #e3d6ca | Trennlinien |

- Schriften: Fraunces (Überschriften, weiche Serife) und Manrope (Text, Bedienung).
- Formensprache: Produktplatzhalter als organische Formen (Welle, Bogen, Tropfen,
  Ring), große Rundungen, keine harten Schatten.
- Navigation: auf dem Handy oben die Suche, darunter horizontal wischbare Kategorie-Chips.
  Auf dem Desktop wird daraus ein Kategorie-Raster mit unterschiedlich großen Kacheln.
- Diskretion als Gestaltungsprinzip: keine expliziten Abbildungen auf Start- und
  Kategorieseiten, neutrale Seitentitel im Browser-Tab möglich (später Option).
- Barrierefreiheit: Kontrast mindestens 4,5:1, sichtbarer Fokus, `prefers-reduced-motion`
  schaltet Animationen ab, alle Formen haben Textalternativen.

## Bewegung (Version 2)
- Hero: langsam treibende Farbwolken, aufsteigende Herzen, feine Körnung, wechselnde Wörter („dir“, „euch“, „uns“, „heute“).
- Laufband mit allen Kategorien in Pflaume, pausiert bei Mausberührung.
- Elemente blenden beim Scrollen gestaffelt ein, Karten heben sich beim Überfahren.
- Produktformen schweben leicht, Merkliste mit Herz-Puls und kleinem Funkenregen.
- Bühne „Für zwei“: dunkler Grund mit langsam rotierendem Farbring und pulsierendem Button.
- Barrierefreiheit: Alles ist dekorativ und für Screenreader ausgeblendet. Bei „Bewegung reduzieren“
  stoppen alle Animationen, wechselnde Wörter bleiben stehen, eingeblendete Inhalte sind sofort sichtbar.
  Ohne JavaScript ist ebenfalls alles sichtbar.
