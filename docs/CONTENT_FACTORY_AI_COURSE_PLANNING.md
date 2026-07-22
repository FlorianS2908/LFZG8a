# KI-Dokumentanalyse und Kursstruktur-Review

## Architektur

Der bestehende CourseForge-Electron-Wizard bleibt die Oberfläche. Dateien werden im Renderer ausgewählt, aber ausschließlich über eng benannte Preload-/IPC-Aufrufe an den Main-Prozess übergeben. `course-planning-service.js` extrahiert Dokumente, speichert versionierte Kursprojekte unter dem kompatibel benannten `content-factory`-Datenverzeichnis und ruft den vorhandenen `OpenAIProvider` auf. API-Schlüssel bleiben in `safeStorage` beziehungsweise der Main-Prozess-Umgebung.

Der produktive Planungsablauf verwendet keinen lokalen oder simulierten Fallback. Ohne konfigurierte OpenAI-Verbindung werden Dokumentanalyse und Kursplanung mit einer Einrichtungsnachricht beendet. Automatisierte Tests führen keine Netzwerkanfragen aus.

Wizard-Reihenfolge:

1. Kursdaten
2. Hauptquelle
3. Zielgruppe und bestätigter Planungsrahmen
4. gemeinsame KI-Dokumentanalyse und UE-Kursplanung
5. Analyse- und Struktur-Review mit Freigabe
6. Didaktisches Konzept
7. bestehende Container-, Material-, Generierungs- und Prüfschritte

Kursprojekte speichern Dokumentmetadaten, Analyseversionen, zusammengeführtes Wissen, Planungsrahmen, alle Planungsentwürfe und einen unveränderlichen freigegebenen Snapshot. Alte Projekte werden beim Lesen um sichere Defaultwerte ergänzt. Neuplanung erzeugt stets eine neue `planningVersion`.

Dokumentanalysen folgen einem kanonischen Schema Version 1. Objektfelder wie Kategorie und Zusammenfassung werden strukturiert gespeichert; sämtliche Sammlungsfelder sind Arrays. Eine zentrale Normalisierung korrigiert ausschließlich fehlende optionale Arrays, `null`, eindeutig erkennbare Einzelobjekte sowie alte Stringformen für Kategorie und Zusammenfassung. Danach erfolgt immer eine erneute strikte Validierung. Fehler werden je Dokument gespeichert und stoppen erfolgreiche andere Dokumente nicht.

Die Planung ist fachneutral. Fachbegriffe werden nur aus Quellen und Benutzervorgaben übernommen. Jede UE kann `materialRequirements` mit Materialart, Herkunft, Zielformat, Werkzeugbedarf, Automatisierbarkeit und Prüfbedarf vorschlagen. Konkrete Dateiformate werden über die registrierbare Artifact-Generator-Schnittstelle ergänzt; HTML/CSS ist lediglich eine optionale Implementierung.

Der Chromium-Cache wird vor Erzeugung des Browserfensters unter `%LOCALAPPDATA%\CourseForge\Cache` konfiguriert. Frühere Electron-`userData`-Bestände werden beim ersten Start idempotent und ohne Überschreiben nach CourseForge kopiert.

## Manueller Test mit dem XLSM-Wochenplan

1. Abhängigkeiten im Verzeichnis `desktop-app` installieren.
2. `.env.example` nach `.env` kopieren.
3. `OPENAI_API_KEY`, `OPENAI_MODEL`, optional `OPENAI_TIMEOUT_MS` und `OPENAI_MAX_RETRIES` setzen. Alternativ den Schlüssel über die KI-Einstellungen sicher importieren.
4. Anwendung mit `CourseForgeStart.cmd` oder `pnpm --dir desktop-app start` starten.
5. Neues Kursprojekt anlegen und `Wochenplan_FIAE_LF-ZQ8A.xlsm` als verbindlichen Unterrichtsplan mit hoher Priorität hochladen.
6. Zielgruppe und Vorkenntnisse erfassen. Für den Beispielrahmen 5 Tage, 9 UE/Tag, 45 Minuten, 08:30–16:30 und die vier vorgegebenen Pausen eintragen.
7. Planungsrahmen speichern, rechnerische Hinweise prüfen und Abweichungen ausdrücklich bestätigen.
8. „Dokumente analysieren und UE-Struktur erstellen“ ausführen. XLSM wird als ZIP/XML gelesen; VBA-Makros werden weder geladen noch ausgeführt.
9. Fortschritt und getrennte Dokumentzustände beobachten; fehlerhafte Dokumente können einzeln erneut analysiert werden.
10. Im Struktur-Review Quellen, Herkunftsbadges, Konflikte und 45 beziehungsweise nach Reserven tatsächlich planbare UE kontrollieren; mindestens eine Einheit bearbeiten und speichern.
11. Kursstruktur ausdrücklich freigeben. Erst danach wird die Didaktik zugänglich.
12. Anwendung neu starten und das Projekt über „Gespeichertes Kursprojekt öffnen“ wiederherstellen.

## Grenzen

XLSX/XLSM besitzt die detaillierteste Extraktion. Bestehende PDF-, PPTX-, DOCX-, EPUB-, HTML-, TXT- und Markdown-Extraktoren werden über die gemeinsame Outline-Schnittstelle angebunden. Die Review-Tabelle unterstützt derzeit das Bearbeiten von Thema, Inhalt und vorläufigem Lernziel; komplexe Split-/Merge- und Tag-Neuplanungsaktionen sind als nächste Erweiterung vorgesehen.
