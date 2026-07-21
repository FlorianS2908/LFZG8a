# Kurscontainerformat

Schema-Version: `1.0.0`. Ein Export enthält ausschließlich relative UTF-8-Pfade.

```text
course-container/
  container.json
  catalog/days.json
  catalog/projects.json
  catalog/tools.json
  catalog/links.json
  dozent/
  teilnehmer/
  assets/
  question-pools/
  source/
  reports/validation-report.json
  checksums.json
```

`container.json` führt `schemaVersion`, `containerId`, `courseId`, `title`, `description`, `version`, `createdAt`, `updatedAt`, `generator`, `language`, `targetGroups`, `dayCount`, `unitCount`, `sourceFiles` und `contentSummary`. Katalog-IDs müssen eindeutig sein. Frageobjekte besitzen ID, Thema, Schwierigkeit, Typ (`single-choice` oder `multiple-choice`), Text, Antworten, richtige Indizes, Erklärung sowie Tag- und Themenzuordnung.

Der Export blockiert absolute Pfade, Traversal (`..`), nicht lesbare Pflichtdateien, ungültiges JSON, doppelte IDs und Lösungen im Teilnehmerbereich. `checksums.json` enthält SHA-256-Prüfsummen. Zeitstempel ausgenommen ist die Ausgabe bei unveränderten Eingaben stabil sortiert. Geheimnisse, Passwörter und unnötige personenbezogene Daten sind verboten.
