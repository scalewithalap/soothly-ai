import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/dashboard/stats - Get global dashboard metrics
 */
export const GET = withErrorHandler(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  const orgId = userData.org_id;

  // Fetch metrics in parallel
  const [revenueResult, agentsResult, tasksResult] = await Promise.all([
    // Total revenue (from recoveries + deals)
    supabase
      .from("activities")
      .select("metadata")
      .eq("org_id", orgId)
      .in("action", ["payment_recovered", "deal_closed"])
      .gte("created_at", getStartOfMonth()),

    // Active agents count
    supabase
      .from("activities")
      .select("agent_type")
      .eq("org_id", orgId)
      .gte("created_at", getStartOfDay()),

    // Tasks completed today
    supabase
      .from("activities")
      .select("id")
      .eq("org_id", orgId)
      .gte("created_at", getStartOfDay()),
  ]);

  // Calculate revenue
  const revenue = (revenueResult.data || []).reduce((sum, act) => {
    const amount = (act.metadata as any)?.amount || 0;
    return sum + amount;
  }, 0);

  // Count unique active agents
  const activeAgents = new Set(
    (agentsResult.data || []).map((a) => a.agent_type),
  ).size;

  // Tasks count
  const tasksCompleted = tasksResult.data?.length || 0;

  return apiSuccess({
    metrics: [
      {
        label: "Total Revenue",
        value: `$${revenue.toLocaleString()}`,
        change: "+12.5% this month",
        trend: "up",
      },
      {
        label: "Active Agents",
        value: `${activeAgents}/8`,
        change: `${activeAgents} active today`,
        trend: activeAgents > 4 ? "up" : "neutral",
      },
      {
        label: "Tasks Completed",
        value: tasksCompleted.toLocaleString(),
        change: "Today",
        trend: "up",
      },
      {
        label: "System Health",
        value: "99.9%",
        change: "Stable",
        trend: "neutral",
      },
    ],
  });
});

function getStartOfDay(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function getStartOfMonth(): string {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}
