import { Polar } from "@polar-sh/sdk";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

// Credit pack options (prepaid only)
const CREDIT_PACKS = [
  { id: "pack_100", credits: 100, price: 1000 }, // $10
  { id: "pack_500", credits: 500, price: 4000 }, // $40
  { id: "pack_1000", credits: 1000, price: 7000 }, // $70
  { id: "pack_5000", credits: 5000, price: 30000 }, // $300
];

const purchaseCreditsSchema = z.object({
  packId: z.enum(["pack_100", "pack_500", "pack_1000", "pack_5000"]),
});

// GET: List available credit packs
export const GET = withErrorHandler(async () => {
  return apiSuccess({ packs: CREDIT_PACKS });
});

// POST: Create checkout session for credit purchase
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get user's organization and subscription tier
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const { data: orgData } = await supabase
    .from("organizations")
    .select("subscription_tier")
    .eq("id", userData.org_id)
    .single();

  // Free tier users cannot buy credits - must upgrade first
  if (!orgData?.subscription_tier || orgData.subscription_tier === "free") {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Free tier users must upgrade to a paid plan before purchasing credits",
      403
    );
  }

  // Validate request body
  const { packId } = await validateBody(request, purchaseCreditsSchema);

  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "Invalid credit pack", 400);
  }

  // Map pack IDs to Polar product IDs
  const PACK_TO_POLAR_PRODUCT: Record<string, string> = {
    pack_100: process.env.POLAR_CREDITS_100_PRODUCT_ID || "",
    pack_500: process.env.POLAR_CREDITS_500_PRODUCT_ID || "",
    pack_1000: process.env.POLAR_CREDITS_1000_PRODUCT_ID || "",
    pack_5000: process.env.POLAR_CREDITS_5000_PRODUCT_ID || "",
  };

  const polarProductId = PACK_TO_POLAR_PRODUCT[packId];

  if (!polarProductId) {
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Credit product not configured",
      500
    );
  }

  const checkout = await polar.checkouts.create({
    products: [polarProductId],
    customerEmail: user.email!,
    metadata: {
      type: "credit_purchase",
      credits: pack.credits,
      org_id: userData.org_id,
      user_id: user.id,
    },
    successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/billing?credits=purchased&amount=${pack.credits}`,
  });

  return apiSuccess({
    checkoutUrl: checkout.url,
    credits: pack.credits,
  });
});

