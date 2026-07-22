# CourseForge Reference Library

## Architekturentscheidung

Die Referenzbibliothek folgt dem Bring-your-own-content-Prinzip. Nutzer importieren eigene, rechtmaessig lizenzierte Fachquellen lokal und verwenden sie nur als interne Wissensquelle fuer Analyse, Suche und KI-Kontext.

**PLOGLAN liefert keine urheberrechtlich geschuetzten Buecher mit. PLOGLAN stellt nur eine lokale Referenzfunktion bereit.**

## Lokaler Speicher

Standardpfad:

```text
%APPDATA%/CourseForge/projects/content-factory/reference-library/
```

Struktur:

```text
reference-library/
  index.json
  sources/{referenceId}/
    original/
    extracted.json
    chunks.json
    metadata.json
    safety-report.json
  reports/
```

Der Ordner liegt ausserhalb des GitHub-Repositories, wird nicht in Kurscontainer kopiert und wird nicht automatisch in Cloud- oder SaaS-Systeme uebertragen.

## Regeln

- Quellen bleiben lokal.
- Quellen werden nicht exportiert.
- Quellen werden nicht an Teilnehmer ausgeliefert.
- Quellen werden nicht automatisch in die Cloud hochgeladen.
- Referenzchunks werden nicht exportiert.
- Originaldateien, Buchseiten, Bilder, Tabellen und laengere Originalpassagen werden nicht uebernommen.
- Personenbezogene Wasserzeichen, Lizenznamen oder E-Mail-Adressen werden als Warnung markiert und duerfen nicht im Export landen.
- Kurscontainer enthalten nur eigene generierte Inhalte und optionale Quellenhinweise.

Standard fuer Buecher:

```json
{
  "usageMode": "local-reference-only",
  "allowedForAiContext": true,
  "allowedForCloud": false,
  "allowedForExport": false,
  "allowedForParticipant": false,
  "copyrightStatus": "unknown"
}
```

## Cloud-Vorbereitung

Fuer Cloudbetrieb muss jede Referenzquelle spaeter explizit als `licensed`, `own-material` oder `open` markiert werden. Standardmaessig bleiben Buecher `local-reference-only`.

## KI-Kontext

Die KI-Pipeline darf Referenzen nur als Kontext verwenden. `sourceRefs` duerfen Referenzquellen nennen, aber keine Rohtexte enthalten. Die KI erzeugt eigene Inhalte; sie kopiert keine Originalpassagen.

## Export-Schutz

Der Export wird blockiert oder kritisch markiert, wenn Referenzbibliothek-Pfade, `original/`, `extracted.json`, `chunks.json`, PDF-/EPUB-Dateien oder Wasserzeichen-/Lizenzhinweise im Container auftauchen.
