-- V7__guardian_portal.sql
-- PROMPT 005 — guardian / family portal.
--
-- Every table is tenant-scoped with forced RLS on app.current_school. The runtime role
-- schoolos_app never owns these tables. Guardian row scope is enforced twice: this schema's
-- school_id policy and the family service's guardian_child lookup derived from the JWT subject.
-- No table stores a school id supplied by a request.

-- ---------------------------------------------------------------- relationship model

ALTER TABLE guardian_child
    ADD COLUMN holds_parental_authority BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN right_to_information BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN is_financial_payer BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN is_emergency_contact BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN emergency_priority INT,
    ADD COLUMN may_collect_child BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN lives_with_child BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'active',
    ADD COLUMN valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN valid_to DATE,
    ADD COLUMN revoked_at TIMESTAMPTZ,
    ADD COLUMN revoked_reason VARCHAR(255);

CREATE INDEX idx_guardian_child_status ON guardian_child(school_id, guardian_subject, status);

CREATE TABLE guardian_invitation (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    invited_name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    invited_by_sub VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_guardian_invitation_token ON guardian_invitation(school_id, token_hash);
CREATE INDEX idx_guardian_invitation_child ON guardian_invitation(school_id, child_id);

CREATE TABLE guardian_restriction (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    guardian_subject VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL,
    scope VARCHAR(255) NOT NULL,
    court_document_ref VARCHAR(128) NOT NULL,
    court_document_name VARCHAR(255),
    set_by VARCHAR(255) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    active BOOLEAN NOT NULL DEFAULT true,
    note TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guardian_restriction_child ON guardian_restriction(school_id, child_id, active);
CREATE INDEX idx_guardian_restriction_guardian ON guardian_restriction(school_id, guardian_subject, active);

CREATE TABLE family_policy_config (
    school_id UUID PRIMARY KEY REFERENCES school(id),
    age_policy VARCHAR(32) NOT NULL DEFAULT 'require_student_consent',
    canteen_mode VARCHAR(16) NOT NULL DEFAULT 'school',
    grade_ranking_enabled BOOLEAN NOT NULL DEFAULT false,
    both_guardians_meeting_default BOOLEAN NOT NULL DEFAULT true,
    absence_threshold_unjustified INT NOT NULL DEFAULT 4,
    absence_threshold_late INT NOT NULL DEFAULT 6,
    absence_threshold_label VARCHAR(255) NOT NULL DEFAULT 'Seuil d’alerte informative — aucune sanction automatique.',
    signature_notice TEXT NOT NULL DEFAULT 'TODO(legal-review) — valeur juridique de la signature électronique à valider.',
    ics_ttl_minutes INT NOT NULL DEFAULT 10080,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- attendance / calendar

CREATE TABLE family_attendance_day (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    status VARCHAR(16) NOT NULL,
    justification VARCHAR(16) NOT NULL,
    reason_label VARCHAR(255),
    arrived_at TIME,
    note TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, child_id, day)
);

CREATE TABLE family_absence_declaration (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    created_by_sub VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    period VARCHAR(16) NOT NULL DEFAULT 'full_day',
    reason_code VARCHAR(64) NOT NULL,
    reason_label VARCHAR(255) NOT NULL,
    reason_text VARCHAR(500),
    status VARCHAR(16) NOT NULL DEFAULT 'submitted',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_absence_child ON family_absence_declaration(school_id, child_id, from_date);

CREATE TABLE family_timetable_entry (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject VARCHAR(128) NOT NULL,
    room VARCHAR(64),
    teacher_name VARCHAR(255),
    change_kind VARCHAR(32),
    change_note VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_timetable_child ON family_timetable_entry(school_id, child_id, day_of_week);

CREATE TABLE family_calendar_event (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    title VARCHAR(255) NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    kind VARCHAR(32) NOT NULL,
    child_id UUID REFERENCES student(id),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- homework / grades

CREATE TABLE family_homework_item (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    subject VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    teacher_name VARCHAR(255),
    assigned_at DATE NOT NULL,
    due_at DATE NOT NULL,
    attachment_name VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_homework_child ON family_homework_item(school_id, child_id, due_at);

CREATE TABLE family_homework_read (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    homework_id UUID NOT NULL REFERENCES family_homework_item(id) ON DELETE CASCADE,
    guardian_subject VARCHAR(255) NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, homework_id, guardian_subject)
);

CREATE TABLE family_assessment (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    subject VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    assessed_at DATE NOT NULL,
    score NUMERIC(6,2) NOT NULL,
    out_of NUMERIC(6,2) NOT NULL DEFAULT 20,
    coefficient NUMERIC(5,2) NOT NULL DEFAULT 1,
    class_average NUMERIC(6,2),
    comment TEXT,
    published_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_assessment_child ON family_assessment(school_id, child_id, subject);

CREATE TABLE family_bulletin (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    term VARCHAR(64) NOT NULL,
    average NUMERIC(6,2) NOT NULL,
    class_average NUMERIC(6,2),
    published_at TIMESTAMPTZ,
    document_key VARCHAR(512),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE family_bulletin_ack (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    bulletin_id UUID NOT NULL REFERENCES family_bulletin(id) ON DELETE CASCADE,
    guardian_subject VARCHAR(255) NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, bulletin_id, guardian_subject)
);

-- ---------------------------------------------------------------- forms / consent

CREATE TABLE family_form_assignment (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    template_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    form_type VARCHAR(32) NOT NULL,
    signatory_rule VARCHAR(32) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    due_at DATE NOT NULL,
    issued_at DATE NOT NULL,
    withdrawable BOOLEAN NOT NULL DEFAULT false,
    legal_notice TEXT NOT NULL,
    attachment_name VARCHAR(255),
    routes_to VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_form_child ON family_form_assignment(school_id, child_id, due_at);

CREATE TABLE family_form_required_signer (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    form_id UUID NOT NULL REFERENCES family_form_assignment(id) ON DELETE CASCADE,
    signer_sub VARCHAR(255) NOT NULL,
    UNIQUE (school_id, form_id, signer_sub)
);

CREATE TABLE family_form_signature (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    form_id UUID NOT NULL REFERENCES family_form_assignment(id) ON DELETE CASCADE,
    signer_sub VARCHAR(255) NOT NULL,
    signer_name VARCHAR(255) NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    document_hash VARCHAR(128) NOT NULL,
    ip_hash VARCHAR(128) NOT NULL,
    device VARCHAR(255) NOT NULL,
    method VARCHAR(16) NOT NULL,
    proof_label VARCHAR(255) NOT NULL,
    UNIQUE (school_id, form_id, signer_sub)
);

CREATE TABLE family_consent (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    purpose VARCHAR(64) NOT NULL,
    label VARCHAR(255) NOT NULL,
    legal_basis VARCHAR(32) NOT NULL DEFAULT 'consent',
    granted BOOLEAN NOT NULL DEFAULT false,
    version_label VARCHAR(32),
    granted_at DATE,
    withdrawn_at TIMESTAMPTZ,
    proof_hash VARCHAR(128),
    text TEXT NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_consent_child ON family_consent(school_id, child_id, purpose);

CREATE TABLE family_authorized_collector (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(64) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    id_check_required BOOLEAN NOT NULL DEFAULT false,
    valid_from DATE NOT NULL,
    valid_to DATE,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    created_by_sub VARCHAR(255) NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    note TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_collector_child ON family_authorized_collector(school_id, child_id);

CREATE TABLE family_contact_change_request (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    guardian_subject VARCHAR(255) NOT NULL,
    fields TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'submitted',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- messages / announcements

CREATE TABLE family_thread (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID REFERENCES student(id),
    subject VARCHAR(255) NOT NULL,
    recipient_role VARCHAR(32) NOT NULL,
    participant_name VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'open',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE family_message (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    thread_id UUID NOT NULL REFERENCES family_thread(id) ON DELETE CASCADE,
    from_sub VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    from_role VARCHAR(32) NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ,
    attachment_name VARCHAR(255)
);
CREATE INDEX idx_family_message_thread ON family_message(school_id, thread_id, sent_at);

CREATE TABLE family_thread_report (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    thread_id UUID NOT NULL REFERENCES family_thread(id) ON DELETE CASCADE,
    reported_by_sub VARCHAR(255) NOT NULL,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason VARCHAR(255)
);

CREATE TABLE family_announcement (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    audience VARCHAR(255),
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    requires_receipt BOOLEAN NOT NULL DEFAULT false,
    category VARCHAR(32) NOT NULL DEFAULT 'school'
);

CREATE TABLE family_announcement_child (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    announcement_id UUID NOT NULL REFERENCES family_announcement(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    UNIQUE (school_id, announcement_id, child_id)
);

CREATE TABLE family_announcement_read (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    announcement_id UUID NOT NULL REFERENCES family_announcement(id) ON DELETE CASCADE,
    guardian_subject VARCHAR(255) NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, announcement_id, guardian_subject)
);

-- ---------------------------------------------------------------- appointments / activities

CREATE TABLE family_appointment_slot (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    teacher_name VARCHAR(255) NOT NULL,
    teacher_role VARCHAR(255),
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    mode VARCHAR(16) NOT NULL,
    location VARCHAR(255),
    topic VARCHAR(255),
    joint_meeting BOOLEAN NOT NULL DEFAULT false,
    booked_by_sub VARCHAR(255),
    booked_by_name VARCHAR(255),
    status VARCHAR(16) NOT NULL DEFAULT 'open',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_appointment_child ON family_appointment_slot(school_id, child_id, slot_date);

CREATE TABLE family_activity_enrolment (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    offering_id UUID,
    activity_name VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'requested',
    waitlist_position INT,
    enrolled_at DATE NOT NULL,
    fee_cents INT NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    consent_required BOOLEAN NOT NULL DEFAULT false,
    consent_granted BOOLEAN NOT NULL DEFAULT false,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_activity_child ON family_activity_enrolment(school_id, child_id);

-- ---------------------------------------------------------------- canteen

CREATE TABLE family_canteen_menu (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    meal_date DATE NOT NULL,
    main VARCHAR(255) NOT NULL,
    vegetarian VARCHAR(255),
    allergens VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE family_canteen_reservation (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    menu_label VARCHAR(255),
    status VARCHAR(16) NOT NULL DEFAULT 'reserved',
    created_by_sub VARCHAR(255) NOT NULL,
    cancelled_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, child_id, meal_date)
);

-- ---------------------------------------------------------------- billing

CREATE TABLE family_invoice (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id),
    label VARCHAR(255) NOT NULL,
    amount_cents INT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    due_date DATE NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'due',
    issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_invoice_child ON family_invoice(school_id, child_id, due_date);

CREATE TABLE family_invoice_payer (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    invoice_id UUID NOT NULL REFERENCES family_invoice(id) ON DELETE CASCADE,
    payer_sub VARCHAR(255) NOT NULL,
    UNIQUE (school_id, invoice_id, payer_sub)
);
CREATE INDEX idx_family_invoice_payer_sub ON family_invoice_payer(school_id, payer_sub);

CREATE TABLE family_payment_receipt (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    invoice_id UUID NOT NULL REFERENCES family_invoice(id),
    payer_sub VARCHAR(255) NOT NULL,
    amount_cents INT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    method VARCHAR(16) NOT NULL,
    psp_reference VARCHAR(64) NOT NULL,
    receipt_name VARCHAR(255) NOT NULL,
    step_up_used BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE family_mandate (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    payer_sub VARCHAR(255) NOT NULL,
    iban_masked VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    signed_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, payer_sub)
);

-- ---------------------------------------------------------------- documents

CREATE TABLE family_document (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'available',
    available_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    storage_key VARCHAR(512),
    watermark VARCHAR(255),
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    requested_at TIMESTAMPTZ,
    requested_by_sub VARCHAR(255),
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_document_child ON family_document(school_id, child_id);

CREATE TABLE family_document_download (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    document_id UUID NOT NULL REFERENCES family_document(id) ON DELETE CASCADE,
    guardian_subject VARCHAR(255) NOT NULL,
    downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    watermark VARCHAR(255) NOT NULL,
    ip_hash VARCHAR(128),
    token_hash VARCHAR(128) NOT NULL
);
CREATE INDEX idx_family_download_guardian ON family_document_download(school_id, guardian_subject, downloaded_at);

-- ---------------------------------------------------------------- notifications / privacy

CREATE TABLE family_notification_preference (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    guardian_subject VARCHAR(255) NOT NULL,
    in_app BOOLEAN NOT NULL DEFAULT true,
    email BOOLEAN NOT NULL DEFAULT true,
    push BOOLEAN NOT NULL DEFAULT false,
    digest_only BOOLEAN NOT NULL DEFAULT false,
    quiet_start TIME NOT NULL DEFAULT '20:00',
    quiet_end TIME NOT NULL DEFAULT '07:00',
    language VARCHAR(8) NOT NULL DEFAULT 'fr',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, guardian_subject)
);

CREATE TABLE family_notification (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    guardian_subject VARCHAR(255) NOT NULL,
    child_id UUID REFERENCES student(id),
    category VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body VARCHAR(500) NOT NULL,
    content_free BOOLEAN NOT NULL DEFAULT true,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_notification_guardian ON family_notification(school_id, guardian_subject, created_at);

CREATE TABLE family_data_request (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    guardian_subject VARCHAR(255) NOT NULL,
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'submitted',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE family_concern (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    child_id UUID REFERENCES student(id) ON DELETE SET NULL,
    guardian_subject VARCHAR(255) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'school_life',
    message TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'submitted',
    acknowledged_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE family_ics_token (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    guardian_subject VARCHAR(255) NOT NULL,
    child_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    token_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    UNIQUE (school_id, token_hash)
);
CREATE INDEX idx_family_ics_guardian ON family_ics_token(school_id, guardian_subject, child_id);

CREATE TABLE family_device_session (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    guardian_subject VARCHAR(255) NOT NULL,
    device VARCHAR(255) NOT NULL,
    user_agent VARCHAR(512),
    ip_hash VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE family_audit_event (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    actor_sub VARCHAR(255) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    target_type VARCHAR(64),
    target_id VARCHAR(128),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_family_audit_school ON family_audit_event(school_id, occurred_at);
CREATE INDEX idx_family_audit_actor ON family_audit_event(school_id, actor_sub, occurred_at);

-- ---------------------------------------------------------------- RLS

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'guardian_invitation','guardian_restriction','family_policy_config',
    'family_attendance_day','family_absence_declaration','family_timetable_entry',
    'family_calendar_event','family_homework_item','family_homework_read',
    'family_assessment','family_bulletin','family_bulletin_ack',
    'family_form_assignment','family_form_required_signer','family_form_signature',
    'family_consent','family_authorized_collector','family_contact_change_request',
    'family_thread','family_message','family_thread_report','family_announcement',
    'family_announcement_child','family_announcement_read','family_appointment_slot',
    'family_activity_enrolment','family_canteen_menu','family_canteen_reservation',
    'family_invoice','family_invoice_payer','family_payment_receipt','family_mandate',
    'family_document','family_document_download','family_notification_preference',
    'family_notification','family_data_request','family_concern','family_ics_token',
    'family_device_session','family_audit_event'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %I USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------- privileges

GRANT SELECT, INSERT, UPDATE, DELETE ON
    guardian_invitation, guardian_restriction, family_policy_config,
    family_attendance_day, family_absence_declaration, family_timetable_entry,
    family_calendar_event, family_homework_item, family_homework_read,
    family_assessment, family_bulletin, family_bulletin_ack,
    family_form_assignment, family_form_required_signer, family_form_signature,
    family_consent, family_authorized_collector, family_contact_change_request,
    family_thread, family_message, family_thread_report, family_announcement,
    family_announcement_child, family_announcement_read, family_appointment_slot,
    family_activity_enrolment, family_canteen_menu, family_canteen_reservation,
    family_invoice, family_invoice_payer, family_payment_receipt, family_mandate,
    family_document, family_document_download, family_notification_preference,
    family_notification, family_data_request, family_concern, family_ics_token,
    family_device_session
TO schoolos_app;

-- Audit trail is append-only: no UPDATE or DELETE for the runtime role.
REVOKE UPDATE, DELETE ON family_audit_event FROM schoolos_app;
GRANT SELECT, INSERT ON family_audit_event TO schoolos_app;

-- Receipts and signatures are immutable once written.
REVOKE UPDATE, DELETE ON family_form_signature, family_payment_receipt FROM schoolos_app;
