import { Webhooks } from "@polar-sh/nextjs";
import { createClient } from "@supabase/supabase-js";

// Use service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map Polar product IDs to our subscription tiers
const POLAR_PRODUCT_TO_TIER: Record<string, string> = {
  // These will need to be configured with actual Polar product IDs
  prod_starter: "starter",
  prod_growth: "growth",
  prod_scale: "scale",
  prod_enterprise: "enterprise",
};

// Credits per tier for initial allocation
const TIER_CREDITS: Record<string, number> = {
  starter: 500,
  growth: 2000,
  scale: 6000,
  enterprise: 100000, // Effectively unlimited
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

    // Update organization subscription
    await supabase
      .from("organizations")
      .update({
        subscription_tier: tier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.org_id);

    // Add initial credits to ledger
    const credits = TIER_CREDITS[tier] || 500;
    await supabase.from("credit_ledger").insert({
      org_id: user.org_id,
      agent_type: "system",
      action: "subscription_credit",
      amount: credits,
      balance_after: credits,
      metadata: {
        tier,
        subscription_id: payload.data.id,
        period: "initial",
      },
    });

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
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.org_id);

      console.log(`Subscription canceled for org ${user.org_id}`);
      return;
    }

    // Handle plan change
    const productId = payload.data.productId;
    const tier = POLAR_PRODUCT_TO_TIER[productId] || "starter";

    await supabase
      .from("organizations")
      .update({
        subscription_tier: tier,
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

    // Downgrade to free tier
    await supabase
      .from("organizations")
      .update({
        subscription_tier: "free",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.org_id);

    console.log(`Subscription canceled for org ${user.org_id}`);
  },

  // Handle order completed (for credit purchases)
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

    // Check if this is a credit purchase (custom metadata)
    const metadata = payload.data.metadata as {
      type?: string;
      credits?: number;
    } | null;
    if (metadata?.type === "credit_purchase" && metadata?.credits) {
      // Get current balance
      const { data: lastEntry } = await supabase
        .from("credit_ledger")
        .select("balance_after")
        .eq("org_id", user.org_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const currentBalance = lastEntry?.balance_after || 0;
      const newBalance = currentBalance + metadata.credits;

      // Add credits to ledger
      await supabase.from("credit_ledger").insert({
        org_id: user.org_id,
        agent_type: "system",
        action: "credit_purchase",
        amount: metadata.credits,
        balance_after: newBalance,
        metadata: {
          order_id: payload.data.id,
        },
      });

      console.log(
        `Credits purchased for org ${user.org_id}: ${metadata.credits}`
      );
    }
  },
});
