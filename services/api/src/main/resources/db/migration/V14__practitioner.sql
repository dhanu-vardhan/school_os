-- V14__practitioner.sql
CREATE TABLE practitioner_org (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    legal_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'onboarding',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE practitioner_user (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    org_id UUID NOT NULL REFERENCES practitioner_org(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE practitioner_document (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    subject_type VARCHAR(16) NOT NULL,
    subject_id UUID NOT NULL,
    doc_type VARCHAR(64) NOT NULL,
    issuer VARCHAR(255),
    valid_from DATE,
    valid_to DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    storage_key VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE practitioner_assignment (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    practitioner_user_id UUID NOT NULL REFERENCES practitioner_user(id),
    student_id UUID NOT NULL REFERENCES public.student(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE practitioner_consent (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    assignment_id UUID NOT NULL REFERENCES practitioner_assignment(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL,
    consented BOOLEAN NOT NULL DEFAULT FALSE,
    consented_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE practitioner_session (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    assignment_id UUID NOT NULL REFERENCES practitioner_assignment(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(128),
    outcome_code VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE coordination_vocabulary (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    code VARCHAR(64) NOT NULL,
    label_fr VARCHAR(255) NOT NULL,
    label_en VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE coordination_point (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    assignment_id UUID NOT NULL REFERENCES practitioner_assignment(id) ON DELETE CASCADE,
    vocab_code VARCHAR(64) NOT NULL,
    justification TEXT,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    review_date DATE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE practitioner_report_aggregate (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    term VARCHAR(32) NOT NULL,
    intervention_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'practitioner_org','practitioner_user','practitioner_document','practitioner_assignment',
    'practitioner_consent','practitioner_session','coordination_vocabulary','coordination_point',
    'practitioner_report_aggregate'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %I USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END$$;

CREATE INDEX idx_practitioner_assignment_student ON practitioner_assignment(student_id);
CREATE INDEX idx_coordination_point_assignment ON coordination_point(assignment_id);
