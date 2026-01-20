import { Webhooks } from "@polar-sh/nextjs";
import { createClient } from "@supabase/supabase-js";

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Map Polar product IDs to our subscription tiers
const POLAR_PRODUCT_TO_TIER: Record<string, string> = {
  // These will need to be configured with actual Polar product IDs
  prod_starter: "starter",
  prod_growth: "growth",
  prod_scale: "scale",
  prod_enterprise: "enterprise",
};

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

  onSubscriptionCreated: async (payload) => {
    const customer = payload.data.customer;
    const email = customer?.email;

    if (!email) {
      console.error("No customer email in subscription webhook");
      return;
    }

    // Find user by email
    const { data: user } = await supabase
      .from("users")
      .select("id, org_id")
      .eq("email", email)
      .single();

    if (!user?.org_id) {
      console.error("User or org not found for email:", email);
      return;
    }

    // Determine tier from product
    const productId = payload.data.productId;
    const tier = POLAR_PRODUCT_TO_TIER[productId] || "starter";

    // Extract billing interval from subscription (month or year)
    // Polar uses recurringInterval: 'month' | 'year'
    const recurringInterval = (payload.data as { recurringInterval?: string })
      .recurringInterval;
    const billingInterval = recurringInterval === "year" ? "year" : "month";

    // Update organization subscription with tier and billing interval
    await supabase
      .from("organizations")
      .update({
        subscription_tier: tier,
        billing_interval: billingInterval,
        billing_cycle_anchor: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.org_id);

    // Usage is now tracked via org_usage table atomically per-action
    // No initial usage needed - limits are enforced per tier

    console.log(`Subscription created for org ${user.org_id}: ${tier}`);
  },

  onSubscriptionUpdated: async (payload) => {
    const customer = payload.data.customer;
    const email = customer?.email;

    if (!email) return;

    const { data: user } = await supabase
      .from("users")
      .select("id, org_id")
      .eq("email", email)
      .single();

    if (!user?.org_id) return;

    // Handle cancellation
    if (payload.data.status === "canceled") {
      await supabase
        .from("organizations")
        .update({
          subscription_tier: "free",
          billing_interval: "month",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.org_id);

      console.log(`Subscription canceled for org ${user.org_id}`);
      return;
    }

    // Handle plan change
    const productId = payload.data.productId;
    const tier = POLAR_PRODUCT_TO_TIER[productId] || "starter";

    // Extract billing interval from subscription
    const recurringInterval = (payload.data as { recurringInterval?: string })
      .recurringInterval;
    const billingInterval = recurringInterval === "year" ? "year" : "month";

    await supabase
      .from("organizations")
      .update({
        subscription_tier: tier,
        billing_interval: billingInterval,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.org_id);

    console.log(`Subscription updated for org ${user.org_id}: ${tier}`);
  },

  onSubscriptionCanceled: async (payload) => {
    const customer = payload.data.customer;
    const email = customer?.email;

    if (!email) return;

    const { data: user } = await supabase
      .from("users")
      .select("id, org_id")
      .eq("email", email)
      .single();

    if (!user?.org_id) return;

    // Downgrade to free tier and reset billing interval
    await supabase
      .from("organizations")
      .update({
        subscription_tier: "free",
        billing_interval: "month",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.org_id);

    console.log(`Subscription canceled for org ${user.org_id}`);
  },

  // Handle order completed (legacy - no longer used for usage)
  onOrderCreated: async (payload) => {
    const customer = payload.data.customer;
    const email = customer?.email;

    if (!email) return;

    const { data: user } = await supabase
      .from("users")
      .select("id, org_id")
      .eq("email", email)
      .single();

    if (!user?.org_id) return;

    // Check if this is a legacy purchase (custom metadata)
    const metadata = payload.data.metadata as {
      type?: string;
      usage?: number;
    } | null;
    // Legacy usage purchases no longer supported
    // Usage is tracked via org_usage per tier limits
    if (metadata?.type === "usage_purchase") {
      console.log(
        `Legacy usage purchase ignored for org ${user.org_id} - using limit-based system`,
      );
    }
  },
});
