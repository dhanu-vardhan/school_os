-- V9__reception.sql
CREATE TABLE visitor_log (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    purpose VARCHAR(255),
    host VARCHAR(255),
    id_checked BOOLEAN NOT NULL DEFAULT FALSE,
    vehicle VARCHAR(128),
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_out_at TIMESTAMPTZ,
    restricted BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pupil_movement (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    student_id UUID NOT NULL REFERENCES public.student(id),
    movement_type VARCHAR(32) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason VARCHAR(255),
    collector_user_id UUID,
    id_checked BOOLEAN NOT NULL DEFAULT FALSE,
    signature_ref VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE absence_call (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    student_id UUID NOT NULL REFERENCES public.student(id),
    caller_relationship VARCHAR(64),
    reason_category VARCHAR(64),
    expected_return DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    duplicate_of UUID REFERENCES absence_call(id)
);

CREATE TABLE family_request (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    title VARCHAR(255) NOT NULL,
    request_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    assigned_to UUID,
    sla_due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE family_request_event (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    request_id UUID NOT NULL REFERENCES family_request(id) ON DELETE CASCADE,
    actor_id UUID,
    action VARCHAR(64) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE enrolment_appointment (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    family_name VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE enrolment_document (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    appointment_id UUID REFERENCES enrolment_appointment(id),
    doc_type VARCHAR(64) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    scan_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE certificate_issue (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    student_id UUID NOT NULL REFERENCES public.student(id),
    number VARCHAR(64) NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    issued_by UUID NOT NULL,
    reissue_of UUID REFERENCES certificate_issue(id)
);

CREATE TABLE mail_log (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    item_type VARCHAR(32) NOT NULL,
    description VARCHAR(255),
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    handed_over_at TIMESTAMPTZ,
    handed_over_to VARCHAR(255)
);

CREATE TABLE lost_item (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    description VARCHAR(255) NOT NULL,
    photo_key VARCHAR(512),
    found_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    claimed_at TIMESTAMPTZ,
    claimed_by VARCHAR(255)
);

CREATE TABLE room_booking (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    room VARCHAR(128) NOT NULL,
    booked_by UUID NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE key_log (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    key_label VARCHAR(128) NOT NULL,
    issued_to UUID NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    returned_at TIMESTAMPTZ
);

CREATE TABLE emergency_event (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    event_type VARCHAR(32) NOT NULL,
    exercise BOOLEAN NOT NULL DEFAULT FALSE,
    triggered_by UUID NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE emergency_ack (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    event_id UUID NOT NULL REFERENCES emergency_event(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE desk_handover_note (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    author_id UUID NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE access_restriction (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    person_id UUID NOT NULL,
    restriction_type VARCHAR(64) NOT NULL,
    note VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'visitor_log','pupil_movement','absence_call','family_request','family_request_event',
    'enrolment_appointment','enrolment_document','certificate_issue','mail_log','lost_item',
    'room_booking','key_log','emergency_event','emergency_ack','desk_handover_note','access_restriction'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %I USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END$$;

CREATE INDEX idx_visitor_log_school ON visitor_log(school_id);
CREATE INDEX idx_pupil_movement_school ON pupil_movement(school_id);
CREATE INDEX idx_absence_call_school ON absence_call(school_id);
CREATE INDEX idx_family_request_school ON family_request(school_id);
