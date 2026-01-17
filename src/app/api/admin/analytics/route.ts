/**
 * Admin Analytics API
 *
 * GET: Returns analytics data for admin dashboard
 * - Credit usage trend
 * - Agent task counts
 * - Message volume
 * - Daily active users
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

async function checkAdminRole(userId: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  return ["admin", "owner"].includes(user?.role || "");
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  if (!(await checkAdminRole(authResult.id))) {
    return NextResponse.json(
      { error: "analytics/unauthorized" },
      { status: 403 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get("days") || "30", 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString();

  // Credit usage trend
  const { data: creditData } = await supabase
    .from("credit_ledger")
    .select("amount, created_at")
    .eq("org_id", authResult.orgId)
    .gte("created_at", startDateStr)
    .order("created_at", { ascending: true });

  // Aggregate by day
  const creditTrend: Record<string, number> = {};
  (creditData || []).forEach((entry) => {
    const dayKey = new Date(entry.created_at).toISOString().split("T")[0];
    creditTrend[dayKey] = (creditTrend[dayKey] || 0) + Math.abs(entry.amount);
  });

  // Agent task counts
  const { data: taskData } = await supabase
    .from("agent_tasks")
    .select("status, agent_type")
    .eq("org_id", authResult.orgId)
    .gte("created_at", startDateStr);

  const tasksByStatus: Record<string, number> = {};
  const tasksByAgent: Record<string, number> = {};
  (taskData || []).forEach((task) => {
    tasksByStatus[task.status] = (tasksByStatus[task.status] || 0) + 1;
    tasksByAgent[task.agent_type] = (tasksByAgent[task.agent_type] || 0) + 1;
  });

  // Message volume (agent messages or superagent sessions)
  const { data: messageData } = await supabase
    .from("agent_messages")
    .select("created_at")
    .eq("org_id", authResult.orgId)
    .gte("created_at", startDateStr);

  const messageTrend: Record<string, number> = {};
  (messageData || []).forEach((msg) => {
    const dayKey = new Date(msg.created_at).toISOString().split("T")[0];
    messageTrend[dayKey] = (messageTrend[dayKey] || 0) + 1;
  });

  // Active users (based on activities table)
  const { data: activityData } = await supabase
    .from("activities")
    .select("user_id, created_at")
    .eq("org_id", authResult.orgId)
    .gte("created_at", startDateStr);

  const activeUsersByDay: Record<string, Set<string>> = {};
  (activityData || []).forEach((activity) => {
    const dayKey = new Date(activity.created_at).toISOString().split("T")[0];
    if (!activeUsersByDay[dayKey]) activeUsersByDay[dayKey] = new Set();
    activeUsersByDay[dayKey].add(activity.user_id);
  });

  const dauTrend = Object.entries(activeUsersByDay).map(([date, users]) => ({
    date,
    count: users.size,
  }));

  // Format trends for charts
  const formatTrend = (data: Record<string, number>) =>
    Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

  return NextResponse.json({
    creditUsage: formatTrend(creditTrend),
    messages: formatTrend(messageTrend),
    dau: dauTrend.sort((a, b) => a.date.localeCompare(b.date)),
    tasks: {
      byStatus: tasksByStatus,
      byAgent: tasksByAgent,
      total: taskData?.length || 0,
    },
    summary: {
      totalCreditsUsed: Object.values(creditTrend).reduce((a, b) => a + b, 0),
      totalMessages: Object.values(messageTrend).reduce((a, b) => a + b, 0),
      totalTasks: taskData?.length || 0,
      avgDailyActiveUsers: Math.round(
        dauTrend.reduce((sum, d) => sum + d.count, 0) / (dauTrend.length || 1),
      ),
    },
  });
}
