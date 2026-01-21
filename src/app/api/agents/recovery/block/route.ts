import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

const blockSchema = z.object({
  recoveryId: z.string().uuid("Invalid recovery ID"),
});

/**
 * POST /api/agents/recovery/block - Block user and stop recovery attempts
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { recoveryId } = await validateBody(request, blockSchema);

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Get recovery with user info
  const { data: recovery, error } = await supabase
    .from("payment_recoveries")
    .select("*, users!payment_recoveries_user_id_fkey(id)")
    .eq("id", recoveryId)
    .eq("org_id", userData.org_id)
    .single();

  if (error || !recovery) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Recovery not found", 404);
  }

  // Update recovery status to blocked
  await supabase
    .from("payment_recoveries")
    .update({ status: "blocked" })
    .eq("id", recoveryId);

  // Block the user account
  if (recovery.users?.id) {
    await supabase
      .from("users")
      .update({
        payment_status: "blocked",
        blocked_at: new Date().toISOString(),
      })
      .eq("id", recovery.users.id);
  }

  // Log activity
  await supabase.from("activities").insert({
    org_id: userData.org_id,
    agent_type: "revenue_recovery",
    action: "account_blocked",
    entity_type: "payment_recovery",
    entity_id: recoveryId,
    description: `User blocked due to payment issues. Recovery ID: ${recoveryId}`,
    metadata: { blockedBy: user.id },
  });

  return apiSuccess({
    message: "User blocked successfully",
    recoveryId,
  });
});
