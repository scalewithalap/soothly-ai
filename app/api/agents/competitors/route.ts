import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { inngest } from "@/inngest/client";
import { INTEL_EVENTS } from "@/inngest/events";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { requireAgentQuota, deductAgentUsage } from "@/lib/usage";
import type { SupabaseClient } from "@supabase/supabase-js";

const addCompetitorSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  name: z.string().optional(),
  monitored_pages: z.array(z.string()).optional().default(["/"]),
});

/**
 * GET /api/agents/competitors - List competitors for current org
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

  // Fetch competitors with alert counts
  const { data: competitors, error } = await supabase
    .from("competitors")
    .select(
      `
      *,
      competitor_changes!competitor_changes_competitor_id_fkey(id, read)
    `,
    )
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching competitors:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch competitors",
      500,
    );
  }

  // Map to API response format
  const mapped = (competitors || []).map((c) => ({
    id: c.id,
    name: c.name,
    url: c.url,
    status: c.status || "active",
    alertCount:
      c.competitor_changes?.filter((ch: { read?: boolean }) => !ch.read)
        .length || 0,
    lastScannedAt: c.last_scanned_at
      ? formatRelativeTime(c.last_scanned_at)
      : "Never",
    logoUrl: `https://logo.clearbit.com/${new URL(c.url).hostname}`,
  }));

  return apiSuccess({ competitors: mapped });
});

/**
 * POST /api/agents/competitors - Add a new competitor to monitor
 */
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const parsed = await validateBody(request, addCompetitorSchema);

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Extract name from URL if not provided
  const name = parsed.name || new URL(parsed.url).hostname.replace("www.", "");

  // Quota: competitors tier limit caps how many competitors can be added
  // per billing period (1 free / 3 launch / 15 growth / 50 scale).
  // Pre-check here; deduction happens after a successful insert below.
  await requireAgentQuota(userData.org_id, "competitor_intel");

  // Insert competitor

  const { data: competitor, error } = await supabase
    .from("competitors")
    .insert({
      org_id: userData.org_id,
      name,
      url: parsed.url,
      monitored_pages: parsed.monitored_pages,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding competitor:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to add competitor",
      500,
    );
  }

  // Deduct one competitors unit for the successful add (success-based).
  await deductAgentUsage(userData.org_id, "competitor_intel", 1);

  // Trigger initial scan
  await inngest.send({
    name: INTEL_EVENTS.SCAN_DAILY,
    data: {
      orgId: userData.org_id,
      triggeredAt: new Date().toISOString(),
    },
  });

  return apiSuccess(
    {
      competitor: {
        id: competitor.id,
        name: competitor.name,
        url: competitor.url,
        status: "scanning",
      },
      message: "Competitor added and initial scan started",
    },
    201,
  );
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
