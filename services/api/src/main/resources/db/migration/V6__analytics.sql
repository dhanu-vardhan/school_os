-- V6__analytics.sql — Part 8 (governed analytics slice).
--
-- A8-1: ordinary RLS-forced tables (not views / materialised views) so the dynamic
--       RlsCatalogCheckTest discovers and polices every tenant table.
-- A8-4: there is no upstream fact source yet. The scheduled refresh job only records
--       source_available = false; it never inserts fabricated fact rows.
-- A8-6: chronic_flag / support snapshots are supportive-only, rule-based and
--       TODO(DPO review) gated. No health, disability, safeguarding or special-needs
--       field is stored in this schema.
--
-- Grants: the runtime role schoolos_app has no DDL and no BYPASSRLS. Postgres default
-- privileges (infra/compose/init-db.sql) grant it writes on every new table, so we
-- explicitly REVOKE writes on raw facts and the append-only audit log. Only the derived
-- tables (refresh_state, aggregate_daily) are writable by the app, and always under
-- FORCE RLS WITH CHECK school_id = current tenant. The real fact loader will run as the
-- owning/Flyway role once upstream Part 3 tables exist; it is not part of this slice.

-- --------------------------------------------------------------------------- facts

CREATE TABLE analytics_daily_attendance_fact (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    class_id UUID,
    date DATE NOT NULL,
    period INT NOT NULL,
    term VARCHAR(64),
    year VARCHAR(16),
    weekday SMALLINT,
    expected INT NOT NULL DEFAULT 0,
    present INT NOT NULL DEFAULT 0,
    justified INT NOT NULL DEFAULT 0,
    unjustified INT NOT NULL DEFAULT 0,
    late INT NOT NULL DEFAULT 0,
    minutes_late_sum INT NOT NULL DEFAULT 0,
    registers_taken INT NOT NULL DEFAULT 0,
    registers_on_time INT NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    source_fingerprint TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, class_id, date, period, source_fingerprint)
);

CREATE TABLE analytics_assessment_fact (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    class_id UUID,
    subject VARCHAR(128),
    assessment_key VARCHAR(255) NOT NULL,
    term VARCHAR(64),
    year VARCHAR(16),
    mark NUMERIC,
    coefficient NUMERIC NOT NULL DEFAULT 1,
    scale_max NUMERIC NOT NULL DEFAULT 20,
    dispensed BOOLEAN NOT NULL DEFAULT false,
    absent BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL,
    source_fingerprint TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, assessment_key, source_fingerprint)
);

CREATE TABLE analytics_homework_fact (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    class_id UUID,
    period VARCHAR(64) NOT NULL,
    assigned INT NOT NULL DEFAULT 0,
    submitted INT NOT NULL DEFAULT 0,
    on_time INT NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    source_fingerprint TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, class_id, period, source_fingerprint)
);

CREATE TABLE analytics_finance_fact (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    period VARCHAR(64) NOT NULL,
    invoiced_cents BIGINT NOT NULL DEFAULT 0,
    collected_cents BIGINT NOT NULL DEFAULT 0,
    overdue_cents BIGINT NOT NULL DEFAULT 0,
    invoice_count INT NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    source_fingerprint TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, period, source_fingerprint)
);

-- student_key is a pseudonymous HMAC of the student id with a per-school rotating salt:
-- never a direct identifier. The snapshot carries only aggregate/support signals.
-- TODO(DPO review): chronic_flag is a profiling-like support signal; lawful basis and
-- fairness review must complete before real data is loaded (docs/ANALYTICS_DESIGN.md §5).
CREATE TABLE analytics_student_term_snapshot (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    student_key UUID,
    class_id UUID,
    cohort VARCHAR(64),
    term VARCHAR(64),
    year VARCHAR(16),
    prior_average_mark NUMERIC,
    average_mark NUMERIC NOT NULL DEFAULT 0,
    chronic_flag BOOLEAN NOT NULL DEFAULT false,
    source TEXT NOT NULL,
    source_fingerprint TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, student_key, term, year, source_fingerprint)
);
COMMENT ON COLUMN analytics_student_term_snapshot.chronic_flag IS
    'TODO(DPO/legal review): rule-based supportive flag (<90% over 28d by default). Never a diagnosis or an automated decision.';

-- ----------------------------------------------------------- derived / operational

-- A8-4: source_available defaults to false. An absent upstream source is recorded,
-- never papered over with zero-valued facts.
CREATE TABLE analytics_refresh_state (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    fact_name TEXT NOT NULL,
    last_source_cursor TEXT,
    last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    rows_written INT NOT NULL DEFAULT 0,
    source_available BOOLEAN NOT NULL DEFAULT false,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, fact_name)
);

-- Pre-computed, tenant-scoped aggregate cells. @Version (JPA) maps to `version`.
CREATE TABLE analytics_aggregate_daily (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    metric_id TEXT NOT NULL,
    grain TEXT NOT NULL,
    period TEXT NOT NULL,
    class_id UUID,
    subject VARCHAR(128),
    value NUMERIC,
    n INT NOT NULL DEFAULT 0,
    numerator NUMERIC,
    ci_lower NUMERIC,
    ci_upper NUMERIC,
    suppressed BOOLEAN NOT NULL DEFAULT false,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Honest freshness signal per cell: a row is never written when the upstream
    -- source is absent. The dictionary version pins the formula used.
    source_available BOOLEAN NOT NULL DEFAULT false,
    formula_version TEXT NOT NULL DEFAULT '1.0.0',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, metric_id, grain, period, class_id, subject)
);

-- Append-only: scope, never values. No UPDATE/DELETE privilege is granted to the app.
CREATE TABLE analytics_audit_event (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    actor_sub TEXT,
    event_type TEXT NOT NULL,
    metric_id TEXT,
    scope TEXT,
    -- Student-level access records the subject and the caller's purpose here.
    -- No values, health or sensitive categories are ever stored in this table.
    student_id UUID,
    purpose VARCHAR(120),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    detail JSONB,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE analytics_audit_event IS
    'Append-only analytics access log: actor, metric id, scope and timestamp. Never stores metric values or personal data.';

-- Saved per-user dashboard views: filter definitions only, no metric values or pupil data.
CREATE TABLE analytics_saved_view (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    owner_sub TEXT NOT NULL,
    name VARCHAR(128) NOT NULL,
    dashboard VARCHAR(64) NOT NULL,
    filters TEXT NOT NULL DEFAULT '{}',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, owner_sub, name)
);

-- ----------------------------------------------------------------------- RLS (V4 pattern)

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
      'analytics_daily_attendance_fact',
      'analytics_assessment_fact',
      'analytics_homework_fact',
      'analytics_finance_fact',
      'analytics_student_term_snapshot',
      'analytics_refresh_state',
      'analytics_aggregate_daily',
      'analytics_audit_event',
      'analytics_saved_view'])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %I USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END$$;

-- ---------------------------------------------------------------------- indexes

CREATE INDEX idx_analytics_daily_attendance_school ON analytics_daily_attendance_fact(school_id);
CREATE INDEX idx_analytics_daily_attendance_grain ON analytics_daily_attendance_fact(school_id, class_id, date, period);
CREATE INDEX idx_analytics_daily_attendance_term ON analytics_daily_attendance_fact(school_id, year, term);

CREATE INDEX idx_analytics_assessment_school ON analytics_assessment_fact(school_id);
CREATE INDEX idx_analytics_assessment_grain ON analytics_assessment_fact(school_id, class_id, subject, term, year);

CREATE INDEX idx_analytics_homework_school ON analytics_homework_fact(school_id);
CREATE INDEX idx_analytics_homework_grain ON analytics_homework_fact(school_id, class_id, period);

CREATE INDEX idx_analytics_finance_school ON analytics_finance_fact(school_id);
CREATE INDEX idx_analytics_finance_grain ON analytics_finance_fact(school_id, period);

CREATE INDEX idx_analytics_student_term_school ON analytics_student_term_snapshot(school_id);
CREATE INDEX idx_analytics_student_term_grain ON analytics_student_term_snapshot(school_id, student_key, term, year);
CREATE INDEX idx_analytics_student_term_class ON analytics_student_term_snapshot(school_id, class_id, cohort);

CREATE INDEX idx_analytics_refresh_state_school ON analytics_refresh_state(school_id);
CREATE INDEX idx_analytics_aggregate_daily_school ON analytics_aggregate_daily(school_id);
CREATE INDEX idx_analytics_aggregate_daily_metric ON analytics_aggregate_daily(school_id, metric_id, grain, period);
-- Exact index contract from the Part 8 brief: (school_id, period, metric_id).
CREATE INDEX idx_analytics_aggregate_daily_period_metric
    ON analytics_aggregate_daily(school_id, period, metric_id);
CREATE INDEX idx_analytics_audit_event_school ON analytics_audit_event(school_id);
CREATE INDEX idx_analytics_audit_event_actor ON analytics_audit_event(school_id, actor_sub, occurred_at);
CREATE INDEX idx_analytics_saved_view_school_owner ON analytics_saved_view(school_id, owner_sub);

-- ---------------------------------------------------------------------- privileges

-- Explicit read access for the runtime role (default privileges already grant it, but
-- stating it keeps the contract visible to reviewers and CI catalog checks).
GRANT SELECT ON
    analytics_daily_attendance_fact,
    analytics_assessment_fact,
    analytics_homework_fact,
    analytics_finance_fact,
    analytics_student_term_snapshot,
    analytics_refresh_state,
    analytics_aggregate_daily,
    analytics_audit_event,
    analytics_saved_view
TO schoolos_app;

-- Raw facts are owned/populated by the Flyway/owner refresh path only.
REVOKE INSERT, UPDATE, DELETE ON
    analytics_daily_attendance_fact,
    analytics_assessment_fact,
    analytics_homework_fact,
    analytics_finance_fact,
    analytics_student_term_snapshot
FROM schoolos_app;

-- Derived tables: the scheduled job and read pipeline may write/upsert under RLS.
GRANT SELECT, INSERT, UPDATE ON analytics_refresh_state TO schoolos_app;
GRANT SELECT, INSERT, UPDATE ON analytics_aggregate_daily TO schoolos_app;

-- Audit log: INSERT only. UPDATE/DELETE are revoked so the chain cannot be rewritten.
REVOKE UPDATE, DELETE ON analytics_audit_event FROM schoolos_app;
GRANT SELECT, INSERT ON analytics_audit_event TO schoolos_app;

-- Users may manage only their own saved views; ownership is enforced in the service too.
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_saved_view TO schoolos_app;
