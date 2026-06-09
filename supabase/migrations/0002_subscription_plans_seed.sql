-- =============================================================================
-- Migration 0002 — subscription_plans seed (UI catalog for /api/plans)
-- =============================================================================
-- The billing page renders from this table. Tier names are canonical:
-- free | launch | growth | scale (matching tier_feature_limits + webhook).
-- Prices in whole USD. Idempotent via unique tier upsert.
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_tier_idx
  ON public.subscription_plans (tier);

INSERT INTO public.subscription_plans
  (id, tier, name, description, price_monthly, price_yearly, max_seats,
   is_recurring, support_type, features, agents_access, api_access,
   display_order, is_active, usage_monthly, usage_one_time, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'free', 'Free', 'Try every agent with starter quotas. Free forever.',
   0, 0, 1, false, 'community',
   '["All 8 AI agents", "1 proposal / mo", "10 leads scraped / mo", "1 SEO article / mo", "100 support messages / mo", "1 team member"]'::jsonb,
   '["lead_gen","seo","partnership","proposal","competitor_intel","revenue_recovery","onboarding","customer_success"]'::jsonb,
   'none', 1, true, 0, NULL, now(), now()),

  (gen_random_uuid(), 'launch', 'Launch', 'For founders automating their first revenue ops. Includes the Superagent.',
   129, 1290, 2, true, 'email',
   '["Everything in Free", "Superagent orchestrator", "10 proposals / mo", "200 leads scraped / mo", "10 SEO articles / mo", "2,000 support messages / mo", "Revenue recovery up to $5k / mo", "2 team members"]'::jsonb,
   '["lead_gen","seo","partnership","proposal","competitor_intel","revenue_recovery","onboarding","customer_success","superagent"]'::jsonb,
   'standard', 2, true, 0, NULL, now(), now()),

  (gen_random_uuid(), 'growth', 'Growth', 'For teams scaling outbound and support automation.',
   349, 3490, 10, true, 'priority',
   '["Everything in Launch", "100 proposals / mo", "1,000 leads scraped / mo", "50 SEO articles / mo", "10,000 support messages / mo", "Revenue recovery up to $50k / mo", "15 competitors tracked", "10 team members"]'::jsonb,
   '["lead_gen","seo","partnership","proposal","competitor_intel","revenue_recovery","onboarding","customer_success","superagent"]'::jsonb,
   'standard', 3, true, 0, NULL, now(), now()),

  (gen_random_uuid(), 'scale', 'Scale', 'Full-throttle autonomous revenue operations.',
   997, 9970, 50, true, 'dedicated',
   '["Everything in Growth", "500 proposals / mo", "5,000 leads scraped / mo", "100 SEO articles / mo", "50,000 support messages / mo", "Revenue recovery up to $100k / mo", "50 competitors tracked", "50 team members"]'::jsonb,
   '["lead_gen","seo","partnership","proposal","competitor_intel","revenue_recovery","onboarding","customer_success","superagent"]'::jsonb,
   'full', 4, true, 0, NULL, now(), now())
ON CONFLICT (tier) DO UPDATE SET
  name          = EXCLUDED.name,
  description   = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly  = EXCLUDED.price_yearly,
  max_seats     = EXCLUDED.max_seats,
  is_recurring  = EXCLUDED.is_recurring,
  support_type  = EXCLUDED.support_type,
  features      = EXCLUDED.features,
  agents_access = EXCLUDED.agents_access,
  api_access    = EXCLUDED.api_access,
  display_order = EXCLUDED.display_order,
  is_active     = EXCLUDED.is_active,
  updated_at    = now();

-- Retire any legacy rows with non-canonical tier names.
UPDATE public.subscription_plans
   SET is_active = false, updated_at = now()
 WHERE tier NOT IN ('free', 'launch', 'growth', 'scale');
