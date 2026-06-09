-- =============================================================================
-- Migration 0003 — Consolidate duplicate agent config tables
-- =============================================================================
-- schema.sql defined BOTH agent_config (rich: autonomy_level, stats, config
-- jsonb — used by toggle/stats/export routes) AND agent_configs (thin:
-- settings jsonb, enabled, mcp_server_ids — used only by the Agent base
-- class). One concept, two tables = drift. agent_config wins.
--
-- This migration:
--   1. Adds mcp_server_ids (the only agent_configs column without an
--      agent_config equivalent).
--   2. Copies any agent_configs rows into agent_config
--      (settings→config, enabled→is_active).
--   3. Drops agent_configs.
--   4. Adds the unique index the code's .eq(org).eq(agent_type).single()
--      access pattern assumes.
-- =============================================================================

ALTER TABLE public.agent_config
  ADD COLUMN IF NOT EXISTS mcp_server_ids text[];

INSERT INTO public.agent_config
  (id, org_id, agent_type, config, is_active, mcp_server_ids, created_at, updated_at)
SELECT gen_random_uuid(), ac.org_id, ac.agent_type, ac.settings, ac.enabled,
       ac.mcp_server_ids, COALESCE(ac.created_at, now()), now()
  FROM public.agent_configs ac
 WHERE NOT EXISTS (
   SELECT 1 FROM public.agent_config c
    WHERE c.org_id = ac.org_id AND c.agent_type = ac.agent_type
 );

DROP TABLE IF EXISTS public.agent_configs;

CREATE UNIQUE INDEX IF NOT EXISTS agent_config_org_agent_idx
  ON public.agent_config (org_id, agent_type);
