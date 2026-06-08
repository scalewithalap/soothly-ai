import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

// Agent definitions
const AGENTS = [
  { name: "Lead Generator", type: "lead_gen" },
  { name: "SEO Strategist", type: "seo" },
  { name: "Support Hero", type: "customer_success" },
  { name: "Partner Finder", type: "partnership" },
  { name: "Competitor Intel", type: "competitor_intel" },
  { name: "Revenue Savior", type: "revenue_recovery" },
  { name: "Onboarding Guide", type: "onboarding" },
  { name: "Sales Closer", type: "proposal" },
];

/**
 * GET /api/dashboard/agents - Get agent health status
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

  // Get last activity for each agent type
  const { data: latestActivities } = await supabase
    .from("activities")
    .select("agent_type, created_at")
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  // Build a map of agent type -> last activity
  const lastActivityMap: Record<string, Date> = {};
  for (const act of latestActivities || []) {
    if (!lastActivityMap[act.agent_type]) {
      lastActivityMap[act.agent_type] = new Date(act.created_at);
    }
  }

  // Build agent status list
  const agents = AGENTS.map((agent, i) => {
    const lastActive = lastActivityMap[agent.type];
    const now = new Date();
    let status: "healthy" | "degraded" | "inactive" = "inactive";
    let lastActiveStr = "Never";

    if (lastActive) {
      const diffHours = (now.getTime() - lastActive.getTime()) / 3600000;
      if (diffHours < 1) {
        status = "healthy";
        lastActiveStr = `${Math.floor((now.getTime() - lastActive.getTime()) / 60000)}m ago`;
      } else if (diffHours < 24) {
        status = "healthy";
        lastActiveStr = `${Math.floor(diffHours)}h ago`;
      } else if (diffHours < 72) {
        status = "degraded";
        lastActiveStr = `${Math.floor(diffHours / 24)}d ago`;
      } else {
        status = "inactive";
        lastActiveStr = `${Math.floor(diffHours / 24)}d ago`;
      }
    }

    return {
      id: String(i + 1),
      name: agent.name,
      type: agent.type,
      status,
      lastActive: lastActiveStr,
    };
  });

  return apiSuccess({ agents });
});
