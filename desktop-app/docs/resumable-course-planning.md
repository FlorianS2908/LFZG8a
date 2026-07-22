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
# Geführte KI-Zusammenarbeit und Workflow-Härtung

Der bestehende Ablauf bleibt unverändert: Kursrahmen, Quellen, Dokumentanalyse, Prüfung, getrennte Unterrichtsplanung und Freigabe. Die Ergänzungen sind evolutionär und vorhandene Projektdateien werden beim Laden mit sicheren Defaults normalisiert.

## Zentrale Verträge und Operationen

`operations/operation-engine.js` definiert ein gemeinsames, persistierbares Operationsmodell, gültige Statusübergänge, Idempotenzschlüssel, Checkpoints und die Rekonstruktion unterbrochener Vorgänge. Die bestehende Analyse-/Planungspipeline bleibt während der schrittweisen Migration aktiv. `analysis-ipc-contract.js` führt API-Version, Allowlist, Berechtigung, Transportart und stabile Fehlercodes zentral; der sandboxed Preload enthält aus Electron-Sicherheitsgründen weiterhin einen expliziten, durch Contract Tests geschützten Spiegel.

## Zusammenarbeit

Neue und migrierte Kurse verwenden standardmäßig „Begleitet“. „Automatisch“ blockiert nur kritische Lücken, „Streng kontrolliert“ verlangt Bestätigung wesentlicher Phasen. Die Ansicht „Von der KI erkannt“ zeigt Kursumfang, Dokumente, Leitquellen, Themen, Konflikte und fehlende Angaben, ohne Dokumentvolltexte zu übertragen.

Dokumentbereiche werden strukturiert validiert. Planbereiche können per `targetType` und stabiler ID gesperrt oder gezielt überarbeitet werden. Jede Überarbeitung und Wiederherstellung erzeugt eine neue Planversion samt kompaktem UE-Diff; gesperrte UEs werden abgelehnt. Feedback, Korrekturen und strukturierte Kursanforderungen werden im Kursprojekt gespeichert.

## Einführung und Grenzen

Feature-Flags besitzen projektlokale Defaults. Mehrstufiger Analysecache, File-ID-Wiederverwendung, atomare JSON-Persistenz und höchstens zwei Segmentworker stammen aus der bestehenden Pipeline. Die getrennte Artefaktpersistenz ist bewusst noch deaktiviert, bis eine wiederholbare Migration bestehender Projektdateien vollständig abgesichert ist. Die neue Operation-Engine ist als zentrale Domäne getestet; die laufende Pipeline wird schrittweise darauf migriert, statt zwei parallele Implementierungen dauerhaft zu betreiben.

Die reale `Wochenplan_FIAE_LF-ZQ8A.xlsm` wird nur getestet, wenn sie außerhalb des Repositories vorhanden ist. Standardtests verwenden eine synthetische makrohaltige Fixture read-only; Makros werden nie ausgeführt.

## Planungsreview und Responsive-Verhalten

Der Schritt „Struktur-Review“ hebt ausschließlich für die breite Planung die allgemeine Inhaltsbegrenzung auf und blendet die kontextuelle Seitenhilfe aus. UE und Zeit bleiben schmal, Thema erhält 15 Prozent, Inhalt und Lernziel jeweils 24 Prozent, Quellen 13 Prozent und Belegstatus 11 Prozent. Ab 900 Pixeln wird jede UE als beschriftete Karte dargestellt; Bearbeitung, Details, Status und Tastaturfokus bleiben erhalten.

Technische Confidence-Werte sind nicht mehr die primäre Nutzerinformation. Die UI normalisiert optionale Zahlen strikt und zeigt stattdessen „Direkt belegt“, „Nachvollziehbar abgeleitet“, „Klärung empfohlen“ oder „Konflikt vorhanden“. Ein Prozentwert erscheint nur ergänzend bei einer endlichen Zahl zwischen 0 und 1; `NaN %` kann nicht gerendert werden. Quellen werden kompakt mit bekanntem Blatt, Seite, Folie oder Fundort dargestellt.
