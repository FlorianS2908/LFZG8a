# Bestandsaufnahme: eigenständige ueTool ContentFactory

Ausgangsstand: `origin/main` bei Commit `5ab97188e03280ee430a92f7014ed897d72b0fdf`, geprüft am 21.07.2026. Der Arbeitsbranch ist `agent/contentfactory-standalone`. Zwei bereits vorhandene, unversionierte Quiz-Dateien unter `dozent/tools/quiz/` gehören nicht zu dieser Änderung und bleiben unangetastet.

## Abhängigkeitsmatrix

| Bereich/Datei | Von ContentFactory benötigt | Aktion | Begründung |
|---|---:|---|---|
| `desktop-app/app/lib/content-factory/**` | Ja | behalten und konsolidieren | Enthält Importadapter, Dateitypregeln, Unterrichtsplan-Parser, Mapping, KI-Fallback, Preflight, Export, Vorschau und Sicherheitsvalidierung. |
| `desktop-app/app/renderer/tool-center/factory.*` | Ja | migrieren | Ist die produktive ContentFactory-Oberfläche; sie wird zum alleinigen Renderer-Einstieg. |
| `desktop-app/app/main.js` | Teilweise | ersetzen | Mischt ContentFactory mit Login, Rollen, Kursserver, Monitor-, Admin-, Doku- und Kursfunktionen. Nur validierte ContentFactory-IPC-Kanäle werden übernommen. |
| `desktop-app/app/preload.js` | Teilweise | ersetzen | Exponiert derzeit zahlreiche Plattform-APIs. Die Standalone-App benötigt nur eine schmale ContentFactory-Bridge. |
| `desktop-app/app/lib/app-data.js` | Teilweise | migrieren | ContentFactory verwendet Teile der lokalen Ablage; Konto-, Rollen-, Passwort- und Freigabelogik ist fachfremd. Eine eigene Projektablage ersetzt diese Kopplung. |
| `desktop-app/app/lib/container-registry/**` | Teilweise | migrieren | Lokale Container-Metadaten sind nützlich; die Plattform-Registry ist an fremde Module gekoppelt. Benötigte Ablage wird in den ContentFactory-Service integriert. |
| `desktop-app/app/lib/env/env-loader.js` | Ja | behalten | Liest optionale lokale KI-Konfiguration ohne Schlüssel in Projekt oder Export zu schreiben. |
| `desktop-app/app/lib/display.js` | Nein | entfernen | Dient Monitorwahl und Kursansichten, die im Standalone-Produkt entfallen. |
| `desktop-app/app/lib/classroom-server.js` | Nein | entfernen | Implementiert Teilnehmer-Kursserver und Freigaben, nicht Containererstellung. |
| `desktop-app/app/lib/dokutool-service.js` | Nein | entfernen | Eigenständiges DokuTool außerhalb des Produktumfangs. |
| `desktop-app/app/lib/admin-tools/**` | Nein | entfernen | Adminbereich, Benutzeradministration und Plattformdiagnose sind ausgeschlossen. |
| `desktop-app/app/lib/course-management/**` | Nein | entfernen | Kurszuweisung und Plattform-Kursverwaltung sind ausgeschlossen. |
| `desktop-app/app/lib/modules/**` | Nein | entfernen | Registriert Plattformmodule, Rollenansichten und fremde Tools. |
| `desktop-app/app/lib/workflow/**` | Nein | entfernen | Enthält rollenbasierte Zugriffssteuerung; Standalone benötigt keine Benutzerkonten. |
| `desktop-app/app/lib/catalog/**`, `course-catalog.js`, `task-packages.json` | Nein | entfernen | Kataloge referenzieren den bestehenden Dozenten-/Teilnehmerkurs statt die Containererstellung. |
| `desktop-app/app/renderer/tool-center/login.*` und `user-create.*` | Nein | entfernen | Login und Registrierung sind ausdrücklich ausgeschlossen. |
| `desktop-app/app/renderer/tool-center/admin-tool.*`, `release-center.*`, `course-management.*` | Nein | entfernen | Admin, Freigabezentrum und Kursverwaltung sind fachfremd. |
| `desktop-app/app/renderer/tool-center/workspace.*` | Nein | entfernen | Alte Landingpage mit Plattformkacheln; die App startet direkt in der ContentFactory. |
| `desktop-app/app/renderer/course*`, `wizard.*` | Nein | entfernen | Dozenten-/Teilnehmer-Kursansicht, Monitorsteuerung und Einrichtungswizard gehören nicht zum Zielprodukt. |
| `packages/content-factory-core/**` | Ja | behalten und erweitern | UI-unabhängige Fachlogik mit Klassifikation, Mapping, Validierung und Containerbau sowie bestehende Tests. |
| `packages/content-factory/README.md` | Teilweise | aktualisieren | Platzhalterpaket; bleibt nur als Architekturdokumentation ohne konkurrierende Implementierung. |
| `apps/content-factory-lab/**` | Teilweise | migrieren, dann entfernen | Das Lab enthält Workflow-Komponenten und lokale Runner. Seine Funktionen sind bereits in Core und produktivem Factory-Renderer vorhanden; ein zweiter Anwendungseinstieg wäre Altcode. |
| `apps/container-factory-lab/**`, `packages/container-factory-core/**` | Nein | entfernen | Ältere parallele Benennung/Implementierung; ContentFactory-Core und produktiver Renderer decken den benötigten Workflow ab. |
| `desktop-app/tests/content-factory.test.js` | Ja | behalten und erweitern | Deckt produktive CommonJS-Fachlogik und Export-Sicherheitsregeln ab. |
| Plattformtests in `desktop-app/tests/` | Nein | entfernen/ersetzen | Testen Login, Rollen, Admin, Kursserver, Navigation und Monitoransichten, die entfernt werden. |
| `.github/workflows/electron-desktop.yml` | Teilweise | ersetzen | Prüft die bisherige Plattform; der neue Workflow muss gezielt Standalone-Core, Sicherheit, Tests und Build prüfen. |
| Root-Inhalte `dozent/`, `teilnehmer/`, `_archiv/`, `Standalone/` | Nein | aus Produktbranch entfernen | Statische Kurs-, Rollen- und historische Artefakte sind weder Laufzeitcode noch Eingabe-Fixtures der Standalone-ContentFactory. |
| `dozent/tools/leitfaeden/Wochenplan_LFZQ8a_HTML_CSS.xlsx` | Nur Testquelle | nicht in Produkt übernehmen | Reale vorhandene Excel-Probe; sie stammt aus Altmaterial. Für dauerhafte Tests wird eine kleine synthetische Fixture verwendet. Die geforderte `Wochenplan_FIAE_LF-ZQ8A.xlsm` wurde im Workspace nicht gefunden. |

## Gefundene Kopplungen und Entscheidungen

- `main.js` startet standardmäßig Login/Landingpage und prüft ContentFactory-Zugriff über Adminrollen. Das wird durch einen einzigen ContentFactory-Fensterstart ersetzt.
- Electron verwendet bereits ein Preload-Skript; die bestehende Bridge ist aber zu breit. Die neue Bridge erlaubt nur Projekt-, Import-, Analyse-, Preflight-, Vorschau- und Exportoperationen.
- Die vorhandenen BrowserWindow-Helfer setzen bereits `contextIsolation: true` und `nodeIntegration: false`; diese Werte werden im neuen Hauptprozess explizit gesetzt.
- Importierte HTML-, JavaScript- und Office-Dateien werden in den ContentFactory-Services als Daten behandelt. Der Standalone-Hauptprozess lädt ausschließlich die eigene lokale Renderer-Datei und führt keine importierten Makros oder Skripte aus.
- `packages/content-factory-core` und `desktop-app/app/lib/content-factory` überlappen teilweise. In diesem Branch bleibt die Electron-Integration in `desktop-app`, während wiederverwendbare, UI-unabhängige Regeln im Core-Paket getestet werden.
- `apps/content-factory-lab` besitzt keinen Electron-Hauptprozess und keine exklusiven Importer. Seine Schrittansichten spiegeln den bereits vorhandenen produktiven Workflow; deshalb wird es nach Übernahme der benötigten Begriffe und Tests entfernt.

## Ziel

Ein einziger Electron-Einstieg öffnet **ueTool ContentFactory – Unterrichtsmaterialien analysieren und Kurscontainer erstellen**. Es gibt keine Konten, Rollen, Landingpage, Kursserver oder fremde Tools. Projekte werden lokal versioniert gespeichert; Import und Export laufen über validierte IPC-Aufrufe. Die fachliche Trennung von Dozenten- und Teilnehmerinhalten bleibt ausschließlich als Sicherheitsmerkmal des erzeugten Containers erhalten.
