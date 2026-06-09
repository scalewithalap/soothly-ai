-- =============================================================================
-- Migration 0009 — RLS hardening across the original schema (LAUNCH BLOCKER)
-- =============================================================================
-- Phase 6 security pass (2026-06-10): llms.txt mandates "Enforce RLS on every
-- table", but schema.sql contained ZERO `ENABLE ROW LEVEL SECURITY`
-- statements. With RLS off, any authenticated user could read/write OTHER
-- ORGS' rows through PostgREST using the anon key. Migrations 0005-0008
-- secured their own new tables; this migration covers the original ones.
--
-- Model:
--   * service_role bypasses RLS — agents, webhooks, and Inngest workflows
--     (all using the admin client) are unaffected.
--   * authenticated users: org-scoped via public.current_org_id() helper
--     (SECURITY DEFINER avoids the users-table self-reference recursion).
--   * tables with no policy stay RLS-enabled = deny-by-default for anon and
--     authenticated (service-role-only tables).
--
-- Apply after 0001-0008. Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Helper: the caller's org id (bypasses RLS to avoid recursion on users)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.current_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- 1. Org-scoped tables: members can access their own org's rows
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  org_tables text[] := ARRAY[
    'a2a_tasks','activities','affiliates','agent_config','agent_memories',
    'agent_messages','agent_tasks','agent_thoughts','agent_traces',
    'api_key_usage_logs','api_keys','approval_requests','articles',
    'audit_log','companies','contacts','content_briefs','coupon_redemptions',
    'crm_entity_mappings','email_sequence_enrollments','email_sequences',
    'guardrail_policies','guardrail_violations','integrations','keywords',
    'knowledge_base_documents','knowledge_base_embeddings','lead_campaigns',
    'lead_contacts','mcp_servers','memory_checkpoints','notification_settings',
    'notifications','oauth_connections','org_assets','org_usage',
    'outreach_emails','outreach_sequences','partner_outreach','partners',
    'semantic_cache','superagent_rate_limits','team_invitations',
    'webhook_connections','webhook_deliveries','webhook_events','webhooks',
    'widget_configs','workflow_runs','workflows'
  ];
BEGIN
  FOREACH t IN ARRAY org_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename = t AND policyname = t || '_org_members') THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id())',
        t || '_org_members', t
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. users — self + same-org visibility; self-update only
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='users_select_same_org') THEN
    CREATE POLICY users_select_same_org ON public.users
      FOR SELECT USING (id = auth.uid() OR org_id = public.current_org_id());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='users_update_self') THEN
    CREATE POLICY users_update_self ON public.users
      FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. organizations — members read; updates via service role only
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organizations' AND policyname='organizations_member_read') THEN
    CREATE POLICY organizations_member_read ON public.organizations
      FOR SELECT USING (id = public.current_org_id());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Public read-only catalogs (active rows only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_feature_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='subscription_plans' AND policyname='plans_public_read') THEN
    CREATE POLICY plans_public_read ON public.subscription_plans
      FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tier_feature_limits' AND policyname='limits_public_read') THEN
    CREATE POLICY limits_public_read ON public.tier_feature_limits
      FOR SELECT USING (true);
  END IF;
  -- feature_flags: no policy — service-role only (flags may gate unreleased work)
END $$;

-- ---------------------------------------------------------------------------
-- 5. User-scoped tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.widget_sessions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='widget_sessions' AND policyname='widget_sessions_self') THEN
    CREATE POLICY widget_sessions_self ON public.widget_sessions
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Service-role-only tables: RLS on, NO policies = deny anon/authenticated.
--    (password_reset_tokens, widget_auth_sessions, api_rate_limits,
--     system_configs, affiliate_* internals, sequence internals, workflow
--     internals, agent_configs already dropped in 0003.)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  locked_tables text[] := ARRAY[
    'password_reset_tokens','widget_auth_sessions','api_rate_limits',
    'system_configs','affiliate_commissions','affiliate_payouts',
    'affiliate_referrals','discount_coupons','email_sequence_events',
    'email_sequence_steps','workflow_node_executions'
  ];
BEGIN
  FOREACH t IN ARRAY locked_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Verification (run manually):
--    SELECT count(*) FROM pg_tables t WHERE schemaname='public'
--      AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--                      WHERE n.nspname='public' AND c.relname=t.tablename AND c.relrowsecurity);
--    -- expect 0 (every public table has RLS enabled)
-- ---------------------------------------------------------------------------
