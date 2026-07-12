# ContentFactory Didactic Course Profiles

Die ContentFactory nutzt didaktische Kursprofile, damit Tagesentwuerfe nicht nur nach Kurstyp, sondern auch nach Unterrichtslogik erzeugt und geprueft werden.

## Profile

Die Profile liegen unter `desktop-app/app/lib/content-factory/didactics/` und werden ueber `didactic-profile-service.js` bereitgestellt.

Aktuelle Profile:

- `explain-demo-practice`: Erklaeren, Demo, Ueben
- `problem-first`: Problem zuerst
- `project-based`: Projektbasiert
- `worked-example-fading`: Musterbeispiel mit Fading
- `exam-training`: Pruefungstraining
- `station-learning`: Stationenlernen
- `flipped-classroom`: Flipped Classroom
- `guided-coding`: Guided Coding

Jedes Profil beschreibt `teachingModel`, `lessonFlow`, `demoStrategy`, `releaseStrategy`, `taskProgression`, `supportLevel`, `assessmentMode`, `reflectionMode`, Sozialform und Sicherheitsvorgaben.

## Wirkung

Das gewaehlte Profil wird an Curriculum-Analyse, PromptBuilder, PromptLinter, Local/Fallback-Provider, Output-Review und Draft-Erstellung uebergeben.

Generierte Drafts enthalten:

- `catalog/didactic-profile.json`
- `catalog/release-plan.json`
- `catalog/days.json` mit `didacticFlow` und `releasePlan` je Tag
- Analysebericht mit Profil, Lesson Flow, Release-Strategie und Reflexionsmodus
- Testprotokollgruppe `Didaktik`

## Sicherheit

Didaktische Profile aendern keine bestehenden Sicherheitsregeln:

- Keine API-Keys oder Secrets im Renderer, Prompt, Report oder Testprotokoll.
- Keine Originalbuchtexte, Referenzchunks oder `textPreview` in Prompts oder Reports.
- Keine Loesungen im Teilnehmerbereich.
- Keine EXE/BAT/CMD/PS1.
- SQL wird nur als Datei erzeugt und niemals automatisch ausgefuehrt.
- Demos bleiben getrennt von Teilnehmerfreigaben und sind standardmaessig dozent-only.

## Tests

`desktop-app/tests/content-factory.test.js` prueft Profil-Presets, automatische Vorschlaege, Prompt-Metadaten, Draft-Katalogdateien, Analysebericht und Testprotokoll.

## Dozenten-Fahrplan

Jeder Tagesentwurf enthaelt ein `teacherRunbook`. Der Fahrplan ist dozent-only und wird im Container als `catalog/teacher-runbooks.json` sowie pro Tag als `dozent/tag_XX/unterrichtsablauf.html` abgelegt.

Der Fahrplan beschreibt:

- Tagesphasen mit Zeitansatz.
- Konkrete Aktion des Dozenten und erwartete Aktion der Teilnehmenden.
- Moderationsfragen je Phase.
- Demo-Schritte und Demo-Referenzen.
- Freigabe-Schritte passend zur Release-Strategie.
- Typische Fehler.
- Differenzierung fuer schwaechere und staerkere Teilnehmende.
- Checkpoints, Reflexion und Fallback, falls Demo oder Tool nicht funktioniert.

Teilnehmerkatalog und Teilnehmerseiten duerfen keinen Link auf `unterrichtsablauf.html`, keinen `teacherRunbook`-Eintrag und keine Dozentenhinweise enthalten.

## Gute Ergebnisse sicherstellen

Die ContentFactory nutzt mehrere Pruefpunkte:

- Fit Score: bewertet, ob Kursziel, Zielgruppe, Kurstyp und Profil zusammenpassen.
- Didactic Quality Gate: prueft LessonFlow, ReleasePlan, Demos, Aufgabenprogression, Loesungsschutz und teacherRunbook.
- Testprotokoll: dokumentiert Fahrplan, Moderationsfragen, Demo-/Freigabe-Schritte, typische Fehler, Differenzierung und Checkpoints.
- Analysebericht: zeigt Profilwahl, Fit Score, Alternativen, Quality-Gate-Warnungen und Fahrplan-Status.
- Manuelle Pruefung: Dozent prueft fachliche Richtigkeit, Timing, Freigaben und ob Demos tatsaechlich zur Lerngruppe passen.

Profilwahl sollte begruendet werden. Weicht die Auswahl von der Empfehlung ab, dokumentiert der Analysebericht die Abweichung und die wichtigsten Alternativen.
