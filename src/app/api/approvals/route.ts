/**
 * Approvals API - List and Create Approval Requests
 * GET: List approval requests for the organization
 * POST: Create a new approval request (typically called by agents)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApprovalGate } from "@/agents/hitl";

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
    const risk_level = searchParams.get("risk_level");
    const agent_type = searchParams.get("agent_type");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const approvalGate = new ApprovalGate(supabase, userData.org_id);

    const approvals = await approvalGate.list({
      statuses: status ? [status as any] : undefined,
      risk_levels: risk_level ? [risk_level as any] : undefined,
      agent_types: agent_type ? [agent_type as any] : undefined,
      limit,
      offset,
    });

    // Get pending count
    const pendingCount = await approvalGate.getPendingCount();

    return NextResponse.json({ approvals, pending_count: pendingCount });
  } catch (error) {
    console.error("Approvals API error:", error);
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
    const {
      agent_type,
      action,
      title,
      description,
      params,
      preview_data,
      risk_level = "medium",
      risk_factors,
      assigned_to,
    } = body;

    if (!agent_type || !action || !title) {
      return NextResponse.json(
        { error: "agent_type, action, and title are required" },
        { status: 400 },
      );
    }

    const approvalGate = new ApprovalGate(supabase, userData.org_id);

    const approval = await approvalGate.requestApproval({
      agent_type,
      action,
      title,
      description,
      params,
      preview_data,
      risk_level,
      risk_factors,
      requested_by: user.id,
      assigned_to,
    });

    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    console.error("Create approval error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
