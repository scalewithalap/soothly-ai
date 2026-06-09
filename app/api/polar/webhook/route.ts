/**
 * POST /api/polar/webhook — Polar subscription lifecycle webhook.
 *
 * Responsibilities:
 * - Resolve the organization for a subscription event (metadata.org_id first,
 *   customer email as legacy fallback — ADR-004).
 * - Map Polar product → tier via env-configured product IDs
 *   (lib/billing/tiers.ts), writing canonical tier names
 *   (free|launch|growth|scale) that match tier_feature_limits rows.
 * - Persist polar_customer_id / polar_subscription_id for support + dunning.
 * - Reset billing_cycle_anchor on create; downgrade to free on cancel.
 *
 * Signature verification is handled by @polar-sh/nextjs (POLAR_WEBHOOK_SECRET).
 */
import { Webhooks } from "@polar-sh/nextjs";
import { createClient } from "@supabase/supabase-js";
import {
  polarProductToTier,
  normalizeTier,
  type Tier,
} from "@/lib/billing/tiers";

// Service role: this route receives no user JWT; org writes are gated by
// signature verification above. Never reuse this client for user-driven routes.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface SubscriptionLike {
  id?: string;
  productId?: string;
  status?: string;
  recurringInterval?: string;
  metadata?: Record<string, unknown> | null;
  customer?: { id?: string; email?: string | null } | null;
}

/**
 * Resolve org_id for a webhook payload.
 * Priority: checkout metadata (trusted, set server-side by our checkout
 * route) → customer email lookup (legacy fallback for subscriptions created
 * before metadata support).
 */
async function resolveOrgId(sub: SubscriptionLike): Promise<string | null> {
  const metaOrgId = sub.metadata?.org_id;
  if (typeof metaOrgId === "string" && metaOrgId.length > 0) {
    // Verify the org actually exists before writing to it.
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", metaOrgId)
      .single();
    if (org?.id) return org.id;
    console.error(`Polar webhook: metadata org_id ${metaOrgId} not found`);
  }

  const email = sub.customer?.email;
  if (!email) return null;
  const { data: user } = await supabase
    .from("users")
    .select("id, org_id")
    .eq("email", email)
    .single();
  return user?.org_id ?? null;
}

function resolveTier(sub: SubscriptionLike): Tier {
  const productMap = polarProductToTier();
  if (sub.productId && productMap[sub.productId]) {
    return productMap[sub.productId];
  }
  // Metadata tier (set by our checkout route) as secondary signal.
  const metaTier = sub.metadata?.tier;
  if (typeof metaTier === "string") return normalizeTier(metaTier);
  console.error(
    `Polar webhook: unknown product ${sub.productId} and no metadata tier — defaulting to launch. Configure POLAR_PRODUCT_* env vars.`,
  );
  return "launch";
}

async function applySubscription(
  sub: SubscriptionLike,
  opts: { resetAnchor: boolean },
): Promise<void> {
  const orgId = await resolveOrgId(sub);
  if (!orgId) {
    console.error(
      "Polar webhook: could not resolve organization (no metadata.org_id, email lookup failed) — manual reconciliation needed",
      { subscriptionId: sub.id, email: sub.customer?.email ?? null },
    );
    return;
  }

  const tier = resolveTier(sub);
  const billingInterval = sub.recurringInterval === "year" ? "year" : "month";

  const update: Record<string, unknown> = {
    subscription_tier: tier,
    billing_interval: billingInterval,
    updated_at: new Date().toISOString(),
  };
  if (opts.resetAnchor) {
    update.billing_cycle_anchor = new Date().toISOString();
  }
  if (sub.customer?.id) update.polar_customer_id = sub.customer.id;
  if (sub.id) update.polar_subscription_id = sub.id;

  const { error } = await supabase
    .from("organizations")
    .update(update)
    .eq("id", orgId);
  if (error) {
    console.error("Polar webhook: org update failed", { orgId, error });
  }
}

async function downgradeToFree(sub: SubscriptionLike): Promise<void> {
  const orgId = await resolveOrgId(sub);
  if (!orgId) {
    console.error("Polar webhook: cancel — could not resolve organization", {
      subscriptionId: sub.id,
    });
    return;
  }
  const { error } = await supabase
    .from("organizations")
    .update({
      subscription_tier: "free",
      billing_interval: "month",
      polar_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);
  if (error) {
    console.error("Polar webhook: downgrade failed", { orgId, error });
  }
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionCreated: async (payload) => {
    await applySubscription(payload.data as SubscriptionLike, {
      resetAnchor: true,
    });
  },

  onSubscriptionUpdated: async (payload) => {
    const sub = payload.data as SubscriptionLike;
    if (sub.status === "canceled") {
      await downgradeToFree(sub);
      return;
    }
    await applySubscription(sub, { resetAnchor: false });
  },

  onSubscriptionCanceled: async (payload) => {
    await downgradeToFree(payload.data as SubscriptionLike);
  },
});
