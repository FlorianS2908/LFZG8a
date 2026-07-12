# ContentFactory Guided UX

## Gefuehrter Modus

Der gefuehrte Modus ist der Standard. Neue Kurscontainer werden ueber den Assistenten erstellt. Der Assistent zeigt immer nur den aktuellen Schritt und erklaert Ziel, Pflichtangaben, optionale Angaben, typische Fehler und Ergebnis.

## Expertenmodus

Der Expertenmodus ist fuer direkte Dateiimporte, Import-Batches und technische Zuordnung gedacht. Er ersetzt nicht den Standardweg fuer neue Kurscontainer.

## Einheitliches Workflow-Prinzip

Alle Workflows zeigen:

- Was mache ich hier?
- Was brauche ich dafuer?
- Was passiert im naechsten Schritt?
- Was ist Pflicht?
- Was ist optional?
- Was ist erledigt?
- Was ist gesperrt?
- Was wird erzeugt?
- Welche typischen Fehler gibt es?
- Was ist der naechste sinnvolle Klick?

## Startseite

Die Startseite zeigt vier Wege:

- Neuen Kurscontainer erstellen
- Bestehenden Container verwalten
- Referenzbibliothek
- Expertenbereich

Der naechste empfohlene Schritt wird oben angezeigt.

## Plan-Wizard

Der Plan-Wizard nutzt den Workflow `create-course-container` mit zwoelf Schritten von Kursdaten bis Container-Draft. Schritte werden erst freigegeben, wenn die fachlichen Voraussetzungen erfuellt sind.

## Rohdaten / Expertenbereich

Rohdaten / Expertenimport ist ein Expertenbereich. Import-Batches sind zwischengespeicherte Dateiimporte; Mapping bedeutet Zuordnung der Datei zu einem Zweck.

## Referenzbibliothek

Referenzquellen bleiben local-reference-only. Sie duerfen nicht in Teilnehmermaterial oder Kurscontainer exportiert werden.

## KI/Fallback

`local` kostet nichts und nutzt lokale Heuristik. `openai`, `openai-review` und `openai-review-repair` nutzen OpenAI nur mit eingerichtetem API-Key. Fallback bleibt aktiv.

## Naechster-Schritt-Assistent

`getNextRecommendedAction(state)` empfiehlt den naechsten sinnvollen Klick, zum Beispiel Hauptquelle hochladen, Curriculum pruefen, Tagesentwuerfe erzeugen oder Preflight starten.
