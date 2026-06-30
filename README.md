# LF ZQ8a - Modernes CSS und Responsive Layouts

Dieses Paket ersetzt den bisherigen LESS-Schwerpunkt durch modernes CSS ohne Präprozessor. Die Unterlagen sind so aufgebaut, dass die Teilnehmenden erst die Grundlagen sehen und diese anschließend direkt im Browser umsetzen.

## Inhalt

- `index.html` - zentrale Startseite für das Lernfeld
- `00_Leitfaden/` - Wochenplan, Dozentenleitfaden, Bewertungsraster, Checkliste und CSS-statt-LESS-Mapping
- `Tag_01_...` bis `Tag_05_...` - Webvarianten, Teilnehmeraufgaben, Dozentenlösungen, Starter und Musterlösungen
- `Projekte/` - CSS-only-Projekte als Übungs- und Abschlussmaterial
- `assets/graphics/` - SVG-Grafiken für Erklärung und Wiederholung
- `quiz/` - JSON-Fragenpools für Wiederholung und Lernzielkontrolle
- `quiz/tag_pools/` - je Tag 25-Fragen- und 50-Fragen-Pool inklusive eingebettetem QuizTool

## Didaktische Leitplanken

- Kein LESS, kein SCSS und kein Bootstrap-Zwang.
- Mobile First wird als Vorgehensweise geübt und nicht nur als Begriff genannt.
- CSS Custom Properties ersetzen die frühere Variablen-Idee aus LESS.
- Komponentenklassen und kleine Utilities ersetzen die Mixin-Idee.
- Flexbox wird für eindimensionale Ausrichtung genutzt.
- Grid wird für zweidimensionale Layouts genutzt.
- Responsive Verhalten wird mit Media Queries, `clamp()`, `min()`, `max()` und `minmax()` aufgebaut.
- Lokale Webfonts werden konzeptionell vorbereitet. Schriftdateien sind nicht enthalten, weil Lizenzen im Unterricht bewusst geprüft werden sollen.

## Hinweise zur Nutzung

Die Dateien können direkt im Browser geöffnet werden. Für die Bearbeitung reicht ein Editor wie VS Code. Sinnvoll ist es, nach jedem Abschnitt kurz in den DevTools zu prüfen, welche CSS-Regel tatsächlich greift.


## Fragenpools pro Tag

Im Ordner `quiz/tag_pools/` liegen zehn neue JSON-Fragenpools. Für jeden Unterrichtstag gibt es einen Kurztest mit 25 Fragen und 35 Minuten sowie einen Haupttest mit 50 Fragen und 70 Minuten. Die Pools enthalten Code-Lesen-und-Verstehen, Post-it-Zuordnungen, Single Choice, Multiple Choice und alle drei Schwierigkeitsstufen. Zusätzlich liegt dort `QuizTool_Timer_v9_LFZQ8a_CSS_Pools.html`, in dem alle Tagespools bereits eingebunden sind.
