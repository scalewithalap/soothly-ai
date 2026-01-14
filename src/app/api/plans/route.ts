import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET /api/plans - Get all active subscription plans
export async function GET() {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select(
        "id, tier, name, description, price_monthly, price_yearly, credits_monthly, credits_one_time, max_seats, is_recurring, support_type, features, agents_access, api_access, display_order"
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch plans:", error);
      return NextResponse.json({ error: "db/fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Plans GET error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
