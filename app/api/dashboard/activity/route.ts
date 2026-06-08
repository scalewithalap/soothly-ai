import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/dashboard/activity - Get recent activity feed
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

  const { data: activities, error } = await supabase
    .from("activities")
    .select("id, agent_type, action, description, created_at, metadata")
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching activities:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch activity",
      500,
    );
  }

  const mapped = (activities || []).map((a) => ({
    id: a.id,
    agentType: a.agent_type,
    action: formatAction(a.action),
    message: a.description,
    timestamp: formatRelativeTime(a.created_at),
    status: getStatusFromAction(a.action),
  }));

  return apiSuccess({ activities: mapped });
});

function formatAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getStatusFromAction(action: string): "success" | "warning" | "error" {
  if (action.includes("failed") || action.includes("error")) return "error";
  if (action.includes("alert") || action.includes("warning")) return "warning";
  return "success";
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
