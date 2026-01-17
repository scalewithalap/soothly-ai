/**
 * Workflows API - List and Create Workflows
 * GET: List workflows for the organization
 * POST: Create a new workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkflowEngine } from "@/agents/workflow";
import { untypedQuery } from "@/agents/utils/dbUtils";

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
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = untypedQuery(supabase)
      .from("workflows")
      .select("*")
      .eq("org_id", userData.org_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data: workflows, error, count } = await query;

    if (error) {
      console.error("Error fetching workflows:", error);
      return NextResponse.json(
        { error: "Failed to fetch workflows" },
        { status: 500 },
      );
    }

    return NextResponse.json({ workflows, count });
  } catch (error) {
    console.error("Workflows API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, description, nodes, edges, trigger_type, trigger_config } =
      body;

    if (!name || !nodes || !edges) {
      return NextResponse.json(
        { error: "Name, nodes, and edges are required" },
        { status: 400 },
      );
    }

    const engine = new WorkflowEngine(supabase, userData.org_id);

    const workflow = await engine.createWorkflow({
      name,
      description,
      nodes,
      edges,
      trigger_type,
      trigger_config,
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Failed to create workflow" },
        { status: 500 },
      );
    }

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error("Create workflow error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
