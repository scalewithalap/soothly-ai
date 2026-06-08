/**
 * Workflow Runs API - Start and List Workflow Runs
 * GET: List runs for a workflow
 * POST: Start a new run
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkflowEngine } from "@/lib/agents/workflow";

interface RouteParams {
  params: Promise<{ workflowId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workflowId } = await params;
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
    const status = searchParams.get("status") as any;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const engine = new WorkflowEngine(supabase, userData.org_id);
    const runs = await engine.listRuns(workflowId, { limit, offset, status });

    return NextResponse.json({ runs });
  } catch (error) {
    console.error("List runs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { workflowId } = await params;
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

    const body = await request.json();
    const { input } = body;

    const engine = new WorkflowEngine(supabase, userData.org_id);

    const run = await engine.startRun({
      workflow_id: workflowId,
      input,
      triggered_by: "user",
      triggered_by_user_id: user.id,
    });

    if (!run) {
      return NextResponse.json(
        { error: "Failed to start workflow run" },
        { status: 500 },
      );
    }

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    console.error("Start run error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
