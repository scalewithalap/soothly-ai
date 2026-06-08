/**
 * Database Utilities for Agent Platform
 * Provides type-safe wrappers for Supabase operations on tables
 * that may not yet have generated types
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Create an untyped query builder for tables without type definitions
 * This is a temporary workaround until database types are regenerated
 */
export function untypedQuery(
  db: SupabaseClient<Database>,
): SupabaseClient<any> {
  return db as SupabaseClient<any>;
}

/**
 * Tables added by the agent platform expansion migration
 * Using this helper allows type-safe table names while bypassing strict types
 */
export const AgentPlatformTables = {
  AGENT_MEMORIES: "agent_memories",
  WORKFLOWS: "workflows",
  WORKFLOW_RUNS: "workflow_runs",
  WORKFLOW_NODE_EXECUTIONS: "workflow_node_executions",
  APPROVAL_REQUESTS: "approval_requests",
  AGENT_TRACES: "agent_traces",
  GUARDRAIL_POLICIES: "guardrail_policies",
  GUARDRAIL_VIOLATIONS: "guardrail_violations",
} as const;

export type AgentPlatformTable =
  (typeof AgentPlatformTables)[keyof typeof AgentPlatformTables];

