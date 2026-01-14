import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET: Fetch agent analytics/metrics
export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    // Get user's org
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: "org/not_found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d

    // Calculate date range
    const now = new Date();
    let daysBack = 7;
    if (period === "30d") daysBack = 30;
    if (period === "90d") daysBack = 90;

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Fetch activities in period
    const { data: activities } = await supabase
      .from("activities")
      .select("agent_type, status, created_at")
      .eq("org_id", userData.org_id)
      .gte("created_at", startDate.toISOString());

    // Fetch credit usage in period
    const { data: credits } = await supabase
      .from("credit_ledger")
      .select("agent_type, amount, action, created_at")
      .eq("org_id", userData.org_id)
      .lt("amount", 0) // Only consumption
      .gte("created_at", startDate.toISOString());

    // Calculate metrics
    const tasksByAgent = {
      leads: activities?.filter((a) => a.agent_type === "leads").length || 0,
      content:
        activities?.filter((a) => a.agent_type === "content").length || 0,
      partners:
        activities?.filter((a) => a.agent_type === "partners").length || 0,
    };

    const completedTasks =
      activities?.filter((a) => a.status === "completed").length || 0;
    const failedTasks =
      activities?.filter((a) => a.status === "failed").length || 0;
    const totalTasks = activities?.length || 0;
    const successRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const creditsUsed =
      credits?.reduce((sum, c) => sum + Math.abs(c.amount), 0) || 0;

    // Group tasks by day for chart
    const tasksByDay: Record<string, number> = {};
    activities?.forEach((a) => {
      const day = new Date(a.created_at).toISOString().split("T")[0];
      tasksByDay[day] = (tasksByDay[day] || 0) + 1;
    });

    // Convert to array sorted by date
    const chartData = Object.entries(tasksByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      period,
      metrics: {
        totalTasks,
        completedTasks,
        failedTasks,
        successRate,
        creditsUsed,
        tasksByAgent,
      },
      chartData,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "server/internal_error" },
      { status: 500 }
    );
  }
}
