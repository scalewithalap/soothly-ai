-- A2A Protocol Tasks Table
-- Stores tasks for Agent-to-Agent protocol
-- Applied via Supabase MCP: 2026-01-18

CREATE TABLE IF NOT EXISTS a2a_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id TEXT,
  external_agent_url TEXT,
  task_spec JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'working', 'input-required', 'completed', 'failed', 'canceled')),
  messages JSONB NOT NULL DEFAULT '[]',
  artifacts JSONB NOT NULL DEFAULT '[]',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_org ON a2a_tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_status ON a2a_tasks(status);
CREATE INDEX IF NOT EXISTS idx_a2a_tasks_session ON a2a_tasks(session_id) WHERE session_id IS NOT NULL;

-- RLS Policies
ALTER TABLE a2a_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org a2a_tasks"
  ON a2a_tasks FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own org a2a_tasks"
  ON a2a_tasks FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own org a2a_tasks"
  ON a2a_tasks FOR UPDATE
  USING (org_id IN (SELECT org_id FROM users WHERE id = auth.uid()));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_a2a_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER a2a_tasks_updated_at
  BEFORE UPDATE ON a2a_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_a2a_tasks_updated_at();

COMMENT ON TABLE a2a_tasks IS 'A2A Protocol tasks for agent-to-agent communication';
