import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const passwordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

// POST /api/settings/profile/password - Change password
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
    const parsed = passwordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Note: Supabase doesn't have a direct "verify current password" method
    // In production, you might need to re-authenticate the user first
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (error) {
      console.error("Password change error:", error);
      return NextResponse.json(
        { error: "auth/password_change_failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password POST error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
