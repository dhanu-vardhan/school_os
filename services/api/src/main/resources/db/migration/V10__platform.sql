-- V10__platform.sql
CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE platform.tenant (
    id UUID PRIMARY KEY,
    legal_name VARCHAR(255) NOT NULL,
    uai_code VARCHAR(32),
    siret VARCHAR(32),
    school_type VARCHAR(64) NOT NULL,
    academic_zone VARCHAR(8),
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris',
    locale VARCHAR(8) NOT NULL DEFAULT 'fr',
    data_region VARCHAR(32) NOT NULL DEFAULT 'eu-west',
    state VARCHAR(32) NOT NULL DEFAULT 'provisioning',
    plan VARCHAR(64) NOT NULL DEFAULT 'standard',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE platform.tenant_flag (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES platform.tenant(id) ON DELETE CASCADE,
    flag_key VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rollout INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform.platform_audit_log (
    id UUID PRIMARY KEY,
    actor_id UUID NOT NULL,
    action VARCHAR(128) NOT NULL,
    tenant_id UUID REFERENCES platform.tenant(id),
    before_state TEXT,
    after_state TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform.support_ticket (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES platform.tenant(id),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    sla_due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE platform.breach_record (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES platform.tenant(id),
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cnil_deadline_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    description TEXT
);

CREATE INDEX idx_platform_tenant_state ON platform.tenant(state);
