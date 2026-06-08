import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * POST /api/agents/proposals/[id]/generate - Trigger proposal generation
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const prospectId = pathParts[pathParts.indexOf("proposals") + 1];

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

  // Trigger generation
  await inngest.send({
    name: "proposal/generate.requested",
    data: {
      orgId: userData.org_id,
      prospectId,
    },
  });

  return apiSuccess({
    message: "Proposal generation started",
  });
});
