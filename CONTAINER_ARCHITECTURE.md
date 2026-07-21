# Containerarchitektur

Die Standalone-ContentFactory erzeugt lokale Kurscontainer aus Unterrichtsplänen und ergänzenden Materialien. Manifestvalidierung, Ablage, Import, Analyse, Generierung, Abschlussprüfung und Export liegen unter `desktop-app/app/lib/content-factory/`; frameworkunabhängige Regeln liegen in `packages/content-factory-core/`.

Ein Container besitzt ein validiertes Manifest, Katalogdateien, getrennte Dozenten- und Teilnehmerausgaben, einen Quellenplan sowie eine Standalone-Ansicht. Interne Pfade wie `dozent/` und `teilnehmer/` gehören ausschließlich zum erzeugten Containerformat und sind keine Plattformverzeichnisse des Repositorys.

Der Electron-Hauptprozess stellt nur ContentFactory-IPC bereit. Projekte werden im lokalen Electron-Benutzerdatenverzeichnis gespeichert; die frühere Plattform-Registry, Kursverwaltung und Rollenlogik sind nicht mehr Bestandteil der Anwendung.

Details enthält [docs/contentfactory-container-format.md](docs/contentfactory-container-format.md).
