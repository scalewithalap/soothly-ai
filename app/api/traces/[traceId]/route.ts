/**
 * Trace Details API - Get Trace Tree
 * GET: Get full trace tree by trace ID
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AgentTracer } from "@/lib/agents/observability";

interface RouteParams {
  params: Promise<{ traceId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { traceId } = await params;
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

    const tracer = new AgentTracer(supabase, userData.org_id, "superagent");
    const spans = await tracer.getTrace(traceId);

    if (spans.length === 0) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    return NextResponse.json({ trace_id: traceId, spans });
  } catch (error) {
    console.error("Get trace error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
