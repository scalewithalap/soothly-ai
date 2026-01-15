import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    // Get user's org and tier
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.org_id) {
      return NextResponse.json({ tier: "free" });
    }

    // Get org tier
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("subscription_tier")
      .eq("id", userData.org_id)
      .single();

    if (orgError || !orgData) {
      return NextResponse.json({ tier: "free" });
    }

    return NextResponse.json({
      tier: orgData.subscription_tier || "free",
    });
  } catch (error) {
    console.error("User tier error:", error);
    return NextResponse.json({ tier: "free" });
  }
}
