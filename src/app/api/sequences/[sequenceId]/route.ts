/**
 * Email Sequence Detail API Routes
 * Get, update, and delete individual sequences
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSequenceWithSteps,
  updateSequence,
  deleteSequence,
  UpdateSequenceSchema,
} from "@/lib/sequences";

interface RouteParams {
  params: Promise<{ sequenceId: string }>;
}

/**
 * GET /api/sequences/[sequenceId]
 * Get a sequence with its steps
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { sequenceId } = await params;
    const sequence = await getSequenceWithSteps(sequenceId);

    if (!sequence) {
      return NextResponse.json(
        {
          error: {
            code: "sequences/not_found",
            userMessage: "Sequence not found",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: sequence });
  } catch (error) {
    console.error("Failed to get sequence:", error);
    return NextResponse.json(
      {
        error: {
          code: "sequences/get_failed",
          userMessage: "Failed to load sequence",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/sequences/[sequenceId]
 * Update a sequence
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

    const { sequenceId } = await params;
    const body = await request.json();
    const parseResult = UpdateSequenceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "validation/invalid_input",
            userMessage: "Invalid sequence data",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const sequence = await updateSequence(sequenceId, parseResult.data);

    return NextResponse.json({ success: true, data: sequence });
  } catch (error) {
    console.error("Failed to update sequence:", error);
    return NextResponse.json(
      {
        error: {
          code: "sequences/update_failed",
          userMessage: "Failed to update sequence",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/sequences/[sequenceId]
 * Archive a sequence (soft delete)
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

    const { sequenceId } = await params;
    await deleteSequence(sequenceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete sequence:", error);
    return NextResponse.json(
      {
        error: {
          code: "sequences/delete_failed",
          userMessage: "Failed to delete sequence",
        },
      },
      { status: 500 },
    );
  }
}
