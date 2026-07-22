# CourseForge

The AI-powered Course Compiler

CourseForge analysiert Themen, Unterrichtspläne und Kursmaterialien, erstellt daraus strukturierte Kursentwürfe und generiert geprüfte Kurscontainer mit Webvarianten, Aufgaben, Lösungen, Projekten, Fragenpools und Begleitmaterialien.

Die eigenständige Electron-Anwendung startet lokal ohne Login oder Rollenverwaltung. Bestehende Projekte aus früheren Produktversionen werden beim ersten Start sicher in das CourseForge-Benutzerdatenverzeichnis kopiert; die Quelldaten bleiben erhalten.

## Installation und Start unter Windows

```text
git clone https://github.com/FlorianS2908/CourseForge.git
cd CourseForge
npm install --prefix desktop-app
CourseForgeStart.cmd
```

Alternativ starten `npm start` und `npm run dev` die Anwendung aus dem Repository-Hauptordner. Alle Startbefehle verwenden relative Pfade und funktionieren daher auch nach dem Umbenennen oder Verschieben des Projektordners.

## Tests und Build

```text
npm test
npm run test:coverage
npm run check
npm run build
npm run package
```

`npm test` führt Architektur-, Renderer-, Service-, Speicher- und Core-Tests aus. `npm run build` erzeugt das entpackte Windows-Build unter `desktop-app/dist`; `npm run package` erzeugt den CourseForge-Installer.

## Unterstützte Eingaben

CourseForge verarbeitet Excel-Unterrichtspläne (`.xls`, `.xlsx`, `.xlsm`), Word, PDF, PowerPoint, EPUB, Markdown, HTML, Text, JSON, XML, Jupyter-Notebooks, Quellcode, Bilder und ZIP-Pakete. `.xlsm`-Dateien werden ausschließlich gelesen; Makros werden weder ausgeführt noch verändert.

## Produktive Struktur

- `desktop-app/app/main.js` und `preload.js`: isolierter Electron-Einstieg
- `desktop-app/app/renderer/tool-center/`: CourseForge-Oberfläche
- `desktop-app/app/lib/content-factory/`: kompatibel gehaltener interner Pfad der Import-, Analyse-, Generierungs-, Prüf- und Exportservices
- `packages/content-factory-core/`: kompatibel gehaltene, frameworkunabhängige Fachlogik
- `docs/`: Benutzer-, Format-, KI-, Import-, Curriculum- und Didaktikdokumentation

Die internen Namen `content-factory`, `factory:*` und `ContentFactory*` bleiben vorerst als Kompatibilitätsschicht bestehen, damit gespeicherte Projekte, IPC-Aufrufe und Erweiterungen nicht brechen. Neue Renderer-Integrationen verwenden `window.courseForgeDesktop`; `window.lfzq8aDesktop` bleibt als Alias verfügbar.

## Lokale Daten und Migration

CourseForge speichert Projekte ausschließlich im lokalen Electron-Benutzerdatenverzeichnis. Beim ersten Start werden vorhandene Projektbestände aus den früheren App-Verzeichnissen erkannt und ohne Überschreiben vorhandener CourseForge-Dateien kopiert. Die Migration ist idempotent und löscht keine Quelldaten. Der Unterordner `projects/content-factory` bleibt bewusst erhalten, damit alle bisherigen Kursprojekte, Referenzen, Analyseergebnisse und Container weiter geladen werden.

OpenAI-Schlüssel werden im Main-Prozess mit Windows `safeStorage` verschlüsselt; der Renderer kann sie weder lesen noch exportieren.

Weitere Informationen stehen in der [OpenAI-Einrichtung](docs/OPENAI_API_SETUP.md), im [Benutzerhandbuch](docs/contentfactory-user-guide.md), in der [Containerformat-Dokumentation](docs/contentfactory-container-format.md) und in der [Standalone-Analyse](docs/contentfactory-standalone-analysis.md).
