# SaaS-Foundation

Dieses Fundament bereitet PLOGLAN fuer eine Web-/Cloud-first-Architektur vor, ohne die bestehende Electron-App zu entfernen oder bestehende HTML/CSS-/LFZQ8a-Dateien zu verschieben.

## Warum Web-/Cloud-First

Der spaetere Betrieb braucht mehrere Clients mit demselben zentralen Kursstand: Kursverwaltung, Admin, Dozent und Teilnehmer. Eine zentrale API und Datenbank sind dafuer die fuehrende Architektur. Electron kann weiterhin als Demo-, Legacy- oder Shell-Option bestehen bleiben.

## Projektstruktur

- `apps/web`: Platzhalter fuer das spaetere Web-Frontend.
- `apps/api`: Platzhalter fuer die spaetere zentrale API.
- `packages/domain`: zentrale Domain-Modelle, Rollen, Fehler und Repository-Interfaces.
- `packages/course-management`: Services fuer Kursinstanzen, Mitgliedschaften, Container-Zuweisungen, Freigaben und Sichtbarkeit.
- `desktop-app`: bleibt unveraendert als bestehende Electron-App-Struktur bestehen.

## ContentContainer vs. CourseInstance

Ein `ContentContainer` ist eine Vorlage oder ein Inhaltscontainer, zum Beispiel `HTML/CSS`, `LF05`, `SQL Grundlagen` oder ein Quiz.

Eine `CourseInstance` ist ein echter laufender Kurs, zum Beispiel `HTML/CSS Kurs Gruppe B` oder `LF05 FIAE September 2026`.

Kurskacheln werden spaeter nicht mehr direkt an Nutzer vergeben. Sie ergeben sich aus:

1. User ist aktives CourseMember.
2. CourseInstance hat aktive CourseContainerAssignments.
3. ContentContainer ist aktiv und assignable.

## Rollen

- `participant`: Teilnehmer im Kurs.
- `teacher`: Dozent im Kurs.
- `admin`: Administration fuer Systemwerkzeuge.
- `super_admin`: erweiterte Administration.
- `course_manager`: Kursverwaltung fuer Kursanlage und Zuordnung.

## Zentrale Entitaeten

- `User`
- `Role`
- `UserRole`
- `Department`
- `ContentContainer`
- `CourseInstance`
- `CourseMember`
- `CourseContainerAssignment`
- `CourseReleaseState`
- `CourseSettings`
- `AuditLogEntry`
- `SyncEvent`

## Sichtbarkeitslogik

Die `CourseVisibilityService` berechnet sichtbare Kurskacheln aus User, Kursmitgliedschaft, Kurs-Container-Zuweisung und ContentContainer. Teilnehmer sehen nur aktive Kurse, in denen sie participant sind. Dozenten sehen nur aktive Kurse, in denen sie teacher sind. Admin-Werkzeuge werden nicht als Kurskacheln berechnet.

## ReleaseState-Prinzip

Freigaben sind pro CourseInstance und ContentContainer gespeichert. Ein Dozent kann ReleaseKeys seiner eigenen Kurse freigeben oder sperren. Teilnehmer sehen nur freigegebene ReleaseKeys. Loesungen duerfen nie in Teilnehmeransichten erscheinen.

## Audit und Sync

Fachliche Aenderungen erzeugen vorbereitete `AuditLogEntry`- und `SyncEvent`-Eintraege. Es gibt noch keine Live-WebSocket-Implementierung; die Events bilden die Grundlage fuer spaetere API- und Sync-Schichten.

## Bewusst noch nicht umgesetzt

- keine vollstaendige Web-App
- keine vollstaendige API
- keine echte Authentifizierung
- keine PostgreSQL-Anbindung
- keine Live-WebSockets
- keine grosse UI-Migration
- keine Entfernung von Electron
- keine destruktive Migration bestehender Kacheln
