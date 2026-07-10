# PostgreSQL Foundation

Dieser Ordner enthaelt die SQL-Zielbasis fuer die spaetere PLOGLAN / ueTool_asSaaS SaaS-Persistenz.

## Dateien

- `ploglan_saas_foundation_v0_2.sql`: PostgreSQL-Foundation-Schema fuer Organisationen, Rollen, ContentContainer, CourseInstances, Kursmitglieder, Freigaben, Kurssettings, Anwesenheit, Heartbeats, Korrekturen, Reports, AuditLog, SyncEvents und Legacy-Staging.

## Nutzung

Das Script ist derzeit eine Architektur- und Migrationsgrundlage. Es wird in diesem Schritt nicht automatisch ausgefuehrt.

Keine bestehende Electron-Datenhaltung wird migriert. Der naechste technische Schritt ist, daraus ein Prisma- oder Drizzle-Schema mit echten Migrationen abzuleiten.
