-- V8__safeguarding_restricted.sql
CREATE SCHEMA IF NOT EXISTS sg;

CREATE TABLE sg.sg_case (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    reference VARCHAR(64) NOT NULL,
    case_type VARCHAR(32) NOT NULL DEFAULT 'concern',
    category VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'medium',
    status VARCHAR(32) NOT NULL DEFAULT 'new',
    reported_by_role VARCHAR(64) NOT NULL,
    subject_student_id UUID REFERENCES public.student(id),
    subject_initials VARCHAR(16),
    immediacy VARCHAR(16) NOT NULL DEFAULT 'none',
    immediate_danger BOOLEAN NOT NULL DEFAULT FALSE,
    pseudonymous_reporter BOOLEAN NOT NULL DEFAULT FALSE,
    conflict_of_interest BOOLEAN NOT NULL DEFAULT FALSE,
    alternate_path VARCHAR(255),
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    retention_policy_id UUID,
    assigned_to UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE sg.sg_case_party (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID NOT NULL REFERENCES sg.sg_case(id) ON DELETE CASCADE,
    party_type VARCHAR(32) NOT NULL,
    person_id UUID,
    display_label VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sg.sg_case_entry (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID NOT NULL REFERENCES sg.sg_case(id) ON DELETE CASCADE,
    entry_type VARCHAR(32) NOT NULL,
    kind VARCHAR(16) NOT NULL DEFAULT 'fact',
    narrative TEXT NOT NULL,
    author_id UUID,
    author_role VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sg.sg_case_attachment (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID NOT NULL REFERENCES sg.sg_case(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES sg.sg_case_entry(id),
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(128),
    storage_key VARCHAR(512) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    scan_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sg.sg_access_grant (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID NOT NULL REFERENCES sg.sg_case(id) ON DELETE CASCADE,
    grantee_user_id UUID NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    granted_by UUID NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(255)
);

CREATE TABLE sg.sg_decision (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID NOT NULL REFERENCES sg.sg_case(id) ON DELETE CASCADE,
    route VARCHAR(64) NOT NULL,
    rationale TEXT,
    decided_by UUID NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    family_informed BOOLEAN,
    family_informed_rationale TEXT
);

CREATE TABLE sg.sg_transmission (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID NOT NULL REFERENCES sg.sg_case(id) ON DELETE CASCADE,
    transmitted_to VARCHAR(128) NOT NULL,
    transmitted_by UUID NOT NULL,
    transmitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reference VARCHAR(128),
    acknowledgement_received BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledgement_at TIMESTAMPTZ
);

CREATE TABLE sg.sg_harassment_step (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID NOT NULL REFERENCES sg.sg_case(id) ON DELETE CASCADE,
    step VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    due_date DATE,
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    notes TEXT,
    faits_niveau INT,
    faits_declared BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sg.sg_contact_directory (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    kind VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    value VARCHAR(512) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sg.sg_template (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    name VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    legal_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sg.sg_training (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    user_id UUID NOT NULL,
    completed_at DATE NOT NULL,
    expires_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sg.sg_break_glass (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID REFERENCES sg.sg_case(id),
    requester_id UUID NOT NULL,
    reason TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    reviewed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE sg.sg_export_request (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID NOT NULL REFERENCES sg.sg_case(id),
    requested_by UUID NOT NULL,
    approved_by UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    watermark VARCHAR(255),
    link_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sg.sg_alert (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID REFERENCES sg.sg_case(id),
    kind VARCHAR(64) NOT NULL,
    message VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ
);

CREATE TABLE sg.sg_access_audit (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    case_id UUID REFERENCES sg.sg_case(id),
    actor_id UUID NOT NULL,
    action VARCHAR(64) NOT NULL,
    sections VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'sg.sg_case','sg.sg_case_party','sg.sg_case_entry','sg.sg_case_attachment',
    'sg.sg_access_grant','sg.sg_decision','sg.sg_transmission','sg.sg_harassment_step',
    'sg.sg_contact_directory','sg.sg_template','sg.sg_training','sg.sg_break_glass',
    'sg.sg_export_request','sg.sg_alert','sg.sg_access_audit'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %s USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END$$;

CREATE INDEX idx_sg_case_school ON sg.sg_case(school_id);
CREATE INDEX idx_sg_case_status ON sg.sg_case(school_id, status);
CREATE INDEX idx_sg_entry_case ON sg.sg_case_entry(case_id);
CREATE INDEX idx_sg_grant_case ON sg.sg_access_grant(case_id);
CREATE INDEX idx_sg_audit_case ON sg.sg_access_audit(case_id);
