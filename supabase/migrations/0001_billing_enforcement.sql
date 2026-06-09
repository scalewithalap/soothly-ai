-- =============================================================================
-- Migration 0001 — Billing enforcement: usage RPCs + tier limit seeds
-- =============================================================================
-- Why this exists (found during MVP build, 2026-06-10):
--   * lib/services/usage-limits.ts calls rpc('check_and_increment_usage')
--   * lib/usage/deduct.ts calls rpc('increment_agent_usage')
--   ...but supabase/schema.sql defined ZERO functions. Quota enforcement was
--   failing closed everywhere (every check errored -> denied). This migration
--   makes the enforcement layer real, with org_usage in its narrow per-feature
--   row form: (org_id, feature_key, current_count, period_start, period_end).
--
-- Apply AFTER schema.sql. Idempotent (CREATE OR REPLACE / ON CONFLICT).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. org_usage hygiene: one row per (org, feature, period start)
-- ---------------------------------------------------------------------------
ALTER TABLE public.org_usage
  ALTER COLUMN current_count SET DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS org_usage_org_feature_period_idx
  ON public.org_usage (org_id, feature_key, period_start);

-- ---------------------------------------------------------------------------
-- 2. tier_feature_limits seeds — mirrors lib/billing/tiers.ts (source:
--    .agents/skills/backend-design/resources/pricing-strategy.md)
--    monthly_limit = -1 means feature not available on that tier.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS tier_feature_limits_tier_feature_idx
  ON public.tier_feature_limits (tier, feature_key);

INSERT INTO public.tier_feature_limits (tier, feature_key, monthly_limit, safety_cap) VALUES
  -- FREE
  ('free',   'proposals',            1,     NULL),
  ('free',   'leads_scraped',        10,    NULL),
  ('free',   'partner_contacts',     2,     NULL),
  ('free',   'seo_articles',         1,     NULL),
  ('free',   'competitors',          1,     NULL),
  ('free',   'onboarding_users',     50,    NULL),
  ('free',   'support_messages',     100,   NULL),
  ('free',   'recovery_attempts',    0,     NULL),
  ('free',   'superagent_campaigns', -1,    NULL),
  ('free',   'team_members',         1,     NULL),
  -- LAUNCH $129/mo
  ('launch', 'proposals',            10,    NULL),
  ('launch', 'leads_scraped',        200,   NULL),
  ('launch', 'partner_contacts',     20,    NULL),
  ('launch', 'seo_articles',         10,    NULL),
  ('launch', 'competitors',          3,     NULL),
  ('launch', 'onboarding_users',     1000,  5000),
  ('launch', 'support_messages',     2000,  10000),
  ('launch', 'recovery_attempts',    100,   500),
  ('launch', 'superagent_campaigns', 10,    50),
  ('launch', 'team_members',         2,     NULL),
  -- GROWTH $349/mo
  ('growth', 'proposals',            100,   500),
  ('growth', 'leads_scraped',        1000,  5000),
  ('growth', 'partner_contacts',     100,   500),
  ('growth', 'seo_articles',         50,    200),
  ('growth', 'competitors',          15,    NULL),
  ('growth', 'onboarding_users',     5000,  25000),
  ('growth', 'support_messages',     10000, 50000),
  ('growth', 'recovery_attempts',    1000,  5000),
  ('growth', 'superagent_campaigns', 50,    200),
  ('growth', 'team_members',         10,    NULL),
  -- SCALE $997/mo
  ('scale',  'proposals',            500,   2000),
  ('scale',  'leads_scraped',        5000,  20000),
  ('scale',  'partner_contacts',     500,   2000),
  ('scale',  'seo_articles',         100,   500),
  ('scale',  'competitors',          50,    NULL),
  ('scale',  'onboarding_users',     50000, 200000),
  ('scale',  'support_messages',     50000, 200000),
  ('scale',  'recovery_attempts',    5000,  20000),
  ('scale',  'superagent_campaigns', 200,   1000),
  ('scale',  'team_members',         50,    NULL)
ON CONFLICT (tier, feature_key) DO UPDATE
  SET monthly_limit = EXCLUDED.monthly_limit,
      safety_cap    = EXCLUDED.safety_cap;

-- ---------------------------------------------------------------------------
-- 3. check_and_increment_usage(org, feature, n) — atomic check + increment
--    Returns JSONB consumed by lib/services/usage-limits.ts.
--    Billing period = calendar month anchored on organizations.billing_cycle_anchor
--    (falls back to first of current month when no anchor).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  p_org_id uuid,
  p_feature_key text,
  p_increment_by integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_anchor timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_limit integer;
  v_safety_cap integer;
  v_count integer;
  v_effective_cap integer;
BEGIN
  SELECT COALESCE(subscription_tier, 'free'),
         COALESCE(NULLIF(billing_cycle_anchor, '')::timestamptz,
                  date_trunc('month', now()))
    INTO v_tier, v_anchor
    FROM organizations WHERE id = p_org_id;

  IF v_tier IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false, 'error', 'feature_not_configured',
      'message', 'Organization not found',
      'current_count', 0, 'limit', 0, 'remaining', 0);
  END IF;

  -- Current billing period: most recent anchor-aligned month boundary
  -- (walk forward from anchor; loops at most months-since-anchor times).
  v_period_start := v_anchor;
  WHILE v_period_start + interval '1 month' <= now() LOOP
    v_period_start := v_period_start + interval '1 month';
  END LOOP;
  v_period_end := v_period_start + interval '1 month';

  SELECT monthly_limit, safety_cap INTO v_limit, v_safety_cap
    FROM tier_feature_limits
    WHERE tier = v_tier AND feature_key = p_feature_key;

  IF v_limit IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false, 'error', 'feature_not_configured',
      'message', format('No limit configured for %s on tier %s', p_feature_key, v_tier),
      'current_count', 0, 'limit', 0, 'remaining', 0);
  END IF;

  IF v_limit = -1 THEN
    RETURN jsonb_build_object(
      'allowed', false, 'error', 'limit_exceeded',
      'message', format('%s is not available on the %s plan', p_feature_key, v_tier),
      'current_count', 0, 'limit', 0, 'remaining', 0,
      'period_end', v_period_end);
  END IF;

  -- Upsert + lock the usage row for this period.
  INSERT INTO org_usage (id, org_id, feature_key, current_count, period_start, period_end, created_at)
  VALUES (gen_random_uuid(), p_org_id, p_feature_key, 0,
          v_period_start::text, v_period_end::text, now())
  ON CONFLICT (org_id, feature_key, period_start) DO NOTHING;

  SELECT current_count INTO v_count
    FROM org_usage
    WHERE org_id = p_org_id AND feature_key = p_feature_key
      AND period_start = v_period_start::text
    FOR UPDATE;

  v_effective_cap := COALESCE(v_safety_cap, v_limit);

  IF v_count + p_increment_by > v_effective_cap AND v_count + p_increment_by > v_limit THEN
    IF v_safety_cap IS NOT NULL AND v_count + p_increment_by > v_safety_cap THEN
      RETURN jsonb_build_object(
        'allowed', false, 'error', 'safety_cap_exceeded',
        'message', 'Fair-use safety cap reached. Contact sales to raise it.',
        'current_count', v_count, 'limit', v_limit,
        'remaining', GREATEST(0, v_limit - v_count),
        'safety_cap', v_safety_cap, 'period_end', v_period_end);
    END IF;
  END IF;

  IF v_count + p_increment_by > v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'error', 'limit_exceeded',
      'message', format('Monthly limit reached for %s (%s/%s)', p_feature_key, v_count, v_limit),
      'current_count', v_count, 'limit', v_limit,
      'remaining', GREATEST(0, v_limit - v_count),
      'period_end', v_period_end);
  END IF;

  UPDATE org_usage
    SET current_count = current_count + p_increment_by
    WHERE org_id = p_org_id AND feature_key = p_feature_key
      AND period_start = v_period_start::text;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_count + p_increment_by,
    'limit', v_limit,
    'remaining', GREATEST(0, v_limit - (v_count + p_increment_by)),
    'period_end', v_period_end);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. get_usage_summary(org) — read-only usage snapshot for dashboards.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usage_summary(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_result jsonb := '{}'::jsonb;
  r record;
BEGIN
  SELECT COALESCE(subscription_tier, 'free') INTO v_tier
    FROM organizations WHERE id = p_org_id;

  FOR r IN
    SELECT tfl.feature_key,
           tfl.monthly_limit,
           COALESCE((
             SELECT ou.current_count FROM org_usage ou
              WHERE ou.org_id = p_org_id
                AND ou.feature_key = tfl.feature_key
                AND ou.period_end::timestamptz > now()
              ORDER BY ou.period_start DESC LIMIT 1
           ), 0) AS used
      FROM tier_feature_limits tfl
     WHERE tfl.tier = v_tier
  LOOP
    v_result := v_result || jsonb_build_object(r.feature_key, jsonb_build_object(
      'used', r.used,
      'limit', r.monthly_limit,
      'remaining', CASE WHEN r.monthly_limit < 0 THEN 0
                        ELSE GREATEST(0, r.monthly_limit - r.used) END));
  END LOOP;

  RETURN jsonb_build_object('tier', v_tier, 'features', v_result);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. get_org_usage(org, feature?) — row-shaped usage read used by
--    lib/services/usage-limits.ts getOrgUsage(). Returns one row per feature
--    (or a single row when p_feature_key is provided).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_org_usage(
  p_org_id uuid,
  p_feature_key text DEFAULT NULL
) RETURNS TABLE (
  feature_key text,
  current_count integer,
  "limit" integer,
  remaining integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tfl.feature_key,
         COALESCE(ou.current_count, 0) AS current_count,
         tfl.monthly_limit AS "limit",
         CASE WHEN tfl.monthly_limit < 0 THEN 0
              ELSE GREATEST(0, tfl.monthly_limit - COALESCE(ou.current_count, 0))
         END AS remaining
    FROM tier_feature_limits tfl
    JOIN organizations o ON o.id = p_org_id
         AND tfl.tier = COALESCE(o.subscription_tier, 'free')
    LEFT JOIN LATERAL (
      SELECT ou2.current_count
        FROM org_usage ou2
       WHERE ou2.org_id = p_org_id
         AND ou2.feature_key = tfl.feature_key
         AND ou2.period_end::timestamptz > now()
       ORDER BY ou2.period_start DESC
       LIMIT 1
    ) ou ON true
   WHERE p_feature_key IS NULL OR tfl.feature_key = p_feature_key;
$$;

-- ---------------------------------------------------------------------------
-- 6. Lock down: RPCs run as definer; callers only need EXECUTE.
--    (App calls these with the service-role key from server-side code.)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.check_and_increment_usage(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_usage_summary(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_org_usage(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_usage(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_usage_summary(uuid) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_usage(uuid, text) TO service_role, authenticated;
