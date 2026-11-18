-- V13__analyst.sql
CREATE TABLE metric_registry (
    id UUID PRIMARY KEY,
    school_id UUID REFERENCES public.school(id),
    metric_key VARCHAR(128) NOT NULL,
    label_fr VARCHAR(255) NOT NULL,
    label_en VARCHAR(255),
    definition TEXT NOT NULL,
    formula TEXT NOT NULL,
    grain VARCHAR(64) NOT NULL,
    min_cell INT NOT NULL DEFAULT 10,
    sensitivity_class VARCHAR(32) NOT NULL DEFAULT 'standard',
    owner VARCHAR(128),
    version INT NOT NULL DEFAULT 1,
    source_tables TEXT,
    refresh_cadence VARCHAR(32),
    limitations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE suppression_policy (
    id UUID PRIMARY KEY,
    school_id UUID REFERENCES public.school(id),
    metric_class VARCHAR(32) NOT NULL,
    min_cell INT NOT NULL,
    secondary_suppression BOOLEAN NOT NULL DEFAULT TRUE,
    rounding BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analyst_query_log (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    analyst_id UUID NOT NULL,
    metric_key VARCHAR(128) NOT NULL,
    dimensions TEXT,
    filters_hash VARCHAR(128),
    result_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(128),
    queried_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE differencing_guard_state (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    analyst_id UUID NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    query_count INT NOT NULL DEFAULT 0,
    last_filters_hash VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE network_consent (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    consenting BOOLEAN NOT NULL DEFAULT FALSE,
    granted_by UUID,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE data_quality_check (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    metric_key VARCHAR(128) NOT NULL,
    check_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    detail TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE metric_change_request (
    id UUID PRIMARY KEY,
    school_id UUID REFERENCES public.school(id),
    metric_key VARCHAR(128) NOT NULL,
    proposed_change TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    requested_by UUID NOT NULL,
    reviewed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'metric_registry','suppression_policy','analyst_query_log','differencing_guard_state',
    'network_consent','data_quality_check','metric_change_request'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %I USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END$$;

CREATE INDEX idx_metric_registry_key ON metric_registry(metric_key);
CREATE INDEX idx_analyst_query_log_analyst ON analyst_query_log(analyst_id);
