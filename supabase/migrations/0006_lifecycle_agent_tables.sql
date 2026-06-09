-- =============================================================================
-- Migration 0006 — Lifecycle agent tables: onboarding_tasks, competitors,
--                  competitor_snapshots, competitor_changes
-- =============================================================================
-- Phase 4b audit (2026-06-10): Onboarding writes onboarding_tasks; Competitor
-- Intel reads/writes competitors, competitor_snapshots, competitor_changes —
-- none existed in schema.sql. Columns derived from all read/write sites in
-- inngest/functions/{onboarding,competitor_intel}.ts and
-- app/api/agents/{onboarding,competitors}/.
--
-- Apply after 0001-0005. Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. onboarding_tasks — per-user activation checklist (Onboarding agent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id text NOT NULL,                      -- stable key from role template
  title text NOT NULL,
  description text,
  category text,
  priority text,
  estimated_minutes integer,
  status text NOT NULL DEFAULT 'pending',     -- pending|completed|skipped
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, task_id)
);
CREATE INDEX IF NOT EXISTS onboarding_tasks_user_idx
  ON public.onboarding_tasks (user_id, status);

-- ---------------------------------------------------------------------------
-- 2. competitors — monitored competitors (Competitor Intel agent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  monitored_pages text[] DEFAULT ARRAY['/', '/pricing']::text[],
  status text NOT NULL DEFAULT 'active',      -- active|paused
  last_scanned_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS competitors_org_idx
  ON public.competitors (org_id, status);

-- ---------------------------------------------------------------------------
-- 3. competitor_snapshots — page content captures for diffing
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitor_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  page_url text,
  content_hash text NOT NULL,
  text_content text,
  title text,
  captured_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS competitor_snapshots_lookup_idx
  ON public.competitor_snapshots (competitor_id, page_path, captured_at DESC);

-- ---------------------------------------------------------------------------
-- 4. competitor_changes — detected diffs + strategic analysis (alert feed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitor_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  page_path text,
  change_type text,                           -- pricing|feature|messaging|other
  priority text,                              -- low|medium|high
  summary text,
  strategic_implication text,
  previous_hash text,
  current_hash text,
  is_read boolean DEFAULT false,
  detected_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS competitor_changes_org_idx
  ON public.competitor_changes (org_id, detected_at DESC);

-- ---------------------------------------------------------------------------
-- 5. RLS — org-scoped, same posture as 0005
-- ---------------------------------------------------------------------------
ALTER TABLE public.onboarding_tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_changes   ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['onboarding_tasks','competitors','competitor_snapshots','competitor_changes']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_org_members') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()))',
        t || '_org_members', t
      );
    END IF;
  END LOOP;
END $$;
