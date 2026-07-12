# CMD Cleanup Report

Datum: 2026-07-12
Branch: main

## Entscheidung

Nur `ContentFactoryMainStart.cmd` bleibt als getrackter CMD-Starter erhalten. Alle alten Lab-, Demo-, Workflow-, Dozenten- und Teilnehmer-Starter wurden entfernt.

## Gefundene getrackte CMD-Dateien

| Datei | Entscheidung | Begruendung |
| --- | --- | --- |
| `AlleViewsTesten.cmd` | remove | Alter Teststarter, nicht mehr zentraler ContentFactory-Start. |
| `ContentFactoryLabStart.cmd` | remove | Alter Lab-Starter, durch zentralen Main-Starter ersetzt. |
| `ContentFactoryMainStart.cmd` | keep | Einziger zentraler Starter fuer die ContentFactory aus `main`. |
| `DemoExe.cmd` | remove | Alter Demo-Starter, durch zentralen Main-Starter ersetzt. |
| `WorkflowCheck.cmd` | remove | Alter Workflow-Starter, durch zentrale Verify-/Testbefehle ersetzt. |
| `apps/container-factory-lab/StartContainerFactoryLab.cmd` | remove | Alter Lab-Starter, durch zentralen Main-Starter ersetzt. |
| `apps/content-factory-lab/StartContentFactoryLab.cmd` | remove | Alter Lab-Starter, durch zentralen Main-Starter ersetzt. |
| `deployment/dozent/Start-LFZQ8a-Dozent.cmd` | remove | Paket-Starter wird nicht mehr als CMD-Datei gepflegt. |
| `deployment/dozent/Start-LFZQ8a-Wizard-Test.cmd` | remove | Alter Wizard-Teststarter. |
| `deployment/teilnehmer/Start-LFZQ8a-Teilnehmer.cmd` | remove | Paket-Starter wird nicht mehr als CMD-Datei gepflegt. |

## Starter-Regeln

- `ContentFactoryMainStart.cmd` startet aus dem Repository-Root.
- `desktop-app/package.json` wird geprueft.
- Ein abweichender Git-Branch wird als Warnung angezeigt.
- Lokales Electron, Electron-CMD und globales Electron werden in dieser Reihenfolge versucht.
- Der Starter fuehrt kein `npm install`, kein `git pull`, keinen Merge und keine Datenloeschung aus.

## Nachkontrolle

Erwarteter Befehl:

```text
git ls-files "*.cmd"
```

Erwartetes Ergebnis:

```text
ContentFactoryMainStart.cmd
```
