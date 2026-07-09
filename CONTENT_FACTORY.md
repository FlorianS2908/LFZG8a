# ueTool_asSaaS ContentFactory

## Zweck

Die Content Factory ist das lokale Admin-Modul, mit dem Unterrichtscontainer vorbereitet werden. Sie kann bestehende Container duplizieren und Rohdaten importieren, zuordnen, validieren und als neuen Draft-Container speichern.

Alles bleibt lokal. Es gibt noch kein SaaS-Backend, keine Cloud-Synchronisierung und keine Online-Lizenzierung.

## Zugriff

Die Factory ist als Modul `content-factory` in der ModuleRegistry registriert und erscheint als Kachel nur fuer Benutzer mit `Admin` oder `SuperAdmin`. Ohne Login oder ohne Admin-Rolle blockiert die Electron-Main-Schicht den Zugriff.

## Container-Duplizierung

Beim Duplizieren wird der Quellcontainer nur gelesen. Das Original wird nicht veraendert. Der neue Container bekommt eine eindeutige ID, eine Route `/modules/{id}`, `sourceContainerId`, Version `0.1.0`, Status `draft` und ein eigenes Manifest.

Drafts erscheinen nicht auf der normalen Landingpage. Erst nach dem Veroeffentlichen mit `status: active` und `visibleInLauncher: true` wird daraus eine Kachel.

## Rohdatenimport

Dateien landen zuerst in einem Import-Batch. Erfasst werden Dateiname, Endung, Groesse, erkannter Typ, Zielbereichsvorschlag, Tagnummer, Vorschau sowie Warnungen und Fehler pro Datei.

Inhaltlich gelesen werden Textdateien wie `.json`, `.csv`, `.xml`, `.txt`, `.md`, `.html`, `.css`, `.js`, `.ts` und `.tsx`. Als Material/Asset oder Metadaten vorbereitet werden unter anderem `.xlsx`, `.xlsm`, `.pdf`, `.docx`, `.pptx`, Bilder, Medien und `.zip`.

## Mapping Und Validierung

Die Factory schlaegt Zielbereiche anhand von Dateinamen und Endungen vor. Vorschlaege koennen manuell ueberschrieben und gesperrt werden. Tagnummern werden aus Mustern wie `tag_01`, `tag01`, `tag-01`, `Tag 1`, `day_1` oder `day01` erkannt.

Validiert werden Containername, eindeutige ID, eindeutige Route, Manifestdaten, Inhalte, Zielbereiche, Tagnummern, doppelte Dateinamen, Lesefehler und Hinweise wie Loesungen ohne Aufgabenbezug. Fehler blockieren die Veroeffentlichung, Warnungen verlangen eine Bestaetigung.

## Zielstruktur

Erzeugte Container werden lokal unter dem App-Datenordner in `containers/{containerId}` abgelegt. Die Zielordner sind vorbereitet: `webvariants`, `tasks`, `solutions`, `quizzes`, `projects`, `materials`, `trainer-info`, `participant-materials`, `classbook`, `reports`, `assets`, `styles`, `scripts`, `documentation` und `other`.

## Erweiterbarkeit

Parser und Dateitypen sind zentral vorbereitet in `content-factory/file-type-rules.js`, `mapping-service.js`, `import-adapters.js` und `target-areas.js`. Spaeter koennen echte Excel-, DOCX-, PPTX-, PDF- oder ZIP-Parser sowie KI-gestuetzte Mapping-Vorschlaege ergaenzt werden. SaaS- und Mandantenfaehigkeit kann spaeter die lokale Storage-Schicht ersetzen oder synchronisieren.

## Rolle in der neuen Container-Architektur

Die ContentFactory bleibt Admin-Systemcontainer, wird aber schrittweise zur zentralen Container-Engine ausgebaut. Sie arbeitet kuenftig zusammen mit:

- lokaler Container-Registry unter `app/lib/container-registry/`
- Admin-Werkzeugkacheln unter `app/lib/modules/admin-tool-containers.js`
- generischer Admin-Tool-Konfiguration unter `app/lib/admin-tools/`

Zugehoerige Admin-Werkzeuge:

- `Container-Adapter / Legacy-Migration`: analysiert bestehende Legacy-Strukturen und erzeugt nicht destruktive Draft-Vorschlaege.
- `Import- & Dateianalyse`: klassifiziert Dateien, Quellcode, SQL, Assets und unbekannte Dateien.
- `Kurscontainer-Generator`: bereitet neue Kurscontainer mit Unterrichtsplan und Tagesstruktur vor.
- `Quiz-Builder`: erzeugt Quizcontainer oder kurstagbezogene Quizze.
- `Container-Export`: erzeugt saubere Pakete ohne Nutzerdaten oder Secrets.

Diese Werkzeuge sind nicht freigebbar und erscheinen nicht im Freigabezentrum.
