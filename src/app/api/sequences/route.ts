/**
 * Email Sequences API Routes
 * List and create sequences
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listSequences,
  createSequence,
  CreateSequenceSchema,
} from "@/lib/sequences";

/**
 * GET /api/sequences
 * List all sequences for the organization
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "draft"
      | "active"
      | "paused"
      | "archived"
      | null;
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const result = await listSequences({
      status: status ?? undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.sequences,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.sequences.length < result.total,
      },
    });
  } catch (error) {
    console.error("Failed to list sequences:", error);
    return NextResponse.json(
      {
        error: {
          code: "sequences/list_failed",
          userMessage: "Failed to load sequences",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sequences
 * Create a new sequence
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parseResult = CreateSequenceSchema.safeParse(body);

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

    const sequence = await createSequence(parseResult.data, user.id);

    return NextResponse.json(
      { success: true, data: sequence },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create sequence:", error);
    return NextResponse.json(
      {
        error: {
          code: "sequences/create_failed",
          userMessage: "Failed to create sequence",
        },
      },
      { status: 500 },
    );
  }
}
