# Container Architecture

## Unterrichtscontainer

Ein Unterrichtscontainer beschreibt ein Unterrichtsmodul mit Manifest, Routen, Materialien, Assets, Aufgaben, Loesungen und Quizdaten. Er ist die lokale Vorstufe fuer die spaetere ueTool_asSaaS ContentFactory. Die ContentFactory kann solche Container spaeter duplizieren oder aus Rohdaten neu erzeugen.

## Transformierte Kachel

Die bisherige HTML/CSS-Kachel, historisch LFZQ8a, wurde als erster Container `lfzq8a` modelliert. Die bestehenden Dateien bleiben an ihren bisherigen Orten, damit vorhandene HTML-Dateien, Assets, Dozentenview, Kursview, Teilnehmeransicht, Aufgaben, Loesungen und lokale Pfade weiter funktionieren.

Die Containerbeschreibung liegt unter:

- `desktop-app/app/lib/modules/lfzq8a-container.js`
- `desktop-app/app/lib/modules/module-registry.js`
- `desktop-app/app/lib/modules/module-types.js`

Die alte Route `/lfzq8a` ist als Legacy-Route im Container dokumentiert. Die neue logische Route ist `/modules/lfzq8a`. Innerhalb der Electron-App oeffnet die Route weiterhin die bestehende Kursfunktion ueber `openCourseFromWorkspace()`.

## Manifest

Das Manifest enthaelt unter anderem:

- `id`, `name`, `description`, `category`, `icon`, `route`
- `visibleInLauncher`
- `status`
- `version`
- `containerType`
- `tags`
- optionale Felder fuer `requiredPermissions`, `requiredLicense`, `sourceContainerId`

Der erste Container ist `containerType: "learning-content"` und `status: "active"`.

## ModuleRegistry

Die `ModuleRegistry` kann Module registrieren und lesen:

- `registerModule(module)`
- `getAllModules()`
- `getVisibleLauncherModules()`
- `getModuleById(id)`
- `getActiveModules()`
- `getModulesByCategory(category)`

Die Landingpage liest sichtbare aktive oder geplante Module aus der Registry. Die HTML/CSS-Kachel wird dadurch nicht mehr hart im HTML verdrahtet, sondern aus dem Manifest erzeugt.

## Lokaler Admin-Login

Beim Start wird ein lokaler Login angezeigt. Der initiale Admin wird automatisch angelegt, falls er noch nicht existiert:

- E-Mail: `admin@admin.de`
- Initialpasswort: `$$Klaus2908$$`
- Rollen: `SuperAdmin`, `Admin`
- `isProtected: true`

Die lokale MVP-Authentifizierung wird in JSON-Dateien unter dem Electron-`userData`-Ordner gespeichert. Sie ist bewusst lokal und kann spaeter durch echte Auth/API, Rollen, Rechte, Organisationen und SaaS-Lizenzen ersetzt werden.

Das Passwort wird nicht im Klartext gespeichert. Die App nutzt PBKDF2-SHA256 mit Salt und hoher Iterationszahl aus Node `crypto`. Geschuetzte Benutzer koennen nicht geloescht oder deaktiviert werden. Der initiale Admin bleibt aktiv und behaelt mindestens die Admin-Rolle.

## Lokale Daten

Mindestens diese Dateien werden im lokalen App-Datenordner gepflegt:

- `users.json`
- `profiles.json`
- `session.json`
- bestehend weiterhin `settings.json`, `participant-releases.json`, `task-releases.json`, `participants.json`

## Spaetere Erweiterung

Weitere Kacheln koennen transformiert werden, indem ein neuer Container analog zu `lfzq8a-container.js` angelegt und in der `ModuleRegistry` registriert wird. Die spaetere Content Factory kann diese Containerstruktur nutzen, um Container zu kopieren, anzupassen oder aus Rohdaten zu erzeugen.

## Einheitliches Manifest-Schema

Alle statischen und kuenftig erzeugten Container verwenden ein gemeinsames Manifest. Pflicht- und Normalisierungsfelder werden in `desktop-app/app/lib/modules/module-types.js` validiert:

- technische ID: `id`
- sichtbarer Name: `displayName` / `name`
- fachlicher Name: `courseName`
- fachliche ID: `courseId`
- Fachbereich: `department` mit `FIAE`, `FISI`, `KABUE`, `KITS`, `ALLGEMEIN`
- Typen: `category` und `containerType`
- Sichtbarkeit: `visibleInLauncher`, `status`, `assignable`, `allowedRoles`
- Herkunft und Export: `sourceContainerId`, `storageMode`, `standaloneEntry`, `exportable`, `legacyRoutes`

Admin-Container muessen `category: "admin"`, `containerType: "system"`, `department: "ALLGEMEIN"` und `assignable: false` besitzen. Kurscontainer wie `HTML/CSS` verwenden `category: "course"`, `containerType: "learning-content"` und bleiben fuer Dozenten/Teilnehmer freigebbar.

## Lokale Container-Registry

Die lokale Registry fuer erzeugte und importierte Container liegt unter:

- `desktop-app/app/lib/container-registry/container-id-service.js`
- `desktop-app/app/lib/container-registry/container-metadata-store.js`
- `desktop-app/app/lib/container-registry/container-repository.js`
- `desktop-app/app/lib/container-registry/container-registry-service.js`

Sie nutzt ein Repository-Pattern. Aktuell speichert sie JSON unter dem lokalen App-Datenordner in `containers/container-index.json` und `containers/archived-containers.json`. IDs und `courseId` werden auf Kollisionen geprueft. Bei Bedarf erzeugt der ID-Service Vorschlaege wie `lf05-fiae`, `lf05-fiae-2` oder `html-css-fiae`.

## ContentContainer vs. CourseInstance

Die Architektur trennt Inhalt und laufenden Kurs:

- `ContentContainer`: fachlicher Inhalt oder Vorlage, z. B. `HTML/CSS`, LF05, Java Grundlagen, Quizcontainer.
- `CourseInstance`: konkrete Kursdurchfuehrung, z. B. `HTML/CSS Kurs Gruppe B`.

Ein ContentContainer kann mehreren CourseInstances zugeordnet werden. Sichtbare Kurskacheln entstehen dadurch nicht mehr nur aus einer Benutzereigenschaft, sondern aus:

```text
User ist Mitglied in CourseInstance
CourseInstance hat ContentContainer
ContentContainer ist aktiv und freigebbar
=> User sieht Kurskachel
```

Die Entwicklungsimplementierung liegt unter `desktop-app/app/lib/course-management/` und nutzt ein Repository-/Service-Pattern:

- `central-course-store.js`
- `course-management-repository.js`
- `course-management-service.js`
- `course-management-types.js`

Aktuell speichert der Store lokal als JSON unter `central-course-data/`. Die Struktur ist auf eine spaetere zentrale API mit PostgreSQL/SQLite vorbereitet.

## Kursverwaltung

Die vier Rollen/Clients sind:

- Teilnehmer
- Dozent
- Admin
- Kursverwaltung (`course_manager`)

Die Kachel `course-management` ist nicht freigebbar und sichtbar fuer `course_manager`, `Admin` und `SuperAdmin`. Kursverwaltung sieht nicht automatisch ContentFactory, Container-Adapter, Test-Center oder andere Admin-Systemtools.

Die Kursverwaltung kann:

- CourseInstances anlegen
- Fachbereich und Kursstatus setzen
- Dozenten und Teilnehmer ueber `course_members` zuordnen
- ContentContainer ueber `course_container_assignments` zuordnen
- SyncEvents und AuditLog anzeigen
- Optimistic-Locking-Konflikte ueber `revision` erkennen

Die Renderer-Seite ist `desktop-app/app/renderer/tool-center/course-management.html`.

## Zentrale Datenmodelle

Die vorbereitete zentrale Datenstruktur enthaelt:

- `users`
- `roles`
- `user_roles`
- `departments`
- `content_containers`
- `course_instances`
- `course_container_assignments`
- `course_members`
- `course_release_states`
- `course_settings`
- `sync_events`
- `audit_log`

Jede relevante Aenderung schreibt ein SyncEvent und einen AuditLog-Eintrag mit Actor, Action, Entity, Before/After, Timestamp und ClientId.

## ReleaseStates und Dozentenfreigaben

Dozenten steuern Teilnehmerinhalte pro CourseInstance und ContentContainer ueber `course_release_states`. Ein Dozent darf nur eigene Kurse freigeben. Teilnehmer erhalten nur freigegebene ReleaseKeys; Loesungs-Keys werden fuer Teilnehmeransichten gefiltert.

## Sync und Konflikte

Der aktuelle Sync-Unterbau speichert Aenderungen in `sync_events`. Damit ist ein spaeterer WebSocket-, SSE- oder Polling-Fallback vorbereitet. Entitaeten wie CourseInstance, CourseMember, ContainerAssignment und ReleaseState tragen `revision`/`updatedAt`. Speichern mit veralteter Revision erzeugt einen Konflikt und gibt den aktuellen Stand zurueck.

## Admin-Werkzeugcontainer

Zentrale Transformations-, Import-, Export-, KI-, Test- und Diagnosefunktionen sind als eigene Admin-Systemcontainer registriert:

- `container-adapter`
- `import-analysis`
- `course-generator`
- `quiz-builder`
- `container-export`
- `ai-provider-config`
- `test-center`
- `system-diagnostics`

Die Container werden in `desktop-app/app/lib/modules/admin-tool-containers.js` erzeugt. Die Logik liegt nicht in der UI, sondern in Services unter `desktop-app/app/lib/admin-tools/`:

- `admin-tool-registry.js`
- `admin-tool-config-store.js`
- `admin-tool-guide-service.js`
- `admin-tool-runner.js`

Alle Admin-Werkzeuge sind nur fuer `Admin`/`SuperAdmin` sichtbar, nie freigebbar und erscheinen nicht im Freigabezentrum. Geoeffnet werden sie ueber die generische Seite `desktop-app/app/renderer/tool-center/admin-tool.html`.

## Generische Admin-Tool-Oberflaeche

Jedes Admin-Werkzeug zeigt dieselbe Grundstruktur:

- Kurzbeschreibung
- Was macht dieses Tool?
- Wann nutzt man dieses Tool?
- Schritt-fuer-Schritt-Anleitung
- Konfiguration als lokal speicherbares JSON
- Vorschau / Ergebnis
- Protokoll / Hinweise

Die Vorschau arbeitet nicht destruktiv. Migrations-, Import- und Exportwerkzeuge duerfen Originaldateien erst nach expliziter Admin-Bestaetigung veraendern oder neue Drafts erzeugen.

## Content Factory

Die Content Factory ist als Systemcontainer `content-factory` registriert. Sie nutzt die bestehende Containerstruktur und speichert erzeugte Container lokal im App-Datenordner unter `containers/{containerId}`.

Container koennen als Vorlage dienen. Beim Duplizieren wird das Original nicht veraendert; der neue Container bekommt ein eigenes Manifest mit `sourceContainerId` und startet als `draft`.

Die ModuleRegistry liefert statische Container wie HTML/CSS und die Content Factory. Veroeffentlichte lokal erzeugte Container werden zusaetzlich aus dem lokalen ContainerStorage gelesen. Die Landingpage zeigt nur Container mit `status: active` oder `placeholder` und `visibleInLauncher: true`.

## Manuelle Pruefliste

- App startet mit Login-Screen.
- Login mit `admin@admin.de` funktioniert.
- Falsches Passwort wird abgelehnt.
- Logout fuehrt zurueck zum Login.
- Ohne Login wird die Landingpage nicht geladen.
- Landingpage zeigt den angemeldeten Admin.
- Profil zeigt Rolle, Organisation, lokalen Status und Schutzstatus.
- Admin-Passwort steht nicht im Klartext in `users.json`.
- Admin kann nicht geloescht oder deaktiviert werden.
- HTML/CSS-Kachel erscheint aus der ModuleRegistry.
- Klick auf HTML/CSS oeffnet die bisherige Kursfunktion.
- Wizard und bestehende Kursviews funktionieren weiter.
- Bestehende Materialien, HTML-Dateien und Assets bleiben erreichbar.
