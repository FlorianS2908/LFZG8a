# LFZQ8a HTML & CSS Workshop-App

Dieses Repository enthaelt die Kursmaterialien und die Electron-Desktop-App fuer den LFZQ8a HTML-&-CSS-Workshop.

Der aktuelle Arbeitsstand liegt auf dem Branch `electronDesktop`.

## Kurzueberblick

- Dozenten starten den Kurs ueber eine Electron-App.
- Beim Erststart fuehrt ein Wizard durch die lokale Einrichtung.
- Im Wizard koennen Dozenten-App und Teilnehmer-Ansicht getrennt auf Deutsch, Englisch oder Tuerkisch gestellt werden.
- Danach startet die App direkt in die integrierte Kursplattform.
- Die bisherigen HTML-Materialien werden ueber einen Kurskatalog in der App angezeigt.
- Standalone bleiben bewusst nur Arbeitsordner und Arbeitsdateien, die in VS Code bearbeitet werden.
- Die Dozenten-App startet einen lokalen Kursserver.
- Teilnehmer oeffnen die angezeigte Teilnehmer-Adresse im Browser.
- Teilnehmer legen beim Erststart ein Profil an.
- Der Dozent kann Tage, Tools und Projekte fuer alle Teilnehmer freigeben.
- Fortschritt, Hilfeanfragen und letzte Aktivitaet erscheinen in der Dozentenuebersicht.

## Einstieg

- `LFZQ8a-Workshop-starten.cmd`: Start der Electron-Desktop-App per Doppelklick.
- `LFZQ8a-Konfig-Wizard-testen.cmd`: startet den Wizard gezielt zu Testzwecken.
- `desktop-app/app/renderer/course.html`: integrierte Kursoberflaeche der Electron-App.
- `desktop-app/app/lib/course-catalog.js`: Katalog der eingebundenen Tage, Tools, Projekte und Leitfaeden.
- `deployment/build-packages.ps1`: baut Dozenten- und Teilnehmer-ZIP-Pakete.
- `deployment/common/install-check.ps1`: gemeinsame Software- und Abhaengigkeitspruefung.
- `deployment/dozent/Start-LFZQ8a-Dozent.cmd`: Starter fuer das Dozentenpaket.
- `deployment/teilnehmer/Start-LFZQ8a-Teilnehmer.cmd`: Starter fuer das Teilnehmerpaket.
- `index.html`: statischer Einstieg fuer den Teilnehmerbereich.
- `LFZQ8a_Workflow_Uebersicht.html`: standalone Workflow-Dokumentation ohne App-Verlinkung.
- `SOFTWARE.md`: reine Liste der benoetigten Softwarepakete.

## Zielarchitektur

Die Electron-App wird zur eigentlichen Kursplattform. Die vielen bisherigen HTML-Seiten bleiben als Materialdateien erhalten, werden aber nicht mehr als lose Einstiegsseiten gedacht, sondern ueber die App navigiert und in einem integrierten Inhaltsbereich angezeigt.

- Dozent: arbeitet in der App mit Kursnavigation, Viewer, Freigaben, Teilnehmerstatus und Loesungen.
- Teilnehmer: nutzt freigegebene Inhalte und bearbeitet Projektdateien lokal.
- Arbeitsdateien: bleiben echte Ordner, damit sie direkt in Visual Studio Code geoeffnet werden koennen.
- Loesungen: bleiben nur im Dozentenbereich sichtbar.

## Start des Dozentenbereichs

1. Projektordner oeffnen.
2. `LFZQ8a-Workshop-starten.cmd` doppelklicken.
3. Beim Erststart den Wizard abschliessen.
4. Im Wizard die Sprache fuer die Dozenten-App und optional abweichend fuer die Teilnehmer-Ansicht waehlen.
5. Danach oeffnet sich die integrierte Kursplattform.
6. Im Bereich `Teilnehmer` steht die Teilnehmer-Adresse.

Das Startskript prueft automatisch:

- ob Electron bereits installiert ist,
- ob Node.js verfuegbar ist,
- ob App-Abhaengigkeiten installiert sind.

Wenn Node.js fehlt und `winget` vorhanden ist, versucht das Skript Node.js LTS automatisch zu installieren. Danach werden die App-Abhaengigkeiten im Ordner `desktop-app/` ueber `pnpm install` oder alternativ `npm install` installiert.

## Mehrsprachigkeit

Die App-Oberflaechen unterstuetzen aktuell:

- Deutsch,
- Englisch,
- Tuerkisch.

Die Sprachwahl wird lokal in den App-Einstellungen gespeichert. Der Dozent waehlt im Wizard getrennt:

- `Dozenten-App`: Sprache fuer Wizard, Kursplattform, Freigaben, Teilnehmerstatus und App-Bedienung.
- `Teilnehmer-Ansicht`: Standardsprache fuer Teilnehmer-Main-View, Teilnehmer-Profil-Wizard, Freigabestatus und Fortschrittsbuttons.

Fachliche Unterrichtsmaterialien, Projektdateien und bereits erstellte HTML-Aufgaben bleiben bewusst in ihrer Originalsprache. Uebersetzt wird die Bedienoberflaeche der Electron-App und der Teilnehmersteuerung.

## Bereitstellung fuer Benutzer

Die festen Bereitstellungspfade liegen unter `deployment/`.

```text
deployment/
  build-packages.ps1
  common/install-check.ps1
  dozent/Start-LFZQ8a-Dozent.cmd
  dozent/Start-LFZQ8a-Wizard-Test.cmd
  teilnehmer/Start-LFZQ8a-Teilnehmer.cmd
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

Die Starter pruefen beim Start automatisch:

- Visual Studio Code vorhanden? Falls nicht, Installation per `winget`.
- Node.js LTS vorhanden? Nur im Dozentenpaket erforderlich; falls nicht, Installation per `winget`.
- Electron/App-Abhaengigkeiten vorhanden? Nur im Dozentenpaket; falls nicht, Installation per `pnpm install` oder `npm install`.
- Danach wird die passende App- bzw. Teilnehmeransicht gestartet.

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

- `desktop-app/`: Electron-Projekt fuer Wizard, Kursplattform, Kursserver, Teilnehmerfreigaben und Fortschrittsdaten.
- `desktop-app/app/renderer/course.html`: integrierte App-Oberflaeche.
- `desktop-app/app/renderer/course.js`: Navigation, Viewer, Freigaben, Teilnehmerstatus und VS-Code-Start.
- `desktop-app/app/lib/course-catalog.js`: zentrale Inhaltsregistrierung.
- `deployment/`: Paketierung, Starter und automatische Installationspruefung.
- `dist/`: lokal erzeugte ZIP-Pakete, nicht versioniert.
- `dozent/`: Dozentenstruktur mit Main-View, Leitfaeden, Tagesmaterial, Loesungen, Bewertung, Quizdaten, Projektmaterialien und Tools.
- `teilnehmer/`: eigenstaendige Teilnehmerstruktur mit Webvarianten, Aufgaben, Starterdateien, Quizdaten, Projektmaterialien, Abgabehinweisen und Standalone-Tools.
- `dozent/assets/css/unified-layout.css`: gemeinsames Dozenten-Layout fuer aktive Materialien.
- `teilnehmer/assets/css/unified-layout.css`: gemeinsames Teilnehmer-Layout fuer aktive Materialien.
- `_archiv/`: alte Root-Dubletten, Zwischenstaende und nicht mehr direkt benoetigte Dateien.

## Dozenten-Workflow

1. Dozent startet `LFZQ8a-Workshop-starten.cmd`.
2. Wizard speichert beim Erststart lokale Einstellungen.
3. Integrierte Kursplattform oeffnet sich.
4. Lokaler Kursserver startet automatisch.
5. Dozent oeffnet Tage, Tools, Projekte und Leitfaeden im integrierten Viewer.
6. Dozent gibt Tage, Projekte und Tools frei.
7. Teilnehmer verbinden sich ueber die angezeigte URL.
8. Dozent sieht Profile, Online-Status, aktuelle Aufgabe, Fortschritt und Hilfeanfragen.

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

1. Dozentenbereich per Doppelklick auf `LFZQ8a-Workshop-starten.cmd` starten.
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
- Mehrsprachigkeit fuer Wizard, Kursplattform und Teilnehmersteuerung,
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
