import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const setupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  industry: z.string().optional(),
  companySize: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    // Get user's org
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 404 });
    }

    // Parse and validate body
    const body = await request.json();
    const result = setupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "validation/invalid_input", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, industry, companySize } = result.data;

    // Update organization
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        name,
        industry: industry || null,
        company_size: companySize || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.org_id);

    if (updateError) {
      console.error("Failed to update organization:", updateError);
      return NextResponse.json({ error: "db/update_failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Org setup error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
