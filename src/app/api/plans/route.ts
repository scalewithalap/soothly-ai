import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET /api/plans - Get all active subscription plans
export const GET = withErrorHandler(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const { data: plans, error } = await supabase
    .from("subscription_plans")
    .select(
      "id, tier, name, description, price_monthly, price_yearly, credits_monthly, credits_one_time, max_seats, is_recurring, support_type, features, agents_access, api_access, display_order"
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch plans:", error);
    throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch plans", 500);
  }

  return apiSuccess({ plans });
});
