/**
 * Guardrail Violations API - List Violations
 * GET: List guardrail violations for the organization
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Guardrails } from "@/agents/safety";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const policy_id = searchParams.get("policy_id") || undefined;
    const agent_type = searchParams.get("agent_type") || undefined;
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const guardrails = new Guardrails(supabase, userData.org_id);

    const violations = await guardrails.getViolations({
      policy_id,
      agent_type: agent_type as any,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      limit,
      offset,
    });

    return NextResponse.json({ violations });
  } catch (error) {
    console.error("Violations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

