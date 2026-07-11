# ContentFactory Produktiv-MVP

## Ziel

Die ContentFactory bildet eine lokal testbare End-to-End-Strecke ab: Kursdaten erfassen, Unterrichtsplan lesen, Materialien und ZIPs sicher stagen, optionale Referenzmetadaten nutzen, Tagesentwuerfe erzeugen und einen Dual-Mode-Container-Draft schreiben.

## Ablauf

1. Kursdaten eingeben: Kursname, Kurs-ID, Fachbereich.
2. Unterrichtsplan hochladen: `.xlsx` oder `.xlsm`, Sheet/Planvariante auswaehlen.
3. Materialien/ZIPs hochladen: alle Uploadbereiche akzeptieren mehrere Dateien und ZIPs.
4. Referenzbibliothek optional einbinden: nur sichere Metadaten und generierte Zusammenfassungen.
5. KI-/Fallback-Modus waehlen: Default `AI_PROVIDER=local`.
6. Tagesentwurf erzeugen: strukturierter `DayGenerationResult`.
7. Vorschau pruefen und Korrekturhinweis erfassen.
8. Dual-Mode-Container-Draft erzeugen.
9. Standalone lokal oeffnen.

## Uploadbereiche

- Unterrichtsplan
- Unterrichtsmaterialien
- Aufgaben
- Loesungen
- Fragenpools / Quiz
- Projektmaterialien
- Quellcode
- Datenbank / SQL
- Assets / Medien
- Referenzliteratur / Fachquellen
- Sonstige Dateien
- ZIP-Gesamtpaket

## ZIP-Staging

ZIPs werden lokal in `AppData/content-factory/staging/{batchId}/` entpackt. Jede enthaltene Datei wird einzeln klassifiziert, gehasht, geprueft und kann manuell korrigiert werden. ZIP-Dateien werden nicht direkt exportiert, ausser sie werden ausdruecklich als auszulieferndes Archiv markiert.

## Referenzbibliothek

Referenzen liegen in `AppData/content-factory/reference-library/`. Suchergebnisse geben keine Originaltext-Snippets an den Renderer. Der Tagesgenerator bekommt nur Metadaten wie Titel, Autor, Abschnitt, Seitenzahl, SourceRef und eine generierte Kurzbeschreibung. Referenzquellen werden nicht in Kurscontainer oder Teilnehmerexports kopiert.

## KI/Fallback

Der lokale `LocalHeuristicProvider` funktioniert ohne API-Key und erzeugt Basisentwuerfe aus dem Unterrichtsplan. Der `OpenAIProvider` ist vorbereitet, wird aber nur verwendet, wenn serverseitig `OPENAI_API_KEY` und `OPENAI_MODEL` gesetzt sind. API-Keys werden nicht an den Browser weitergegeben.

## Unterrichtsplanparser

Der Desktop-Parser liest `.xlsx`/`.xlsm` lokal aus, erkennt mehrere Sheets, tolerante Spaltennamen und erzeugt Warnungen statt Abbrueche. Ohne lesbare Struktur wird ein pruefbarer Fallback-Plan erzeugt.

## Dual-Mode-Container

Drafts liegen in `AppData/content-factory/drafts/{containerId}/` und enthalten:

- `manifest.json` mit `runtimeModes`
- `catalog/`
- `dozent/`
- `teilnehmer/`
- `shared/`
- `standalone/`
- `platform/adapter.json`
- `reviews/`
- `source-map.json`
- `reports/`

Loesungen liegen nur im Dozentenbereich. Der Teilnehmerbereich enthaelt Webvariante, Aufgaben und Quiz.

## Standalone-Vorschau

`standalone/index.html` ist lokal oeffnbar. Katalogdaten werden eingebettet, damit die Vorschau auch per `file://` funktioniert. Sichtbar ist der Hinweis: `Standalone-Draft: keine echte Plattform-Freigabe`.

## Plattform-Adapter

`platform/adapter.json` beschreibt Rollen, Kataloge, ReleaseKeys und spaetere Integrationspunkte. Es werden noch keine echten CourseInstances, Nutzer oder Cloud-Daten angelegt.

## Grenzen des MVP

- OpenAI ist vorbereitet, aber der sichere Produktivaufruf ist noch nicht als Cloud-/Serverdienst umgesetzt.
- PDF/DOCX-Inhalte werden im Desktop-MVP nicht vollstaendig extrahiert.
- Referenzen liefern nur sichere Metadaten, keine Originalpassagen.
- Der erzeugte Container bleibt `status=draft`.

## Naechster Schritt Richtung Web/Cloud

Als naechstes sollte die AI-Schicht serverseitig mit Auth, AuditLog, CourseInstance-Kontext und geschuetzter Secret-Verwaltung angebunden werden. Danach koennen Drafts versioniert, in CourseInstances zugewiesen und ueber ReleaseStates freigegeben werden.
