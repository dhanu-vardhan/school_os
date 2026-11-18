-- V11__instructor.sql
CREATE TABLE activity_session (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    activity_id UUID NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(128),
    capacity INT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE session_attendance (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    session_id UUID NOT NULL REFERENCES activity_session(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student(id),
    status VARCHAR(16) NOT NULL DEFAULT 'present',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, student_id)
);

CREATE TABLE session_note (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    session_id UUID NOT NULL REFERENCES activity_session(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pickup_check (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    session_id UUID NOT NULL REFERENCES activity_session(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student(id),
    collector_id UUID,
    id_checked BOOLEAN NOT NULL DEFAULT FALSE,
    method VARCHAR(32) NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE autonomous_departure_consent (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    student_id UUID NOT NULL REFERENCES public.student(id),
    granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE ratio_policy (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    age_band VARCHAR(32) NOT NULL,
    ratio INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ratio_exception (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    session_id UUID NOT NULL REFERENCES activity_session(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    recorded_by UUID NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff_document (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    user_id UUID NOT NULL,
    doc_type VARCHAR(64) NOT NULL,
    issuer VARCHAR(255),
    valid_from DATE,
    valid_to DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    storage_key VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE instructor_timesheet (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES activity_session(id),
    hours NUMERIC(5,2) NOT NULL,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_incident (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    session_id UUID REFERENCES activity_session(id),
    student_id UUID REFERENCES public.student(id),
    description TEXT NOT NULL,
    first_aid BOOLEAN NOT NULL DEFAULT FALSE,
    reported_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE funding_export (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    format VARCHAR(64) NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'activity_session','session_attendance','session_note','pickup_check',
    'autonomous_departure_consent','ratio_policy','ratio_exception','staff_document',
    'instructor_timesheet','activity_incident','funding_export'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %I USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END$$;

CREATE INDEX idx_activity_session_school ON activity_session(school_id);
CREATE INDEX idx_session_attendance_session ON session_attendance(session_id);
