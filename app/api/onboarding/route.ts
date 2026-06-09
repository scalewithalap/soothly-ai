/**
 * Onboarding API
 *
 * PATCH: Update onboarding progress
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/inngest/client";

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  try {
    const { step, completed, data } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Update user profile with onboarding data
    const updateData: Record<string, unknown> = {
      onboarding_step: step,
      onboarding_completed: completed,
      updated_at: new Date().toISOString(),
    };

    if (data.full_name) {
      updateData.full_name = data.full_name;
    }

    await supabase.from("users").update(updateData).eq("id", authResult.id);

    // Update organization if provided
    if (data.org_name) {
      const { data: user } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", authResult.id)
        .single();

      if (user?.org_id) {
        await supabase
          .from("organizations")
          .update({
            name: data.org_name,
            metadata: { industry: data.industry },
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.org_id);
      }
    }

    // Hand off to the Onboarding agent when product onboarding completes.
    // This was the agent's documented trigger (auth.user.created) but nothing
    // ever emitted it — fired here, where we reliably know org context exists.
    if (completed) {
      try {
        const { data: user } = await supabase
          .from("users")
          .select("org_id, email, full_name")
          .eq("id", authResult.id)
          .single();
        if (user?.org_id) {
          await inngest.send({
            name: "onboarding/user.created",
            data: {
              orgId: user.org_id,
              userId: authResult.id,
              email: user.email,
              fullName: user.full_name ?? null,
              source: "product_onboarding",
            },
          });
        }
      } catch (eventError) {
        // Non-fatal: onboarding completion must not fail on event emit.
        console.error("onboarding/user.created emit failed:", eventError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding update error:", error);
    return NextResponse.json(
      { error: "onboarding/update_failed" },
      { status: 500 },
    );
  }
}

