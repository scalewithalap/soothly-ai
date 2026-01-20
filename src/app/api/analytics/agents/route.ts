import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET: Fetch agent analytics/metrics
export const GET = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get user's org
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
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
  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("agent_type, status, created_at")
    .eq("org_id", userData.org_id)
    .gte("created_at", startDate.toISOString());

  if (activitiesError) {
    console.error("Failed to fetch activities:", activitiesError);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch analytics",
      500,
    );
  }

  // Fetch usage in period from org_usage
  const currentPeriod = new Date().toISOString().slice(0, 7) + "-01";
  const { data: usage } = await supabase
    .from("org_usage")
    .select("feature_key, current_count")
    .eq("org_id", userData.org_id)
    .eq("period_start", currentPeriod);

  // Calculate metrics
  const tasksByAgent = {
    lead_gen:
      activities?.filter(
        (a) => a.agent_type === "lead_gen" || a.agent_type === "leads",
      ).length || 0,
    seo:
      activities?.filter(
        (a) => a.agent_type === "seo" || a.agent_type === "content",
      ).length || 0,
    partnership:
      activities?.filter(
        (a) => a.agent_type === "partnership" || a.agent_type === "partners",
      ).length || 0,
  };

  const completedTasks =
    activities?.filter((a) => a.status === "completed").length || 0;
  const failedTasks =
    activities?.filter((a) => a.status === "failed").length || 0;
  const totalTasks = activities?.length || 0;
  const successRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalUsage = usage?.reduce((sum, u) => sum + u.current_count, 0) || 0;

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

  return apiSuccess({
    period,
    metrics: {
      totalTasks,
      completedTasks,
      failedTasks,
      successRate,
      totalUsage,
      tasksByAgent,
    },
    chartData,
  });
});
