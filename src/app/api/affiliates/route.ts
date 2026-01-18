/**
 * Affiliates API Route
 * GET: List affiliates (admin) or get own affiliate data
 * POST: Apply to become an affiliate
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateReferralCode } from "@/lib/affiliates/tracking";

type AnyClient = any;

// Validation schemas
const applySchema = z.object({
  payment_method: z.enum(["paypal", "bank_transfer", "stripe"]),
  payment_details: z.object({
    email: z.string().email().optional(),
    account_name: z.string().optional(),
    account_number: z.string().optional(),
    bank_name: z.string().optional(),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "auth/unauthorized" } },
        { status: 401 },
      );
    }

    // Get user's org
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        { error: { code: "org/not_found" } },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    // Cast to AnyClient for affiliate table queries
    const affiliateClient = supabase as AnyClient;

    if (mode === "me") {
      // Get own affiliate data
      const { data: affiliate, error } = await affiliateClient
        .from("affiliates")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        return NextResponse.json({ affiliate: null });
      }

      return NextResponse.json({ affiliate });
    }

    // Admin: list all affiliates for org
    const { data: affiliates, error } = await affiliateClient
      .from("affiliates")
      .select("*, users(email, full_name)")
      .eq("org_id", userData.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching affiliates:", error);
      return NextResponse.json(
        { error: { code: "db/query_failed" } },
        { status: 500 },
      );
    }

    return NextResponse.json({ affiliates });
  } catch (error) {
    console.error("Affiliates API error:", error);
    return NextResponse.json(
      { error: { code: "server/internal_error" } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "auth/unauthorized" } },
        { status: 401 },
      );
    }

    // Get user's org
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        { error: { code: "org/not_found" } },
        { status: 404 },
      );
    }

    // Cast to AnyClient for affiliate table queries
    const affiliateClient = supabase as AnyClient;

    // Check if already an affiliate
    const { data: existing } = await affiliateClient
      .from("affiliates")
      .select("id, status")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: { code: "affiliate/already_exists" }, affiliate: existing },
        { status: 400 },
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = applySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "validation/invalid_input",
            details: parsed.error.format(),
          },
        },
        { status: 400 },
      );
    }

    // Generate unique referral code
    const referralCode = generateReferralCode("ZH");

    // Create affiliate record
    const { data: affiliate, error } = await affiliateClient
      .from("affiliates")
      .insert({
        user_id: user.id,
        org_id: userData.org_id,
        referral_code: referralCode,
        payment_method: parsed.data.payment_method,
        payment_details: parsed.data.payment_details,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating affiliate:", error);
      return NextResponse.json(
        { error: { code: "db/insert_failed" } },
        { status: 500 },
      );
    }

    return NextResponse.json({ affiliate }, { status: 201 });
  } catch (error) {
    console.error("Affiliates API error:", error);
    return NextResponse.json(
      { error: { code: "server/internal_error" } },
      { status: 500 },
    );
  }
}
