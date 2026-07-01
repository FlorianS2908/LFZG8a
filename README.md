# LFZQ8a HTML & CSS

Dieses Repository enthaelt die Kursmaterialien fuer LFZQ8a HTML & CSS.

## Einstieg

- `index.html`: statischer Einstieg fuer den Teilnehmerbereich
- `LFZQ8a-Workshop-starten.cmd`: Start der Electron-Desktop-App per Doppelklick

## Aktive Struktur

- `dozent/`: Dozentenstruktur mit Leitfaeden, Tagesmaterial, Loesungen, Bewertung, Quizdaten, Projektdateien und Tools; Start erfolgt ueber die Electron-Desktop-App
- `teilnehmer/`: eigenstaendige Teilnehmerstruktur mit Webvarianten, Aufgaben, Starterdateien, Quizdaten, Projektmaterial, Abgabehinweisen und Standalone-Tools
- `desktop-app/`: Electron-Projekt fuer die Desktop-App
- `_archiv/`: alte Root-Dubletten, Zwischenstaende und nicht mehr direkt benoetigte Dateien

## Standalone-Tools

- Dozenten-Tool: `dozent/tools/html-tags-css-dozenteninfo.html`
- Teilnehmer-Tool: `teilnehmer/tools/html-tags-css-uebersicht.html`

## DSGVO-relevante Funktionen

Diagnosefunktionen mit technischen Geraetedaten, Netzwerkdaten und Mailvorbereitung wurden aus `electronDesktop` entfernt und liegen separat im Branch `dsgvo-diagnosefunktionen`.

## Nutzung

Der Bereich `teilnehmer/` ist bewusst standalone aufgebaut und kann separat weitergegeben oder geoeffnet werden. Der Bereich `dozent/` wird nicht aus dem statischen Einstieg verlinkt und soll ueber die Electron-Desktop-App gestartet werden. Alle Projektpfade sind relativ aufgebaut, damit der Ordner auf unterschiedlichen Windows-Systemen lauffaehig bleibt.

## Aufraeumregel

Neue Kursdateien gehoeren in die passende Rollenstruktur:

- Aufgaben, Starterdateien und Teilnehmermaterial nach `teilnehmer/`
- Loesungen, Leitfaeden und Dozentenmaterial nach `dozent/`
- alte oder nicht mehr benoetigte Arbeitsstaende nach `_archiv/`
