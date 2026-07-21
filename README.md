# Ploglan ContentFactory

Die ContentFactory ist eine eigenständige Electron-Anwendung zum Erstellen, Prüfen und Exportieren von Kurscontainern. Sie startet direkt ohne Login, Rollenverwaltung oder frühere Kursplattform. Das Ploglan-Branding steht links oben in der festen Seitennavigation.

## Start unter Windows

Der vorhandene Starter `ContentFactoryMainStart.cmd` startet die Anwendung mit der lokalen Konfiguration. Alternativ:

```text
npm install --prefix desktop-app
npm start
```

Für die Entwicklung wird `npm run dev` verwendet.

## Tests und Build

```text
npm test
npm run test:coverage
npm run check
npm run build
npm run package
```

`npm test` führt Architektur-, Renderer-, Service-, Speicher- und Core-Tests aus. `npm run build` erzeugt ein entpacktes Windows-Build unter `desktop-app/dist`; `npm run package` erzeugt den Windows-Installer.

## Unterstützte Eingaben

Die ContentFactory verarbeitet Excel-Unterrichtspläne (`.xls`, `.xlsx`, `.xlsm`), Word, PDF, PowerPoint, EPUB, Markdown, HTML, Text, JSON, XML, Jupyter-Notebooks, Quellcode, Bilder und ZIP-Pakete. `.xlsm`-Dateien werden ausschließlich gelesen; Makros werden weder ausgeführt noch verändert.

## Produktive Struktur

- `desktop-app/app/main.js` und `preload.js`: isolierter Electron-Einstieg
- `desktop-app/app/renderer/tool-center/`: ContentFactory-Oberfläche und Ploglan-Logo
- `desktop-app/app/lib/content-factory/`: Import-, Analyse-, Generierungs-, Prüf- und Exportservices
- `packages/content-factory-core/`: produktive, frameworkunabhängige Fachlogik
- `docs/`: Benutzer-, Format-, KI-, Import-, Curriculum- und Didaktikdokumentation

Projekte, Referenzen und Schlüsselkonfigurationen werden ausschließlich im lokalen Electron-Benutzerdatenverzeichnis gespeichert. OpenAI ist optional; ohne API-Schlüssel bleibt die lokale regelbasierte Verarbeitung verfügbar.

Weitere Informationen stehen im [Benutzerhandbuch](docs/contentfactory-user-guide.md), in der [Containerformat-Dokumentation](docs/contentfactory-container-format.md) und in der [Standalone-Analyse](docs/contentfactory-standalone-analysis.md).
