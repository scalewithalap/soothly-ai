import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/agents/onboarding/users/[id] - Get user progress + tasks
 */
export const GET = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const userId = pathParts[pathParts.indexOf("users") + 1];

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

  // Fetch user with tasks
  const { data: targetUser, error } = await supabase
    .from("users")
    .select(
      `
      id,
      full_name,
      email,
      detected_role,
      onboarding_status,
      onboarding_started_at,
      updated_at
    `,
    )
    .eq("id", userId)
    .eq("org_id", userData.org_id)
    .single();

  if (error || !targetUser) {
    throw new AppError(ErrorCodes.NOT_FOUND, "User not found", 404);
  }

  // Fetch tasks
  const { data: tasks } = await supabase
    .from("onboarding_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("priority", { ascending: true });

  // Fetch activities as nudges
  const { data: activities } = await supabase
    .from("activities")
    .select("*")
    .eq("entity_id", userId)
    .eq("agent_type", "onboarding")
    .order("created_at", { ascending: false })
    .limit(10);

  return apiSuccess({
    user: {
      id: targetUser.id,
      name: targetUser.full_name || targetUser.email?.split("@")[0],
      email: targetUser.email,
      role: targetUser.detected_role,
      signedUpAt: targetUser.onboarding_started_at,
      lastActivityAt: targetUser.updated_at,
    },
    tasks: (tasks || []).map((t) => ({
      id: t.task_id,
      title: t.title,
      description: t.description,
      category: t.category,
      status: t.status,
      estimatedMinutes: t.estimated_minutes,
      completedAt: t.completed_at,
    })),
    nudges: (activities || []).map((a) => ({
      id: a.id,
      type: "email",
      subject: a.description,
      sentAt: a.created_at,
      status: "sent",
    })),
  });
});
