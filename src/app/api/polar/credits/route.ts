import { NextRequest, NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { createClient } from "@/lib/supabase/server";
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

// GET: List available credit packs
export async function GET() {
  return NextResponse.json({ packs: CREDIT_PACKS });
}

// POST: Create checkout session for credit purchase
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    // Get user's organization and subscription tier
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 404 });
    }

    const { data: orgData } = await supabase
      .from("organizations")
      .select("subscription_tier")
      .eq("id", userData.org_id)
      .single();

    // Free tier users cannot buy credits - must upgrade first
    if (!orgData?.subscription_tier || orgData.subscription_tier === "free") {
      return NextResponse.json(
        {
          error: "billing/upgrade_required",
          message:
            "Free tier users must upgrade to a paid plan before purchasing additional credits",
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { packId } = body;

    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json(
        { error: "billing/invalid_pack" },
        { status: 400 }
      );
    }

    // Create Polar checkout for credit purchase
    // Note: In production, create credit pack products in Polar dashboard
    // and map packId to Polar product IDs
    const PACK_TO_POLAR_PRODUCT: Record<string, string> = {
      pack_100: process.env.POLAR_CREDITS_100_PRODUCT_ID || "",
      pack_500: process.env.POLAR_CREDITS_500_PRODUCT_ID || "",
      pack_1000: process.env.POLAR_CREDITS_1000_PRODUCT_ID || "",
      pack_5000: process.env.POLAR_CREDITS_5000_PRODUCT_ID || "",
    };

    const polarProductId = PACK_TO_POLAR_PRODUCT[packId];

    if (!polarProductId) {
      return NextResponse.json(
        { error: "billing/product_not_configured" },
        { status: 500 }
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
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?credits=purchased&amount=${pack.credits}`,
    });

    return NextResponse.json({
      checkoutUrl: checkout.url,
      credits: pack.credits,
    });
  } catch (error) {
    console.error("Credit purchase error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
