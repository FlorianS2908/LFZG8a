# ContentFactory Productive Testflow

Diese Anleitung beschreibt den produktiven MVP-Test ohne echte Quellen ins Repository zu kopieren. Uploads, Staging, Referenzbibliothek und Drafts liegen lokal unter `AppData/content-factory/`.

## Test mit Unterrichtsplan

1. ContentFactory oeffnen und Kursname, Kurs-ID und Fachbereich setzen.
2. Anchor-Typ `course-plan` waehlen.
3. Unterrichtsplan als XLSX/DOCX/PDF hochladen.
4. Dauer, Zielgruppe, Kursziel und erwartetes Ergebnis setzen.
5. Quelle analysieren.
6. CurriculumPlanDraft pruefen, Themen bearbeiten oder verschieben.
7. Plan freigeben.
8. Optional Zusatzmaterialien oder ZIPs importieren.
9. `Alle Tage generieren` ausfuehren.
10. Dual-Mode-Container-Draft erzeugen.
11. Standalone oeffnen und Teilnehmer-/Dozentenansicht vergleichen.
12. Analysebericht pruefen.

## Test mit PDF, PPTX oder EPUB

1. Anchor-Typ `book-or-presentation` waehlen.
2. PDF, PPTX oder EPUB auswaehlen.
3. Optional Seiten- oder Folienbereiche definieren.
4. Analyse starten.
5. Im Review pruefen, ob Themen aus Outline, Folien oder Kapiteln entstanden sind.
6. Warnungen beachten, besonders bei PDF-Fallback oder nicht lesbaren Quellen.
7. Plan freigeben und alle Tage generieren.

Die Originalquelle wird nicht in den Kurscontainer exportiert. SourceRefs bleiben Metadaten.

## Test mit DOCX, Markdown, HTML oder TXT

1. Anchor-Typ `text-document` waehlen.
2. DOCX, MD, HTML oder TXT auswaehlen.
3. Analyse starten.
4. Ueberschriften und Abschnittsthemen im Review kontrollieren.
5. Bei Bedarf Tagesname, Tagesziel, Summary, UE, Difficulty oder Active-Status korrigieren.
6. Plan erneut freigeben, wenn Aenderungen vorgenommen wurden.

## OpenAI ohne Key

Ohne `OPENAI_API_KEY` und `OPENAI_MODEL` bleibt der Status `OpenAI nicht konfiguriert`. Auch wenn im UI `openai` gewaehlt wird, nutzt die ContentFactory automatisch den lokalen Fallback und schreibt eine Warnung in das DayResult.

## Speicherorte

- Staging: `AppData/content-factory/staging/{batchId}/`
- Referenzbibliothek: `AppData/content-factory/reference-library/`
- Curriculum-Drafts: `AppData/content-factory/curriculum-drafts/{draftId}/`
- Generierte Draft-Container: `AppData/content-factory/drafts/{containerId}/`

Keine Uploads und keine Referenzquellen gehoeren ins GitHub-Repo.

## Standalone pruefen

Der Draft enthaelt `standalone/index.html`. Dort kann zwischen Teilnehmer-Vorschau und Dozentenansicht gewechselt werden.

Zu pruefen:

- Alle Tage sind sichtbar.
- Aufgaben und Quiz sind sichtbar.
- Loesungen erscheinen nur in der Dozentenansicht.
- Warnungen und SourceRefs sind sichtbar.
- Keine Originalbuchtexte oder Referenzchunks sind enthalten.

## Analysebericht pruefen

Der Bericht liegt unter `reports/{containerId}-analysis-report.html`.

Wichtige Felder:

- Kursname, Kurs-ID, Fachbereich
- Anchor-Typ, Anchor-Dateien und Ranges
- Extraktionsstatus je Quelle
- AI-Modus, OpenAI genutzt, Fallback genutzt
- Anzahl Tage, Themen, Aufgaben, Loesungen und Quizfragen
- Warnungen
- Referenznutzung
- Export-Schutz-Ergebnis
- erzeugte Dateien und offene Punkte

## MVP-Grenzen

PDFs koennen je nach Aufbau nur teilweise lesbar sein. Es gibt keine OCR, keine Bildextraktion und keine semantische Tiefenanalyse kompletter Buchseiten. Der lokale Fallback erzeugt deshalb pruefbare Entwuerfe mit Warnungen, aber keine fachlich finale Kursfreigabe.
