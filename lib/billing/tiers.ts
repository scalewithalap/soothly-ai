/**
 * Billing Tiers — Single Source of Truth
 *
 * Canonical tier names, Polar product mapping, feature limits, and the
 * agent-type → feature-key mapping used by usage enforcement.
 *
 * Tier names MUST match `tier_feature_limits.tier` and
 * `organizations.subscription_tier` values: free | launch | growth | scale.
 * (Fixes the historical mismatch where the Polar webhook wrote
 * starter/growth/scale/enterprise.)
 *
 * Limits mirror .agents/skills/backend-design/resources/pricing-strategy.md.
 * The database (tier_feature_limits + check_and_increment_usage RPC) is the
 * runtime enforcement point; these constants are for seeds, UI, and tests.
 */

export const TIERS = ["free", "launch", "growth", "scale"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_PRICES_MONTHLY: Record<Tier, number> = {
  free: 0,
  launch: 129,
  growth: 349,
  scale: 997,
};

/** Yearly = 2 months free (10x monthly). */
export const TIER_PRICES_YEARLY: Record<Tier, number> = {
  free: 0,
  launch: 1290,
  growth: 3490,
  scale: 9970,
};

export const FEATURE_KEYS = [
  "proposals",
  "leads_scraped",
  "partner_contacts",
  "seo_articles",
  "competitors",
  "onboarding_users",
  "support_messages",
  "recovery_attempts",
  "superagent_campaigns",
  "team_members",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

/**
 * Monthly limits per tier. -1 = feature not available on this tier.
 * Safety caps prevent abuse on generous limits (per pricing-strategy.md §2B).
 */
export const TIER_LIMITS: Record<
  Tier,
  Record<FeatureKey, { limit: number; safetyCap?: number }>
> = {
  free: {
    proposals: { limit: 1 },
    leads_scraped: { limit: 10 },
    partner_contacts: { limit: 2 },
    seo_articles: { limit: 1 },
    competitors: { limit: 1 },
    onboarding_users: { limit: 50 },
    support_messages: { limit: 100 },
    recovery_attempts: { limit: 0 }, // demo only — no live recovery on free
    superagent_campaigns: { limit: -1 }, // paid-only gate
    team_members: { limit: 1 },
  },
  launch: {
    proposals: { limit: 10 },
    leads_scraped: { limit: 200 },
    partner_contacts: { limit: 20 },
    seo_articles: { limit: 10 },
    competitors: { limit: 3 },
    onboarding_users: { limit: 1000, safetyCap: 5000 },
    support_messages: { limit: 2000, safetyCap: 10000 },
    recovery_attempts: { limit: 100, safetyCap: 500 },
    superagent_campaigns: { limit: 10, safetyCap: 50 },
    team_members: { limit: 2 },
  },
  growth: {
    proposals: { limit: 100, safetyCap: 500 },
    leads_scraped: { limit: 1000, safetyCap: 5000 },
    partner_contacts: { limit: 100, safetyCap: 500 },
    seo_articles: { limit: 50, safetyCap: 200 },
    competitors: { limit: 15 },
    onboarding_users: { limit: 5000, safetyCap: 25000 },
    support_messages: { limit: 10000, safetyCap: 50000 },
    recovery_attempts: { limit: 1000, safetyCap: 5000 },
    superagent_campaigns: { limit: 50, safetyCap: 200 },
    team_members: { limit: 10 },
  },
  scale: {
    proposals: { limit: 500, safetyCap: 2000 },
    leads_scraped: { limit: 5000, safetyCap: 20000 },
    partner_contacts: { limit: 500, safetyCap: 2000 },
    seo_articles: { limit: 100, safetyCap: 500 },
    competitors: { limit: 50 },
    onboarding_users: { limit: 50000, safetyCap: 200000 },
    support_messages: { limit: 50000, safetyCap: 200000 },
    recovery_attempts: { limit: 5000, safetyCap: 20000 },
    superagent_campaigns: { limit: 200, safetyCap: 1000 },
    team_members: { limit: 50 },
  },
};

/**
 * Agent type → feature key consumed on successful completion.
 * Single mapping shared by pre-checks (usage-limits) and post-completion
 * deduction (lib/usage/deduct.ts).
 */
export const AGENT_FEATURE_KEY: Record<string, FeatureKey> = {
  lead_gen: "leads_scraped",
  seo: "seo_articles",
  partnership: "partner_contacts",
  proposal: "proposals",
  competitor_intel: "competitors",
  revenue_recovery: "recovery_attempts",
  onboarding: "onboarding_users",
  customer_success: "support_messages",
  superagent: "superagent_campaigns",
};

/**
 * Polar product ID → tier mapping, configured via environment.
 * Set these to the product IDs from your Polar dashboard (sandbox first,
 * production values swapped at launch):
 *   POLAR_PRODUCT_LAUNCH_MONTHLY / POLAR_PRODUCT_LAUNCH_YEARLY
 *   POLAR_PRODUCT_GROWTH_MONTHLY / POLAR_PRODUCT_GROWTH_YEARLY
 *   POLAR_PRODUCT_SCALE_MONTHLY  / POLAR_PRODUCT_SCALE_YEARLY
 */
export function polarProductToTier(): Record<string, Tier> {
  const map: Record<string, Tier> = {};
  const pairs: Array<[string | undefined, Tier]> = [
    [process.env.POLAR_PRODUCT_LAUNCH_MONTHLY, "launch"],
    [process.env.POLAR_PRODUCT_LAUNCH_YEARLY, "launch"],
    [process.env.POLAR_PRODUCT_GROWTH_MONTHLY, "growth"],
    [process.env.POLAR_PRODUCT_GROWTH_YEARLY, "growth"],
    [process.env.POLAR_PRODUCT_SCALE_MONTHLY, "scale"],
    [process.env.POLAR_PRODUCT_SCALE_YEARLY, "scale"],
  ];
  for (const [productId, tier] of pairs) {
    if (productId) map[productId] = tier;
  }
  return map;
}

/** Tier + interval → Polar product ID (for checkout initiation). */
export function tierToPolarProduct(
  tier: Exclude<Tier, "free">,
  interval: "month" | "year",
): string | undefined {
  const env: Record<string, string | undefined> = {
    "launch:month": process.env.POLAR_PRODUCT_LAUNCH_MONTHLY,
    "launch:year": process.env.POLAR_PRODUCT_LAUNCH_YEARLY,
    "growth:month": process.env.POLAR_PRODUCT_GROWTH_MONTHLY,
    "growth:year": process.env.POLAR_PRODUCT_GROWTH_YEARLY,
    "scale:month": process.env.POLAR_PRODUCT_SCALE_MONTHLY,
    "scale:year": process.env.POLAR_PRODUCT_SCALE_YEARLY,
  };
  return env[`${tier}:${interval}`];
}

export function isPaidTier(tier: string | null | undefined): boolean {
  return tier === "launch" || tier === "growth" || tier === "scale";
}

/** Normalize legacy tier names that may exist in older rows. */
export function normalizeTier(raw: string | null | undefined): Tier {
  switch ((raw || "free").toLowerCase()) {
    case "launch":
    case "starter": // legacy webhook name
      return "launch";
    case "growth":
      return "growth";
    case "scale":
    case "enterprise": // legacy webhook name
      return "scale";
    default:
      return "free";
  }
}
