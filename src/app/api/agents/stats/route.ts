import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

// Define agent types
const AGENT_TYPES = [
  "leadGeneration",
  "seoContent",
  "partnerships",
  "contractReview",
  "regulatoryMonitoring",
  "accountsReceivable",
  "spendAnalysis",
  "dynamicPricing",
  "dataScraper",
] as const;

type AgentType = (typeof AGENT_TYPES)[number];

interface AgentStats {
  agent_type: AgentType;
  is_active: boolean;
  autonomy_level: "wait" | "ai_decides" | "always_proceed";
  total_tasks_completed: number;
  total_credits_used: number;
  total_value_generated: number;
  last_run_at: string | null;
  last_thought: string | null;
}

// GET /api/agents/stats - Get stats for all agents
export const GET = withErrorHandler(async () => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get user's org
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // Fetch agent configs
  const { data: configs, error } = await supabase
    .from("agent_config")
    .select("*")
    .eq("org_id", userData.org_id);

  if (error) {
    console.error("Failed to fetch agent configs:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch agent stats",
      500,
    );
  }

  // Create a map of existing configs
  const configMap = new Map<string, AgentStats>();
  for (const config of configs || []) {
    configMap.set(config.agent_type, {
      agent_type: config.agent_type,
      is_active: config.is_active,
      autonomy_level: config.autonomy_level,
      total_tasks_completed: config.total_tasks_completed || 0,
      total_credits_used: config.total_credits_used || 0,
      total_value_generated: parseFloat(config.total_value_generated) || 0,
      last_run_at: config.last_run_at,
      last_thought: config.last_thought,
    });
  }

  // Fill in defaults for any missing agents
  const allAgentStats: AgentStats[] = AGENT_TYPES.map((agentType) => {
    return (
      configMap.get(agentType) || {
        agent_type: agentType,
        is_active: false,
        autonomy_level: "wait" as const,
        total_tasks_completed: 0,
        total_credits_used: 0,
        total_value_generated: 0,
        last_run_at: null,
        last_thought: null,
      }
    );
  });

  // Calculate summary stats
  const summary = {
    activeAgents: allAgentStats.filter((a) => a.is_active).length,
    totalAgents: AGENT_TYPES.length,
    totalTasksCompleted: allAgentStats.reduce(
      (sum, a) => sum + a.total_tasks_completed,
      0,
    ),
    totalCreditsUsed: allAgentStats.reduce(
      (sum, a) => sum + a.total_credits_used,
      0,
    ),
    totalValueGenerated: allAgentStats.reduce(
      (sum, a) => sum + a.total_value_generated,
      0,
    ),
  };

  return apiSuccess({
    agents: allAgentStats,
    summary,
  });
});

