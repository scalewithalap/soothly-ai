/**
 * Affiliate Referrals API
 * GET: List referrals for an affiliate
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AnyClient = any;

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

    // Get referrals
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = affiliateClient
      .from("affiliate_referrals")
      .select("*, users:referred_user_id(email)")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: referrals, error, count } = await query;

    if (error) {
      console.error("Error fetching referrals:", error);
      return NextResponse.json(
        { error: { code: "db/query_failed" } },
        { status: 500 },
      );
    }

    return NextResponse.json({ referrals, total: count });
  } catch (error) {
    console.error("Referrals API error:", error);
    return NextResponse.json(
      { error: { code: "server/internal_error" } },
      { status: 500 },
    );
  }
}
