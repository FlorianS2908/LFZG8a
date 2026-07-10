# ContentFactory Dual Mode

ContentFactory und ContainerFactory bezeichnen in diesem Repository dasselbe Lab. Die vorhandene Kachel unter `apps/content-factory-lab` bleibt bestehen; `apps/container-factory-lab` ist ein nicht-destruktiver Alias fuer die spaetere Namenswelt.

## Ziel

Die Factory erzeugt zunaechst Draft-Container. Diese Drafts sind lokal als Standalone-Paket testbar und enthalten gleichzeitig die Metadaten fuer eine spaetere SaaS-/Web-Plattform.

## Standalone-Modus

Ein Export enthaelt `standalone/index.html`, `standalone/standalone.js` und `standalone/standalone.css`. Der Runner braucht keine Datenbank, keine API-Keys und keine echten Nutzer. Er zeigt klar an: "Standalone-Vorschau, keine echte Plattform-Freigabe".

## Plattform-Modus

`platform/adapter.json`, `platform/route-map.json` und `platform/integration.json` beschreiben, wie der Container spaeter importiert werden kann. Der Container selbst enthaelt keine CourseInstance, CourseMembers, ReleaseStates, Attendance oder AuditLog. Diese Daten liefert spaeter die Plattform.

## Containerstruktur

Der Draft erzeugt unter anderem:

- `manifest.json` mit `runtimeModes.standalone` und `runtimeModes.platform`
- `container.json`
- `catalog/days.json`
- `catalog/participant-content.json`
- `catalog/release-keys.json`
- `dozent/` mit Webvarianten, Aufgaben und Loesungen
- `teilnehmer/` mit Webvarianten und Aufgaben ohne Loesungen
- `shared/quiz`, `shared/assets`, `shared/metadata`
- `source-map.json`
- Analyse- und Naming-Reports

## Kursname

Kursname, Kurs-ID und Fachbereich aus der Eingabemaske sind fuehrend. Sichtbare Legacy-Namen wie `LFZQ8a`, `LFZG8a`, `LF10a`, abweichendes `LF05` oder generisches `HTML/CSS` werden im sichtbaren Output ersetzt oder validiert. Originalnamen duerfen in `source-map.json` und Analyseberichten erhalten bleiben.

## KI

Die KI-Schicht ist vorbereitet, erzwingt aber keine Cloud. `LocalHeuristicProvider` funktioniert ohne Key. `OpenAIProvider` ist als Backend-Provider vorbereitet, aber ohne hardcodierte API-Keys und nicht fuer Browser-Key-Nutzung gedacht.

## Validierung

Vor Export wird geprueft:

- Manifest und Runtime-Modes vorhanden
- Standalone- und Plattformdateien vorhanden
- Katalogpfade zeigen auf existierende Dateien
- Teilnehmerbereich enthaelt keine Loesungen
- ReleaseKeys sind eindeutig
- Quiz-Indizes sind gueltig
- `.env`, `.git`, `node_modules` und ausfuehrbare Dateien werden blockiert
- `source-map.json` und Analysebericht existieren

## Grenzen des MVP

Der Excel-Unterrichtsplanparser ist robust vorbereitet und nutzt Fallbacks, falls echte Sheet-Inhalte im Browser-Lab noch nicht voll extrahiert werden. Es findet keine produktive Veroeffentlichung, keine Datenbankmigration und keine echte Plattformfreigabe statt.
