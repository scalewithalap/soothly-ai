/**
 * A2A Task Status API
 * Get status of a specific task
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getA2AServer } from "@/agents/a2a";
import type { Task, TaskState, Message, Artifact } from "@/agents/a2a/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/a2a/tasks/[id]
 * Get task details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: taskId } = await params;

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get org_id
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 },
      );
    }

    // Fetch task
    const { data: task, error } = await supabase
      .from("a2a_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("org_id", userData.org_id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const response: Task = {
      id: task.id,
      sessionId: task.session_id || undefined,
      status: {
        state: task.status as TaskState,
        timestamp: task.updated_at,
      },
      messages: task.messages as unknown as Message[],
      artifacts: task.artifacts as unknown as Artifact[],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("A2A task get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
