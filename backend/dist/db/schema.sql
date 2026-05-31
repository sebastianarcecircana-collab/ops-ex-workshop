-- Operation Quicksilver — PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cohorts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id  TEXT NOT NULL DEFAULT 'monaco-syndicate',
  join_code   TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id     UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  callsign      TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  current_gate  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cohort_id, callsign)
);

CREATE TABLE IF NOT EXISTS submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  gate_number         INTEGER NOT NULL,
  artifact_json       JSONB NOT NULL,
  status              TEXT NOT NULL DEFAULT 'evaluating'
                        CHECK (status IN ('evaluating', 'complete', 'error')),
  quality_signals_json JSONB,
  feedback_text       TEXT,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_at        TIMESTAMPTZ,
  UNIQUE (team_id, gate_number)
);

CREATE TABLE IF NOT EXISTS scenarios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  status              TEXT NOT NULL DEFAULT 'generating'
                        CHECK (status IN ('generating', 'complete', 'error')),
  acts_json           JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcome_type        TEXT CHECK (outcome_type IN ('clean_success', 'partial_success', 'failure')),
  weighted_aggregate  FLOAT,
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_teams_cohort ON teams(cohort_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team ON submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_gate ON submissions(team_id, gate_number);
CREATE INDEX IF NOT EXISTS idx_scenarios_team ON scenarios(team_id);
