/**
 * Email Sequence Step Details API Routes
 * Update and delete individual steps
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateStep, deleteStep, UpdateStepSchema } from "@/lib/sequences";

interface RouteParams {
  params: Promise<{ sequenceId: string; stepId: string }>;
}

/**
 * PATCH /api/sequences/[sequenceId]/steps/[stepId]
 * Update a specific step
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "auth/unauthorized", userMessage: "Please sign in" } },
        { status: 401 },
      );
    }

    const { sequenceId, stepId } = await params;
    const body = await request.json();
    const parseResult = UpdateStepSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "validation/invalid_input",
            userMessage: "Invalid step data",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const step = await updateStep(stepId, parseResult.data);

    return NextResponse.json({ success: true, data: step });
  } catch (error) {
    console.error("Failed to update step:", error);
    return NextResponse.json(
      {
        error: {
          code: "steps/update_failed",
          userMessage: "Failed to update step",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/sequences/[sequenceId]/steps/[stepId]
 * Delete a specific step
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "auth/unauthorized", userMessage: "Please sign in" } },
        { status: 401 },
      );
    }

    const { stepId } = await params;
    await deleteStep(stepId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete step:", error);
    return NextResponse.json(
      {
        error: {
          code: "steps/delete_failed",
          userMessage: "Failed to delete step",
        },
      },
      { status: 500 },
    );
  }
}
