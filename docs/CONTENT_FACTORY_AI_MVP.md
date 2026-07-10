# ContentFactory AI MVP

## Ziel

Dieser MVP macht den Kernfall testbar: Unterrichtsplan plus optionale Rohmaterialien werden zu strukturierten Tagesentwuerfen und daraus zu einem Dual-Mode-Kurscontainer-Draft.

## Pflichtanker

Kursname, Kurs-ID und Fachbereich kommen aus der Eingabemaske und sind fuehrend. Der Unterrichtsplan ist Pflicht, Zusatzmaterialien sind optional. Ohne bestaetigten Plan wird kein Container exportiert.

## AI_PROVIDER=local

Default ist `AI_PROVIDER=local`. Der `LocalHeuristicProvider` funktioniert ohne API-Key und erzeugt aus Unterrichtsplan und optionalen Dateihinweisen:

- Dozenten-Webvariante
- Teilnehmer-Webvariante
- Aufgaben
- Dozenten-Loesungshinweise
- Quizplatzhalter
- Warnungen bei fehlendem Material

Alle automatisch erzeugten Inhalte werden als aus dem Unterrichtsplan erzeugt markiert.

## OpenAIProvider

Der `OpenAIProvider` ist vorbereitet, aber nicht Pflicht. API-Keys werden nicht hardcodiert und gehoeren nicht in den Browser. Ohne Konfiguration faellt der `AiOrchestrator` automatisch auf `LocalHeuristicProvider` zurueck und gibt eine Statusmeldung fuer die UI aus.

## Pipeline

1. `prepareDayInput`
2. `generateDayDraft`
3. optional `reviewDayDraft`
4. optional `repairDayDraft`
5. `normalizeDayGenerationResult`
6. Output-Validierung
7. Preview und Draft-Export

KI schreibt keine Dateien direkt. Sie liefert nur `DayGenerationResult`; der Container-Builder erzeugt daraus die Dateien.

## DayGenerationResult

Das strukturierte Ergebnis enthaelt Webvarianten, Aufgaben, Loesungen fuer Dozenten, Quizplatzhalter, Quellen, Warnungen und `aiGenerated`-Marker. Teilnehmerausgaben duerfen keine Loesungen enthalten.

## Dual-Mode-Container

Der Export erzeugt:

- `manifest.json` mit `runtimeModes.standalone` und `runtimeModes.platform`
- `catalog/days.json`
- `catalog/participant-content.json`
- `standalone/index.html`
- `platform/adapter.json`
- Dozenten- und Teilnehmerordner
- `source-map.json`
- Analysebericht

## Naming

Der NamingConsistencyService nutzt Kursname und Kurs-ID aus der Eingabemaske als kanonische Wahrheit. Legacy-Namen wie `LFZQ8a`, `LFZG8a` oder `LF10a` duerfen im sichtbaren Output nicht verbleiben. Originalnamen sind nur in `source-map.json` und Analyseberichten erlaubt.

## Grenzen

- Noch keine perfekte Materialauswertung.
- Noch keine produktive Veroeffentlichung.
- Noch keine DB-Anbindung.
- Noch kein vollstaendiger SaaS-Import.
- OpenAI wird nur vorbereitet; der testbare Default ist lokal.
