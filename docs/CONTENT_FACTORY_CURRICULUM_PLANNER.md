# ContentFactory Curriculum Planner

## Warum Curriculum Anchor

Der Curriculum Anchor ist die thematische Hauptquelle fuer einen neuen Kurscontainer. Vor Tagesentwuerfen und Container-Draft wird daraus ein pruefbarer `CurriculumPlanDraft` erzeugt. Erst nach Freigabe dieses Plans darf die ContentFactory Tagesentwuerfe generieren.

## Anchor-Typen

- `course-plan`: vorhandener Unterrichtsplan mit Tagen, Themen und UE-Bloecken.
- `book-or-presentation`: PDF, EPUB oder PowerPoint als Quelle. Optional koennen Seiten- oder Folienbereiche angegeben werden.
- `text-document`: Word, Markdown, HTML oder TXT als thematische Quelle.

Genau ein Anchor-Typ ist aktiv. Zusatzmaterialien und Referenzliteratur bleiben separate Kontextquellen.

## Dauer- und Zielgruppenmodell

Der Planner speichert Dauer als Tage, Stunden oder UE. Standardwerte sind 5 Tage, 8 Stunden pro Tag, 9 UE pro Tag und 45 Minuten pro UE. Bei Stunden oder UE wird die Zahl der Tage aus der Tageskapazitaet abgeleitet.

Das Zielgruppenprofil enthaelt unter anderem Fachbereich, Vorkenntnisse, Lernniveau, Sprache, Praxisanteil, Schwierigkeit und Projekt-/Pruefungsorientierung. Diese Werte werden im CurriculumPlanDraft gespeichert und spaeter an die Tagesgenerierung weitergegeben.

## Themenanalyse

Der lokale MVP nutzt ohne API-Key deterministische Heuristiken:

- Unterrichtsplan: Tage und UE-Bloecke werden uebernommen.
- Buch/PDF/EPUB/PPTX: Dateiname, Anchor-Titel und optionale Bereiche erzeugen sichere Themenkarten ohne Originalseiten.
- Text/Word/Markdown/HTML/TXT: Datei- und Strukturhinweise erzeugen Themenkarten ohne vollstaendige Originaltexte im Renderer.

Wenn OpenAI spaeter serverseitig konfiguriert wird, kann `generateCurriculumPlan` bessere Cluster und didaktische Reihenfolgen vorschlagen. Der Output bleibt validierungspflichtig.

## Tages- und UE-Verteilung

Themen werden anhand der Dauer gleichmaessig auf Tage verteilt. Pro Tag werden UE summiert. Leere Tage und ueberladene Tage erzeugen Warnungen.

## Review-Zwischenschritt

Die UI zeigt eine Kanban-/Spaltenansicht je Tag. Themen koennen im MVP per Drag & Drop oder Buttons auf andere Tage verschoben werden. UE lassen sich pro Thema erhoehen oder reduzieren. Jede Aenderung setzt den Status wieder auf `needs-review`.

## Freigabe vor Generierung

Tagesgenerierung und Container-Draft sind blockiert, bis der CurriculumPlanDraft den Status `approved` hat. Der freigegebene Plan wird als `approvedCurriculumPlan` an DayGeneration und Draft-Erzeugung uebergeben.

## Sicherheit

- Keine Originalbuchtexte im CurriculumPlanDraft.
- Keine Referenzchunks im Renderer.
- Keine Referenzliteratur im Containerexport.
- Keine Loesungen im Teilnehmerbereich.
- Kein API-Key im Browser.
- Default bleibt `AI_PROVIDER=local`.

## Speicherort

Curriculum-Drafts liegen lokal unter:

`AppData/content-factory/curriculum-drafts/{draftId}/`

Enthalten sind `anchor.json`, `extracted-outline.json`, `curriculum-plan.json`, `review-history.json`, `analysis-report.json` und `analysis-report.html`.

## Grenzen des MVP

Der lokale Fallback analysiert keine kompletten Buchseiten oder PowerPoint-Folieninhalte semantisch, sondern erzeugt sichere, pruefbare Themenvorschlaege aus Metadaten, Bereichen und Dateinamen. Eine tiefere Inhaltsanalyse sollte spaeter serverseitig mit sauberer Rechte- und Secret-Verwaltung erfolgen.
