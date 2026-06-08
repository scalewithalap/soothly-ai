import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/agents/recovery/stats - Get aggregate recovery statistics
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

  // Get all recoveries for stats calculation
  const { data: recoveries, error } = await supabase
    .from("payment_recoveries")
    .select("status, amount, failure_code")
    .eq("org_id", userData.org_id);

  if (error) {
    console.error("Error fetching recovery stats:", error);
    throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch stats", 500);
  }

  const all = recoveries || [];
  const recovered = all.filter((r) => r.status === "recovered");
  const atRisk = all.filter(
    (r) => r.status === "pending" || r.status === "link_sent",
  );

  // Calculate recovery rate
  const totalCompleted =
    recovered.length +
    all.filter((r) => r.status === "failed" || r.status === "blocked").length;
  const recoveryRate =
    totalCompleted > 0
      ? Math.round((recovered.length / totalCompleted) * 100)
      : 0;

  // Calculate amounts
  const totalRecovered = recovered.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalAtRisk = atRisk.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Top failure reasons
  const failureCounts: Record<string, number> = {};
  all.forEach((r) => {
    const reason = r.failure_code || "unknown";
    failureCounts[reason] = (failureCounts[reason] || 0) + 1;
  });

  const topFailureReasons = Object.entries(failureCounts)
    .map(([reason, count]) => ({ reason: formatReason(reason), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return apiSuccess({
    stats: {
      recoveryRate,
      totalRecovered,
      totalAtRisk,
      topFailureReasons,
    },
  });
});

function formatReason(code: string): string {
  return code
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
