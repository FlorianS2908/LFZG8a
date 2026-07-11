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
- PDF/PPTX/DOCX/EPUB/TXT/MD/HTML: die ContentFactory erzeugt sichere Outlines aus Seiten, Folien, Kapiteln, Ueberschriften und kurzen Metadaten.
- Buch/PDF/EPUB/PPTX: optionale Seiten- oder Folienbereiche werden beruecksichtigt. Bereiche ausserhalb der Auswahl werden ignoriert.
- Text/Word/Markdown/HTML/TXT: Ueberschriften, Listen- und Abschnittsstruktur werden als Themenkandidaten genutzt.

Wenn OpenAI spaeter serverseitig konfiguriert wird, kann `generateCurriculumPlan` bessere Cluster und didaktische Reihenfolgen vorschlagen. Der Output bleibt validierungspflichtig.

Die Outlines enthalten nur kurze Vorschauen und eigenformulierte Zusammenfassungen. Volltexte, Buchseiten, Folienbilder, Tabellenbilder und Referenzchunks werden nicht in den Renderer oder in den Kurscontainer geschrieben.

## Source Extraction

Die Extraktion liegt unter `desktop-app/app/lib/content-factory/source-extraction/`.

Unterstuetzte Formate:

- PDF: sicherer Text-/Latin1-Fallback mit Seiten-/Abschnittswarnung, keine OCR und keine Bilder.
- PPTX: ZIP/XML-Auswertung von `ppt/slides/slide*.xml`, Folientitel und sichtbarer Text als kurze Outline, keine Screenshots.
- DOCX: ZIP/XML-Auswertung von `word/document.xml`, Ueberschriften und Absaetze als sichere Struktur.
- EPUB: ZIP/XHTML-Auswertung von HTML-Kapiteln, Kapitel- und Heading-Struktur, reference-only fuer Literatur.
- TXT/MD/HTML: lokale Text- und Heading-Heuristik.

Wenn eine Quelle nicht gelesen werden kann, bricht der Planner nicht ab. Stattdessen erzeugt er eine Warnung und einen Fallback aus Dateiname und Anchor-Metadaten.

Jeder Extractor liefert ein `quality`-Objekt mit Score, Level, Fallback-Hinweis, erkannter Zeichenmenge und Abschnittszahl. `high` steht fuer mehrere echte Abschnitte/Folien/Kapitel, `medium` fuer erkannten Text mit unsicherer Struktur und `low` fuer Dateiname/Fallback.

## Curriculum Quality

Der Planner bewertet jeden `CurriculumPlanDraft` mit `quality.score` von 0 bis 100.

Bewertet werden:

- passende Anzahl Tage zur Dauer
- UE-Verteilung
- aktive Themen
- sinnvolle Titel und SourceRefs
- Zielgruppe und Kursziel
- leere, zu kurze oder ueberladene Tage
- niedrige Extraktionsqualitaet
- Warnungen zu Originaltext oder Referenzchunks

Level: `weak`, `usable`, `good`, `strong`. Die UI zeigt den Score im Review als Ampel-/Warnblock. `weak` blockiert die Freigabe nicht automatisch, macht aber Nacharbeit sichtbar.

## Tages- und UE-Verteilung

Themen werden anhand der Dauer gleichmaessig auf Tage verteilt. Pro Tag werden UE summiert. Leere Tage und ueberladene Tage erzeugen Warnungen.

## Review-Zwischenschritt

Die UI zeigt eine Kanban-/Spaltenansicht je Tag. Themen koennen per Drag & Drop oder Buttons auf andere Tage verschoben werden. Tagesname, Tagesziel, Titel, Summary, UE, Difficulty und Active-Status sind editierbar. Themen koennen deaktiviert, dupliziert oder unterhalb neu angelegt werden. Jede Aenderung setzt den Status wieder auf `needs-review`.

## Freigabe vor Generierung

Tagesgenerierung und Container-Draft sind blockiert, bis der CurriculumPlanDraft den Status `approved` hat. Der freigegebene Plan wird als `approvedCurriculumPlan` an DayGeneration und Draft-Erzeugung uebergeben.

Nach Freigabe kann die UI entweder einen ausgewaehlten Tag neu erzeugen oder mit `generateAllDayDrafts` alle Tage generieren. Fehler pro Tag fuehren zu einem lokalen Fallback fuer genau diesen Tag und werden als Warnung im DayResult gespeichert.

Das Feld `corrections` steuert die Korrekturschleife. `reviseDayDraft` ueberarbeitet den vorhandenen Tagesentwurf lokal oder optional mit OpenAI und speichert die Revision unter `reviews/tag_XX.json`.

## OpenAIProvider

Default bleibt `AI_PROVIDER=local`. OpenAI ist nur aktiv, wenn `OPENAI_API_KEY` und `OPENAI_MODEL` im Node/Main-Prozess gesetzt sind. Der Renderer erhaelt nur `configured` und Modellname, niemals den Key.

Der Provider nutzt JSON-only Prompts, validiert DayGeneration-Ergebnisse und faellt bei Timeout, API-Fehlern oder ungueltigem JSON auf `LocalHeuristicProvider` zurueck. Teilnehmerbereiche werden nach der Normalisierung auf Loesungshinweise geprueft.

Der lokale Fallback erzeugt strukturierte Tagesentwuerfe mit Einstieg, Lernzielen, Vorwissen, Themenabschnitten, Demo, Arbeitsphase, Reflexion, Zusammenfassung und Quellenhinweisen. Aufgaben, Erwartungshorizonte und Quizfragen werden aus Themen/UE-Bloecken abgeleitet und an Zielgruppe, Schwierigkeit, Projekt- und Pruefungsorientierung angepasst.

## Container-Konfiguration und Artefakte

Der Wizard enthaelt einen Schritt `Container-Konfiguration`. Dort werden Kurstyp, Artefaktmodus und sichere Erzeugungsoptionen gesetzt.

Unterstuetzte Kurstypen im MVP:

- `theory`
- `html-css`
- `java`
- `java-maven`
- `python`
- `jupyter`
- `sql`
- `php-xampp`
- `uml-pap`
- `database-project`
- `mixed-project`

Aus Kurstyp, Zielgruppe, Vorkenntnissen, Kursziel und Didaktik werden Artefaktvorschlaege abgeleitet. Einsteiger erhalten einfache Dateien, Fortgeschrittene eher Projektstrukturen. Java erzeugt fuer Anfaenger keine Maven-Projekte als Default; `java-maven` oder fortgeschrittene Zielgruppen erzeugen eine Maven-Struktur.

Generierte Artefakte koennen unter anderem sein:

- Java-Dateien oder Maven-Projekte
- Python-Dateien
- Jupyter-Notebooks
- SQL-Skripte und phpMyAdmin-README
- PHP/XAMPP-Starter
- Draw.io-Diagramme
- README-/Setup-Dateien

Sicherheitsregeln:

- Code, SQL, externe Tools und EXE-Dateien werden nicht automatisch ausgefuehrt.
- `.exe`, `.bat`, `.cmd` und `.ps1` werden im Export blockiert.
- SQL wird nur als Datei erzeugt und muss manuell importiert werden.
- Loesungsartefakte liegen nur unter `dozent/`.
- `participant-content.json` referenziert keine Dozentenartefakte.
- ToolProfiles beschreiben externe Werkzeuge nur als manuelle Hinweise.

## Standalone und Analysebericht

Der erzeugte Dual-Mode-Draft enthaelt alle DayResults. `standalone/index.html` bietet einen Umschalter zwischen Teilnehmer-Vorschau und Dozentenansicht. Loesungen erscheinen nur in der Dozentenansicht.

Der Analysebericht enthaelt Kursdaten, Anchor-Typ, Anchor-Dateien, Ranges, Extraktionsstatus, Zielgruppe, Dauer, AI-Modus, OpenAI-/Fallback-Hinweise, Anzahl Tage/Themen/Aufgaben/Loesungen/Quizfragen, ContainerProfile, Artefaktvorschlaege, erzeugte Artefakte, Toolprofile, Warnungen, Referenznutzung, Export-Schutz-Ergebnis, erzeugte Dateien und offene Punkte.

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

Der lokale Fallback ist bewusst konservativ. Er extrahiert keine Bilder, keine Tabellenbilder, keine OCR-Inhalte und keine vollstaendigen Buchseiten. PDF-Text kann je nach Datei nur eingeschraenkt lesbar sein; in diesem Fall wird mit Warnung weitergearbeitet. Eine tiefere semantische Inhaltsanalyse sollte serverseitig mit sauberer Rechte- und Secret-Verwaltung erfolgen.
