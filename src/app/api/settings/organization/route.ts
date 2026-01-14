import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
});

// GET /api/settings/organization - Get current organization
export async function GET() {
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
      return NextResponse.json({ error: "org/not_found" }, { status: 400 });
    }

    const { data: org, error } = await supabase
      .from("organizations")
      .select(
        "id, name, subscription_tier, credits_balance, credits_limit, created_at"
      )
      .eq("id", userData.org_id)
      .single();

    if (error) {
      return NextResponse.json({ error: "db/fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error("Organization GET error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/organization - Update organization
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
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 400 });
    }

    // Only owners and admins can update org settings
    if (!["owner", "admin"].includes(userData.role)) {
      return NextResponse.json({ error: "auth/forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateOrgSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: org, error } = await supabase
      .from("organizations")
      .update({
        name: parsed.data.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.org_id)
      .select()
      .single();

    if (error) {
      console.error("Organization update error:", error);
      return NextResponse.json({ error: "db/update_failed" }, { status: 500 });
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error("Organization PATCH error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
