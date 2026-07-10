# PostgreSQL Foundation

Dieser Ordner enthaelt die SQL-Zielbasis fuer die spaetere PLOGLAN / ueTool_asSaaS SaaS-Persistenz.

## Dateien

- `ploglan_saas_foundation_v0_2.sql`: PostgreSQL-Foundation-Schema fuer Organisationen, Rollen, ContentContainer, CourseInstances, Kursmitglieder, Freigaben, Kurssettings, Anwesenheit, Heartbeats, Korrekturen, Reports, AuditLog, SyncEvents und Legacy-Staging.
- `../../docker-compose.yml`: lokale PostgreSQL-Instanz fuer Entwicklung.
- `../../.env.example`: Beispiel fuer `DATABASE_URL`.

## PostgreSQL Lokal Starten

Vom Projektroot aus:

```powershell
docker compose up -d postgres
```

Die lokale Datenbank laeuft dann mit:

```text
Host: localhost
Port: 5432
Datenbank: ploglan_dev
User: ploglan
Passwort: ploglan_dev_password
```

## Schema Einspielen

Vom Projektroot aus:

```powershell
docker compose exec -T postgres psql -U ploglan -d ploglan_dev -f /schema/ploglan_saas_foundation_v0_2.sql
```

Da das Compose-Setup das Schema nicht automatisch mounted, ist fuer den lokalen Entwicklerlauf dieser Befehl robuster:

```powershell
Get-Content .\database\postgres\ploglan_saas_foundation_v0_2.sql | docker compose exec -T postgres psql -U ploglan -d ploglan_dev
```

## Tabellen Pruefen

```powershell
docker compose exec postgres psql -U ploglan -d ploglan_dev -c "\dt"
```

Einzelne Kerntabellen pruefen:

```powershell
docker compose exec postgres psql -U ploglan -d ploglan_dev -c "select count(*) from organizations;"
docker compose exec postgres psql -U ploglan -d ploglan_dev -c "select count(*) from content_containers;"
docker compose exec postgres psql -U ploglan -d ploglan_dev -c "select count(*) from course_instances;"
```

## Demo-Daten Pruefen

Das SQL enthaelt Demo-Seed-Daten. Nach dem Einspielen:

```powershell
docker compose exec postgres psql -U ploglan -d ploglan_dev -c "select organization_key, name from organizations;"
docker compose exec postgres psql -U ploglan -d ploglan_dev -c "select email, display_name from app_users order by email;"
docker compose exec postgres psql -U ploglan -d ploglan_dev -c "select course_instance_id, title, status from course_instances;"
```

## Datenbank Stoppen

```powershell
docker compose down
```

## Datenbank Zuruecksetzen

Das entfernt den lokalen PostgreSQL-Container und das lokale Entwicklungsvolume. Nur fuer lokale Dev-Daten verwenden:

```powershell
docker compose down -v
docker compose up -d postgres
Get-Content .\database\postgres\ploglan_saas_foundation_v0_2.sql | docker compose exec -T postgres psql -U ploglan -d ploglan_dev
```

## Naechster Schritt

Das Script ist derzeit eine Architektur- und Migrationsgrundlage. Es wird nicht automatisch ausgefuehrt. Keine bestehende Electron-Datenhaltung wird migriert.

Der naechste technische Schritt ist, daraus ein Prisma- oder Drizzle-Schema mit echten Migrationen abzuleiten.
