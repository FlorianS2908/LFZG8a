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

## Start per Doppelklick

Im Projektordner liegt die Datei `LFZQ8a-Workshop-starten.cmd`. Sie kann per Doppelklick gestartet werden.

Der Starter:

- wechselt automatisch in den Ordner `desktop-app`
- nutzt die vorhandene Electron-Installation
- fuehrt bei fehlender Installation einmalig `pnpm install` oder `npm install` aus
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

Aktuell abgedeckt:

- Settings werden angelegt und gespeichert
- Historie wird gespeichert, begrenzt und sortiert
- Reset loescht nur die Historie
- Monitor-Auswahl faellt bei fehlendem Monitor sauber zurueck
- Fensterpositionen werden aus der Display-Workarea berechnet
- Diagnose-Sparklines, CPU-Berechnung und Berichtsausgabe

## Daten

Electron speichert Einstellungen und Historie im lokalen App-Datenordner des Benutzers.
Der Wizard zeigt den Datenordner ueber die Schaltflaeche `Datenordner`.

- `settings.json`: Monitorwahl und Setup-Status
- `history.json`: Unterrichtshistorie
- `reports/`: lokal erzeugte Diagnoseberichte als JSON und HTML

Die Reset-Funktion loescht nur `history.json`.

## Diagnose und Testprotokoll

Der Wizard kann nach aktiver Einwilligung ein Testprotokoll erzeugen. Es wird nichts automatisch oder heimlich versendet.

Das Protokoll enthaelt:

- App-Version und Systemdaten
- Monitoranzahl und Displaydaten
- lokale IP-Adressen
- MAC-Adressen der Netzwerkadapter
- kurze CPU- und RAM-Verlaufsskalen mit Peak-Werten
- gespeicherte Dateien `report.html` und `report.json`

Die Schaltflaeche `Mail vorbereiten` oeffnet das lokale Mailprogramm mit Empfaenger `jlploglan@gmail.com` und der Berichtszusammenfassung im Mailtext. Anhaenge koennen per `mailto:` nicht auf jedem System automatisch gesetzt werden; die gespeicherten Berichtdateien koennen bei Bedarf manuell angehaengt werden.

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
