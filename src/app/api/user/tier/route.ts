import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";

// GET /api/user/tier - Get current user's subscription tier
export const GET = withErrorHandler(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get user's org and tier
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.org_id) {
    // User without org defaults to free tier
    return apiSuccess({ tier: "free" });
  }

  // Get org tier
  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select("subscription_tier")
    .eq("id", userData.org_id)
    .single();

  if (orgError || !orgData) {
    return apiSuccess({ tier: "free" });
  }

  return apiSuccess({
    tier: orgData.subscription_tier || "free",
  });
});

