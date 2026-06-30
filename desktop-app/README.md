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

Nach der ersten Installation muss `pnpm install` nur erneut ausgefuehrt werden, wenn sich `package.json`, `pnpm-lock.yaml` oder `pnpm-workspace.yaml` geaendert haben. Fuer normale Codeaenderungen reicht:

```powershell
pnpm start
```

## Pruefung

```powershell
pnpm run verify
```

`verify` fuehrt Syntaxchecks und die automatisierten Modul-Tests aus. Die Tests laufen bewusst mit einem kleinen In-Process-Runner, damit sie auf Windows/OneDrive und in GitHub Actions ohne zusaetzliche Test-Worker stabil laufen.

Aktuell abgedeckt:

- Settings werden angelegt und gespeichert
- Historie wird gespeichert, begrenzt und sortiert
- Reset loescht nur die Historie
- Monitor-Auswahl faellt bei fehlendem Monitor sauber zurueck
- Fensterpositionen werden aus der Display-Workarea berechnet

## Daten

Electron speichert Einstellungen und Historie im lokalen App-Datenordner des Benutzers.
Der Wizard zeigt den Datenordner ueber die Schaltflaeche `Datenordner`.

- `settings.json`: Monitorwahl und Setup-Status
- `history.json`: Unterrichtshistorie

Die Reset-Funktion loescht nur `history.json`.

## Automatisierung

Der Workflow `.github/workflows/electron-desktop.yml` prueft den Branch `electronDesktop` bei Pushes und Pull Requests automatisch:

1. Checkout
2. pnpm einrichten
3. Node einrichten
4. Dependencies installieren
5. `pnpm run verify`

## Update- und Installationsstrategie

Fuer die Entwicklung bleibt `node_modules` lokal erhalten und wird nicht committed. Dadurch muss die App nicht nach jeder Codeaenderung neu installiert werden.

Fuer Clients ist als naechster Schritt ein Release-Paket sinnvoll:

- einfache Variante: ZIP mit fertiger App
- saubere Ausrollung: Windows-Installer mit `electron-builder`
- spaetere Komfortstufe: Auto-Update ueber GitHub Releases

## Naechste Ausbaustufe

- Windows-Release als ZIP oder Installer bauen
- Wizard um Kurs-/Klassenprofil erweitern
- Historie mit Tagesstatus, Aufgabenstatus und Dozentennotizen ausbauen
- optional Auto-Update oder GitHub-Release-Download vorbereiten
