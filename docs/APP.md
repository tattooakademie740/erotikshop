# Lustviora als App

## Entscheidung: zuerst Web-App (PWA), native App später

| Weg | Plus | Minus |
|---|---|---|
| **PWA** (umgesetzt) | Kein App-Store nötig, sofort live, ein Code für Web, iPhone und Android, Updates ohne Freigabe | Push auf dem iPhone erst ab iOS 16.4 und nur nach Installation |
| Native App (Expo/React Native oder Capacitor) | Präsenz im App Store und Google Play | Store-Richtlinien für Erotikartikel sind streng und müssen vorab geprüft werden (nicht verifiziert), doppelter Pflegeaufwand |

Die Store-Richtlinien von Apple und Google zu Erotikprodukten habe ich **nicht verifiziert**. Vor einer
nativen App muss geprüft werden, ob und wie ein Shop für Sexspielzeug dort zugelassen wird.

## Was die PWA kann
- Installierbar auf dem Startbildschirm (Android: Knopf „Installieren“, iPhone: Teilen → Zum Home-Bildschirm)
- Vollbild ohne Browserleiste, eigenes Icon, Splash in Markenfarben
- Tab-Leiste unten: Start, Suche, Merkliste, Warenkorb
- Offline: zuletzt besuchte Seiten, Bilder und eine eigene Offline-Seite; Merkliste und Warenkorb liegen auf dem Gerät
- Kurzbefehle beim langen Drücken auf das Icon (Android): Suche, Merkliste, Warenkorb
- Sicherheits-Header, Service Worker wird nie zwischengespeichert

## Nächste Schritte
1. Push-Benachrichtigungen (Versand, Lieferung), nur mit ausdrücklicher Einwilligung, Texte ohne Produktnamen
2. Diskreter Modus: neutrales App-Icon und neutraler Name auf dem Startbildschirm als Option
3. Kundenkonto mit Bestellverlauf in der App
4. Danach Entscheidung über native App nach Prüfung der Store-Richtlinien
