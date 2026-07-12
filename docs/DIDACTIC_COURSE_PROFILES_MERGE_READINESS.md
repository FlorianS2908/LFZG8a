# Didactic Course Profiles Merge Readiness

Status: READY_WITH_WARNINGS

## Branch Update

- Branch: `feature/didactic-course-profiles`
- Remote aktualisiert mit `git fetch --all --prune`.
- `origin/main` wurde in den Feature-Branch gemergt.
- Merge-Konflikte: keine.
- Nicht nach `main` gemergt.
- Keine DSGVO-/Datenschutz-Zweige gemergt.

## Enthaltene Features

- Didaktische Kursprofile mit Empfehlung, Fit Score, Preview und Wizard-Schritt.
- ReleasePlan je Tag.
- DemoTargets und sichere Demo-Artefakte.
- Prompt-Precision-Integration fuer didaktische Regeln.
- Dozenten-Fahrplan je Tag.
- Drag-and-Drop Uploadzonen mit Mehrfachupload.

## Dozenten-Fahrplan Status

- `teacherRunbook` ist Teil des normalisierten DayGenerationResult.
- Local/Fallback erzeugt profiltypische Phasen fuer alle acht didaktischen Profile.
- Drafts erzeugen `catalog/teacher-runbooks.json`.
- Drafts erzeugen pro Tag `dozent/tag_XX/unterrichtsablauf.html`.
- `catalog/days.json` referenziert den Dozenten-Fahrplan ueber `teacherRunbook`.
- Dozenten-Webvariante zeigt Profil, Unterrichtsfluss, Demo-Buttons, Freigabehinweise und Link zum Fahrplan.
- Teilnehmerbereich verlinkt den Fahrplan nicht und bleibt ohne Dozentenhinweise.

## Drag-and-Drop Upload Status

- Hauptquelle und alle Materialbereiche nutzen einheitliche Dropzones.
- Klick-Auswahl, Tastaturfokus und Drag-and-Drop sind unterstuetzt.
- Mehrfachupload ergaenzt vorhandene Dateien.
- Einzelne Dateien koennen entfernt werden.
- Duplikate werden erkannt.
- Dateitypen werden gegen `accept` geprueft.
- ZIP-Dateien bleiben erlaubt.
- Grosse Dateien erzeugen Warnungen.
- Gefaehrliche Endungen werden blockiert: `.exe`, `.bat`, `.cmd`, `.ps1`, `.msi`, `.vbs`, `.scr`, `.com`.

## Didaktik-Tests

- Tests decken alle acht Profile ab:
  - `explain-demo-practice`
  - `problem-first`
  - `project-based`
  - `worked-example-fading`
  - `exam-training`
  - `station-learning`
  - `flipped-classroom`
  - `guided-coding`
- Geprueft werden Local Day Draft, Didactic Quality Gate, Container Draft, `teacherRunbook`, Testprotokoll und Teilnehmer-Schutz.

## Upload-Tests

- Mehrere Dateien werden akzeptiert.
- Gefaehrliche Endungen werden blockiert.
- Duplikate werden markiert.
- Uploadbereiche behalten `uploadArea`.
- Entfernen einzelner Dateien ist abgedeckt.
- Dropzone-HTML enthaelt `multiple` und `data-dropzone`.

## Secret-Scan

- Es wurden keine echten API-Keys oder Secrets gefunden.
- Treffer im Scan beziehen sich auf Schutzlogik, blockierte Dateinamen, Env-Loader oder Test-/Placeholder-Regeln.
- Keine `.env`, keine API-Key-Dateien, kein `node_modules`, kein `dist`, keine AppData-Drafts und keine Referenzbuecher sind Bestandteil des Feature-Codes.

## Verify-Ergebnis

- `npm install`: nicht ausgefuehrt, weil `npm` in dieser Shell nicht verfuegbar ist.
- `npm run verify`: nicht wortwoertlich ausfuehrbar, weil `npm` in dieser Shell nicht verfuegbar ist.
- Aequivalente Projektpruefung ueber die gebuendelte Node-Runtime:
  - `node scripts/check-all.js`: erfolgreich.
  - `node tests/run-tests.js`: erfolgreich.
  - `git diff --check`: erfolgreich.

## Empfehlung

READY_WITH_WARNINGS

Der Branch ist fachlich merge-vorbereitet und mit `origin/main` aktualisiert. Die Warnung betrifft ausschliesslich die lokale Toolchain: `npm` ist in dieser Ausfuehrungsumgebung nicht verfuegbar. Sobald `npm` lokal verfuegbar ist, sollte `cd desktop-app && npm install && npm run verify` noch einmal wortwoertlich ausgefuehrt werden.
