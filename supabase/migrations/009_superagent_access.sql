-- =====================================================
-- Migration: 009_superagent_access
-- Purpose: Enable Superagent functionality and feature gating
-- =====================================================

-- 1. Add agent_type enum value for superagent if it doesn't exist
DO $$
BEGIN
  -- Check if enum type exists and add value
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_type_enum') THEN
    ALTER TYPE agent_type_enum ADD VALUE IF NOT EXISTS 'superagent';
  END IF;
END$$;

-- 2. Create helper function to check yearly subscription eligibility
CREATE OR REPLACE FUNCTION public.is_yearly_eligible(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  org_tier text;
BEGIN
  -- Get the subscription tier for the user's organization
  SELECT o.subscription_tier INTO org_tier
  FROM users u
  JOIN organizations o ON u.org_id = o.id
  WHERE u.id = user_id;

  -- Yearly-eligible tiers (those with price_yearly in subscription_plans)
  -- Excludes 'free' tier
  RETURN org_tier IS NOT NULL AND org_tier != 'free';
END;
$$;

-- 3. Create helper function to check Superagent access
CREATE OR REPLACE FUNCTION public.has_superagent_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- For now, all paid plans have Superagent access
  -- Can be refined later to only yearly-specific subscriptions
  RETURN is_yearly_eligible(user_id);
END;
$$;

-- 4. Create feature flags table for gradual rollout
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  allowed_tiers text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read feature flags
CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- Only admins can modify feature flags (via service role)
CREATE POLICY "Service role can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Insert initial feature flags for Superagent rollout
INSERT INTO public.feature_flags (name, description, enabled, rollout_percentage, allowed_tiers)
VALUES 
  ('superagent_enabled', 'Enable Superagent for eligible users', true, 100, ARRAY['starter', 'growth', 'scale', 'enterprise']),
  ('agent_data_isolation', 'Enforce strict data isolation between normal agents', false, 0, ARRAY[]::text[]),
  ('superagent_rate_limiting', 'Enable rate limiting for Superagent queries', true, 100, ARRAY['starter', 'growth', 'scale', 'enterprise'])
ON CONFLICT (name) DO UPDATE SET
  updated_at = now();

-- 6. Create Superagent rate limiting table
CREATE TABLE IF NOT EXISTS public.superagent_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requests_today integer DEFAULT 0,
  tokens_today bigint DEFAULT 0,
  last_request_at timestamptz,
  rate_limit_daily integer DEFAULT 100,
  token_limit_daily bigint DEFAULT 100000,
  reset_at timestamptz DEFAULT (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id)
);

-- Enable RLS on rate limits table
ALTER TABLE public.superagent_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own org's rate limits
CREATE POLICY "Users can view their org rate limits"
  ON public.superagent_rate_limits FOR SELECT
  USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

-- 7. Create function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_superagent_rate_limit(p_org_id uuid, p_tokens integer DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rate_record superagent_rate_limits%ROWTYPE;
  result jsonb;
BEGIN
  -- Get or create rate limit record
  INSERT INTO superagent_rate_limits (org_id)
  VALUES (p_org_id)
  ON CONFLICT (org_id) DO UPDATE SET
    -- Reset if past reset time
    requests_today = CASE 
      WHEN superagent_rate_limits.reset_at <= now() THEN 0
      ELSE superagent_rate_limits.requests_today
    END,
    tokens_today = CASE 
      WHEN superagent_rate_limits.reset_at <= now() THEN 0
      ELSE superagent_rate_limits.tokens_today
    END,
    reset_at = CASE 
      WHEN superagent_rate_limits.reset_at <= now() THEN date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'
      ELSE superagent_rate_limits.reset_at
    END
  RETURNING * INTO rate_record;

  -- Check if rate limited
  IF rate_record.requests_today >= rate_record.rate_limit_daily THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_request_limit',
      'requests_used', rate_record.requests_today,
      'requests_limit', rate_record.rate_limit_daily,
      'reset_at', rate_record.reset_at
    );
  END IF;

  IF rate_record.tokens_today >= rate_record.token_limit_daily THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'daily_token_limit',
      'tokens_used', rate_record.tokens_today,
      'tokens_limit', rate_record.token_limit_daily,
      'reset_at', rate_record.reset_at
    );
  END IF;

  -- Increment counters
  UPDATE superagent_rate_limits
  SET 
    requests_today = requests_today + 1,
    tokens_today = tokens_today + p_tokens,
    last_request_at = now(),
    updated_at = now()
  WHERE org_id = p_org_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'requests_used', rate_record.requests_today + 1,
    'requests_limit', rate_record.rate_limit_daily,
    'tokens_used', rate_record.tokens_today + p_tokens,
    'tokens_limit', rate_record.token_limit_daily,
    'reset_at', rate_record.reset_at
  );
END;
$$;

-- 8. Add index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_superagent_rate_limits_org_id 
  ON public.superagent_rate_limits(org_id);

-- 9. Grant necessary permissions
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT SELECT ON public.superagent_rate_limits TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_yearly_eligible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_superagent_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_superagent_rate_limit(uuid, integer) TO authenticated;
