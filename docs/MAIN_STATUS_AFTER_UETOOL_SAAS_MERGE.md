# Main Status nach ueTool_SaaS Merge

## Status

- `main` ist die aktuelle Hauptbasis.
- `ueTool_SaaS` war vor diesem Cleanup identisch mit `main` und dient danach als Referenzbranch.
- `main` enthaelt zusaetzlich diesen Post-Merge-Cleanup-Commit.
- DSGVO-Zweige bleiben separat und wurden nicht automatisch in `main` gemergt.
- Verify: erfolgreich.

## Enthaltene Hauptfunktionen

- Electron Desktop-App
- Adminbereich
- ContentFactory
- Freigabezentrum
- Dozent anlegen
- Teilnehmer anlegen
- Kursverwaltung
- ContentContainer / CourseInstance Trennung
- KI-/Provider-Konfiguration
- OpenAI-Key-Integration
- Local/Fallback
- Prompt Contracts
- Prompt Quality Gate
- Preflight
- Presets
- Cost Guard
- Artefaktgeneratoren
- Testprotokoll
- Analysebericht
- Standalone-Draft
- Export-/Loesungsschutz

## Noch nicht erledigt

- erster echter ContentFactory-Testlauf
- punktgenauer Container-Review-Modus
- produktive Keychain-Verschluesselung statt MVP-Key-Store
- DSGVO-Zweig separat pruefen

## Naechste Schritte

1. `npm run verify` ausfuehren.
2. Admin-Key-Import lokal testen.
3. ContentFactory-Testlauf Java Einsteiger lokal durchfuehren.
4. Danach OpenAI-Testlauf durchfuehren.
5. Danach Review-Modus als neuen Feature-Branch entwickeln.

## Cleanup-Pruefung

- Branch-Vergleich vor dem Cleanup: `main` und `ueTool_SaaS` ohne abweichende Commits.
- Branch-Vergleich nach dem Cleanup: `main` ist durch diesen Dokumentations-/Naming-Commit bewusst vor `ueTool_SaaS`.
- Secret-Scan: keine echten Secrets gefunden.
- Getrackte `.env`-Dateien: nur `.env.example`.
- Getrackte Key-Dateien: keine `api_key_ContentFactory.txt`.
- `npm` ist in der aktuellen Shell nicht im PATH; die Verify-Bestandteile wurden mit dem gebuendelten Node ausgefuehrt:
  - `node scripts/check-all.js`: erfolgreich
  - `node tests/run-tests.js`: erfolgreich, `141 test(s) passed`
