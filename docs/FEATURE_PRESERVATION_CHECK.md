# Feature Preservation Check

Datum/Uhrzeit: 2026-07-12 11:35 +02:00
Branch: `ueTool_SaaS`

## Plattform

- [x] Electron Desktop-App vorhanden
- [x] Login vorhanden
- [x] Rollen Admin/Dozent/Teilnehmer vorhanden
- [x] Admin-Systemkacheln vorhanden
- [x] Freigabezentrum vorhanden
- [x] Kursverwaltung vorhanden

## ContentFactory

- [x] ContentFactory erreichbar
- [x] Upload/Staging vorhanden
- [x] ZIP-Handling vorhanden
- [x] Curriculum Anchor vorhanden
- [x] Curriculum Planner vorhanden
- [x] Curriculum Review vorhanden
- [x] Alle-Tage-Generierung vorhanden
- [x] Dual-Mode-Container-Draft vorhanden
- [x] Standalone vorhanden
- [x] Analysebericht vorhanden

## KI

- [x] Local/Fallback vorhanden
- [x] OpenAIProvider vorhanden
- [x] OpenAI-Key wird nicht angezeigt
- [x] Prompt Contracts vorhanden
- [x] Prompt Quality Gate vorhanden oder vorbereitet
- [x] AI Quality Gate vorhanden oder vorbereitet
- [x] Cost Guard vorhanden oder vorbereitet

## Artefakte

- [x] Java-Dateien erzeugbar
- [x] Maven-Projekt erzeugbar
- [x] Python-Dateien erzeugbar
- [x] Jupyter Notebook erzeugbar
- [x] SQL-Dateien erzeugbar
- [x] PHP/XAMPP-Dateien erzeugbar
- [x] Draw.io-Dateien erzeugbar
- [x] Loesungen nur Dozentenbereich

## Sicherheit

- [x] Keine `.env` im Repo
- [x] Keine API-Keys im Repo
- [x] Keine EXE im Export
- [x] Keine Loesungen im Teilnehmerbereich
- [x] Keine Referenzliteratur im Export
- [x] Keine `reference-library`/`chunks`/`original` im Export

## Tests

- [x] Verify-Aequivalent laeuft: `node scripts/check-all.js` und `node tests/run-tests.js`
- [x] ContentFactory Tests laufen
- [x] Validator Tests laufen
- [x] Preflight Tests laufen
- [x] Artefakt Tests laufen
- [x] KI/Fallback Tests laufen

## Hinweise

- `npm` ist auf dieser Maschine nicht im PATH. Das `desktop-app`-Script `verify` besteht aus `node scripts/check-all.js && node tests/run-tests.js`; beide Schritte wurden mit dem gebuendelten Node erfolgreich ausgefuehrt.
- Secret-Scan zeigte nur erlaubte Platzhalter-/Skript-Treffer und keine echten Secrets.
