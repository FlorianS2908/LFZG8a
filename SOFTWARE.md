# Benoetigte Softwarepakete

## Pflicht

| Paket | Zweck | Hinweis |
| --- | --- | --- |
| Windows | Zielsystem fuer Startskripte und Desktop-App | Aktuelle Automatisierung ist fuer Windows ausgelegt |
| Node.js LTS | Start und Installation der Electron-App | Kann bei Bedarf ueber `winget` installiert werden |
| Electron | Desktop-App fuer Wizard, Kursplattform und lokalen Kursserver | Wird ueber `desktop-app/package.json` installiert |
| npm | Installation der JavaScript-Abhaengigkeiten | Kommt mit Node.js |
| Browser | Teilnehmer-View ueber Kursserver-Adresse | Edge, Chrome oder Firefox reicht |

## Empfohlen

| Paket | Zweck | Hinweis |
| --- | --- | --- |
| Visual Studio Code | Bearbeitung der Projekt-Arbeitsordner | Wird aus der App heraus fuer Arbeitsdateien geoeffnet |
| pnpm | Schnellere und stabile Dependency-Installation | Das Startskript bevorzugt `pnpm`, faellt aber auf `npm` zurueck |
| winget | Automatische Node.js-Installation | Nur noetig, wenn Node.js nicht vorhanden ist |

## Automatische Installation durch Starter

| Rolle | Starter | Automatisch geprueft | Automatisch installiert, wenn moeglich |
| --- | --- | --- | --- |
| Dozent | `Start-LFZQ8a-Dozent.cmd` | VS Code, Node.js LTS, Electron/App-Abhaengigkeiten | VS Code per `winget`, Node.js LTS per `winget`, App-Abhaengigkeiten per `pnpm install` oder `npm install` |
| Teilnehmer | `Start-LFZQ8a-Teilnehmer.cmd` | VS Code, lokale Teilnehmermaterialien | VS Code per `winget` |

Die gemeinsame Prueflogik liegt fest unter:

```text
deployment/common/install-check.ps1
```

Die ZIP-Pakete werden mit folgendem Skript erzeugt:

```text
deployment/build-packages.ps1
```

Die erzeugten ZIP-Dateien liegen lokal unter:

```text
dist/LFZQ8a-Dozent.zip
dist/LFZQ8a-Teilnehmer.zip
```

`dist/` ist ein lokaler Build-Ordner und wird nicht versioniert.

## Wird aktuell nicht zusaetzlich benoetigt

| Paket | Grund |
| --- | --- |
| React | Der aktuelle Umbau nutzt die bestehende Electron/HTML/JS-Struktur ohne neue UI-Abhaengigkeit |
| Less | Die Projektmaterialien wurden auf CSS umgestellt |
| Separater Webserver | Die Dozenten-App startet den lokalen Kursserver selbst |
| Externer Uebersetzungsdienst | Die Sprachen Deutsch, Englisch, Tuerkisch, Ukrainisch und Russisch liegen lokal in der App; keine Cloud-API oder Internetverbindung fuer die App-Uebersetzung noetig |
| Zusaetzliches Navigationsframework | Die zentrale Dozenten-Startseite wird mit der bestehenden Electron/HTML/JS-Struktur aus dem Kurskatalog gerendert |

## Lokale App-Abhaengigkeiten

Die App-Abhaengigkeiten liegen im Ordner `desktop-app/` und werden ueber `package.json` gesteuert.

```powershell
cd desktop-app
npm install
npm start
```

Alternativ:

```powershell
cd desktop-app
pnpm install
pnpm start
```

## Testausfuehrung und Coverage

| Paket | Zweck | Hinweis |
| --- | --- | --- |
| Node.js LTS | Fuehrt den Test-Runner und die Coverage-Instrumentierung aus | Pflicht fuer automatisierte Tests |
| npm oder pnpm | Installiert die App-Abhaengigkeiten vor dem Testlauf | `npm test` startet `tests/run-tests.js` |
| Node Inspector / V8 Coverage | Misst Pfadbereiche in `desktop-app/app/lib` | Wird ueber Node.js genutzt, keine separate Installation |

Aktueller Zielwert:

```text
Mindestens 95 Prozent Pfadabdeckung fuer desktop-app/app/lib
```

Abgedeckte Testarten:

- C0-Anweisungsabdeckung,
- C1-Zweigabdeckung,
- C2-Bedingungsabdeckung,
- C3-Pfadabdeckung fuer zentrale App-Flows,
- C4-Mehrfachbedingungsabdeckung fuer kombinierte Randfaelle,
- Blackbox-Tests ueber oeffentliche Funktionen,
- Whitebox-Tests fuer interne Fallbacks und Grenzwerte.
