-- V5__auth_guardian_scope.sql
-- Row scope on top of tenant RLS: a guardian may only read their linked children and a
-- student only their own record. Tenant isolation remains the outer boundary; this table
-- is what makes "parent sees the whole school" impossible.

ALTER TABLE student ADD COLUMN user_subject VARCHAR(255);
CREATE UNIQUE INDEX uq_student_school_user_subject
    ON student(school_id, user_subject)
    WHERE user_subject IS NOT NULL;

CREATE TABLE guardian_child (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    guardian_subject VARCHAR(255) NOT NULL,
    student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
    relationship VARCHAR(32) NOT NULL DEFAULT 'guardian',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (school_id, guardian_subject, student_id)
);

ALTER TABLE guardian_child ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_child FORCE ROW LEVEL SECURITY;
CREATE POLICY school_isolation ON guardian_child
  USING (school_id = nullif(current_setting('app.current_school', true), '')::uuid)
  WITH CHECK (school_id = nullif(current_setting('app.current_school', true), '')::uuid);

CREATE INDEX idx_guardian_child_school ON guardian_child(school_id);
CREATE INDEX idx_guardian_child_guardian ON guardian_child(school_id, guardian_subject);
