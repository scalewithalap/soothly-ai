import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Params {
  params: Promise<{ agentId: string }>;
}

function getThoughtIcon(type: string): string {
  switch (type) {
    case "info":
      return "💭";
    case "action":
      return "⚡";
    case "decision":
      return "🤔";
    case "error":
      return "❌";
    case "success":
      return "✅";
    default:
      return "📝";
  }
}

// GET /api/agents/[agentId]/thoughts - Get thought stream for an agent
export async function GET(request: Request, context: Params) {
  try {
    const { agentId } = await context.params;
    const supabase = (await createClient()) as unknown as SupabaseClient;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: ErrorCodes.AUTH_UNAUTHORIZED } },
        { status: 401 },
      );
    }

    // Get user's org
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        { success: false, error: { code: ErrorCodes.NOT_FOUND } },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const since = searchParams.get("since");

    // Build query
    let query = supabase
      .from("agent_thoughts")
      .select("*")
      .eq("org_id", userData.org_id)
      .eq("agent_type", agentId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data: thoughts, error } = await query;

    if (error) {
      console.error("Failed to fetch agent thoughts:", error);
      return NextResponse.json(
        { success: false, error: { code: ErrorCodes.DATABASE_ERROR } },
        { status: 500 },
      );
    }

    // Get the latest thought for quick display
    const latestThought = thoughts?.[0] || null;

    // Format thoughts with icons based on type
    const formattedThoughts = (thoughts || []).map((t) => ({
      ...t,
      icon: getThoughtIcon(t.thought_type),
    }));

    return NextResponse.json({
      success: true,
      data: {
        thoughts: formattedThoughts,
        latestThought,
        count: thoughts?.length || 0,
      },
    });
  } catch (error) {
    console.error("Failed to fetch thoughts:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: ErrorCodes.DATABASE_ERROR } },
      { status: 500 },
    );
  }
}
