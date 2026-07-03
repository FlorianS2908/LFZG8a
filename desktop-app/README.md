# LFZQ8a Desktop-App

Diese App ist die Electron-Kursplattform fuer die LFZQ8a-Unterrichtsmaterialien.

## Ziel

- bestehende HTML-Materialien ueber einen Kurskatalog in die App integrieren
- Inhalte im App-Viewer anzeigen
- Dozenteninfos und Materialien optional in einem eigenen Fenster oeffnen
- zweites Fenster gezielt auf einen ausgewaehlten Monitor setzen
- Teilnehmerfreigaben und Teilnehmerstatus verwalten
- lokale Unterrichtshistorie speichern
- Historie gezielt resetten, ohne Workshop-Dateien oder Einstellungen zu loeschen

## App-Struktur

- `app/renderer/course.html`: integrierte Kursplattform.
- `app/renderer/course.js`: Navigation, Viewer, Freigaben, Teilnehmerstatus und VS-Code-Start.
- `app/lib/course-catalog.js`: zentrale Registrierung der Tage, Tools, Projekte und Leitfaeden.
- `app/renderer/wizard.html`: Erststart-Wizard.
- `app/lib/classroom-server.js`: lokaler Kursserver fuer Teilnehmerprofile, Freigaben und Fortschritt.

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

## Start per Doppelklick

Im Projektordner liegt die Datei `LFZQ8a-Workshop-starten.cmd`. Sie kann per Doppelklick gestartet werden.

Der Starter:

- wechselt automatisch in den Ordner `desktop-app`
- sucht direkt die installierte `electron.exe` und benoetigt dafuer kein globales `node`
- installiert bei fehlender Electron-Installation automatisch die Abhaengigkeiten
- installiert bei Bedarf Node.js LTS ueber `winget`
- fuehrt danach einmalig `pnpm install` oder `npm install` aus
- startet danach die Desktop-App

Fuer eine reine Pruefung ohne App-Start:

```powershell
.\LFZQ8a-Workshop-starten.cmd --check
```

## Pruefung

```powershell
pnpm run verify
```

`verify` fuehrt Syntaxchecks und die automatisierten Modul-Tests aus. Die Tests laufen bewusst mit einem kleinen In-Process-Runner, damit sie auf Windows/OneDrive und in GitHub Actions ohne zusaetzliche Test-Worker stabil laufen.

Der Test-Runner misst zusaetzlich die Pfad-/Range-Abdeckung der Module unter `app/lib` und bricht unter 90% ab. Der aktuelle Stand liegt bei 94,44%.

Aktuell abgedeckt:

- Settings werden angelegt und gespeichert
- Wizard-Testmodus kann Historie deaktivieren
- Historie wird gespeichert, begrenzt und sortiert
- Reset loescht nur die Historie
- Kurskatalog verweist auf vorhandene Inhalte
- Electron startet die integrierte Kursplattform
- Monitor-Auswahl faellt bei fehlendem Monitor sauber zurueck
- Fensterpositionen werden aus der Display-Workarea berechnet
- JSON-Dateien werden angelegt, gelesen und bei Fehlern mit Fallback behandelt

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
- Teilnehmer-App oder lokaler Helper fuer Teilnehmer-Arbeitsordner pruefen
- Wizard um Kurs-/Klassenprofil erweitern
- Historie mit Tagesstatus, Aufgabenstatus und Dozentennotizen ausbauen
- optional Auto-Update oder GitHub-Release-Download vorbereiten
