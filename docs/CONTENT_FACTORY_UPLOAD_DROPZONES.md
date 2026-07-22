# CourseForge Upload Dropzones

Die Uploadbereiche im CourseForge-Wizard sind als einheitliche Dropzones umgesetzt. Jede Zone kann per Klick oder per Drag-and-Drop verwendet werden und akzeptiert mehrere Dateien.

## Uploadbereiche

- Thematische Hauptquelle
- Unterrichtsmaterialien
- Aufgaben
- Loesungen
- Fragenpools / Quiz
- Projektmaterialien
- Quellcode
- Datenbank / SQL
- Assets / Medien
- Referenzliteratur / Fachquellen
- Sonstige Dateien
- ZIP-Gesamtpaket

## Mehrfachupload

Mehrfaches Droppen oder Auswaehlen ergaenzt die vorhandene Dateiliste. Dateien werden nicht unbeabsichtigt ersetzt. Einzelne Dateien koennen pro Uploadzone wieder entfernt werden.

Jedes Dateiobjekt dokumentiert Name, Pfad, Groesse, MIME-Typ, `lastModified`, Uploadbereich, Quelle (`drop` oder `picker`), Warnungen und Blockierungsstatus.

## Sicherheitsregeln

Blockierte Dateiendungen:

- `.exe`
- `.bat`
- `.cmd`
- `.ps1`
- `.msi`
- `.vbs`
- `.scr`
- `.com`

Blockierte Dateien werden nicht in die Auswahl uebernommen. Quellcode und SQL werden nie automatisch ausgefuehrt. Grosse Dateien zeigen eine Warnung.

## ZIP-Handling

ZIP-Dateien bleiben in allen Uploadbereichen erlaubt. Die eigentliche sichere Entpackung und Staging-Verarbeitung passiert im Import-Service. ZIP-Dateien werden nicht direkt in den Kurscontainer kopiert, ausser eine spaetere Zuordnung markiert sie ausdruecklich als auszulieferndes Archiv.

## Referenzliteratur

Referenzliteratur ist `reference-only`. Sie bleibt lokal in der Referenzbibliothek und wird nicht in den Kurscontainer exportiert. Reports und Protokolle duerfen keine Rohtexte, Chunks, `rawText` oder `textPreview` enthalten.

## UI-Verhalten

Jede Dropzone zeigt:

- Anzahl Dateien.
- Gesamtgroesse.
- Erlaubte Dateitypen.
- Warnungen.
- Letzte/ausgewaehlte Dateien.
- Duplikat-Hinweise.
- Entfernen-Buttons.

Die Dropzones sind per Tastatur fokussierbar und koennen auch ohne Drag-and-Drop per Klick genutzt werden.
