# LFZQ8a Desktop-App

Diese App ist der Electron-Prototyp fuer die LFZQ8a-Unterrichtsmaterialien.

## Ziel

- bestehende HTML-Uebersicht weiterverwenden
- Dozenteninfos in einem eigenen Fenster oeffnen
- zweites Fenster gezielt auf einen ausgewaehlten Monitor setzen
- lokale Unterrichtshistorie speichern
- Historie gezielt resetten, ohne Workshop-Dateien oder Einstellungen zu loeschen

## Entwicklung starten

```powershell
cd desktop-app
pnpm install
pnpm start
```

## Pruefung

```powershell
pnpm run check
```

## Daten

Electron speichert Einstellungen und Historie im lokalen App-Datenordner des Benutzers.
Der Wizard zeigt den Datenordner ueber die Schaltflaeche `Datenordner`.

- `settings.json`: Monitorwahl und Setup-Status
- `history.json`: Unterrichtshistorie

Die Reset-Funktion loescht nur `history.json`.

## Naechste Ausbaustufe

- Windows-Release als ZIP oder Installer bauen
- Wizard um Kurs-/Klassenprofil erweitern
- Historie mit Tagesstatus, Aufgabenstatus und Dozentennotizen ausbauen
- optional Auto-Update oder GitHub-Release-Download vorbereiten
