# Main Cleanup Candidates

Stand: Post-Merge-Cleanup auf `main`.

## Ergebnis

- Entfernt: alte getrackte Analyse-/Output-ZIPs im Repository-Root.
- Entfernt lokal: ungetrackte `_tmp_...`-Datei.
- Nicht entfernt: aktive App-, Kurs-, Deployment-, Test- und Lab-Strukturen.
- DSGVO-/Datenschutz-Zweige wurden nicht gemergt oder veraendert.

## Kandidaten

| Pfad | Zweck | Referenziert | Tests | README/Docs | Empfehlung |
| --- | --- | --- | --- | --- | --- |
| `_archiv/` | Ruecklage alter Root-Materialstaende | Ja, README und Tests ignorieren/erwaehnen den Ordner | Ja, Pfadintegritaet ignoriert `_archiv` explizit | Ja | keep |
| `apps/container-factory-lab/` | Alias fuer altes ContentFactory Lab | Ja, verweist auf `apps/content-factory-lab` | Nein | Ja | later-review |
| `apps/content-factory-lab/` | Standalone-Lab/Referenzoberflaeche | Ja, `ContentFactoryLabStart.cmd` | Nein | Ja | later-review |
| `desktop-app_ANALYSE.zip` | altes Analysepaket | Nein | Nein | Nein | remove |
| `LF_ZQ8a_ANALYSE.zip` | altes Analysepaket | Nein | Nein | Nein | remove |
| `dozent.zip` | alter generierter Output | Nein | Nein | Nein | remove |
| `_tmp_41064_88e9f62df06c84e00af459575c20b109` | temporaere lokale Datei | Nein | Pfadintegritaet verbietet `_tmp_` im aktiven Baum | Nein | remove |
| `DemoExe.cmd` | aktives Startskript | Ja | Ja | Ja | keep |
| `WorkflowCheck.cmd` | aktiver Workflow-Check | Ja | Indirekt/Docs | Ja | keep |
| `docs/BRANCH_STRATEGY_AFTER_MAIN_CLEANUP.md` | Branchstrategie nach Merge | Ja, Statusdoku | Nein | Ja | keep |
| alte Merge-Readiness-Dokumente in `docs/` | Audit-/Merge-Nachweis | Ja, Kontext nach Main-Merge | Nein | Teilweise | keep |

## Entfernte Dateien

- `desktop-app_ANALYSE.zip`
- `LF_ZQ8a_ANALYSE.zip`
- `dozent.zip`

Altmaterial bleibt ueber Git-Historie erhalten und ist nicht Teil des aktiven Produkts.

## Nicht geloescht

`_archiv/`, Lab-Ordner und aktive Startskripte bleiben erhalten, weil sie noch referenziert sind oder bewusst als Referenz dienen. Eine spaetere Bereinigung sollte in einem eigenen Cleanup-Branch mit angepassten Tests und README erfolgen.
