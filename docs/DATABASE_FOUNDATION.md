# Database Foundation

Diese Datenbank-Foundation beschreibt die Zielpersistenz fuer die spaetere PLOGLAN / ueTool_asSaaS Web-/Cloud-first-Architektur. Sie ist bewusst nur als SQL-Grundlage abgelegt. Es wird keine bestehende lokale Datenhaltung migriert und keine Datenbankverbindung erzwungen.

## Warum PostgreSQL

PostgreSQL ist die Zielpersistenz, weil die SaaS-Variante zentrale, mandantenfaehige und transaktionale Datenhaltung braucht. Kursverwaltung, Dozenten, Teilnehmer und Admins arbeiten spaeter gleichzeitig auf demselben Datenstand. PostgreSQL passt dafuer gut, weil es starke Constraints, Transaktionen, JSONB fuer flexible Metadaten, Indizes, UUIDs und spaetere Audit-/Reporting-Abfragen sauber abbilden kann.

## ContentContainer und CourseInstance

`ContentContainer` beschreibt eine Inhaltsvorlage oder ein wiederverwendbares Lern-/Tool-Paket, zum Beispiel HTML/CSS, LF05, ein Quiz oder ein Werkzeug.

`CourseInstance` beschreibt einen echten laufenden Kurs, zum Beispiel "HTML/CSS Kurs Gruppe B" oder "LF05 FIAE September 2026".

Diese Trennung ist wichtig, weil ein ContentContainer in vielen Kursinstanzen verwendet werden kann. Freigaben, Settings, Anwesenheit und Berichte gehoeren nicht global an den Inhalt, sondern an die konkrete CourseInstance.

## Kursmitglieder

Kursmitglieder werden ueber `course_members` abgebildet. Ein Datensatz verbindet Organisation, CourseInstance, User und Rolle im Kurs:

- `teacher`
- `participant`

Ein Dozent kann mehreren Kursen zugeordnet sein. Ein Teilnehmer kann ebenfalls mehreren Kursen zugeordnet sein. Ein Kurs kann spaeter mehrere Dozenten haben.

## Kurskacheln

Dozenten und Teilnehmer bekommen sichtbare Kurskacheln nicht durch direkte Kachelzuweisung. Die Sichtbarkeit ergibt sich aus:

1. User ist aktives `course_member`.
2. Die `course_instance` ist aktiv oder geplant sichtbar.
3. Der Kurs hat aktive `course_container_assignments`.
4. Der zugewiesene `content_container` ist aktiv, sichtbar und zuweisbar.

Admin-Werkzeuge bleiben davon getrennt und werden nicht als normale Kurskacheln berechnet.

## ReleaseStates

`course_release_states` speichert Freigaben pro CourseInstance und ContentContainer. Ein `release_key` kann fuer alle, eine Gruppe oder einen einzelnen User freigegeben werden.

Dadurch kann derselbe ContentContainer in zwei Kursen unterschiedliche Freigabestaende haben. Teilnehmer sehen nur freigegebene ReleaseKeys. Loesungen bleiben fachlich geschuetzt und duerfen nicht in Teilnehmeransichten erscheinen.

## Zeit- und Anwesenheitsmodul

Das Schema bereitet Unterrichtseinheiten ueber `course_sessions`, konkrete Zeitabschnitte ueber `user_time_entries` und verdichtete Anwesenheit ueber `course_session_attendance` vor.

Damit koennen spaeter Kurszeiten, Anwesenheitsstatus, Unterbrechungen, Korrekturen und Tagesberichte nachvollziehbar gespeichert werden.

## Heartbeats

`session_heartbeats` speichert regelmaessige Browser-Lebenszeichen. Sie helfen zu erkennen, ob ein Client noch aktiv ist, ob die Seite sichtbar ist, ob ein Netzwerkabbruch vorliegt oder ob ein Rechner in den Ruhemodus gegangen ist.

## Warum Login/Logout Nicht Reicht

Login und Logout beschreiben nur den Start und das Ende einer Authentifizierungssitzung. Sie zeigen nicht verlaesslich, ob ein Teilnehmer im Kurs aktiv war, ob der Browser geschlossen wurde, ob die Verbindung unterbrochen wurde oder ob der Rechner in den Ruhemodus gegangen ist.

Fuer Anwesenheit und Unterrichtszeit braucht es deshalb laufende Aktivitaetsdaten und korrigierbare Zeitabschnitte.

## Automatische Unterbrechung und Auto-Close

`course_sessions` enthaelt Timeout-Felder fuer Heartbeat-Intervall, Heartbeat-Timeout und Auto-Ende. Zusammen mit `session_heartbeats` und `user_time_entries` kann die spaetere API erkennen:

- Client sendet keine Heartbeats mehr.
- Zeitabschnitt wird als `interrupted` markiert.
- Nach laengerem Ausfall wird automatisch geschlossen.
- Bei Wiederkehr kann eine Korrektur vorgeschlagen werden.

Die Logik ist vorbereitet, aber noch nicht als laufender Dienst implementiert.

## Zeitkorrekturen und AuditLog

`time_corrections` bildet manuelle oder systemgestuetzte Korrekturen ab, zum Beispiel bei vergessenem Logout, Ruhemodus oder Netzabbruch. Alte und neue Zeiten, Status, Begruendung und Entscheidung werden getrennt gespeichert.

`audit_log` dokumentiert die fachliche Aenderung nachvollziehbar. So bleiben Korrekturen pruefbar: Wer hat was geaendert, wann, warum und mit welchem Vorher-/Nachher-Zustand.

## Spaetere Migration nach Prisma oder Drizzle

Folgende Tabellen sollen spaeter aus dem SQL in echte Prisma-/Drizzle-Migrationen ueberfuehrt werden:

- `organizations`
- `departments`
- `app_users`
- `roles`
- `user_roles`
- `content_containers`
- `course_instances`
- `course_members`
- `course_container_assignments`
- `course_release_states`
- `course_settings`
- `course_sessions`
- `user_time_entries`
- `course_session_attendance`
- `session_heartbeats`
- `time_corrections`
- `attendance_reports`
- `audit_log`
- `sync_events`
- `migration_batches`
- `legacy_raw_records`
- `legacy_mapping_results`

Der naechste sinnvolle Schritt ist, aus `database/postgres/ploglan_saas_foundation_v0_2.sql` ein Prisma- oder Drizzle-Schema abzuleiten und daraus versionierte Migrationen zu erzeugen.
