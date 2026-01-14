import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const PIPELINE_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

// GET: Fetch leads grouped by pipeline stage
export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 404 });
    }

    // Fetch all contacts with their pipeline stage
    const { data: contacts, error } = await supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, email, company, title, pipeline_stage, created_at, updated_at"
      )
      .eq("org_id", userData.org_id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch contacts:", error);
      return NextResponse.json({ error: "db/query_failed" }, { status: 500 });
    }

    // Group by stage
    const pipeline: Record<string, typeof contacts> = {};
    PIPELINE_STAGES.forEach((stage) => {
      pipeline[stage] =
        contacts?.filter((c) => (c.pipeline_stage || "new") === stage) || [];
    });

    // Calculate stage counts
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach((stage) => {
      counts[stage] = pipeline[stage].length;
    });

    return NextResponse.json({
      pipeline,
      counts,
      total: contacts?.length || 0,
    });
  } catch (error) {
    console.error("Pipeline API error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}

// PATCH: Move lead to a new stage
export async function PATCH(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 404 });
    }

    const body = await request.json();
    const { contactId, stage } = body;

    if (!contactId || !stage) {
      return NextResponse.json(
        { error: "validation/missing_fields" },
        { status: 400 }
      );
    }

    if (!PIPELINE_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: "validation/invalid_stage" },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("contacts")
      .update({
        pipeline_stage: stage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contactId)
      .eq("org_id", userData.org_id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update contact:", error);
      return NextResponse.json({ error: "db/update_failed" }, { status: 500 });
    }

    return NextResponse.json({ contact: updated });
  } catch (error) {
    console.error("Pipeline update error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
