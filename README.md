# ueTool_asSaaS

Dieses Repository enthaelt die Plattform `ueTool_asSaaS` und den Kurscontainer `HTML/CSS`.

`ueTool_asSaaS` ist die lokale Desktop-Plattform. `HTML/CSS` ist der fachliche Kurscontainer. Die `ContentFactory` ist das Admin-Werkzeug zur Erstellung, Pruefung und Duplizierung von Kurscontainern.
Die ContentFactory erzeugt optional Demo-Buttons in Dozenten-Webvarianten. Direkter Demo-Launch funktioniert nur in der Electron-App; Standalone-Drafts zeigen sichere Pfad-/Hinweistexte.
Didaktische Kursprofile steuern Lesson Flow, Demo-Strategie, Aufgabenprogression, Reflexion und Freigabelogik; Details stehen in `docs/CONTENT_FACTORY_DIDACTIC_COURSE_PROFILES.md`.

## Aktueller Hauptstand

- `main` ist die aktuelle Entwicklungsbasis.
- `ueTool_asSaaS` ist die lokale Desktop-Plattform.
- `HTML/CSS` ist der aktuell integrierte Kurscontainer.
- Die ContentFactory ist das Admin-Werkzeug zur Erstellung, Pruefung und Duplizierung von Kurscontainern.
- Datenschutz-/DSGVO-Zweige werden separat behandelt und nicht automatisch in `main` gemergt.
- Fruehere Neustruktur-/SaaS-Branches bleiben nur als Referenz erhalten.

## Adminbereich und Registrierung

Der Adminbereich enthaelt vier nicht freigebbare Systemkacheln:

- `ContentFactory`
- `Freigabezentrum`
- `Dozent anlegen`
- `Teilnehmer anlegen`

Dozenten und Teilnehmer koennen sich nur registrieren, wenn der Admin sie vorher lokal vorgemerkt hat. Diese Vorabfreigaben werden ohne Passwort in den lokalen App-Daten gespeichert und nach erfolgreicher Registrierung auf `accepted` gesetzt. Widerrufene Freigaben erhalten den Status `revoked` und koennen nicht mehr fuer eine Registrierung genutzt werden.

Im Freigabezentrum sieht der Admin registrierte Benutzer, deren Kurs-/Tool-Freigaben sowie offene, angenommene oder widerrufene Registrierungsfreigaben.

### Architekturstand Container

Die Kacheln folgen einem einheitlichen Manifest-Prinzip mit `courseName`, `courseId`, `department`, `category`, `containerType`, `assignable`, `allowedRoles`, `storageMode` und `exportable`.

Neue Admin-Werkzeugkacheln sind als nicht freigebbare Systemcontainer registriert:

- Container-Adapter / Legacy-Migration
- Import- & Dateianalyse
- Kurscontainer-Generator
- Quiz-Builder
- Container-Export
- KI-/Provider-Konfiguration
- Test-Center / Qualitaetssicherung
- Systemdiagnose / Pruefberichte

Die Werkzeuglogik liegt in `desktop-app/app/lib/admin-tools/`, die lokale Container-Registry in `desktop-app/app/lib/container-registry/`. Die generische Admin-Werkzeugseite ist `desktop-app/app/renderer/tool-center/admin-tool.html`.

### Kursverwaltung und CourseInstances

Neben Teilnehmer, Dozent und Admin gibt es die Rolle `course_manager`. Sie sieht die Kachel `Kursverwaltung`, aber keine Admin-Systemwerkzeuge wie ContentFactory oder Test-Center.

Die Kursverwaltung trennt:

- `ContentContainer`: Inhalt/Vorlage, z. B. `HTML/CSS`
- `CourseInstance`: laufender Kurs, z. B. `HTML/CSS Kurs Gruppe B`

CourseInstances, Mitglieder, Containerzuordnungen, ReleaseStates, SyncEvents und AuditLog werden ueber Services unter `desktop-app/app/lib/course-management/` verwaltet. In der Entwicklungsvariante wird lokal JSON gespeichert; die Schicht ist fuer zentrale API/DB vorbereitet.

## Start der ContentFactory

Windows:

```text
ContentFactoryMainStart.cmd
```

Hinweis:
Alle alten Lab-, Demo- und Workflow-CMD-Starter wurden entfernt. Die ContentFactory wird zentral ueber `ContentFactoryMainStart.cmd` gestartet.

## ContentFactory Workflow

1. Start
2. Neuen Kurscontainer erstellen
3. Kursdaten
4. Hauptquelle hochladen: Unterrichtsplan, PowerPoint, PDF, EPUB oder Textdokument
5. Curriculum analysieren
6. Curriculum pruefen und freigeben
7. Didaktik und Containerprofil pruefen
8. Materialien ergaenzen
9. KI/Fallback waehlen
10. Tagesentwuerfe erzeugen
11. Preflight/Testlauf
12. Draft erzeugen

Der Rohdatenbereich ist ein Expertenbereich und nicht der Standardweg fuer neue Kurscontainer.

Standardkonten:

- Admin: `admin@admin.de` / `$$Klaus2908$$`
- Dozent: `dozent@dozent.de` / `$$Klaus2908$$`
- Teilnehmer: `tn@tn.de` / `$$Klaus2908$$`

Der aktuelle Hauptstand liegt auf `main`. Fruehere Neustruktur-/SaaS-Branches bleiben nur als Referenz erhalten. DSGVO-/Datenschutz-Zweige werden separat geprueft.

## Kurzueberblick

- Dozenten starten den Kurs ueber eine Electron-App.
- Beim Erststart fuehrt ein Wizard durch die lokale Einrichtung.
- Im Wizard koennen Dozenten-App und Teilnehmer-Ansicht getrennt auf Deutsch, Englisch, Tuerkisch, Ukrainisch oder Russisch gestellt werden.
- Danach startet die App direkt in die integrierte Dozentenview.
- Die bisherigen HTML-Materialien werden ueber einen Kurskatalog in der App angezeigt.
- Standalone bleiben bewusst nur Arbeitsordner und Arbeitsdateien, die in VS Code bearbeitet werden.
- Die Dozenten-App startet einen lokalen Kursserver.
- Teilnehmer oeffnen die angezeigte Teilnehmer-Adresse im Browser.
- Teilnehmer legen beim Erststart ein Profil an.
- Der Dozent kann Tage, Tools und Projekte fuer alle Teilnehmer freigeben.
- Fortschritt, Hilfeanfragen und letzte Aktivitaet erscheinen in der Dozentenuebersicht.

## Einstieg

- `ContentFactoryMainStart.cmd`: zentraler Windows-Starter fuer die ContentFactory aus dem Main-Branch.
- `desktop-app/app/renderer/course.html`: integrierte Kursoberflaeche der Electron-App.
- `desktop-app/app/lib/course-catalog.js`: stabile Katalog-Schnittstelle fuer die App.
- `desktop-app/app/lib/catalog/`: getrennte Inhaltsmodule fuer Tage, Projekte, Tools/Leitfaeden und Teilnehmerinhalte.
- `deployment/build-packages.ps1`: baut Dozenten- und Teilnehmer-ZIP-Pakete.
- `deployment/common/install-check.ps1`: gemeinsame Software- und Abhaengigkeitspruefung.
- `index.html`: statischer Einstieg fuer den Teilnehmerbereich.
- `LFZQ8a_Workflow_Uebersicht.html`: standalone Workflow-Dokumentation ohne App-Verlinkung.
- `SOFTWARE.md`: reine Liste der benoetigten Softwarepakete.

## Zielarchitektur

Die Electron-App wird zur eigentlichen Dozentenview. Die vielen bisherigen HTML-Seiten bleiben als Materialdateien erhalten, werden aber nicht mehr als lose Einstiegsseiten gedacht, sondern ueber die App navigiert und in einem integrierten Inhaltsbereich angezeigt.

Die Inhalte sind intern modular getrennt: Kurstage, Projekte, Tools/Leitfaeden und Teilnehmerinhalte liegen in eigenen Katalogmodulen unter `desktop-app/app/lib/catalog/`. `desktop-app/app/lib/course-catalog.js` bleibt nur die gemeinsame Schnittstelle, die Electron-App und Tests verwenden. Dadurch koennen neue Tage, neue Projekte oder neue Tools getrennt gepflegt werden, ohne die App-Startlogik umzubauen.

- Dozent: arbeitet in der App mit Kursnavigation, Viewer, Freigaben, Teilnehmerstatus und Loesungen.
- Dozenten-Startseite: zeigt direkt alle 5 Tage, die 2 Projekte und die Toolliste als zentrale Arbeitsflaeche.
- Teilnehmer: nutzt freigegebene Inhalte und bearbeitet Projektdateien lokal.
- Arbeitsdateien: bleiben echte Ordner, damit sie direkt in Visual Studio Code geoeffnet werden koennen.
- Loesungen: bleiben nur in der Kursuebersicht sichtbar.

## Start der ContentFactory

1. Projektordner oeffnen.
2. `ContentFactoryMainStart.cmd` doppelklicken.
3. Die ContentFactory startet aus `desktop-app`, sofern Electron installiert ist.
4. Falls Electron fehlt, im Ordner `desktop-app` einmal `npm install` ausfuehren und den Starter erneut starten.

Das Startskript prueft automatisch:

- ob Electron bereits installiert ist,
- ob Node.js verfuegbar ist,
- ob App-Abhaengigkeiten installiert sind.

Das Startskript installiert keine Software automatisch, loescht keine Daten und fuehrt keinen Pull oder Merge aus.

## Mehrsprachigkeit

Die App-Oberflaechen unterstuetzen aktuell:

- Deutsch,
- Englisch,
- Tuerkisch,
- Ukrainisch,
- Russisch.

Die Sprachwahl wird lokal in den App-Einstellungen gespeichert. Der Dozent waehlt im Wizard getrennt:

- `Dozenten-App`: Sprache fuer Wizard, Dozentenview, Freigaben, Teilnehmerstatus und App-Bedienung.
- `Teilnehmer-Ansicht`: Standardsprache fuer Teilnehmer-Main-View, Teilnehmer-Profil-Wizard, Freigabestatus und Fortschrittsbuttons.

Fachliche Unterrichtsmaterialien, Projektdateien und bereits erstellte HTML-Aufgaben bleiben bewusst in ihrer Originalsprache. Uebersetzt wird die Bedienoberflaeche der Electron-App und der Teilnehmersteuerung.

## Profil und Settings

In der Dozenten-App befindet sich links oben ein Profil-Icon. Darueber werden nach dem Erststart die wichtigen Einstellungen gepflegt:

- Name, E-Mail und Profilbild des Dozenten,
- Sprache der Dozenten-App,
- Standardsprache der Teilnehmer-Ansicht,
- Monitor fuer Dozenteninfos,
- automatisches Freigabe-Fenster auf dem ausgewaehlten zweiten Monitor,
- lokale Testbericht-Einstellungen,
- Liste der automatisch erzeugten Testberichte.

Beim Start der Dozenten-App wird automatisch ein lokales Testprotokoll erzeugt. Die Berichte liegen als JSON- und HTML-Dateipaar im lokalen App-Datenordner und koennen ueber das Settings-Menue eingesehen werden.

Auch im Teilnehmerbereich gibt es links oben ein Profil-Icon. Teilnehmer koennen dort Name, Kuerzel, optionale Kontaktdaten, Profilbild und Sprache bearbeiten. Diese Daten dienen der Zuordnung in der Dozentenuebersicht.

## Bereitstellung fuer Benutzer

Die festen Bereitstellungspfade liegen unter `deployment/`.

```text
deployment/
  build-packages.ps1
  common/install-check.ps1
```

ZIP-Pakete werden so gebaut:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\deployment\build-packages.ps1
```

Danach liegen die Pakete unter:

```text
dist/LFZQ8a-Dozent.zip
dist/LFZQ8a-Teilnehmer.zip
```

Das Dozentenpaket enthaelt Electron-App, Dozentenmaterial, Teilnehmermaterial, Loesungen, Tools und den lokalen Kursserver. Das Teilnehmerpaket enthaelt nur Teilnehmermaterialien, Aufgaben, Tools ohne Dozentenloesungen und den Teilnehmerstarter.

Die frueheren Paket-Starter wurden entfernt. Fuer lokale ContentFactory-Tests bleibt `ContentFactoryMainStart.cmd` der einzige CMD-Starter.

## Software und Voraussetzungen

Fuer diesen Umbau wurde keine neue Software eingefuehrt. Die integrierte Kursoberflaeche nutzt weiterhin die bestehende Electron/Node-Struktur. Die reine Paketliste steht zusaetzlich in `SOFTWARE.md`.

| Komponente | Zweck | Hinweis |
| --- | --- | --- |
| Windows | Zielsystem fuer Dozenten- und Teilnehmer-Clients | Aktuelles Startskript ist fuer Windows ausgelegt |
| Node.js LTS | Start und Installation der Electron-App | Wird bei Bedarf per `winget` installiert |
| winget | automatische Node.js-Installation | Falls nicht vorhanden, Node.js manuell installieren |
| Electron | Desktop-App fuer Dozent, Wizard und Kursserver | Abhaengigkeit in `desktop-app/package.json` |
| pnpm oder npm | Installation der App-Abhaengigkeiten | Skript bevorzugt `pnpm`, sonst `npm` |
| Browser | Teilnehmer-View | Teilnehmer oeffnen die Kursserver-Adresse |
| Visual Studio Code | Bearbeitung der lokalen Ausgangssituationen | empfohlen fuer Projektarbeit |

## Aktive Struktur

- `desktop-app/`: Electron-Projekt fuer Wizard, Dozentenview, Kursserver, Teilnehmerfreigaben und Fortschrittsdaten.
- `desktop-app/app/renderer/course.html`: integrierte App-Oberflaeche.
- `desktop-app/app/renderer/course.js`: Navigation, Viewer, Freigaben, Teilnehmerstatus und VS-Code-Start.
- `desktop-app/app/renderer/course-content-groups.js`: Gruppierung der App-Bereiche fuer Tage, Projekte, Tools und Teilnehmerprojekte.
- `desktop-app/app/lib/course-catalog.js`: stabile Schnittstelle zur Inhaltsregistrierung.
- `desktop-app/app/lib/catalog/teacher-days.js`: Kurstage und Tagesmaterial.
- `desktop-app/app/lib/catalog/teacher-projects.js`: Dozenten-Projektkarten, Arbeitsordner und Loesungen.
- `desktop-app/app/lib/catalog/teacher-tools.js`: Tools, Leitfaeden und zentrale Dozentenlinks.
- `desktop-app/app/lib/catalog/participant-content.js`: Teilnehmerlinks und Teilnehmer-Projektordner.
- `deployment/`: Paketierung, Starter und automatische Installationspruefung.
- `dist/`: lokal erzeugte ZIP-Pakete, nicht versioniert.
- `dozent/`: Dozentenstruktur mit Main-View, Leitfaeden, Tagesmaterial, Loesungen, Bewertung, Quizdaten, Projektmaterialien und Tools.
- `teilnehmer/`: eigenstaendige Teilnehmerstruktur mit Webvarianten, Aufgaben, Starterdateien, Quizdaten, Projektmaterialien, Abgabehinweisen und Standalone-Tools.
- `dozent/assets/css/unified-layout.css`: gemeinsames Dozenten-Layout fuer aktive Materialien.
- `teilnehmer/assets/css/unified-layout.css`: gemeinsames Teilnehmer-Layout fuer aktive Materialien.
- `_archiv/`: alte Root-Dubletten, Zwischenstaende und nicht mehr direkt benoetigte Dateien.

## Dozenten-Workflow

1. Dozent startet die ContentFactory im aktuellen Main-Stand ueber `ContentFactoryMainStart.cmd`.
2. Wizard speichert beim Erststart lokale Einstellungen.
3. Integrierte Dozentenview oeffnet sich.
4. Bei aktiver Zweitmonitor-Option oeffnet sich die Freigabe-View automatisch als zweites Fenster.
5. Lokaler Kursserver startet automatisch.
6. Auf der Startseite sieht der Dozent direkt die 5 Kurstage mit Webvariante und Uebungsaufgaben.
7. Darunter stehen die 2 Projekte mit Aufgabenpaket, Arbeitsordner und Endergebnis.
8. Danach folgt die Tool- und Leitfadenliste.
9. Dozent oeffnet Tage, Tools, Projekte und Leitfaeden im integrierten Viewer.
10. Dozent gibt Tage, Projekte und Tools frei.
11. Teilnehmer verbinden sich ueber die angezeigte URL.
12. Dozent sieht Profile, Online-Status, aktuelle Aufgabe, Fortschritt und Hilfeanfragen.

## Teilnehmer-Workflow

1. Teilnehmer oeffnet die vom Dozenten angezeigte Teilnehmer-Adresse.
2. Beim Erststart erscheint ein Profil-Wizard.
3. Teilnehmer gibt Name und Kuerzel an; E-Mail, Teams-Name und Bild sind optional.
4. Freigegebene Bereiche sind anklickbar.
5. Gesperrte Bereiche bleiben sichtbar, sind aber deaktiviert.
6. Teilnehmer meldet Fortschritt ueber Statusbuttons:
   - `Gestartet`
   - `In Bearbeitung`
   - `Hilfe benoetigt`
   - `Erledigt`

## Lokaler Testablauf

1. ContentFactory per Doppelklick auf `ContentFactoryMainStart.cmd` starten.
2. In der App den Bereich `Teilnehmer` oeffnen.
3. Teilnehmer-Adresse ablesen, zum Beispiel `http://localhost:PORT/teilnehmer`.
4. Adresse in einem Browserfenster oeffnen.
5. Profil anlegen, zum Beispiel:
   - Name: `Test Teilnehmer`
   - Kuerzel: `TT`
   - E-Mail optional
   - Teams-Name optional
6. Teilnehmer sollte in der Dozenten-App erscheinen.
7. Im Teilnehmerfenster Statusbuttons testen.
8. In der Dozenten-App pruefen, ob Fortschritt und Hilfe-Status aktualisiert werden.

Mehrere Teilnehmer koennen lokal simuliert werden ueber:

- Inkognito-Fenster,
- zweites Browserprofil,
- anderen Browser.

## Freigaben testen

1. In der Dozenten-View den Bereich `Teilnehmer-Freigaben` oeffnen.
2. Zum Beispiel `Tag 2` oder `Projektmaterialien` aktivieren.
3. `Freigaben speichern` klicken.
4. Teilnehmerfenster kurz warten oder neu laden.
5. Der Bereich sollte entsperrt werden.

## Projektmaterialien

Die Projektmaterialien sind nach Rollen und Projekten gruppiert.

- Teilnehmer erhalten Aufgaben, Starterdateien und Ausgangssituationen.
- Dozenten erhalten zusaetzlich Loesungen, Teilloesungen und Hinweise.
- Projektvorbereitende Aufgaben liegen in zwei Schwierigkeitsstufen vor: `einfach` und `schwer`.
- Arbeitsordner werden aus der App heraus in VS Code geoeffnet.

Wichtige Projektbereiche:

- `teilnehmer/Projektmaterialien/`
- `dozent/Projektmaterialien/`
- `dozent/Projektmaterialien/projektvorbereitung/`

## Aufgabenpaket-Verwaltung in der App

Die neuen Aufgabenpakete sind nicht nur als lose HTML-Dateien abgelegt, sondern ueber eine zentrale Registry in die Electron-App eingebunden.

- Integriert sind 4 Pakete mit zusammen 150 Aufgaben:
  - Akkordeon Hauptaufgaben Tag 1 bis Tag 5,
  - Akkordeon Zusatzaufgaben mit 10 Aufgaben pro Tag,
  - Wunderland Hauptaufgaben Tag 1 bis Tag 5,
  - Wunderland Zusatzaufgaben mit 10 Aufgaben pro Tag.
- Jede Aufgabe kann einzeln freigegeben werden.
- Aufgabenfreigabe und Loesungsfreigabe sind getrennt.
- Teilnehmer sehen nur freigegebene Aufgaben.
- Loesungen erscheinen im Teilnehmerbereich erst, wenn die jeweilige Loesung separat freigegeben wurde.
- Die lokale Freigabehistorie liegt in den App-Daten als `task-releases.json`.

Die Registry wird aus den HTML-Paketen erzeugt:

```powershell
cd desktop-app
node scripts/build-task-registry.js
```

Neue Aufgabenpakete werden in `desktop-app/scripts/build-task-registry.js` als Quelle ergaenzt. Die erzeugten Registry-Dateien liegen danach unter `desktop-app/app/lib/task-packages.json` und `teilnehmer/assets/data/task-packages.json`.

## Tools

- Dozenten-Tool: `dozent/tools/html-css-tag-tool-dozent.html`
- Teilnehmer-Tool: `teilnehmer/tools/html-css-tag-tool-teilnehmer.html`
- Quiztool Dozent: `dozent/tools/quiz/QuizTool_Timer_v9_LFZQ8a_CSS_Pools.html`
- Quiztool Teilnehmer: `teilnehmer/tools/quiz/QuizTool_Timer_v9_LFZQ8a_CSS_Pools.html`

## Workflow-Dokumentation

Die Datei `LFZQ8a_Workflow_Uebersicht.html` beschreibt den Gesamtplan fuer externe Leser:

- Rollen,
- Branch und Entwicklungsstand,
- benoetigte Software,
- Start,
- Dozenten-/Teilnehmer-Workflow,
- Freigaben,
- Fortschritt,
- lokalen Testablauf.

Die Datei ist bewusst standalone und enthaelt keine Verlinkung zur App.

## DSGVO-relevante Funktionen

Diagnosefunktionen mit technischen Geraetedaten, Netzwerkdaten und Mailvorbereitung wurden aus `electronDesktop` entfernt und liegen separat im Branch `dsgvo-diagnosefunktionen`.

Profilinformationen der Teilnehmer dienen der Kurssteuerung und Zuordnung im Unterricht. Optional erfasste Angaben wie E-Mail, Teams-Name und Profilbild sollten nur verwendet werden, wenn sie fuer den konkreten Kursbetrieb benoetigt werden.

## Tests

Die Tests liegen unter `desktop-app/tests/`.

Ausfuehren:

```powershell
cd desktop-app
npm test
```

Alternativ mit dem im Projekt genutzten Node.js:

```powershell
node tests/run-tests.js
```

Aktueller Testumfang:

- App-Daten und lokale Speicherung,
- Freigaben,
- Teilnehmerprofile und Fortschritt,
- Display-/Monitorlogik,
- JSON-Speicher,
- Pfadintegritaet,
- Kurskatalog und integrierte App-View,
- Mehrsprachigkeit fuer Wizard, Dozentenview und Teilnehmersteuerung,
- Deployment-Skripte und feste Dokumentationsdateien,
- Standalone-Anforderungen fuer den Teilnehmerbereich,
- mindestens 95 Prozent Pfadabdeckung fuer `desktop-app/app/lib`.

Die aktuelle automatisierte Abdeckung liegt bei 95,15 Prozent fuer die instrumentierten Bibliotheken.

Teststrategie:

- C0-Anweisungsabdeckung: zentrale Daten-, Display- und JSON-Funktionen werden ueber direkte Unit-Tests ausgefuehrt.
- C1-Zweigabdeckung: Fallbacks, Fehlerpfade, optionale Eingaben und Grenzwerte werden gezielt getestet.
- C2-Bedingungsabdeckung: boolesche Optionen wie Historie, Netzwerkdaten, Freigaben und Hilfe-Status werden in beiden Richtungen geprueft.
- C3-Pfadabdeckung: wichtige Pfade durch lokale Speicherung, Profilanlage, Fortschritt, Report-Erzeugung und Deployment-Pruefung sind automatisiert.
- C4-Mehrfachbedingungsabdeckung: kombinierte Faelle wie fehlende Profildaten plus vorhandene Bestandsdaten oder unvollstaendige Netzwerkdaten plus HTML-Bericht werden abgedeckt.
- Blackbox-Tests: Tests pruefen oeffentliche Funktionen ueber Eingabe und erwartete Ausgabe, zum Beispiel Profile, Freigaben, Reports und Pfade.
- Whitebox-Tests: Tests decken bekannte interne Randbedingungen ab, zum Beispiel Clamping von Fortschritt, kaputte JSON-Dateien, Display-Fallbacks und deaktivierte Historie.

## Aufraeumregel

Neue Kursdateien gehoeren in die passende Rollenstruktur:

- Aufgaben, Starterdateien und Teilnehmermaterial nach `teilnehmer/`
- Loesungen, Leitfaeden und Dozentenmaterial nach `dozent/`
- App-Navigation und zentrale Kurslogik nach `desktop-app/`
- Bereitstellungslogik nach `deployment/`
- erzeugte Pakete nach `dist/`
- alte oder nicht mehr benoetigte Arbeitsstaende nach `_archiv/`
