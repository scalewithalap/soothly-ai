/**
 * AgentDataAccess - Enforces strict data isolation between agents
 *
 * This class provides a data access layer that ensures:
 * 1. Normal agents can only access data they created
 * 2. Superagent can access all agent data for the organization
 * 3. All queries are scoped by org_id for tenant isolation
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentType, NormalAgentType } from "../base/types";

interface DataAccessOptions {
  orgId: string;
  agentType: AgentType;
  userId?: string;
}

interface QueryResult<T> {
  data: T[] | null;
  error: Error | null;
  count?: number;
}

/**
 * Tables that contain agent-scoped data (have agent_type column)
 */
const AGENT_SCOPED_TABLES = [
  "agent_tasks",
  "agent_messages",
  "agent_events",
  "agent_outputs",
  "generated_content",
  "lead_campaigns",
  "lead_contacts",
  "partner_outreach",
] as const;

type AgentScopedTable = (typeof AGENT_SCOPED_TABLES)[number];

/**
 * Check if a table is agent-scoped
 */
function isAgentScopedTable(table: string): table is AgentScopedTable {
  return AGENT_SCOPED_TABLES.includes(table as AgentScopedTable);
}

/**
 * AgentDataAccess provides isolated data access for agents
 */
export class AgentDataAccess {
  private supabase: SupabaseClient;
  private orgId: string;
  private agentType: AgentType;
  private isSuperagent: boolean;
  private featureFlagEnabled: boolean = false;

  constructor(options: DataAccessOptions) {
    // Create service role client for server-side operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    this.orgId = options.orgId;
    this.agentType = options.agentType;
    this.isSuperagent = options.agentType === "superagent";
  }

  /**
   * Initialize and check feature flag
   */
  async init(): Promise<void> {
    const { data } = await this.supabase
      .from("feature_flags")
      .select("enabled")
      .eq("name", "agent_data_isolation")
      .single();

    this.featureFlagEnabled = data?.enabled ?? false;
  }

  /**
   * Check if data isolation is enabled
   */
  isIsolationEnabled(): boolean {
    return this.featureFlagEnabled;
  }

  /**
   * Query data from an agent-scoped table
   * Automatically applies org_id and agent_type filters
   */
  async query<T = Record<string, unknown>>(
    table: string,
    options?: {
      select?: string;
      filter?: Record<string, unknown>;
      limit?: number;
      orderBy?: { column: string; ascending?: boolean };
    },
  ): Promise<QueryResult<T>> {
    try {
      let query = this.supabase
        .from(table)
        .select(options?.select || "*", { count: "exact" })
        .eq("org_id", this.orgId);

      // Apply agent type filter for agent-scoped tables
      // Unless this is Superagent (has access to all)
      if (
        this.featureFlagEnabled &&
        !this.isSuperagent &&
        isAgentScopedTable(table)
      ) {
        query = query.eq("agent_type", this.agentType);
      }

      // Apply additional filters
      if (options?.filter) {
        for (const [key, value] of Object.entries(options.filter)) {
          query = query.eq(key, value);
        }
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? false,
        });
      }

      // Apply limit
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error, count } = await query;

      return {
        data: data as T[] | null,
        error: error ? new Error(error.message) : null,
        count: count ?? undefined,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Query failed"),
      };
    }
  }

  /**
   * Get data from a specific agent (Superagent only)
   */
  async queryAgentData<T = Record<string, unknown>>(
    targetAgent: NormalAgentType,
    table: string,
    options?: {
      select?: string;
      filter?: Record<string, unknown>;
      limit?: number;
    },
  ): Promise<QueryResult<T>> {
    if (!this.isSuperagent) {
      return {
        data: null,
        error: new Error("Only Superagent can access other agents' data"),
      };
    }

    return this.query<T>(table, {
      ...options,
      filter: {
        ...options?.filter,
        agent_type: targetAgent,
      },
    });
  }

  /**
   * Insert data with automatic org_id and agent_type tagging
   */
  async insert<T = Record<string, unknown>>(
    table: string,
    data: Record<string, unknown> | Record<string, unknown>[],
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      const rows = Array.isArray(data) ? data : [data];

      // Tag all rows with org_id and agent_type
      const taggedRows = rows.map((row) => ({
        ...row,
        org_id: this.orgId,
        ...(isAgentScopedTable(table) ? { agent_type: this.agentType } : {}),
      }));

      const { data: result, error } = await this.supabase
        .from(table)
        .insert(taggedRows)
        .select()
        .single();

      return {
        data: result as T | null,
        error: error ? new Error(error.message) : null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Insert failed"),
      };
    }
  }

  /**
   * Update data (only own agent's data unless Superagent)
   */
  async update<T = Record<string, unknown>>(
    table: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      let query = this.supabase
        .from(table)
        .update(data)
        .eq("id", id)
        .eq("org_id", this.orgId);

      // Restrict to own agent type unless Superagent
      if (
        this.featureFlagEnabled &&
        !this.isSuperagent &&
        isAgentScopedTable(table)
      ) {
        query = query.eq("agent_type", this.agentType);
      }

      const { data: result, error } = await query.select().single();

      return {
        data: result as T | null,
        error: error ? new Error(error.message) : null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Update failed"),
      };
    }
  }

  /**
   * Delete data (only own agent's data unless Superagent)
   */
  async delete(
    table: string,
    id: string,
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      let query = this.supabase
        .from(table)
        .delete()
        .eq("id", id)
        .eq("org_id", this.orgId);

      // Restrict to own agent type unless Superagent
      if (
        this.featureFlagEnabled &&
        !this.isSuperagent &&
        isAgentScopedTable(table)
      ) {
        query = query.eq("agent_type", this.agentType);
      }

      const { error } = await query;

      return {
        success: !error,
        error: error ? new Error(error.message) : null,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error("Delete failed"),
      };
    }
  }

  /**
   * Get aggregated stats across all agents (Superagent only)
   */
  async getAggregatedStats(): Promise<{
    data: Record<NormalAgentType, { tasks: number; usage: number }> | null;
    error: Error | null;
  }> {
    if (!this.isSuperagent) {
      return {
        data: null,
        error: new Error("Only Superagent can access aggregated stats"),
      };
    }

    try {
      const { data, error } = await this.supabase
        .from("agent_tasks")
        .select("agent_type, usage_consumed")
        .eq("org_id", this.orgId);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      // Aggregate by agent type
      const stats: Record<string, { tasks: number; usage: number }> = {};

      for (const row of data || []) {
        const type = row.agent_type as string;
        if (!stats[type]) {
          stats[type] = { tasks: 0, usage: 0 };
        }
        stats[type].tasks++;
        stats[type].usage += row.usage_consumed || 0;
      }

      return {
        data: stats as Record<
          NormalAgentType,
          { tasks: number; usage: number }
        >,
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error("Failed to get stats"),
      };
    }
  }

  /**
   * Check if current agent can access a specific record
   */
  async canAccess(
    table: string,
    id: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (this.isSuperagent) {
      return { allowed: true };
    }

    if (!isAgentScopedTable(table)) {
      return { allowed: true };
    }

    const { data, error } = await this.supabase
      .from(table)
      .select("agent_type")
      .eq("id", id)
      .eq("org_id", this.orgId)
      .single();

    if (error || !data) {
      return { allowed: false, reason: "Record not found" };
    }

    if (this.featureFlagEnabled && data.agent_type !== this.agentType) {
      return {
        allowed: false,
        reason: `This record belongs to ${data.agent_type} agent`,
      };
    }

    return { allowed: true };
  }
}

/**
 * Factory function to create AgentDataAccess instance
 */
export function createAgentDataAccess(
  options: DataAccessOptions,
): AgentDataAccess {
  return new AgentDataAccess(options);
}

/**
 * Helper to create and initialize AgentDataAccess
 */
export async function initAgentDataAccess(
  options: DataAccessOptions,
): Promise<AgentDataAccess> {
  const dataAccess = new AgentDataAccess(options);
  await dataAccess.init();
  return dataAccess;
}

export default AgentDataAccess;
