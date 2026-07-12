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
