-- V3__ai_suggestion.sql
CREATE TABLE ai_suggestion (
    id UUID PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES school(id),
    feature VARCHAR(64) NOT NULL,
    model_id VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'proposed',
    output TEXT,
    decided_by VARCHAR(255),
    decided_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_suggestion ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestion FORCE ROW LEVEL SECURITY;
CREATE POLICY school_isolation ON ai_suggestion
  USING (school_id = nullif(current_setting('app.current_school', true), '')::uuid)
  WITH CHECK (school_id = nullif(current_setting('app.current_school', true), '')::uuid);

CREATE INDEX idx_ai_suggestion_school ON ai_suggestion(school_id);
