-- V1__init.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE school (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Paris',
    locale VARCHAR(8) NOT NULL DEFAULT 'fr',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE membership (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    user_subject VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    role VARCHAR(32) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    birth_date DATE,
    ine_number VARCHAR(32),
    class_id UUID,
    enrolment_date DATE,
    languages_spoken VARCHAR(255),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE school ENABLE ROW LEVEL SECURITY;
ALTER TABLE school FORCE ROW LEVEL SECURITY;
CREATE POLICY school_isolation ON school
  USING (school_id = nullif(current_setting('app.current_school', true), '')::uuid)
  WITH CHECK (school_id = nullif(current_setting('app.current_school', true), '')::uuid);

ALTER TABLE membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership FORCE ROW LEVEL SECURITY;
CREATE POLICY school_isolation ON membership
  USING (school_id = nullif(current_setting('app.current_school', true), '')::uuid)
  WITH CHECK (school_id = nullif(current_setting('app.current_school', true), '')::uuid);

ALTER TABLE student ENABLE ROW LEVEL SECURITY;
ALTER TABLE student FORCE ROW LEVEL SECURITY;
CREATE POLICY school_isolation ON student
  USING (school_id = nullif(current_setting('app.current_school', true), '')::uuid)
  WITH CHECK (school_id = nullif(current_setting('app.current_school', true), '')::uuid);

CREATE INDEX idx_membership_school ON membership(school_id);
CREATE INDEX idx_student_school ON student(school_id);
