-- ============================================================================
-- Migration: 002_create_agent_messages
-- Description: Creates agent_messages table for chat persistence
-- ============================================================================

CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT agent_messages_valid_agent_type CHECK (agent_type IN (
    'leads', 'content', 'partners', 'contracts', 
    'compliance', 'receivables', 'spend', 'pricing'
  ))
);

-- Performance indexes
CREATE INDEX idx_agent_messages_org_agent ON agent_messages(org_id, agent_type);
CREATE INDEX idx_agent_messages_task ON agent_messages(task_id);
CREATE INDEX idx_agent_messages_created ON agent_messages(created_at DESC);
CREATE INDEX idx_agent_messages_org_created ON agent_messages(org_id, created_at DESC);

-- Enable RLS
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org's messages"
  ON agent_messages FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert messages for their org"
  ON agent_messages FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE agent_messages;
