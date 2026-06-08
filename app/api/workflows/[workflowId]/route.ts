/**
 * Workflow Details API - Get, Update, Delete Workflow
 * GET: Get workflow by ID
 * PATCH: Update workflow
 * DELETE: Delete workflow
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WorkflowEngine } from "@/lib/agents/workflow";
import { untypedQuery } from "@/lib/agents/utils/dbUtils";

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

    const engine = new WorkflowEngine(supabase, userData.org_id);
    const workflow = await engine.getWorkflow(workflowId);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("Get workflow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // Update workflow
    const { data: workflow, error } = await untypedQuery(supabase)
      .from("workflows")
      .update(body)
      .eq("id", workflowId)
      .eq("org_id", userData.org_id)
      .select()
      .single();

    if (error) {
      console.error("Update workflow error:", error);
      return NextResponse.json(
        { error: "Failed to update workflow" },
        { status: 500 },
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("Update workflow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { error } = await untypedQuery(supabase)
      .from("workflows")
      .delete()
      .eq("id", workflowId)
      .eq("org_id", userData.org_id);

    if (error) {
      console.error("Delete workflow error:", error);
      return NextResponse.json(
        { error: "Failed to delete workflow" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workflow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
