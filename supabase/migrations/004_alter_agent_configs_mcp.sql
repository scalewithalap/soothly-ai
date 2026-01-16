-- ============================================================================
-- Migration: 004_alter_agent_configs_mcp
-- Description: Adds MCP server references to agent_configs table
-- ============================================================================

ALTER TABLE agent_configs 
ADD COLUMN IF NOT EXISTS mcp_server_ids UUID[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN agent_configs.mcp_server_ids IS 'Array of MCP server IDs this agent can use';
