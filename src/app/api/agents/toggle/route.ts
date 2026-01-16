import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

const toggleSchema = z.object({
  agentType: z.string().min(1),
  action: z.enum(["activate", "deactivate", "set_autonomy"]),
  autonomyLevel: z.enum(["wait", "ai_decides", "always_proceed"]).optional(),
});

// POST /api/agents/toggle - Toggle agent status or set autonomy level
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get user's org and role
  const { data: userData } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Only admins/owners can toggle agents
  if (!["owner", "admin"].includes(userData.role)) {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Insufficient permissions",
      403,
    );
  }

  // Validate request
  const { agentType, action, autonomyLevel } = await validateBody(
    request,
    toggleSchema,
  );

  // Build update object
  const updates: Record<string, unknown> = {};

  if (action === "activate") {
    updates.is_active = true;
  } else if (action === "deactivate") {
    updates.is_active = false;
  } else if (action === "set_autonomy" && autonomyLevel) {
    updates.autonomy_level = autonomyLevel;
  }

  // Upsert agent config
  const { data: config, error } = await supabase
    .from("agent_config")
    .upsert(
      {
        org_id: userData.org_id,
        agent_type: agentType,
        ...updates,
      },
      {
        onConflict: "org_id,agent_type",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to update agent config:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to update agent",
      500,
    );
  }

  // Log the thought
  await supabase.from("agent_thoughts").insert({
    org_id: userData.org_id,
    agent_type: agentType,
    thought_type: "action",
    message:
      action === "activate"
        ? "Agent activated by user"
        : action === "deactivate"
          ? "Agent deactivated by user"
          : `Autonomy level changed to: ${autonomyLevel}`,
  });

  return apiSuccess({
    success: true,
    config,
  });
});
