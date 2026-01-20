/**
 * Billing History API
 *
 * GET: Fetch user's billing/payment history from subscriptions
 */

import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

interface BillingRecord {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  description: string;
  invoice_url?: string;
}

export async function GET() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // Get user's organization
    const { data: user } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", authResult.id)
      .single();

    if (!user?.org_id) {
      return NextResponse.json({ history: [] });
    }

    // Fetch payment history from subscriptions
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select(
        "id, plan_id, status, current_period_start, current_period_end, created_at",
      )
      .eq("org_id", user.org_id)
      .order("created_at", { ascending: false });

    // Transform to billing records
    const history: BillingRecord[] = [];

    // Add subscription records
    if (subscriptions) {
      for (const sub of subscriptions) {
        history.push({
          id: `sub-${sub.id}`,
          date: sub.created_at,
          amount: 0, // Would need plan pricing lookup
          currency: "USD",
          status: sub.status === "active" ? "paid" : "pending",
          description: `Subscription - ${sub.plan_id || "Unknown Plan"}`,
        });
      }
    }

    // Sort by date descending
    history.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return NextResponse.json({ history: history.slice(0, 50) });
  } catch (error) {
    console.error("Failed to fetch billing history:", error);
    return NextResponse.json(
      { error: "billing/fetch_failed" },
      { status: 500 },
    );
  }
}
