import { createClient } from "@/lib/supabase/server";
import { apiSuccess, validateBody, withErrorHandler } from "@/lib/validation";
import { addCreditsSchema } from "@/lib/validation/schemas";
import { AppError, ErrorCodes } from "@/lib/errors";

interface UserData {
  org_id: string | null;
  role?: "owner" | "admin" | "member";
}

export const GET = withErrorHandler(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get user's organization
  const { data, error: userError } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const userData = data as UserData | null;

  if (userError || !userData?.org_id) {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      "User not found or no organization",
      404
    );
  }

  // Get credit balance
  const { data: balance, error: balanceError } = await (supabase as any).rpc(
    "get_credit_balance",
    { p_org_id: userData.org_id }
  );

  if (balanceError) {
    console.error("Failed to get credit balance:", balanceError);
    throw new AppError(
      ErrorCodes.SERVER_ERROR,
      "Failed to get credit balance",
      500
    );
  }

  // Get recent credit transactions
  const { data: transactions } = await supabase
    .from("credit_ledger")
    .select("*")
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false })
    .limit(10);

  return apiSuccess({
    balance: balance || 0,
    transactions: transactions || [],
  });
});

export const POST = withErrorHandler(async (request: Request) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get user's organization and role
  const { data, error: userError } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  const userData = data as UserData | null;

  if (userError || !userData?.org_id) {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      "User not found or no organization",
      404
    );
  }

  // Only owners and admins can add credits
  if (!userData.role || !["owner", "admin"].includes(userData.role)) {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Insufficient permissions",
      403
    );
  }

  // Validate input with Zod
  const { amount, reason } = await validateBody(request, addCreditsSchema);

  // Add credits
  const { data: result, error: addError } = await (supabase as any).rpc(
    "add_credits",
    {
      p_org_id: userData.org_id,
      p_amount: amount,
      p_reason: reason,
      p_metadata: { added_by: user.id },
    }
  );

  if (addError) {
    console.error("Failed to add credits:", addError);
    throw new AppError(ErrorCodes.SERVER_ERROR, "Failed to add credits", 500);
  }

  return apiSuccess(result);
});

