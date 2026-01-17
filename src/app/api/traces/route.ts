/**
 * Traces API - List Agent Execution Traces
 * GET: List traces with filtering options
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AgentTracer } from "@/agents/observability";

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
    const agent_type = searchParams.get("agent_type");
    const status = searchParams.get("status");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const has_errors = searchParams.get("has_errors") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Use a generic tracer just for listing (agent type doesn't matter for org-wide listing)
    const tracer = new AgentTracer(supabase, userData.org_id, "superagent");

    const traces = await tracer.listTraces({
      agent_types: agent_type ? [agent_type as any] : undefined,
      statuses: status ? [status as any] : undefined,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      has_errors,
      limit,
      offset,
    });

    return NextResponse.json({ traces });
  } catch (error) {
    console.error("Traces API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
