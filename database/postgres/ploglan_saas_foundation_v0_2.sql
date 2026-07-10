-- ============================================================
-- PLOGLAN / LFZQ8a SaaS Foundation Database Schema
-- PostgreSQL
-- Version: 0.2.0
--
-- Enthält:
-- - Organisation / Mandant
-- - Benutzer / Rollen / Fachbereiche
-- - ContentContainer
-- - CourseInstance
-- - Kursmitglieder
-- - Kurscontainer-Zuweisungen
-- - ReleaseStates
-- - Kurssettings
-- - Zeit- und Anwesenheitserfassung
-- - Heartbeats
-- - Korrekturen
-- - Reports
-- - AuditLog
-- - SyncEvents
-- - Migration/Staging
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Helper
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'department_key') THEN
    CREATE TYPE department_key AS ENUM (
      'FIAE',
      'FISI',
      'KABUE',
      'KITS',
      'ALLGEMEIN'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_key') THEN
    CREATE TYPE role_key AS ENUM (
      'participant',
      'teacher',
      'admin',
      'super_admin',
      'course_manager'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'container_category') THEN
    CREATE TYPE container_category AS ENUM (
      'course',
      'admin',
      'tool',
      'quiz',
      'standalone',
      'project'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'container_type') THEN
    CREATE TYPE container_type AS ENUM (
      'learning-content',
      'system',
      'tool',
      'quiz',
      'standalone-app',
      'factory-generated'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_status') THEN
    CREATE TYPE entity_status AS ENUM (
      'draft',
      'planned',
      'active',
      'completed',
      'disabled',
      'archived',
      'placeholder',
      'inactive',
      'removed'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_role') THEN
    CREATE TYPE course_role AS ENUM (
      'teacher',
      'participant'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'release_target') THEN
    CREATE TYPE release_target AS ENUM (
      'all',
      'group',
      'user'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'course_session_status') THEN
    CREATE TYPE course_session_status AS ENUM (
      'planned',
      'active',
      'paused',
      'interrupted',
      'completed',
      'cancelled',
      'auto_closed',
      'correction_required'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE attendance_status AS ENUM (
      'unknown',
      'present',
      'late',
      'absent',
      'excused',
      'interrupted',
      'left_early',
      'corrected'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'time_entry_type') THEN
    CREATE TYPE time_entry_type AS ENUM (
      'login_session',
      'course_attendance',
      'teaching_time',
      'break',
      'correction'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'time_entry_source') THEN
    CREATE TYPE time_entry_source AS ENUM (
      'browser',
      'heartbeat',
      'manual',
      'system',
      'import'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'time_entry_status') THEN
    CREATE TYPE time_entry_status AS ENUM (
      'active',
      'paused',
      'interrupted',
      'closed',
      'auto_closed',
      'corrected',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'time_correction_status') THEN
    CREATE TYPE time_correction_status AS ENUM (
      'requested',
      'approved',
      'rejected',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM (
      'draft',
      'generated',
      'approved',
      'exported',
      'archived'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'migration_status') THEN
    CREATE TYPE migration_status AS ENUM (
      'created',
      'analyzed',
      'dry_run',
      'validated',
      'completed',
      'failed',
      'rolled_back'
    );
  END IF;
END $$;

-- ------------------------------------------------------------
-- Organizations / Tenants
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  legal_name TEXT,
  department department_key DEFAULT 'ALLGEMEIN',
  status entity_status NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Departments
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key department_key NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO departments (key, display_name, description)
VALUES
  ('FIAE', 'FIAE', 'Fachinformatiker Anwendungsentwicklung'),
  ('FISI', 'FISI', 'Fachinformatiker Systemintegration'),
  ('KABUE', 'KABÜ', 'Kaufleute für Büromanagement'),
  ('KITS', 'KiTS', 'Kaufleute IT-Systemmanagement'),
  ('ALLGEMEIN', 'Allgemein', 'Allgemeine oder systemweite Inhalte')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- Users / Roles
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status entity_status NOT NULL DEFAULT 'active',
  external_auth_id TEXT,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_app_users_org_email UNIQUE (organization_id, email)
);

DROP TRIGGER IF EXISTS trg_app_users_updated_at ON app_users;
CREATE TRIGGER trg_app_users_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key role_key NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (key, display_name, description)
VALUES
  ('participant', 'Teilnehmer', 'Teilnehmerrolle'),
  ('teacher', 'Dozent', 'Dozentenrolle'),
  ('admin', 'Admin', 'Systemadministration'),
  ('super_admin', 'SuperAdmin', 'Vollzugriff'),
  ('course_manager', 'Kursverwaltung', 'Kurse, Dozenten und Teilnehmer verwalten')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_roles UNIQUE (organization_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user
ON user_roles (organization_id, user_id);

-- ------------------------------------------------------------
-- Content Containers
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  technical_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  course_id TEXT NOT NULL,
  department department_key NOT NULL DEFAULT 'ALLGEMEIN',

  category container_category NOT NULL,
  container_type container_type NOT NULL,

  description TEXT,
  icon TEXT,
  route TEXT,
  visible_in_launcher BOOLEAN NOT NULL DEFAULT TRUE,
  assignable BOOLEAN NOT NULL DEFAULT TRUE,

  status entity_status NOT NULL DEFAULT 'draft',
  version TEXT NOT NULL DEFAULT '1.0.0',

  manifest_path TEXT,
  catalog_path TEXT,
  storage_mode TEXT NOT NULL DEFAULT 'generated',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  migration_batch_id UUID,

  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_content_container_technical_id UNIQUE (organization_id, technical_id),
  CONSTRAINT uq_content_container_course_id UNIQUE (organization_id, course_id)
);

DROP TRIGGER IF EXISTS trg_content_containers_updated_at ON content_containers;
CREATE TRIGGER trg_content_containers_updated_at
BEFORE UPDATE ON content_containers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_content_containers_visibility
ON content_containers (organization_id, status, assignable, visible_in_launcher);

-- ------------------------------------------------------------
-- Course Instances
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  course_instance_id TEXT NOT NULL,
  title TEXT NOT NULL,
  department department_key NOT NULL,

  start_date DATE,
  end_date DATE,

  status entity_status NOT NULL DEFAULT 'planned',
  version INTEGER NOT NULL DEFAULT 1,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  migration_batch_id UUID,

  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_course_instance_id UNIQUE (organization_id, course_instance_id)
);

DROP TRIGGER IF EXISTS trg_course_instances_updated_at ON course_instances;
CREATE TRIGGER trg_course_instances_updated_at
BEFORE UPDATE ON course_instances
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_course_instances_org_status
ON course_instances (organization_id, status, department);

-- ------------------------------------------------------------
-- Course Members
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,

  role_in_course course_role NOT NULL,
  status entity_status NOT NULL DEFAULT 'active',

  assigned_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  legacy_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  migration_batch_id UUID,

  CONSTRAINT uq_active_course_member UNIQUE (
    organization_id,
    course_instance_id,
    user_id,
    role_in_course
  )
);

CREATE INDEX IF NOT EXISTS idx_course_members_user
ON course_members (organization_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_course_members_course
ON course_members (organization_id, course_instance_id, status);

-- ------------------------------------------------------------
-- Course Container Assignments
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_container_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  content_container_id UUID NOT NULL REFERENCES content_containers(id) ON DELETE RESTRICT,

  status entity_status NOT NULL DEFAULT 'active',

  assigned_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT uq_course_container_assignment UNIQUE (
    organization_id,
    course_instance_id,
    content_container_id
  )
);

CREATE INDEX IF NOT EXISTS idx_course_container_assignments_course
ON course_container_assignments (organization_id, course_instance_id, status);

-- ------------------------------------------------------------
-- Course Release States
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_release_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  content_container_id UUID NOT NULL REFERENCES content_containers(id) ON DELETE CASCADE,

  release_key TEXT NOT NULL,
  is_released BOOLEAN NOT NULL DEFAULT FALSE,

  released_for release_target NOT NULL DEFAULT 'all',
  released_for_id UUID,

  released_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  released_at TIMESTAMPTZ,

  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_course_release_states_updated_at ON course_release_states;
CREATE TRIGGER trg_course_release_states_updated_at
BEFORE UPDATE ON course_release_states
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_release_state_nullsafe
ON course_release_states (
  organization_id,
  course_instance_id,
  content_container_id,
  release_key,
  released_for,
  COALESCE(released_for_id::text, '__ALL__')
);

CREATE INDEX IF NOT EXISTS idx_course_release_states_lookup
ON course_release_states (
  organization_id,
  course_instance_id,
  content_container_id,
  is_released
);

-- ------------------------------------------------------------
-- Course Settings
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,

  start_time TIME,
  end_time TIME,

  breaks JSONB NOT NULL DEFAULT '[]'::jsonb,
  monitor_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,

  version INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_course_settings_course UNIQUE (organization_id, course_instance_id)
);

DROP TRIGGER IF EXISTS trg_course_settings_updated_at ON course_settings;
CREATE TRIGGER trg_course_settings_updated_at
BEFORE UPDATE ON course_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Course Sessions
-- Unterrichtseinheit / Kurstag / Live-Session
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  content_container_id UUID REFERENCES content_containers(id) ON DELETE SET NULL,

  session_key TEXT,
  session_date DATE NOT NULL,
  day_number INTEGER,
  title TEXT,

  planned_start TIMESTAMPTZ,
  planned_end TIMESTAMPTZ,

  started_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,

  paused_at TIMESTAMPTZ,

  ended_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  ended_at TIMESTAMPTZ,
  auto_ended_at TIMESTAMPTZ,

  status course_session_status NOT NULL DEFAULT 'planned',

  heartbeat_interval_seconds INTEGER NOT NULL DEFAULT 60,
  heartbeat_timeout_seconds INTEGER NOT NULL DEFAULT 300,
  auto_end_timeout_seconds INTEGER NOT NULL DEFAULT 900,

  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_course_sessions_updated_at ON course_sessions;
CREATE TRIGGER trg_course_sessions_updated_at
BEFORE UPDATE ON course_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_sessions_day
ON course_sessions (
  organization_id,
  course_instance_id,
  session_date,
  COALESCE(day_number, -1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_sessions_key
ON course_sessions (organization_id, session_key)
WHERE session_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_sessions_course_date
ON course_sessions (organization_id, course_instance_id, session_date DESC, status);

-- ------------------------------------------------------------
-- User Time Entries
-- konkrete Zeitabschnitte: Unterricht, Anwesenheit, Login etc.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES course_sessions(id) ON DELETE CASCADE,
  course_instance_id UUID REFERENCES course_instances(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role_in_course course_role,

  entry_type time_entry_type NOT NULL,
  source time_entry_source NOT NULL DEFAULT 'browser',
  status time_entry_status NOT NULL DEFAULT 'active',

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,

  last_heartbeat_at TIMESTAMPTZ,
  interruption_count INTEGER NOT NULL DEFAULT 0,

  corrected_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  correction_reason TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_user_time_entries_duration_nonnegative CHECK (duration_seconds >= 0),
  CONSTRAINT chk_user_time_entries_time_order CHECK (
    ended_at IS NULL OR ended_at >= started_at
  )
);

DROP TRIGGER IF EXISTS trg_user_time_entries_updated_at ON user_time_entries;
CREATE TRIGGER trg_user_time_entries_updated_at
BEFORE UPDATE ON user_time_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_time_entries_user
ON user_time_entries (organization_id, user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_time_entries_session
ON user_time_entries (organization_id, course_session_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_user_time_entries_active
ON user_time_entries (organization_id, status, last_heartbeat_at)
WHERE status IN ('active', 'paused', 'interrupted');

-- ------------------------------------------------------------
-- Course Session Attendance
-- aggregierte Anwesenheit pro Person und Session
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS course_session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_session_id UUID NOT NULL REFERENCES course_sessions(id) ON DELETE CASCADE,
  course_instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role_in_course course_role NOT NULL,

  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,

  total_online_seconds INTEGER NOT NULL DEFAULT 0,
  total_present_seconds INTEGER NOT NULL DEFAULT 0,
  total_interrupted_seconds INTEGER NOT NULL DEFAULT 0,

  status attendance_status NOT NULL DEFAULT 'unknown',
  source time_entry_source NOT NULL DEFAULT 'browser',

  manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,

  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_course_session_attendance UNIQUE (course_session_id, user_id),
  CONSTRAINT chk_course_session_attendance_seconds CHECK (
    total_online_seconds >= 0
    AND total_present_seconds >= 0
    AND total_interrupted_seconds >= 0
  )
);

DROP TRIGGER IF EXISTS trg_course_session_attendance_updated_at ON course_session_attendance;
CREATE TRIGGER trg_course_session_attendance_updated_at
BEFORE UPDATE ON course_session_attendance
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_course_session_attendance_course
ON course_session_attendance (organization_id, course_instance_id, course_session_id, status);

CREATE INDEX IF NOT EXISTS idx_course_session_attendance_user
ON course_session_attendance (organization_id, user_id, created_at DESC);

-- ------------------------------------------------------------
-- Session Heartbeats
-- Browser-Lebenszeichen zur Erkennung von Aktivität, Ruhemodus,
-- Tab geschlossen, Verbindungsabbruch etc.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS session_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES course_sessions(id) ON DELETE CASCADE,
  course_instance_id UUID REFERENCES course_instances(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES user_time_entries(id) ON DELETE SET NULL,

  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  client_status TEXT NOT NULL DEFAULT 'active',
  page_visible BOOLEAN,
  idle_seconds INTEGER,
  network_status TEXT,

  ip_address INET,
  user_agent TEXT,
  client_id TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT chk_session_heartbeats_idle_nonnegative CHECK (
    idle_seconds IS NULL OR idle_seconds >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_session_heartbeats_session_user
ON session_heartbeats (organization_id, course_session_id, user_id, heartbeat_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_heartbeats_time_entry
ON session_heartbeats (time_entry_id, heartbeat_at DESC);

-- ------------------------------------------------------------
-- Time Corrections
-- Korrekturen bei vergessenen Logouts, Ruhemodus, Netzabbruch etc.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS time_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES course_sessions(id) ON DELETE CASCADE,
  course_instance_id UUID REFERENCES course_instances(id) ON DELETE CASCADE,

  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES user_time_entries(id) ON DELETE SET NULL,
  attendance_id UUID REFERENCES course_session_attendance(id) ON DELETE SET NULL,

  requested_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES app_users(id) ON DELETE SET NULL,

  old_start TIMESTAMPTZ,
  old_end TIMESTAMPTZ,
  new_start TIMESTAMPTZ,
  new_end TIMESTAMPTZ,

  old_status TEXT,
  new_status TEXT,

  reason TEXT NOT NULL,
  status time_correction_status NOT NULL DEFAULT 'requested',
  decision_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT chk_time_corrections_new_time_order CHECK (
    new_start IS NULL OR new_end IS NULL OR new_end >= new_start
  )
);

CREATE INDEX IF NOT EXISTS idx_time_corrections_course
ON time_corrections (organization_id, course_instance_id, course_session_id, status);

CREATE INDEX IF NOT EXISTS idx_time_corrections_user
ON time_corrections (organization_id, user_id, created_at DESC);

-- ------------------------------------------------------------
-- Attendance Reports
-- Tages-/Wochen-/Monatsnachweise
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_instance_id UUID NOT NULL REFERENCES course_instances(id) ON DELETE CASCADE,
  course_session_id UUID REFERENCES course_sessions(id) ON DELETE SET NULL,

  report_key TEXT NOT NULL,
  report_date DATE,
  report_type TEXT NOT NULL DEFAULT 'daily',

  status report_status NOT NULL DEFAULT 'draft',

  generated_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ,

  approved_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,

  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_attendance_report_key UNIQUE (organization_id, report_key)
);

DROP TRIGGER IF EXISTS trg_attendance_reports_updated_at ON attendance_reports;
CREATE TRIGGER trg_attendance_reports_updated_at
BEFORE UPDATE ON attendance_reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_attendance_reports_course
ON attendance_reports (organization_id, course_instance_id, report_date DESC, status);

-- ------------------------------------------------------------
-- Audit Log
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,

  before_data JSONB,
  after_data JSONB,

  client_id TEXT,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
ON audit_log (organization_id, entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
ON audit_log (organization_id, actor_user_id, created_at DESC);

-- ------------------------------------------------------------
-- Sync Events
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_events_org_created
ON sync_events (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_events_entity
ON sync_events (organization_id, entity_type, entity_id);

-- ------------------------------------------------------------
-- Migration / Legacy Import
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS migration_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  batch_key TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  source_name TEXT,
  source_description TEXT,

  status migration_status NOT NULL DEFAULT 'created',

  started_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_migration_batches_updated_at ON migration_batches;
CREATE TRIGGER trg_migration_batches_updated_at
BEFORE UPDATE ON migration_batches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS legacy_raw_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_batch_id UUID NOT NULL REFERENCES migration_batches(id) ON DELETE CASCADE,

  source_table TEXT,
  source_entity_type TEXT NOT NULL,
  legacy_id TEXT,
  raw_payload JSONB NOT NULL,

  detected_target_entity TEXT,
  mapping_status TEXT NOT NULL DEFAULT 'unmapped',
  mapping_notes JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_raw_records_batch
ON legacy_raw_records (migration_batch_id, source_entity_type, mapping_status);

CREATE TABLE IF NOT EXISTS legacy_mapping_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_batch_id UUID NOT NULL REFERENCES migration_batches(id) ON DELETE CASCADE,
  legacy_raw_record_id UUID REFERENCES legacy_raw_records(id) ON DELETE SET NULL,

  target_entity_type TEXT NOT NULL,
  target_entity_id UUID,
  mapping_status TEXT NOT NULL,

  legacy_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legacy_mapping_results_batch
ON legacy_mapping_results (migration_batch_id, target_entity_type, mapping_status);

-- ------------------------------------------------------------
-- Demo Seed Data
-- ------------------------------------------------------------

INSERT INTO organizations (organization_key, name, legal_name, department)
VALUES
  ('demo-bildungstraeger', 'Demo Bildungsträger', 'Demo Bildungsträger GmbH', 'ALLGEMEIN')
ON CONFLICT (organization_key) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
)
INSERT INTO app_users (organization_id, email, display_name, first_name, last_name)
SELECT org.id, email, display_name, first_name, last_name
FROM org,
(
  VALUES
    ('admin@demo.local', 'Demo Admin', 'Demo', 'Admin'),
    ('kursverwaltung@demo.local', 'Demo Kursverwaltung', 'Demo', 'Kursverwaltung'),
    ('dozent@demo.local', 'Demo Dozent', 'Demo', 'Dozent'),
    ('teilnehmer1@demo.local', 'Demo Teilnehmer 1', 'Demo', 'Teilnehmer 1'),
    ('teilnehmer2@demo.local', 'Demo Teilnehmer 2', 'Demo', 'Teilnehmer 2')
) AS u(email, display_name, first_name, last_name)
ON CONFLICT (organization_id, email) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
),
role_map AS (
  SELECT id, key FROM roles
),
user_map AS (
  SELECT app_users.id, app_users.email
  FROM app_users
  JOIN org ON app_users.organization_id = org.id
)
INSERT INTO user_roles (organization_id, user_id, role_id)
SELECT org.id, user_map.id, role_map.id
FROM org, user_map, role_map
WHERE
  (user_map.email = 'admin@demo.local' AND role_map.key = 'admin')
  OR (user_map.email = 'kursverwaltung@demo.local' AND role_map.key = 'course_manager')
  OR (user_map.email = 'dozent@demo.local' AND role_map.key = 'teacher')
  OR (user_map.email IN ('teilnehmer1@demo.local', 'teilnehmer2@demo.local') AND role_map.key = 'participant')
ON CONFLICT (organization_id, user_id, role_id) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
),
admin_user AS (
  SELECT app_users.id
  FROM app_users
  JOIN org ON app_users.organization_id = org.id
  WHERE email = 'admin@demo.local'
)
INSERT INTO content_containers (
  organization_id,
  technical_id,
  display_name,
  course_name,
  course_id,
  department,
  category,
  container_type,
  description,
  status,
  assignable,
  created_by
)
SELECT
  org.id,
  technical_id,
  display_name,
  course_name,
  course_id,
  department::department_key,
  category::container_category,
  container_type::container_type,
  description,
  status::entity_status,
  assignable,
  admin_user.id
FROM org, admin_user,
(
  VALUES
    ('html-css', 'HTML/CSS', 'HTML/CSS Grundlagen', 'html-css', 'FIAE', 'course', 'learning-content', 'Demo ContentContainer für HTML/CSS', 'active', TRUE),
    ('lf05-demo', 'LF05 Demo', 'LF05 Demo Kurscontainer', 'lf05-demo', 'FIAE', 'course', 'learning-content', 'Demo ContentContainer für LF05', 'active', TRUE)
) AS c(
  technical_id,
  display_name,
  course_name,
  course_id,
  department,
  category,
  container_type,
  description,
  status,
  assignable
)
ON CONFLICT (organization_id, technical_id) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
),
manager_user AS (
  SELECT app_users.id
  FROM app_users
  JOIN org ON app_users.organization_id = org.id
  WHERE email = 'kursverwaltung@demo.local'
)
INSERT INTO course_instances (
  organization_id,
  course_instance_id,
  title,
  department,
  start_date,
  end_date,
  status,
  created_by
)
SELECT
  org.id,
  'lf05-fiae-demo-2026',
  'LF05 FIAE Demo Kurs 2026',
  'FIAE',
  DATE '2026-09-01',
  DATE '2026-09-15',
  'active',
  manager_user.id
FROM org, manager_user
ON CONFLICT (organization_id, course_instance_id) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
),
course AS (
  SELECT course_instances.id
  FROM course_instances
  JOIN org ON course_instances.organization_id = org.id
  WHERE course_instance_id = 'lf05-fiae-demo-2026'
)
INSERT INTO course_settings (
  organization_id,
  course_instance_id,
  start_time,
  end_time,
  breaks
)
SELECT
  org.id,
  course.id,
  TIME '08:30',
  TIME '16:30',
  '[
    {"start":"10:00","end":"10:15","label":"Vormittagspause"},
    {"start":"11:45","end":"12:15","label":"Mittagspause"},
    {"start":"13:45","end":"14:00","label":"Nachmittagspause"},
    {"start":"15:30","end":"15:45","label":"Nachmittagspause"}
  ]'::jsonb
FROM org, course
ON CONFLICT (organization_id, course_instance_id) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
),
course AS (
  SELECT course_instances.id
  FROM course_instances
  JOIN org ON course_instances.organization_id = org.id
  WHERE course_instance_id = 'lf05-fiae-demo-2026'
),
manager_user AS (
  SELECT app_users.id
  FROM app_users
  JOIN org ON app_users.organization_id = org.id
  WHERE email = 'kursverwaltung@demo.local'
),
users_to_assign AS (
  SELECT app_users.id, app_users.email
  FROM app_users
  JOIN org ON app_users.organization_id = org.id
  WHERE email IN ('dozent@demo.local', 'teilnehmer1@demo.local', 'teilnehmer2@demo.local')
)
INSERT INTO course_members (
  organization_id,
  course_instance_id,
  user_id,
  role_in_course,
  assigned_by
)
SELECT
  org.id,
  course.id,
  users_to_assign.id,
  CASE
    WHEN users_to_assign.email = 'dozent@demo.local' THEN 'teacher'::course_role
    ELSE 'participant'::course_role
  END,
  manager_user.id
FROM org, course, manager_user, users_to_assign
ON CONFLICT (organization_id, course_instance_id, user_id, role_in_course) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
),
course AS (
  SELECT id FROM course_instances
  WHERE organization_id = (SELECT id FROM org)
  AND course_instance_id = 'lf05-fiae-demo-2026'
),
container AS (
  SELECT id FROM content_containers
  WHERE organization_id = (SELECT id FROM org)
  AND technical_id = 'lf05-demo'
),
manager_user AS (
  SELECT app_users.id
  FROM app_users
  JOIN org ON app_users.organization_id = org.id
  WHERE email = 'kursverwaltung@demo.local'
)
INSERT INTO course_container_assignments (
  organization_id,
  course_instance_id,
  content_container_id,
  assigned_by
)
SELECT org.id, course.id, container.id, manager_user.id
FROM org, course, container, manager_user
ON CONFLICT (organization_id, course_instance_id, content_container_id) DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
),
course AS (
  SELECT id FROM course_instances
  WHERE organization_id = (SELECT id FROM org)
  AND course_instance_id = 'lf05-fiae-demo-2026'
),
container AS (
  SELECT id FROM content_containers
  WHERE organization_id = (SELECT id FROM org)
  AND technical_id = 'lf05-demo'
),
teacher_user AS (
  SELECT app_users.id
  FROM app_users
  JOIN org ON app_users.organization_id = org.id
  WHERE email = 'dozent@demo.local'
)
INSERT INTO course_release_states (
  organization_id,
  course_instance_id,
  content_container_id,
  release_key,
  is_released,
  released_for,
  released_by,
  released_at
)
SELECT
  org.id,
  course.id,
  container.id,
  release_key,
  is_released,
  'all',
  CASE WHEN is_released THEN teacher_user.id ELSE NULL END,
  CASE WHEN is_released THEN NOW() ELSE NULL END
FROM org, course, container, teacher_user,
(
  VALUES
    ('tag_01', TRUE),
    ('tag_02', FALSE),
    ('quiz_tag_01_25', TRUE)
) AS r(release_key, is_released)
ON CONFLICT DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
),
course AS (
  SELECT id FROM course_instances
  WHERE organization_id = (SELECT id FROM org)
  AND course_instance_id = 'lf05-fiae-demo-2026'
),
container AS (
  SELECT id FROM content_containers
  WHERE organization_id = (SELECT id FROM org)
  AND technical_id = 'lf05-demo'
),
teacher_user AS (
  SELECT app_users.id
  FROM app_users
  JOIN org ON app_users.organization_id = org.id
  WHERE email = 'dozent@demo.local'
)
INSERT INTO course_sessions (
  organization_id,
  course_instance_id,
  content_container_id,
  session_key,
  session_date,
  day_number,
  title,
  planned_start,
  planned_end,
  started_by,
  status
)
SELECT
  org.id,
  course.id,
  container.id,
  'lf05-fiae-demo-2026-tag-01',
  DATE '2026-09-01',
  1,
  'Tag 1 - Daten verstehen',
  TIMESTAMPTZ '2026-09-01 08:30:00+02',
  TIMESTAMPTZ '2026-09-01 16:30:00+02',
  teacher_user.id,
  'planned'
FROM org, course, container, teacher_user
ON CONFLICT DO NOTHING;

WITH org AS (
  SELECT id FROM organizations WHERE organization_key = 'demo-bildungstraeger'
),
session AS (
  SELECT cs.id, cs.course_instance_id
  FROM course_sessions cs
  JOIN org ON cs.organization_id = org.id
  WHERE cs.session_key = 'lf05-fiae-demo-2026-tag-01'
),
members AS (
  SELECT cm.user_id, cm.role_in_course
  FROM course_members cm
  JOIN session ON cm.course_instance_id = session.course_instance_id
  WHERE cm.organization_id = (SELECT id FROM org)
  AND cm.status = 'active'
)
INSERT INTO course_session_attendance (
  organization_id,
  course_session_id,
  course_instance_id,
  user_id,
  role_in_course,
  status,
  source
)
SELECT
  org.id,
  session.id,
  session.course_instance_id,
  members.user_id,
  members.role_in_course,
  'unknown',
  'system'
FROM org, session, members
ON CONFLICT (course_session_id, user_id) DO NOTHING;

COMMIT;