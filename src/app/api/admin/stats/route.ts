/**
 * Admin Stats API
 *
 * Platform-wide statistics for admin dashboard.
 */

import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const authResult = await requireAuth();
  if (isErrorResponse(authResult)) return authResult;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Check if user is admin
  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", authResult.id)
    .single();

  if (user?.role !== "admin") {
    return NextResponse.json({ error: "admin/unauthorized" }, { status: 403 });
  }

  try {
    // Fetch org-wide stats
    const [usersResult, tasksResult, messagesResult, usageResult] =
      await Promise.all([
        // Total users in org
        supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("org_id", authResult.orgId),

        // Agent tasks this month
        supabase
          .from("agent_tasks")
          .select("*", { count: "exact", head: true })
          .eq("org_id", authResult.orgId)
          .gte(
            "created_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          ),

        // Messages this month
        supabase
          .from("agent_messages")
          .select("*", { count: "exact", head: true })
          .eq("org_id", authResult.orgId)
          .gte(
            "created_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          ),

        // Current period usage
        supabase
          .from("org_usage")
          .select("current_count")
          .eq("org_id", authResult.orgId)
          .eq("period_start", new Date().toISOString().slice(0, 7) + "-01"),
      ]);

    return NextResponse.json({
      stats: {
        totalUsers: usersResult.count || 0,
        tasksThisMonth: tasksResult.count || 0,
        messagesThisMonth: messagesResult.count || 0,
        totalUsage:
          usageResult.data?.reduce(
            (sum: number, u: { current_count: number }) =>
              sum + u.current_count,
            0,
          ) || 0,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "admin/stats_failed" }, { status: 500 });
  }
}
