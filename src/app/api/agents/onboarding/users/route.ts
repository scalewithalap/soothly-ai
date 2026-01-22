import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/agents/onboarding/users - List users in onboarding
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

  // Fetch users with onboarding status
  const { data: users, error } = await supabase
    .from("users")
    .select(
      `
      id,
      full_name,
      email,
      detected_role,
      onboarding_status,
      onboarding_started_at,
      updated_at,
      onboarding_tasks!onboarding_tasks_user_id_fkey(status)
    `,
    )
    .eq("org_id", userData.org_id)
    .in("onboarding_status", ["in_progress", "completed"])
    .order("onboarding_started_at", { ascending: false });

  if (error) {
    console.error("Error fetching onboarding users:", error);
    throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch users", 500);
  }

  // Map to API response
  const mapped = (users || []).map((u) => {
    const tasks = u.onboarding_tasks || [];
    const completedCount = tasks.filter(
      (t: { status: string }) => t.status === "completed",
    ).length;
    const progress =
      tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    return {
      id: u.id,
      name: u.full_name || u.email?.split("@")[0] || "Unknown",
      email: u.email,
      role: u.detected_role || "other",
      progress,
      status:
        u.onboarding_status === "completed"
          ? "completed"
          : progress < 30
            ? "stalled"
            : "active",
      signedUpAt: formatDate(u.onboarding_started_at),
      lastActivityAt: formatRelativeTime(u.updated_at),
    };
  });

  return apiSuccess({ users: mapped });
});

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
