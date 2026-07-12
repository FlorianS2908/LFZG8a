# ContentFactory UX Workflow System

## Workflow-Prinzip

Jeder ContentFactory-Workflow folgt demselben Aufbau:

- Workflow-Kopf
- Zielbeschreibung
- Voraussetzungen
- Schritt-Navigation
- aktueller Arbeitsbereich
- Hilfe-/Kontextbereich
- Status-/Qualitaetsanzeige
- Aktionsleiste
- Ergebnisbereich

Jeder Schritt beantwortet:

- Was passiert hier?
- Warum ist das wichtig?
- Was muss ich eingeben?
- Was kann ich optional ergaenzen?
- Was bekomme ich danach?
- Was prueft das System?
- Was sind typische Fehler?

## Sprache

Technische Begriffe werden nicht alleinstehend angezeigt:

- Rohdaten / Expertenimport
- Import-Batch = zwischengespeicherter Dateiimport
- Mapping = Zuordnung der Datei zu einem Zweck
- Draft = Entwurf eines Kurscontainers
- Preflight = Sicherheits- und Qualitaetspruefung vor Veroeffentlichung

## Layout-Bausteine

Das Plain-JS-System liegt unter:

```text
desktop-app/app/renderer/tool-center/workflow-ui/
```

Es stellt Registry, Hilfeinhalte, Gates, Statuslogik, Utils und Rendererfunktionen bereit. Die ContentFactory nutzt diese Bausteine fuer den Plan-Wizard und die angrenzenden Workflows.

## Guided und Expert

Guided Mode ist Standard. Er zeigt mehr Erklaerung, empfiehlt naechste Schritte und sperrt Expertenbereiche staerker.

Expert Mode oeffnet Rohdaten / Expertenimport und Import-Batches direkter. Die Sicherheits- und Exportregeln bleiben trotzdem aktiv.
