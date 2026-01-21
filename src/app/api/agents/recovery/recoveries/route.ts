import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/agents/recovery/recoveries - List payment recoveries for current org
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

  // Fetch recoveries with user info
  const { data: recoveries, error } = await supabase
    .from("payment_recoveries")
    .select(
      `
      *,
      users!payment_recoveries_user_id_fkey(full_name, email)
    `,
    )
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching recoveries:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch recoveries",
      500,
    );
  }

  // Map to API response format
  const mapped = (recoveries || []).map((r) => ({
    id: r.id,
    invoiceId: r.invoice_id,
    customerName: r.users?.full_name || "Unknown",
    amount: r.amount,
    currency: r.currency || "USD",
    failureCode: r.failure_code,
    status: r.status,
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    lastAttemptAt: formatRelativeTime(r.updated_at),
    riskLevel: getRiskLevel(r.attempts, r.max_attempts),
  }));

  return apiSuccess({ recoveries: mapped });
});

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

function getRiskLevel(
  attempts: number,
  maxAttempts: number,
): "low" | "medium" | "high" {
  const ratio = attempts / maxAttempts;
  if (ratio >= 0.8) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
}
