-- ============================================================================
-- Migration: 001_create_agent_tasks
-- Description: Creates agent_tasks table for tracking individual agent operations
-- ============================================================================

CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'cancelled'
  )),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  params JSONB DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  credits_consumed INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT agent_tasks_valid_agent_type CHECK (agent_type IN (
    'leads', 'content', 'partners', 'contracts', 
    'compliance', 'receivables', 'spend', 'pricing'
  ))
);

-- Performance indexes
CREATE INDEX idx_agent_tasks_org ON agent_tasks(org_id);
CREATE INDEX idx_agent_tasks_org_agent ON agent_tasks(org_id, agent_type);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_created ON agent_tasks(created_at DESC);

-- Enable RLS
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org's tasks"
  ON agent_tasks FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert tasks for their org"
  ON agent_tasks FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update their org's tasks"
  ON agent_tasks FOR UPDATE
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));
