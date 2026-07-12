# Erster ContentFactory-Testlauf

## Ziel

Pruefen, ob die ContentFactory lokal einen kleinen Kurscontainer erzeugen kann.

## Test 1: Java Einsteiger Local/Fallback

Einstellungen:

- Preset: Java Einsteiger
- ageRange: 16-20 oder mixed
- priorKnowledge: none
- learningLevel: intro
- courseType: java
- artifactMode: web-and-files
- Dauer: 1-2 Tage
- AI-Modus: local

Erwartung:

- Preflight gruen oder gelb mit nachvollziehbaren Warnungen
- einfache `.java`-Dateien
- kein Maven
- Aufgaben vorhanden
- Loesungen nur im Dozentenbereich
- Quiz vorhanden
- Standalone vorhanden
- Testprotokoll vorhanden
- Analysebericht vorhanden
- keine Secrets
- keine Loesungen im Teilnehmerbereich

## Test 2: Java Einsteiger OpenAI

Voraussetzung:

- OpenAI-Key lokal ueber Adminbereich importiert
- kleine Kostenwarnung aktiv
- AI-Modus: openai oder openai-review
- Prompt Quality Gate aktiv

Erwartung:

- OpenAI-Verbindung erfolgreich oder Fallback sauber dokumentiert
- aiMeta im Testprotokoll
- Prompt Contract dokumentiert
- Kostenabschaetzung sichtbar

## Test 3: SQL/phpMyAdmin Einsteiger

Einstellungen:

- Preset: SQL / phpMyAdmin Einsteiger
- priorKnowledge: none
- courseType: sql

Erwartung:

- SQL-Dateien
- phpMyAdmin README
- keine automatische SQL-Ausfuehrung
- Loesungen nur Dozentenbereich
