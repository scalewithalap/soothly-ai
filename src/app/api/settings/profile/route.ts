import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
});

// GET /api/settings/profile - Get current user profile
export async function GET() {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, created_at")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "db/fetch_failed" }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/profile - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabase
      .from("users")
      .update({
        full_name: parsed.data.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json({ error: "db/update_failed" }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
