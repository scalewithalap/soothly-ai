-- =============================================================================
-- Migration 0005 — Missing agent work tables: prospects, proposals,
--                  support_tickets
-- =============================================================================
-- Audit (Phase 4a, 2026-06-10): the Proposal agent writes to `prospects` and
-- `proposals`, and Customer Success reads/writes `support_tickets` — none of
-- these tables existed in schema.sql. Columns below are derived from every
-- read/write site in inngest/functions/{proposal,customer_success}.ts and
-- app/api/agents/{proposals,support}/.
--
-- Apply after 0001-0004. Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. prospects — Proposal agent's analysis targets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  website_url text NOT NULL,
  company_name text,
  industry text,
  company_size text,
  analysis_data jsonb,
  status text NOT NULL DEFAULT 'analyzing',  -- analyzing|analyzed|proposal_ready|failed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prospects_org_idx ON public.prospects (org_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. proposals — generated proposal documents (content = structured JSON;
--    PDF is rendered on demand via /api/agents/proposals/[id]/pdf)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  title text NOT NULL,
  content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft',      -- draft|sent|accepted|rejected
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proposals_org_idx ON public.proposals (org_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. support_tickets — Customer Success agent queue (widget + API)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_email text,
  user_name text,
  subject text,
  question text NOT NULL,
  response text,
  ai_response text,
  ai_confidence double precision,
  from_cache boolean DEFAULT false,
  intent text,
  status text NOT NULL DEFAULT 'open',       -- open|in_progress|resolved|escalated|closed
  escalation_reason text,
  source text DEFAULT 'widget',              -- widget|email|api
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_org_status_idx
  ON public.support_tickets (org_id, status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. RLS — org-scoped access, same posture as the rest of the schema.
--    Service-role (agents/webhooks) bypasses RLS; authenticated users are
--    restricted to rows in their own org.
-- ---------------------------------------------------------------------------
ALTER TABLE public.prospects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='prospects' AND policyname='prospects_org_members') THEN
    CREATE POLICY prospects_org_members ON public.prospects
      USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='proposals' AND policyname='proposals_org_members') THEN
    CREATE POLICY proposals_org_members ON public.proposals
      USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='support_tickets' AND policyname='support_tickets_org_members') THEN
    CREATE POLICY support_tickets_org_members ON public.support_tickets
      USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));
  END IF;
END $$;
