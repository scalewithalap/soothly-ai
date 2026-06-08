/**
 * Email Sequence Enrollments API Routes
 * Manage contact enrollments in sequences
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listEnrollments,
  bulkEnroll,
  pauseEnrollment,
  resumeEnrollment,
  removeEnrollment,
  BulkEnrollSchema,
} from "@/lib/sequences";

interface RouteParams {
  params: Promise<{ sequenceId: string }>;
}

/**
 * GET /api/sequences/[sequenceId]/enrollments
 * List enrollments for a sequence
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as
      | "active"
      | "completed"
      | "paused"
      | "bounced"
      | "replied"
      | null;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const result = await listEnrollments(sequenceId, {
      status: status ?? undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: result.enrollments,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.enrollments.length < result.total,
      },
    });
  } catch (error) {
    console.error("Failed to list enrollments:", error);
    return NextResponse.json(
      {
        error: {
          code: "enrollments/list_failed",
          userMessage: "Failed to load enrollments",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sequences/[sequenceId]/enrollments
 * Bulk enroll contacts
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
    const parseResult = BulkEnrollSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "validation/invalid_input",
            userMessage: "Invalid enrollment data",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const result = await bulkEnroll(sequenceId, parseResult.data);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error("Failed to enroll contacts:", error);
    return NextResponse.json(
      {
        error: {
          code: "enrollments/create_failed",
          userMessage: "Failed to enroll contacts",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/sequences/[sequenceId]/enrollments
 * Bulk action on enrollments (pause/resume)
 */
export async function PATCH(request: NextRequest, {}: RouteParams) {
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
    const { action, enrollmentIds } = body as {
      action: "pause" | "resume" | "remove";
      enrollmentIds: string[];
    };

    if (!action || !enrollmentIds?.length) {
      return NextResponse.json(
        {
          error: {
            code: "validation/invalid_input",
            userMessage: "Action and enrollmentIds required",
          },
        },
        { status: 400 },
      );
    }

    const results = await Promise.allSettled(
      enrollmentIds.map(async (id) => {
        switch (action) {
          case "pause":
            return await pauseEnrollment(id);
          case "resume":
            return await resumeEnrollment(id);
          case "remove":
            return await removeEnrollment(id);
        }
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      data: { succeeded, failed, total: enrollmentIds.length },
    });
  } catch (error) {
    console.error("Failed to update enrollments:", error);
    return NextResponse.json(
      {
        error: {
          code: "enrollments/update_failed",
          userMessage: "Failed to update enrollments",
        },
      },
      { status: 500 },
    );
  }
}
