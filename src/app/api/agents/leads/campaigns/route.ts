import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const createCampaignSchema = z.object({
  name: z.string().min(3),
  target_criteria: z
    .object({
      industry: z.string().optional(),
      job_title: z.string().optional(),
      location: z.string().optional(),
    })
    .optional(),
});

// GET /api/agents/leads/campaigns - List campaigns for current org
export async function GET() {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    // Get user's org
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 400 });
    }

    const { data: campaigns, error } = await supabase
      .from("lead_campaigns")
      .select("*")
      .eq("org_id", userData.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching campaigns:", error);
      return NextResponse.json({ error: "db/fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Campaigns GET error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}

// POST /api/agents/leads/campaigns - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get user's org
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 400 });
    }

    const { data: campaign, error } = await supabase
      .from("lead_campaigns")
      .insert({
        org_id: userData.org_id,
        name: parsed.data.name,
        target_criteria: parsed.data.target_criteria || {},
        status: "draft",
        leads_collected: 0,
        leads_contacted: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating campaign:", error);
      return NextResponse.json({ error: "db/create_failed" }, { status: 500 });
    }

    // Trigger Inngest event for background processing
    await inngest.send({
      name: "leads/campaign.created",
      data: {
        campaignId: (campaign as { id: string }).id,
        orgId: userData.org_id,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Campaigns POST error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
