-- ============================================================================
-- Migration: 003_create_mcp_servers
-- Description: Creates mcp_servers table for MCP integration extensibility
-- ============================================================================

CREATE TABLE mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  transport TEXT NOT NULL DEFAULT 'stdio' CHECK (transport IN ('stdio', 'sse', 'websocket')),
  auth_type TEXT CHECK (auth_type IN ('none', 'api_key', 'bearer', 'basic')),
  credentials_encrypted TEXT,
  enabled BOOLEAN DEFAULT true,
  last_health_check TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(org_id, name)
);

-- Performance indexes
CREATE INDEX idx_mcp_servers_org ON mcp_servers(org_id);
CREATE INDEX idx_mcp_servers_enabled ON mcp_servers(org_id, enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their org's MCP servers"
  ON mcp_servers FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage their org's MCP servers"
  ON mcp_servers FOR ALL
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_mcp_servers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mcp_servers_updated_at
  BEFORE UPDATE ON mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION update_mcp_servers_updated_at();
