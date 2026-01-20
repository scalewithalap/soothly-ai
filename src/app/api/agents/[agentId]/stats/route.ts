import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Params {
  params: Promise<{ agentId: string }>;
}

// GET /api/agents/[agentId]/stats - Get detailed stats for a specific agent
export async function GET(_request: Request, context: Params) {
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

    // Fetch agent config
    const { data: config } = await supabase
      .from("agent_config")
      .select("*")
      .eq("org_id", userData.org_id)
      .eq("agent_type", agentId)
      .single();

    // Fetch recent activities for this agent
    const { data: activities } = await supabase
      .from("activities")
      .select("*")
      .eq("org_id", userData.org_id)
      .eq("agent_type", agentId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch recent thoughts
    const { data: thoughts } = await supabase
      .from("agent_thoughts")
      .select("*")
      .eq("org_id", userData.org_id)
      .eq("agent_type", agentId)
      .order("created_at", { ascending: false })
      .limit(100);

    // Calculate run history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentRuns } = await supabase
      .from("activities")
      .select("created_at, status, usage_count")
      .eq("org_id", userData.org_id)
      .eq("agent_type", agentId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // Group runs by day for chart data
    const runsByDay: Record<
      string,
      { tasks: number; usage: number; value: number }
    > = {};
    for (const run of recentRuns || []) {
      const day = run.created_at.split("T")[0];
      if (!runsByDay[day]) {
        runsByDay[day] = { tasks: 0, usage: 0, value: 0 };
      }
      runsByDay[day].tasks += 1;
      runsByDay[day].usage += run.usage_count || 0;
      runsByDay[day].value += (run.usage_count || 0) * 0.5;
    }

    const chartData = Object.entries(runsByDay).map(([date, stats]) => ({
      date,
      ...stats,
    }));

    // Default config if not exists
    const agentConfig = config || {
      agent_type: agentId,
      is_active: false,
      autonomy_level: "wait",
      total_tasks_completed: 0,
      total_usage: 0,
      total_value_generated: 0,
      last_run_at: null,
      last_thought: null,
    };

    // Calculate success rate
    const completedTasks = (activities || []).filter(
      (a) => a.status === "completed",
    ).length;
    const failedTasks = (activities || []).filter(
      (a) => a.status === "failed",
    ).length;
    const successRate =
      completedTasks + failedTasks > 0
        ? Math.round((completedTasks / (completedTasks + failedTasks)) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        config: agentConfig,
        stats: {
          successRate,
          totalRuns: activities?.length || 0,
          avgUsagePerRun: activities?.length
            ? Math.round((agentConfig.total_usage || 0) / activities.length)
            : 0,
          estimatedHoursSaved: Math.round(
            (agentConfig.total_tasks_completed || 0) * 0.25,
          ),
        },
        recentActivities: activities || [],
        recentThoughts: thoughts || [],
        chartData,
      },
    });
  } catch (error) {
    console.error("Failed to fetch agent stats:", error);
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
