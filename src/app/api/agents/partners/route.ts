import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const discoverPartnersSchema = z.object({
  industry: z.string().min(2),
  partner_type: z
    .enum([
      "affiliate",
      "reseller",
      "integration",
      "referral",
      "strategic",
      "other",
    ])
    .default("affiliate"),
});

// GET /api/agents/partners - List partners for current org
export async function GET() {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 400 });
    }

    const { data: partners, error } = await supabase
      .from("partners")
      .select("*")
      .eq("org_id", userData.org_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching partners:", error);
      return NextResponse.json({ error: "db/fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ partners });
  } catch (error) {
    console.error("Partners GET error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}

// POST /api/agents/partners - Trigger partner discovery
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
    const parsed = discoverPartnersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 400 });
    }

    // Trigger Inngest event for background partner discovery
    await inngest.send({
      name: "partners/discover.requested",
      data: {
        industry: parsed.data.industry,
        partnerType: parsed.data.partner_type,
        orgId: userData.org_id,
      },
    });

    return NextResponse.json(
      { message: "Discovery started", industry: parsed.data.industry },
      { status: 202 }
    );
  } catch (error) {
    console.error("Partners POST error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
