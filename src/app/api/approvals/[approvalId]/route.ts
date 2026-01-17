/**
 * Approval Details API - Get, Approve, Reject, Cancel Approval
 * GET: Get approval by ID
 * PATCH: Approve or reject the approval
 * DELETE: Cancel a pending approval
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApprovalGate } from "@/agents/hitl";

interface RouteParams {
  params: Promise<{ approvalId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { approvalId } = await params;
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

    const approvalGate = new ApprovalGate(supabase, userData.org_id);
    const approval = await approvalGate.getRequest(approvalId);

    if (!approval) {
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ approval });
  } catch (error) {
    console.error("Get approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { approvalId } = await params;
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
    const { action, comment } = body;

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 },
      );
    }

    const approvalGate = new ApprovalGate(supabase, userData.org_id);

    const success =
      action === "approve"
        ? await approvalGate.approve(approvalId, user.id, comment)
        : await approvalGate.reject(approvalId, user.id, comment);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update approval" },
        { status: 500 },
      );
    }

    // Get updated approval
    const approval = await approvalGate.getRequest(approvalId);

    return NextResponse.json({ success: true, approval });
  } catch (error) {
    console.error("Update approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { approvalId } = await params;
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

    const approvalGate = new ApprovalGate(supabase, userData.org_id);
    const success = await approvalGate.cancel(approvalId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to cancel approval" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
