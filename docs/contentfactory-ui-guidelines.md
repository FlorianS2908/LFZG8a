# UI-Richtlinien der ueTool ContentFactory

## Informationsarchitektur

Die normale Hauptnavigation besteht ausschließlich aus Start, Kurs erstellen, Meine Kurscontainer, Referenzquellen und Einstellungen. Technische Werkzeuge stehen unter dem standardmäßig geschlossenen Eintrag **Expertenfunktionen**. Schnellzugriffe dürfen wichtige Aufgaben hervorheben, aber nicht die gesamte Navigation duplizieren.

Die Kurserstellung zeigt sechs Phasen: Grundlagen, Unterrichtsplan, Inhalte und Materialien, Kursstruktur, Generierung sowie Prüfen und Exportieren. Interne Teilschritte bleiben in der Fachlogik erhalten. Fortschritt wird immer mit Phase, Textstatus und Symbol vermittelt, nie nur mit Farbe.

## Design-Tokens

Die Variablen in `content-factory.css` sind verbindlich. Primärfarbe `#075985`, starker Akzent `#0c4a6e`, helle Akzentfläche `#e0f2fe`, Text `#172033`, Sekundärtext `#526176`, Trennlinie `#cbd5e1`, Canvas `#f5f7fa`. Abstände folgen 4, 8, 12, 16, 24 und 32 Pixeln. Der Standardradius beträgt 10 Pixel. Neue Einzelwerte sind nur mit begründeter visueller Funktion zulässig.

Typografie nutzt die Systemschrift. Pro Ansicht gibt es genau eine Hauptüberschrift unterhalb des Produktnamens. Lesetexte bleiben möglichst unter 65 Zeichen pro Zeile. Karten haben keine dekorativen Schatten; Hierarchie entsteht durch Abstand, Rahmen und Überschriften.

## Aktionen und Formulare

Pro Ansicht gibt es höchstens eine hervorgehobene Primäraktion. Sekundäraktionen ergänzen sie, Tertiäraktionen dienen Navigation oder Aktualisierung, destruktive Aktionen verlangen eine Bestätigung. Interaktive Ziele sind mindestens 44 Pixel hoch und besitzen einen sichtbaren Fokusindikator.

Jedes Eingabefeld benötigt ein dauerhaft sichtbares Label. Verwandte Felder werden mit `fieldset` und `legend` gruppiert. Pflicht und optional werden ausgeschrieben. Hilfetexte erhalten eine ID und werden mit `aria-describedby` verbunden. Fehlermeldungen erklären Problem und Lösung, stehen am Feld und werden in einer fokussierbaren Zusammenfassung angekündigt. Eingaben bleiben bei Fehlern erhalten.

## Status, Uploads und Dialoge

Statusmeldungen verwenden Text, Symbol und Farbe. Laufende oder abgeschlossene Vorgänge werden über `role="status"` beziehungsweise `aria-live="polite"` angekündigt; blockierende Fehler über eine fokussierbare Fehlerzusammenfassung. Die Begriffe sind: Erfolg, Hinweis, Warnung, Fehler und In Bearbeitung.

Uploadbereiche nennen Zweck, Pflichtstatus, unterstützte Typen und Sicherheitsverhalten. Der Unterrichtsplan wird als Excel-Hauptquelle hervorgehoben; `.xls`, `.xlsx` und `.xlsm` werden nur gelesen, Makros nie ausgeführt. Drag-and-drop hat immer einen sichtbaren Dateiauswahlknopf und eine Tastaturalternative. Dateien zeigen Name, Größe, Typ, Status, Warnung und Entfernen-Aktion.

Destruktive Dialoge nennen das betroffene Objekt und die Auswirkung. Beim Öffnen wandert der Fokus in den Dialog, Tab bleibt darin, Escape bricht ab und nach dem Schließen kehrt der Fokus zum Auslöser zurück.

## Empty States und Expertenfunktionen

Ein Empty State beschreibt den Zustand und bietet genau eine passende Handlung, etwa „Noch keine Kurscontainer vorhanden. Erstelle deinen ersten Kurscontainer.“ Expertenfunktionen verwenden verständliche Hauptbegriffe; technische Namen dürfen nur ergänzend erscheinen. Bevorzugt werden Hauptquelle, Art der Duplizierung, Abschlussprüfung, Kursentwurf, lokale Verarbeitung, Importvorgang, temporärer Importbereich und Referenztests.

## Accessibility und responsive Desktopansicht

Die Oberfläche orientiert sich an WCAG 2.2 AA. Sie besitzt Skip-Link, Landmarken, logische Überschriften, native Bedienelemente, sichtbaren Fokus, `aria-current` für aktive Navigation und Textalternativen für Symbole. Keine positive Tabreihenfolge, keine reine Farbcodierung und keine ungeprüfte HTML-Injektion. Dynamisches Rendering stellt den Fokus auf den neuen Hauptbereich oder das erste fehlerhafte Feld zurück. `prefers-reduced-motion` wird respektiert.

Bei 1024×720 bleibt die Oberfläche vollständig bedienbar. Formulare wechseln bei Bedarf auf eine Spalte, Tabellen scrollen innerhalb ihres Bereichs, und die Gesamtansicht erzeugt keinen horizontalen Scrollbalken. Ab 800 Pixeln wird die Seitennavigation zur horizontalen Desktop-Kompaktnavigation.

## Textkonventionen

Sichtbare Texte verwenden korrektes UTF-8 und aktive deutsche Sätze. „Kursentwurf“ ersetzt „Container-Draft“, „Abschlussprüfung“ ersetzt „Preflight“, „Dateien importieren“ ersetzt „In Staging importieren“. Gleiche Funktionen tragen überall dieselbe Bezeichnung. Interne IDs und Implementierungsdetails erscheinen nicht im normalen Modus.
