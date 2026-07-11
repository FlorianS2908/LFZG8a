# ContentFactory Upload-Staging und ZIP-Import

Die ContentFactory verarbeitet produktive Uploads lokal im AppData-Bereich. Upload-Dateien werden nicht in das GitHub-Repository kopiert.

## Speicherorte

- Upload-Staging: `AppData/content-factory/staging/{batchId}/`
- Referenzbibliothek: `AppData/content-factory/reference-library/`
- Draft-Container: `AppData/content-factory/drafts/{containerId}/`

## Uploadbereiche

Alle Uploadbereiche akzeptieren mehrere Dateien und ZIP-Dateien:

- Unterrichtsplan
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

ZIP-Dateien werden in den Staging-Bereich kopiert und dort entpackt. Jede entpackte Datei wird einzeln importiert, klassifiziert, gehasht und kann manuell korrigiert, entfernt, blockiert oder einem Zielbereich und Tag zugeordnet werden. Die Original-ZIP-Datei bleibt als Quelle in den Metadaten dokumentiert.

## Sicherheitsregeln

- Zip-Slip-Pfade werden blockiert.
- ZIP-Bomben werden ueber Groessen- und Dateizahlgrenzen abgefangen.
- Maximale Einzeldatei: 250 MB.
- Maximaler Upload-Batch: 2 GB.
- Maximale entpackte ZIP-Groesse: 3 GB.
- Maximale Dateien pro Batch: 1.000.
- Maximale ZIP-Verschachtelung: 2 Ebenen.
- `.env`, `.git`, `node_modules`, ausfuehrbare Dateien und Secrets werden fuer Export/Verwendung blockiert oder ignoriert.
- Quellcode und SQL werden nie ausgefuehrt.
- ZIP-Dateien werden nicht direkt in einen Kurscontainer kopiert, ausser sie werden ausdruecklich als auszulieferndes Archiv markiert.
- Referenzliteratur bleibt `local-reference-only` und wird nicht in Kurscontainer oder Teilnehmerexports kopiert.

## Validierung

Die Importliste zeigt pro Datei Status, Warnungen, Hash-Duplikate, ZIP-Quelle und ZIP-Pfad. Uploadkarten zeigen Dateianzahl, Speicherverbrauch und ZIP-Warnungen.
