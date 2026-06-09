/**
 * POST /api/polar/checkout — create a Polar checkout session for the
 * authenticated user's organization.
 *
 * Body: { tier: "launch" | "growth" | "scale", interval?: "month" | "year" }
 * Returns: { url, id } — hosted Polar checkout URL to redirect to.
 *
 * Design notes (see docs/decisions.md ADR-004):
 * - Server-side session creation (replaces the GET query-param adapter) so we
 *   attach trusted metadata: org_id + tier. The webhook resolves the org from
 *   this metadata instead of guessing by customer email.
 * - Product IDs come from env (POLAR_PRODUCT_{TIER}_{MONTHLY|YEARLY}) — no
 *   hardcoded placeholder IDs.
 * - POLAR_SERVER=production|sandbox decouples billing env from NODE_ENV so a
 *   production deploy can still point at Polar sandbox during pilot.
 */
import { z } from "zod";
import { Polar } from "@polar-sh/sdk";
import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { tierToPolarProduct } from "@/lib/billing/tiers";
import type { SupabaseClient } from "@supabase/supabase-js";

const checkoutSchema = z.object({
  tier: z.enum(["launch", "growth", "scale"]),
  interval: z.enum(["month", "year"]).default("month"),
});

function polarClient(): Polar {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    throw new AppError(
      ErrorCodes.SERVER_ERROR,
      "Billing is not configured (POLAR_ACCESS_TOKEN missing)",
      500,
    );
  }
  return new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server:
      process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
  });
}

export const POST = withErrorHandler(async (req: Request) => {
  const { tier, interval } = await validateBody(req, checkoutSchema);

  const supabase = (await createClient()) as unknown as SupabaseClient;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError(
      ErrorCodes.AUTH_UNAUTHORIZED,
      "Not authenticated",
      401,
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, email")
    .eq("id", user.id)
    .single();
  if (!profile?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const productId = tierToPolarProduct(tier, interval);
  if (!productId) {
    throw new AppError(
      ErrorCodes.SERVER_ERROR,
      `No Polar product configured for ${tier}/${interval}. Set POLAR_PRODUCT_${tier.toUpperCase()}_${interval === "year" ? "YEARLY" : "MONTHLY"}.`,
      500,
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const checkout = await polarClient().checkouts.create({
    products: [productId],
    successUrl: `${appUrl}/billing?checkout=success&checkout_id={CHECKOUT_ID}`,
    customerEmail: profile.email ?? user.email ?? undefined,
    // Trusted resolution keys for the webhook — never trust email alone.
    metadata: {
      org_id: profile.org_id,
      tier,
      interval,
    },
  });

  return apiSuccess({ url: checkout.url, id: checkout.id });
});
