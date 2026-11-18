-- V12__provider.sql
CREATE TABLE provider_org (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    legal_name VARCHAR(255) NOT NULL,
    siret VARCHAR(32),
    status VARCHAR(32) NOT NULL DEFAULT 'onboarding',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE provider_contract (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    org_id UUID NOT NULL REFERENCES provider_org(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    term_start DATE NOT NULL,
    term_end DATE NOT NULL,
    scope TEXT,
    price_cents INT NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provider_user (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    org_id UUID NOT NULL REFERENCES provider_org(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provider_document (
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

CREATE TABLE provider_session_assignment (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    org_id UUID NOT NULL REFERENCES provider_org(id),
    user_id UUID NOT NULL REFERENCES provider_user(id),
    session_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provider_session_report (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    session_id UUID NOT NULL,
    author_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provider_incident (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    session_id UUID,
    description TEXT NOT NULL,
    reported_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provider_invoice (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    org_id UUID NOT NULL REFERENCES provider_org(id),
    number VARCHAR(64) NOT NULL,
    amount_cents INT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(32) NOT NULL DEFAULT 'submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provider_invoice_line (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    invoice_id UUID NOT NULL REFERENCES provider_invoice(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price_cents INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provider_charter_acceptance (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    user_id UUID NOT NULL,
    charter_version INT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE provider_feedback (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.school(id),
    org_id UUID NOT NULL REFERENCES provider_org(id),
    rating INT,
    note TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'provider_org','provider_contract','provider_user','provider_document',
    'provider_session_assignment','provider_session_report','provider_incident',
    'provider_invoice','provider_invoice_line','provider_charter_acceptance','provider_feedback'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %I USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END$$;

CREATE INDEX idx_provider_org_school ON provider_org(school_id);
CREATE INDEX idx_provider_user_org ON provider_user(org_id);
