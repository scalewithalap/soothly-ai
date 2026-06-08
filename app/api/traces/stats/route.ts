/**
 * Traces Stats API - Get Aggregated Trace Statistics
 * GET: Get trace statistics for the organization
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AgentTracer } from "@/lib/agents/observability";

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

    // Get query params for date range
    const { searchParams } = new URL(request.url);
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    const tracer = new AgentTracer(supabase, userData.org_id, "superagent");
    const stats = await tracer.getStats(
      start_date ? new Date(start_date) : undefined,
      end_date ? new Date(end_date) : undefined,
    );

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Traces stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
