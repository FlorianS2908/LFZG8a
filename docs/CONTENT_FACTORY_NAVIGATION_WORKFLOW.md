# ContentFactory Navigation Workflow

## Warum der Wizard gefuehrt ist

Die ContentFactory soll neue Kurscontainer aus einer fachlichen Hauptquelle erzeugen. Deshalb startet `Neuen Kurscontainer erstellen` immer im Plan-Wizard und nicht im Rohdatenimport. So werden Kursdaten, Hauptquelle, Didaktik, Containerprofil, Curriculum-Freigabe, KI/Fallback und Testlauf in einer nachvollziehbaren Reihenfolge bearbeitet.

## Wizard-Schritte und Gates

| Schritt | Aktiv wenn | Erfuellt wenn |
| --- | --- | --- |
| Kursdaten | immer | Kursname, Kurs-ID und Fachbereich gesetzt sind |
| Hauptquelle | Kursdaten erfuellt | mindestens eine Hauptquell-Datei vorhanden ist |
| Dauer & Zielgruppe | Kursdaten erfuellt | Dauer, Vorkenntnisse, Niveau und Schwierigkeit gesetzt sind |
| Didaktik | Kursdaten und Zielgruppe erfuellt | ein didaktisches Profil gesetzt ist |
| Container | Didaktik erfuellt | Kurstyp und Artefaktmodus gesetzt sind |
| Analyse | Kursdaten, Hauptquelle, Zielgruppe, Didaktik und Containerprofil erfuellt | ein CurriculumDraft vorhanden ist |
| Curriculum pruefen | CurriculumDraft vorhanden | Curriculum freigegeben ist |
| Materialien | Curriculum freigegeben | Uploads vorhanden oder Schritt uebersprungen |
| KI/Fallback | Curriculum freigegeben | KI-Modus gesetzt ist |
| Tagesentwuerfe | Curriculum freigegeben | mindestens ein Tagesentwurf vorhanden ist |
| Testlauf | Tagesentwurf vorhanden | Preflight oder Testlauf vorhanden ist |

## Hauptquelle

Die Hauptquelle bestimmt die Themenstruktur. Unterstuetzt werden:

- Unterrichtsplan: `.xlsx`, `.xlsm`, `.zip`
- Buch / PDF / EPUB / PowerPoint: `.pdf`, `.epub`, `.pptx`, `.zip`
- Textdokument / Word / Markdown / HTML / TXT: `.docx`, `.txt`, `.md`, `.html`, `.zip`

Seiten- und Folienbereiche koennen fuer PDF, EPUB und PowerPoint optional angegeben werden.

## Plan-Wizard vs. Rohdaten / Experte

Der Plan-Wizard ist der Standardweg fuer neue Kurscontainer. Er fuehrt vom Unterrichtsplan oder einer anderen Hauptquelle ueber Curriculum-Analyse, Freigabe, KI/Fallback und Preflight zum Draft.

`Rohdaten / Experte` ist fuer direkte Dateiimporte, Mapping-Korrekturen und Staging-Batches gedacht. Der Bereich ist gesperrt, bis Kursdaten oder eine Hauptquelle vorhanden sind oder der Expertenmodus explizit aktiviert wurde.

## KI/Fallback

- `local`: lokale heuristische Erstellung ohne API-Kosten
- `openai`: OpenAI wird verwendet, wenn ein API-Key eingerichtet ist
- `openai-review`: OpenAI plus interne Review-Pruefung
- `openai-review-repair`: OpenAI plus Review und Reparaturversuch bei Schemafehlern

OpenAI-Status, Fallback, Prompt-Pruefung, Golden Tests und Kostenabschaetzung bleiben im KI/Fallback-Schritt sichtbar. API-Keys und Rohtexte werden nicht angezeigt.
