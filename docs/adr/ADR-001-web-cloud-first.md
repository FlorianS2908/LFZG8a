# ADR-001: Web-/Cloud-First fuer PLOGLAN

## Status

Accepted

## Entscheidung

PLOGLAN wird kuenftig web-/cloud-first weiterentwickelt.

Die bestehende Electron-App bleibt zunaechst als Demo-, Legacy- und Shell-Option erhalten. Sie wird nicht geloescht und nicht destruktiv migriert.

Die fuehrende Architektur fuer den spaeteren Mehrbenutzerbetrieb ist:

- Web-Frontend
- zentrale API
- zentrale Datenbank
- Rollen- und Rechtemodell
- Kursinstanzen
- zentrale Freigaben
- Audit-Log
- Sync-Faehigkeit

## Begruendung

Die Kursverwaltung soll auf mehreren Clients laufen. Dozenten, Teilnehmer, Admins und Kursverwaltung muessen denselben zentralen Kursstand sehen und bearbeiten koennen.

Ein lokales SQLite-/Electron-first-Modell wuerde spaeter bei Multi-Tenancy, Authentifizierung, Sync und zentraler Datenhaltung zu einem grossen Neubau fuehren. Deshalb wird neue fachliche Kernlogik in wiederverwendbare Packages gelegt, die spaeter von Web-App, API und optional Electron-Shell genutzt werden koennen.

## Konsequenzen

- Neue fachliche Kernlogik entsteht in `packages/`.
- `desktop-app/` bleibt als bestehender Referenz-, Demo- und Legacy-Stand erhalten.
- ContentContainer und CourseInstance werden fachlich getrennt.
- Kursfreigaben, Einstellungen, Audit und Sync werden an CourseInstances modelliert.
- Die Migration erfolgt schrittweise.
- In diesem Schritt entsteht noch keine vollstaendige Web-App, API, PostgreSQL-Anbindung oder Live-WebSocket-Schicht.
