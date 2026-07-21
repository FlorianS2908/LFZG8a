# Standalone-Bestandsanalyse

Stand: 21.07.2026, Branch `agent/contentfactory-standalone`.

Der produktive Electron-Einstieg lädt direkt `factory.html`. Main und Preload referenzieren ausschließlich ContentFactory-Services. Frühere Kursmaterialien, Plattformrenderer, Rollen-/Adminservices, Labs, SaaS-Platzhalter und Parallelpakete wurden nach Referenzprüfung entfernt.

Erhalten bleiben `desktop-app/app/lib/content-factory/`, `json-store.js`, `env/`, der ContentFactory-Renderer, das Ploglan-Logo und `packages/content-factory-core/`. Interne Ausgabeordner mit Bezeichnungen für Dozenten und Teilnehmer sind Bestandteil generierter Kurscontainer, nicht der Anwendungshülle.

Der unversionierte Ordner `Standalone/` ist leer und wird nicht gebaut oder paketiert. Seine lokale Entfernung wurde durch OneDrive-Dateirechte verhindert; er hat keinen Einfluss auf Repository oder Build.

Die externe Datei `01-Wochenplan_FIAE_LF-ZQ8A.xlsm` ist unter dem angegebenen Linux-Scratch-Pfad in dieser Windows-Umgebung nicht verfügbar. `.xlsm`-Akzeptanz, Parserpfad und Makroschutz werden deshalb statisch und durch synthetische Fachtests geprüft.
