import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";
import { ONBOARDING_EVENTS } from "@/inngest/events";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * POST /api/agents/onboarding/tasks/[id]/complete - Mark task complete
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const taskId = pathParts[pathParts.indexOf("tasks") + 1];

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

  // Get user ID from request body
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    throw new AppError(
      ErrorCodes.VALIDATION_INVALID_INPUT,
      "userId is required",
      400,
    );
  }

  // Trigger Inngest event
  await inngest.send({
    name: ONBOARDING_EVENTS.TASK_COMPLETED,
    data: {
      userId,
      taskId,
      orgId: userData.org_id,
    },
  });

  return apiSuccess({
    message: "Task completed",
    taskId,
  });
});
