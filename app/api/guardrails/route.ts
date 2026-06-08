/**
 * Guardrails API - List and Create Guardrail Policies
 * GET: List guardrail policies for the organization
 * POST: Create a new guardrail policy
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Guardrails } from "@/lib/agents/safety";
import { untypedQuery } from "@/lib/agents/utils/dbUtils";

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
    const enabled = searchParams.get("enabled");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = untypedQuery(supabase)
      .from("guardrail_policies")
      .select("*")
      .eq("org_id", userData.org_id)
      .order("priority", { ascending: true })
      .range(offset, offset + limit - 1);

    if (enabled !== null) {
      query = query.eq("enabled", enabled === "true");
    }

    const { data: policies, error } = await query;

    if (error) {
      console.error("Error fetching guardrail policies:", error);
      return NextResponse.json(
        { error: "Failed to fetch policies" },
        { status: 500 },
      );
    }

    return NextResponse.json({ policies });
  } catch (error) {
    console.error("Guardrails API error:", error);
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
      name,
      description,
      applies_to_agents = [],
      applies_to_actions = [],
      rules = [],
      enabled = true,
      priority = 100,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const guardrails = new Guardrails(supabase, userData.org_id);

    const policy = await guardrails.createPolicy({
      org_id: userData.org_id,
      name,
      description,
      applies_to_agents,
      applies_to_actions,
      rules,
      enabled,
      priority,
      created_by: user.id,
    });

    if (!policy) {
      return NextResponse.json(
        { error: "Failed to create policy" },
        { status: 500 },
      );
    }

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error("Create guardrail error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
