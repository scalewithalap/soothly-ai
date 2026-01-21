import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { RECOVERY_EVENTS } from "@/inngest/events";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

const retrySchema = z.object({
  recoveryId: z.string().uuid("Invalid recovery ID"),
});

/**
 * POST /api/agents/recovery/retry - Trigger manual payment retry
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { recoveryId } = await validateBody(request, retrySchema);

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Verify recovery belongs to org
  const { data: recovery, error } = await supabase
    .from("payment_recoveries")
    .select("*")
    .eq("id", recoveryId)
    .eq("org_id", userData.org_id)
    .single();

  if (error || !recovery) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Recovery not found", 404);
  }

  if (recovery.status === "recovered") {
    throw new AppError(
      ErrorCodes.VALIDATION_INVALID_INPUT,
      "Payment already recovered",
      400,
    );
  }

  // Trigger retry via Inngest
  await inngest.send({
    name: RECOVERY_EVENTS.PAYMENT_RETRY,
    data: {
      invoiceId: recovery.invoice_id,
      orgId: userData.org_id,
      recoveryId: recovery.id,
    },
  });

  return apiSuccess({
    message: "Payment retry triggered",
    recoveryId: recovery.id,
  });
});
