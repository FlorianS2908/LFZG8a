# LFZQ8a HTML & CSS

Dieses Repository enthaelt die Kursmaterialien fuer LFZQ8a HTML & CSS.

## Einstieg

- `index.html`: zentrale Uebersicht fuer Dozenten- und Teilnehmerbereich
- `LFZQ8a-Workshop-starten.cmd`: Start der Electron-Desktop-App per Doppelklick

## Aktive Struktur

- `dozent/`: eigenstaendige Dozentenstruktur mit Leitfaeden, Tagesmaterial, Loesungen, Bewertung, Quizdaten, Projektdateien und Standalone-Tools
- `teilnehmer/`: eigenstaendige Teilnehmerstruktur mit Webvarianten, Aufgaben, Starterdateien, Quizdaten, Projektmaterial, Abgabehinweisen und Standalone-Tools
- `desktop-app/`: Electron-Projekt fuer die Desktop-App
- `_archiv/`: alte Root-Dubletten, Zwischenstaende und nicht mehr direkt benoetigte Dateien

## Standalone-Tools

- Dozenten-Tool: `dozent/tools/html-tags-css-dozenteninfo.html`
- Teilnehmer-Tool: `teilnehmer/tools/html-tags-css-uebersicht.html`

## Nutzung

Die Bereiche `dozent/` und `teilnehmer/` sind bewusst getrennt aufgebaut und koennen separat weitergegeben oder geoeffnet werden. Die Desktop-App bleibt daneben als technische Start- und Fensterlogik erhalten.

## Aufraeumregel

Neue Kursdateien gehoeren in die passende Rollenstruktur:

- Aufgaben, Starterdateien und Teilnehmermaterial nach `teilnehmer/`
- Loesungen, Leitfaeden und Dozentenmaterial nach `dozent/`
- alte oder nicht mehr benoetigte Arbeitsstaende nach `_archiv/`
