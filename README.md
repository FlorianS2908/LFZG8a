# ueTool ContentFactory

**Unterrichtsmaterialien analysieren und Kurscontainer erstellen**

Die ueTool ContentFactory ist eine lokale Electron-Anwendung. Sie importiert Unterrichtspläne und Materialien, schlägt Kategorien vor, erzeugt eine bearbeitbare Tagesstruktur, prüft den geplanten Container und exportiert getrennte Dozenten- und Teilnehmerinhalte. Die Anwendung startet direkt ohne Login, Benutzerkonten oder Rollenverwaltung.

## Voraussetzungen und Start

- Node.js 22 und npm
- Windows 10/11 für die Paketierung

```text
npm install --prefix desktop-app
npm run dev
npm start
npm test
npm run test:coverage
npm run check
npm run build
npm run package
```

`npm run package` erzeugt ein Windows-Paket in `desktop-app/dist`. Alle Paketinhalte sind explizit auf ContentFactory-Dateien begrenzt.

## Workflow

Ein Excel-Unterrichtsplan (`.xls`, `.xlsx` oder `.xlsm`) ist Pflicht. Makros werden nicht ausgeführt. Nach Blatt- und Spaltenauswahl können Materialien importiert, automatisch vorgeschlagene Kategorien manuell geändert, Tage bearbeitet, lokale oder optionale KI-Entwürfe geprüft und Preflight, Vorschau und Export gestartet werden.

Unterstützte Quellen sind Markdown, PowerPoint, Excel, JSON, XML, Jupyter, HTML, Word, PDF, PNG/JPEG, Text, CSS, JavaScript und TypeScript. Unbekannte Typen werden als nicht automatisch analysierbar behandelt und können als Anlage erhalten bleiben.

## Daten, KI und Sicherheit

Projekte und Referenzen liegen lokal im Electron-Benutzerdatenverzeichnis. Projekte enthalten keine API-Schlüssel. Ohne Internet und ohne Schlüssel arbeitet die regelbasierte lokale Verarbeitung weiter. OpenAI ist optional; eine Übertragung erfolgt nur nach erkennbarer Auswahl. Renderer-Isolation, eine schmale Preload-API, validierte relative Exportpfade und die Trennung von Lösungen schützen den Workflow.

Das Containerformat ist in [docs/contentfactory-container-format.md](docs/contentfactory-container-format.md) beschrieben, der Ablauf in [docs/contentfactory-user-guide.md](docs/contentfactory-user-guide.md). Die Bestandsaufnahme und bekannte Restarbeiten stehen in [docs/contentfactory-standalone-analysis.md](docs/contentfactory-standalone-analysis.md).

## Bekannte Einschränkungen

- Die externe Probe `Wochenplan_FIAE_LF-ZQ8A.xlsm` war im Workspace nicht vorhanden; Core-Tests verwenden synthetische Plandaten.
- Historische Plattformdateien sind nicht mehr startbar, erreichbar oder paketiert. Ihre physische Massenlöschung wurde in diesem Arbeitslauf aus Sicherheitsgründen nicht freigegeben und bleibt eine getrennt zu prüfende Bereinigung.
- Code-Coverage wird mit Node gemessen; die Schwelle wird erst nach belastbarer Baseline angehoben und nicht künstlich grün gerechnet.
