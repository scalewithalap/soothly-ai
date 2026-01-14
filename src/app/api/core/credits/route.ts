import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface UserData {
  org_id: string | null;
  role?: "owner" | "admin" | "member";
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    const userData = data as UserData | null;

    if (userError || !userData?.org_id) {
      return NextResponse.json(
        { error: "User not found or no organization" },
        { status: 404 }
      );
    }

    // Get credit balance
    const { data: balance, error: balanceError } = await (supabase as any).rpc(
      "get_credit_balance",
      { p_org_id: userData.org_id }
    );

    if (balanceError) {
      console.error("Failed to get credit balance:", balanceError);
      return NextResponse.json(
        { error: "Failed to get credit balance" },
        { status: 500 }
      );
    }

    // Get recent credit transactions
    const { data: transactions, error: txError } = await supabase
      .from("credit_ledger")
      .select("*")
      .eq("org_id", userData.org_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (txError) {
      console.error("Failed to get transactions:", txError);
    }

    return NextResponse.json({
      balance: balance || 0,
      transactions: transactions || [],
    });
  } catch (error) {
    console.error("Credits API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization and role
    const { data, error: userError } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    const userData = data as UserData | null;

    if (userError || !userData?.org_id) {
      return NextResponse.json(
        { error: "User not found or no organization" },
        { status: 404 }
      );
    }

    // Only owners and admins can add credits
    if (!userData.role || !["owner", "admin"].includes(userData.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount, reason } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    // Add credits
    const { data: result, error: addError } = await (supabase as any).rpc(
      "add_credits",
      {
        p_org_id: userData.org_id,
        p_amount: amount,
        p_reason: reason,
        p_metadata: { added_by: user.id },
      }
    );

    if (addError) {
      console.error("Failed to add credits:", addError);
      return NextResponse.json(
        { error: "Failed to add credits" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Credits API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
