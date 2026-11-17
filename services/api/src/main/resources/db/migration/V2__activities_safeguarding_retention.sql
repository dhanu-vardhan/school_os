-- V2__activities_safeguarding_retention.sql

CREATE TABLE activity (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    description TEXT,
    min_age INT,
    max_age INT,
    pedagogical_category VARCHAR(64),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_offering (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    activity_id UUID NOT NULL REFERENCES activity(id),
    term VARCHAR(64),
    capacity INT NOT NULL DEFAULT 0,
    min_enrolment INT NOT NULL DEFAULT 0,
    price_cents INT NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    registration_open_at TIMESTAMPTZ,
    registration_close_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    location VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_session (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    offering_id UUID NOT NULL REFERENCES activity_offering(id),
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    instructor_id UUID,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_registration (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    offering_id UUID NOT NULL REFERENCES activity_offering(id),
    student_id UUID NOT NULL REFERENCES student(id),
    status VARCHAR(32) NOT NULL DEFAULT 'requested',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_attendance (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    session_id UUID NOT NULL REFERENCES activity_session(id),
    student_id UUID NOT NULL REFERENCES student(id),
    status VARCHAR(32) NOT NULL DEFAULT 'present',
    note TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE safeguarding_concern (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    reported_by VARCHAR(255) NOT NULL,
    subject_student_id UUID REFERENCES student(id),
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE retention_policy (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    data_type VARCHAR(64) NOT NULL,
    retention_days INT NOT NULL,
    action VARCHAR(32) NOT NULL DEFAULT 'delete',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE consent_record (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    student_id UUID REFERENCES student(id),
    guardian_id UUID,
    consent_type VARCHAR(64) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for all new tenant tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['activity','activity_offering','activity_session','activity_registration','activity_attendance','safeguarding_concern','retention_policy','consent_record'])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %I USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END$$;

CREATE INDEX idx_activity_school ON activity(school_id);
CREATE INDEX idx_activity_offering_school ON activity_offering(school_id);
CREATE INDEX idx_activity_session_school ON activity_session(school_id);
CREATE INDEX idx_activity_registration_school ON activity_registration(school_id);
CREATE INDEX idx_activity_attendance_school ON activity_attendance(school_id);
CREATE INDEX idx_safeguarding_concern_school ON safeguarding_concern(school_id);
CREATE INDEX idx_retention_policy_school ON retention_policy(school_id);
CREATE INDEX idx_consent_record_school ON consent_record(school_id);
