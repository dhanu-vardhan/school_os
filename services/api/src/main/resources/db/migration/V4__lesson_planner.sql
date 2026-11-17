-- V4__lesson_planner.sql
-- EPIC 21: lesson plans, resource library and curriculum coverage.
-- No individual pupil data is stored here; records are class-linked teaching content.

CREATE TABLE lesson_plan (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(128),
    level VARCHAR(64),
    class_id UUID,
    planned_date DATE,
    day_of_week SMALLINT,
    start_minute INT NOT NULL DEFAULT 480,
    end_minute INT NOT NULL DEFAULT 525,
    room VARCHAR(128),
    objectives TEXT,
    steps TEXT,
    differentiation_notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    source_plan_id UUID,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_resource (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    title VARCHAR(255) NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'document',
    subject VARCHAR(128),
    level VARCHAR(64),
    -- Slice simplification: tags are stored as a comma-separated list. A dedicated
    -- join table would be the next refactor once tag filtering grows.
    tags VARCHAR(1024) NOT NULL DEFAULT '',
    url VARCHAR(1024),
    file_key VARCHAR(512),
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_plan_resource (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    plan_id UUID NOT NULL REFERENCES lesson_plan(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES lesson_resource(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (plan_id, resource_id)
);

CREATE TABLE curriculum_chapter (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    class_id UUID,
    subject VARCHAR(128),
    title VARCHAR(255) NOT NULL,
    programme_ref VARCHAR(128),
    position INT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE curriculum_coverage (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    chapter_id UUID NOT NULL REFERENCES curriculum_chapter(id) ON DELETE CASCADE,
    lesson_plan_id UUID REFERENCES lesson_plan(id) ON DELETE SET NULL,
    taught_on DATE NOT NULL,
    term VARCHAR(64),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (chapter_id, lesson_plan_id)
);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['lesson_plan','lesson_resource','lesson_plan_resource','curriculum_chapter','curriculum_coverage'])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY school_isolation ON %I USING (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid) WITH CHECK (school_id = nullif(current_setting(''app.current_school'', true), '''')::uuid)', t);
  END LOOP;
END$$;

CREATE INDEX idx_lesson_plan_school ON lesson_plan(school_id);
CREATE INDEX idx_lesson_plan_class_date ON lesson_plan(class_id, planned_date);
CREATE INDEX idx_lesson_resource_school ON lesson_resource(school_id);
CREATE INDEX idx_lesson_plan_resource_school ON lesson_plan_resource(school_id);
CREATE INDEX idx_curriculum_chapter_school ON curriculum_chapter(school_id);
CREATE INDEX idx_curriculum_chapter_class ON curriculum_chapter(class_id);
CREATE INDEX idx_curriculum_coverage_school ON curriculum_coverage(school_id);
CREATE INDEX idx_curriculum_coverage_chapter ON curriculum_coverage(chapter_id);
