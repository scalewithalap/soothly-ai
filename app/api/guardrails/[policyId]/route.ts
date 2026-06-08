/**
 * Guardrail Policy Details API - Get, Update, Delete Policy
 * GET: Get policy by ID
 * PATCH: Update policy
 * DELETE: Delete policy
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Guardrails } from "@/lib/agents/safety";
import { untypedQuery } from "@/lib/agents/utils/dbUtils";

interface RouteParams {
  params: Promise<{ policyId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { policyId } = await params;
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

    const { data: policy, error } = await untypedQuery(supabase)
      .from("guardrail_policies")
      .select("*")
      .eq("id", policyId)
      .eq("org_id", userData.org_id)
      .single();

    if (error || !policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    return NextResponse.json({ policy });
  } catch (error) {
    console.error("Get policy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { policyId } = await params;
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
    const guardrails = new Guardrails(supabase, userData.org_id);

    const success = await guardrails.updatePolicy(policyId, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update policy" },
        { status: 500 },
      );
    }

    // Fetch updated policy
    const { data: policy } = await untypedQuery(supabase)
      .from("guardrail_policies")
      .select("*")
      .eq("id", policyId)
      .single();

    return NextResponse.json({ policy });
  } catch (error) {
    console.error("Update policy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { policyId } = await params;
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

    const guardrails = new Guardrails(supabase, userData.org_id);
    const success = await guardrails.deletePolicy(policyId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete policy" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete policy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
