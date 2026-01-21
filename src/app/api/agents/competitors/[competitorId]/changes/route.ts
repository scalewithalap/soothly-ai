import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /api/agents/competitors/[competitorId]/changes
 * Fetch change history for a specific competitor
 */
export const GET = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  // Extract competitorId from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const competitorId = pathParts[pathParts.indexOf("competitors") + 1];

  if (!competitorId || competitorId === "changes") {
    throw new AppError(
      ErrorCodes.VALIDATION_INVALID_INPUT,
      "competitorId is required",
      400,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Verify ownership via org
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Get changes for the competitor
  const { data: changes, error } = await supabase
    .from("competitor_changes")
    .select(
      `
      *,
      competitors!competitor_changes_competitor_id_fkey(name, url, org_id)
    `,
    )
    .eq("competitor_id", competitorId)
    .order("detected_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching changes:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch changes",
      500,
    );
  }

  // Verify org ownership
  if (changes && changes.length > 0) {
    const orgId = changes[0].competitors?.org_id;
    if (orgId !== userData.org_id) {
      throw new AppError(ErrorCodes.AUTH_FORBIDDEN, "Access denied", 403);
    }
  }

  // Map to API response format
  const mapped = (changes || []).map((c) => ({
    id: c.id,
    type: c.change_type || "content_update",
    priority: c.priority || "medium",
    summary: c.summary || "Change detected",
    implication: c.strategic_implication || "",
    detectedAt: formatRelativeTime(c.detected_at),
    url: c.page_url,
    diff:
      c.previous_content && c.current_content
        ? {
            before: truncate(c.previous_content, 200),
            after: truncate(c.current_content, 200),
          }
        : null,
  }));

  return apiSuccess({ changes: mapped });
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

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}
