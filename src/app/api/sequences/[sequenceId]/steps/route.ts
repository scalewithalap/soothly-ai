/**
 * Email Sequence Steps API Routes
 * Manage steps within a sequence
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSteps,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps,
  CreateStepSchema,
  UpdateStepSchema,
  ReorderStepsSchema,
} from "@/lib/sequences";

interface RouteParams {
  params: Promise<{ sequenceId: string }>;
}

/**
 * GET /api/sequences/[sequenceId]/steps
 * List all steps in a sequence
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
    const steps = await getSteps(sequenceId);

    return NextResponse.json({ success: true, data: steps });
  } catch (error) {
    console.error("Failed to get steps:", error);
    return NextResponse.json(
      {
        error: {
          code: "steps/list_failed",
          userMessage: "Failed to load steps",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sequences/[sequenceId]/steps
 * Create a new step
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const parseResult = CreateStepSchema.safeParse(body);

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

    const step = await createStep(sequenceId, parseResult.data);

    return NextResponse.json({ success: true, data: step }, { status: 201 });
  } catch (error) {
    console.error("Failed to create step:", error);
    return NextResponse.json(
      {
        error: {
          code: "steps/create_failed",
          userMessage: "Failed to create step",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/sequences/[sequenceId]/steps
 * Reorder steps
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const parseResult = ReorderStepsSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "validation/invalid_input",
            userMessage: "Invalid reorder data",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const steps = await reorderSteps(sequenceId, parseResult.data);

    return NextResponse.json({ success: true, data: steps });
  } catch (error) {
    console.error("Failed to reorder steps:", error);
    return NextResponse.json(
      {
        error: {
          code: "steps/reorder_failed",
          userMessage: "Failed to reorder steps",
        },
      },
      { status: 500 },
    );
  }
}
