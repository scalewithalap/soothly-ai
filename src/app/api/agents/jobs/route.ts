import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET: Fetch recent agent jobs/activities
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
  const status = searchParams.get("status"); // running, completed, failed
  const limit = parseInt(searchParams.get("limit") || "20");

  // Fetch recent activities
  let query = supabase
    .from("activities")
    .select("*")
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: activities, error } = await query;

  if (error) {
    console.error("Failed to fetch activities:", error);
    throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch jobs", 500);
  }

  // Count by status for summary
  const { data: statusCounts } = await supabase
    .from("activities")
    .select("status")
    .eq("org_id", userData.org_id);

  const summary = {
    total: statusCounts?.length || 0,
    running: statusCounts?.filter((a) => a.status === "running").length || 0,
    completed:
      statusCounts?.filter((a) => a.status === "completed").length || 0,
    failed: statusCounts?.filter((a) => a.status === "failed").length || 0,
  };

  return apiSuccess({
    activities: activities || [],
    summary,
  });
});
