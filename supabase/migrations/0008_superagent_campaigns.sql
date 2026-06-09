-- =============================================================================
-- Migration 0008 — superagent_campaigns table (phantom table #10)
-- =============================================================================
-- Phase 5 audit (2026-06-10): the entire Superagent orchestration layer
-- (plan/execute/cancel + campaigns API + UI) reads/writes
-- superagent_campaigns, which never existed in schema.sql.
-- Columns derived from inngest/functions/superagent.ts and
-- app/api/agents/superagent/campaigns/*.
-- Apply after 0001-0007. Idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.superagent_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,                          -- niche_takeover|content_blitz|outbound_campaign|competitive_response|custom
  objective text,
  inputs jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{id, agentType, action, params, dependsOn, status, completedAt}]
  results jsonb,
  status text NOT NULL DEFAULT 'planning',     -- planning|executing|completed|failed|cancelled
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS superagent_campaigns_org_idx
  ON public.superagent_campaigns (org_id, created_at DESC);

ALTER TABLE public.superagent_campaigns ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='superagent_campaigns' AND policyname='superagent_campaigns_org_members') THEN
    CREATE POLICY superagent_campaigns_org_members ON public.superagent_campaigns
      USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
