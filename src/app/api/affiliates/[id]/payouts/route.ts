/**
 * Affiliate Payouts API
 * GET: List payouts for an affiliate
 * POST: Request a new payout
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { requestPayout } from "@/lib/affiliates/commission";

type AnyClient = any;

interface RouteParams {
  params: Promise<{ id: string }>;
}

const payoutRequestSchema = z.object({
  amount: z.number().min(50, "Minimum payout is $50"),
  payment_method: z.enum(["paypal", "bank_transfer", "stripe"]),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: affiliateId } = await params;
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

    // Cast to AnyClient for affiliate table queries
    const affiliateClient = supabase as AnyClient;

    // Verify ownership
    const { data: affiliate } = await affiliateClient
      .from("affiliates")
      .select("id")
      .eq("id", affiliateId)
      .eq("user_id", user.id)
      .single();

    if (!affiliate) {
      return NextResponse.json(
        { error: { code: "affiliate/not_found" } },
        { status: 404 },
      );
    }

    // Get payouts
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = affiliateClient
      .from("affiliate_payouts")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: payouts, error, count } = await query;

    if (error) {
      console.error("Error fetching payouts:", error);
      return NextResponse.json(
        { error: { code: "db/query_failed" } },
        { status: 500 },
      );
    }

    return NextResponse.json({ payouts, total: count });
  } catch (error) {
    console.error("Payouts GET API error:", error);
    return NextResponse.json(
      { error: { code: "server/internal_error" } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: affiliateId } = await params;
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

    // Cast to AnyClient for affiliate table queries
    const affiliateClient = supabase as AnyClient;

    // Verify ownership
    const { data: affiliate } = await affiliateClient
      .from("affiliates")
      .select("id, status, pending_balance")
      .eq("id", affiliateId)
      .eq("user_id", user.id)
      .single();

    if (!affiliate) {
      return NextResponse.json(
        { error: { code: "affiliate/not_found" } },
        { status: 404 },
      );
    }

    if (affiliate.status !== "approved") {
      return NextResponse.json(
        { error: { code: "affiliate/not_approved" } },
        { status: 403 },
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = payoutRequestSchema.safeParse(body);

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

    if (affiliate.pending_balance < parsed.data.amount) {
      return NextResponse.json(
        { error: { code: "affiliate/insufficient_balance" } },
        { status: 400 },
      );
    }

    // Request payout
    const result = await requestPayout({
      affiliateId,
      amount: parsed.data.amount,
      paymentMethod: parsed.data.payment_method,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: { code: "affiliate/payout_failed", message: result.error } },
        { status: 400 },
      );
    }

    return NextResponse.json({ payoutId: result.payoutId }, { status: 201 });
  } catch (error) {
    console.error("Payouts POST API error:", error);
    return NextResponse.json(
      { error: { code: "server/internal_error" } },
      { status: 500 },
    );
  }
}
