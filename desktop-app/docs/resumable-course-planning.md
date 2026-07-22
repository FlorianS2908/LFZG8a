# Wiederaufnehmbare Dokumentanalyse und UE-Planung

## Anwenderablauf

1. Kurs und Quellen anlegen.
2. Dauer, Zielgruppe und Vorkenntnisse bestätigen.
3. **Dokumente analysieren** starten und die Analysefelder prüfen.
4. **Unterrichtsplan aus Analyse erstellen** starten.
5. Den Plan `Kurs → Tag → UE` prüfen und freigeben.
6. Lernwerkzeuge und Materialien werden erst nach der Planfreigabe erzeugt.

## Pipeline und Persistenz

Kursprojekte besitzen migrationsfähige Statusobjekte für `document_preparation`, `document_analysis`, `topic_consolidation`, `ue_scaffold`, `topic_distribution` und `plan_validation`. Jede Phase speichert Status, Aktivität, Fortschritt, Retry-Zähler und einen redigierten Fehler. Bestehende Projekte erhalten beim Laden kompatible Defaults.

Eine Dokumentanalyse endet nach dem konsolidierten `topicCatalog`. Planung ist eine getrennte Operation und erhält ausschließlich diesen Katalog, den Kursrahmen und ein deterministisch erzeugtes UE-Gerüst. Ein Planungsfehler verändert weder Dokumentstatus noch Analyseversionen. Der schlanke Ergebnisabruf liefert Plan, Dokumentstatus, Warnungen, Fehler und Navigationsziel ohne Extraktionen oder alte Analyseversionen.

## Idempotenz und Cache

Dokumente werden nur wiederverwendet, wenn SHA-256, `analyzedChecksum` und Promptversion kompatibel sind. Segmentresultate speichern Segment-ID, Quellprüfsumme und Promptversion; erfolgreiche Segmente werden bei Retries übersprungen. Providerdateien werden einmal über die Files API hochgeladen. `providerFileId` und die zugehörige Prüfsumme bleiben in den Vorbereitungsmetadaten erhalten; spätere Analysen referenzieren die ID und senden keine erneute Base64-Datei.

## Parallelität und Timeouts

Segmentanalyse verwendet standardmäßig zwei Worker und bewahrt die ursprüngliche Ergebnisreihenfolge. Provider-429- und temporäre 5xx-Antworten verwenden den bestehenden begrenzten Backoff. Dokumentanfragen haben ein eigenes Zeitbudget, die Unterrichtsplanung standardmäßig fünf Minuten. Renderer-Polling ist adaptiv (500–2000 ms) und verwendet ein Inaktivitätslimit statt eines pauschalen Gesamtabbruchs. Ein Renderer-Inaktivitätshinweis beendet die Backendoperation nicht.

## Sicherheit

XLSM-Dateien werden ausschließlich lesend verarbeitet. VBA-Inhalte werden weder geladen noch ausgeführt; eine temporäre XLSX-Arbeitskopie enthält keine Makroteile. HTML und EPUB werden bereinigt. ZIP-Pfade, Signaturen, Dateigrößen und gespeicherte Prüfsummen werden validiert. Dokumentinhalte bleiben nicht vertrauenswürdige Eingaben. Logs redigieren Schlüssel, Tokens, Base64 und Dokumentvolltexte; `EPIPE` darf den Fachablauf nicht beenden.

## Tests und bekannte Einschränkungen

Standardtests verwenden Provider-Testdoubles und benötigen keinen echten OpenAI-Zugang. Der Electron-Smoke wird mit `pnpm exec electron . --course-planning-smoke` gestartet. Ein echter Provider-Smoke bleibt opt-in. Providerdateien werden derzeit beim bewussten Entfernen eines Kursprojekts nicht automatisch remote gelöscht; ihre kontrollierte Lebenszyklusbereinigung bleibt eine administrative Folgeaufgabe. Die reale Datei `Wochenplan_FIAE_LF-ZQ8A.xlsm` muss separat bereitgestellt werden; ohne sie wird eine makrohaltige, realistische XLSM-Fixture verwendet.
