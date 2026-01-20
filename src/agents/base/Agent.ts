import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  AgentType,
  AgentTask,
  AgentResult,
  UsageCost,
  AgentEvent,
} from "./types";
import { AgentCommunicator } from "./AgentCommunicator";
import { AgentDataAccess } from "../data/AgentDataAccess";
import {
  AgentMemory,
  type CreateMemoryInput,
  type MemoryRetrievalOptions,
  type MemorySearchResult,
} from "../memory";
import {
  AgentTracer,
  type CreateSpanInput,
  type CompleteSpanInput,
} from "../observability";
import {
  Guardrails,
  type GuardrailContext,
  type GuardrailResult,
} from "../safety";
import {
  checkAndIncrementUsage,
  getOrgUsage,
  getFeatureKeyForAgent,
  type FeatureKey,
} from "@/lib/services/usage-limits";

export abstract class BaseAgent {
  abstract readonly name: AgentType;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly usageCost: UsageCost;

  protected orgId: string;
  protected db: SupabaseClient<Database>;
  protected communicator: AgentCommunicator;
  protected dataAccess: AgentDataAccess;
  protected memory: AgentMemory;
  protected tracer: AgentTracer;
  protected guardrails: Guardrails;
  private dataAccessInitialized: boolean = false;

  constructor(orgId: string, db: SupabaseClient<Database>) {
    this.orgId = orgId;
    this.db = db;
    this.communicator = AgentCommunicator.getInstance();
    // DataAccess initialized lazily since we need the agent name from subclass
    this.dataAccess = null as unknown as AgentDataAccess;
    // Memory, tracer, and guardrails also need agent name from subclass
    this.memory = null as unknown as AgentMemory;
    this.tracer = null as unknown as AgentTracer;
    this.guardrails = new Guardrails(db, orgId);
  }

  /**
   * Initialize the agent data access layer
   * Call this once the agent name is available
   */
  protected async initDataAccess(): Promise<void> {
    if (this.dataAccessInitialized) return;

    this.dataAccess = new AgentDataAccess({
      orgId: this.orgId,
      agentType: this.name,
    });
    await this.dataAccess.init();

    // Initialize memory and tracer with agent name
    this.memory = new AgentMemory(this.db, this.orgId, this.name);
    this.tracer = new AgentTracer(this.db, this.orgId, this.name);

    this.dataAccessInitialized = true;
  }

  /**
   * Query data with automatic isolation enforcement
   * Wrapper around AgentDataAccess.query() for convenience
   */
  protected async queryIsolated<T = Record<string, unknown>>(
    table: string,
    options?: {
      select?: string;
      filter?: Record<string, unknown>;
      limit?: number;
      orderBy?: { column: string; ascending?: boolean };
    },
  ): Promise<{ data: T[] | null; error: Error | null }> {
    if (!this.dataAccessInitialized) {
      await this.initDataAccess();
    }
    return this.dataAccess.query<T>(table, options);
  }

  /**
   * Insert data with automatic org_id and agent_type tagging
   */
  protected async insertIsolated<T = Record<string, unknown>>(
    table: string,
    data: Record<string, unknown> | Record<string, unknown>[],
  ): Promise<{ data: T | null; error: Error | null }> {
    if (!this.dataAccessInitialized) {
      await this.initDataAccess();
    }
    return this.dataAccess.insert<T>(table, data);
  }

  /**
   * Update data with isolation enforcement
   */
  protected async updateIsolated<T = Record<string, unknown>>(
    table: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<{ data: T | null; error: Error | null }> {
    if (!this.dataAccessInitialized) {
      await this.initDataAccess();
    }
    return this.dataAccess.update<T>(table, id, data);
  }

  /**
   * Delete data with isolation enforcement
   */
  protected async deleteIsolated(
    table: string,
    id: string,
  ): Promise<{ success: boolean; error: Error | null }> {
    if (!this.dataAccessInitialized) {
      await this.initDataAccess();
    }
    return this.dataAccess.delete(table, id);
  }

  /**
   * Initialize the agent (load config, connect to services, etc.)
   */
  abstract initialize(): Promise<void>;

  /**
   * Execute a task and return the result
   */
  abstract execute(task: AgentTask): Promise<AgentResult>;

  /**
   * Cleanup resources when agent is done
   */
  abstract cleanup(): Promise<void>;

  /**
   * Get the agent's configuration from the database
   */
  protected async getConfig(): Promise<Record<string, unknown>> {
    const { data } = (await this.db
      .from("agent_configs")
      .select("settings, enabled")
      .eq("org_id", this.orgId)
      .eq("agent_type", this.name)
      .single()) as {
      data: { settings: Record<string, unknown>; enabled: boolean } | null;
    };

    if (!data) return {};
    return data.settings || {};
  }

  /**
   * Check if the agent is enabled for this organization
   */
  protected async isEnabled(): Promise<boolean> {
    const { data } = (await this.db
      .from("agent_configs")
      .select("enabled")
      .eq("org_id", this.orgId)
      .eq("agent_type", this.name)
      .single()) as { data: { enabled: boolean } | null };

    if (!data) return false;
    return data.enabled || false;
  }

  /**
   * Check if usage is within limits for this agent BEFORE starting task.
   * Uses the new limit-based system per pricing-strategy.md.
   */
  protected async hasEnoughUsage(
    action: string,
    quantity: number = 1,
  ): Promise<boolean> {
    // Get feature key for this agent type
    const featureKey = getFeatureKeyForAgent(this.name);
    if (!featureKey) {
      // Unknown agent type, allow by default but log warning
      console.warn(`Unknown agent type for usage check: ${this.name}`);
      return true;
    }

    // Check current usage without incrementing
    const usage = await getOrgUsage(this.orgId, featureKey);
    if (Array.isArray(usage)) return true; // Error case, allow

    return usage.remaining >= quantity;
  }

  /**
   * Check and increment usage ATOMICALLY for this agent.
   * Uses the new limit-based system per pricing-strategy.md.
   * Returns false if limit exceeded.
   */
  protected async consumeUsageAfterSuccess(
    action: string,
    quantity: number = 1,
    referenceId?: string,
    referenceType?: string,
  ): Promise<boolean> {
    // Get feature key for this agent type
    const featureKey = getFeatureKeyForAgent(this.name);
    if (!featureKey) {
      console.warn(`Unknown agent type for usage tracking: ${this.name}`);
      return true; // Allow unknown agent types
    }

    // Check and increment atomically
    const result = await checkAndIncrementUsage(
      this.orgId,
      featureKey,
      quantity,
    );

    if (!result.allowed) {
      console.warn(`Usage limit exceeded for ${this.name}:`, result.error);
    }

    return result.allowed;
  }

  /**
   * Charge usage for an action (alias for consumeUsageAfterSuccess)
   * Uses the new limit-based usage system.
   */
  protected async consumeUsage(
    action: string,
    quantity: number = 1,
  ): Promise<boolean> {
    return this.consumeUsageAfterSuccess(action, quantity);
  }

  /**
   * Get the current usage remaining for this agent type
   * Returns remaining usage count
   */
  protected async getBalance(): Promise<number> {
    const featureKey = getFeatureKeyForAgent(this.name);
    if (!featureKey) return 999999; // Unknown agent, return large number

    const usage = await getOrgUsage(this.orgId, featureKey);
    if (Array.isArray(usage)) return 0;

    return usage.remaining;
  }

  /**
   * Broadcast an event to other agents
   */
  protected async emit(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.communicator.broadcast({
      id: crypto.randomUUID(),
      fromAgent: this.name,
      eventType,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * Subscribe to events from other agents
   */
  protected subscribe(
    eventType: string,
    handler: (event: AgentEvent) => void | Promise<void>,
  ): () => void {
    return this.communicator.subscribe(eventType, handler);
  }

  /**
   * Log an action for audit purposes
   */
  protected async log(
    level: "info" | "warn" | "error",
    message: string,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agent: this.name,
      orgId: this.orgId,
      level,
      message,
      ...meta,
    };

    // In production, this would go to a logging service
  }

  // =====================================================
  // MEMORY METHODS
  // =====================================================

  /**
   * Store a memory for later recall
   */
  protected async rememberFact(
    content: string,
    options: Partial<CreateMemoryInput> = {},
  ): Promise<void> {
    if (!this.dataAccessInitialized) {
      await this.initDataAccess();
    }
    await this.memory.store({
      content,
      memory_type: options.memory_type || "semantic",
      importance: options.importance,
      source_task_id: options.source_task_id,
      source_action: options.source_action,
      metadata: options.metadata,
      tags: options.tags,
    });
  }

  /**
   * Recall memories similar to a query
   */
  protected async recallMemories(
    query: string,
    options: MemoryRetrievalOptions = {},
  ): Promise<MemorySearchResult[]> {
    if (!this.dataAccessInitialized) {
      await this.initDataAccess();
    }
    return this.memory.recall(query, options);
  }

  /**
   * Get recent memories for context
   */
  protected async getRecentContext(limit: number = 10): Promise<string[]> {
    if (!this.dataAccessInitialized) {
      await this.initDataAccess();
    }
    const memories = await this.memory.getRecent(limit);
    return memories.map((m) => m.content);
  }

  // =====================================================
  // TRACING METHODS
  // =====================================================

  /**
   * Start a new trace for this action
   */
  protected async startTrace(input: CreateSpanInput): Promise<string> {
    if (!this.dataAccessInitialized) {
      await this.initDataAccess();
    }
    return this.tracer.startTrace(input);
  }

  /**
   * Start a new span within the current trace
   */
  protected async startSpan(input: CreateSpanInput): Promise<string> {
    if (!this.dataAccessInitialized) {
      await this.initDataAccess();
    }
    return this.tracer.startSpan(input);
  }

  /**
   * End the current span with success
   */
  protected async traceSuccess(
    output?: Record<string, unknown>,
    metrics?: { model?: string; tokens_in?: number; tokens_out?: number },
  ): Promise<void> {
    if (!this.dataAccessInitialized) return;
    await this.tracer.success(output, metrics);
  }

  /**
   * End the current span with error
   */
  protected async traceError(
    error: Error | string,
    output?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.dataAccessInitialized) return;
    await this.tracer.error(error, output);
  }

  /**
   * Get current trace ID for correlation
   */
  protected getTraceId(): string | null {
    return this.tracer?.getTraceId() || null;
  }

  // =====================================================
  // GUARDRAILS METHODS
  // =====================================================

  /**
   * Check guardrails before executing an action
   */
  protected async checkGuardrails(
    action: string,
    input?: Record<string, unknown>,
    sessionStats?: GuardrailContext["session_stats"],
  ): Promise<GuardrailResult> {
    const context: GuardrailContext = {
      agent_type: this.name,
      action,
      input,
      session_stats: sessionStats,
      trace_id: this.getTraceId() || undefined,
    };
    return this.guardrails.evaluate(context);
  }

  /**
   * Wrapper to execute with guardrails check
   */
  protected async executeWithGuardrails<T>(
    action: string,
    input: Record<string, unknown>,
    fn: () => Promise<T>,
  ): Promise<{
    success: boolean;
    data?: T;
    error?: string;
    blocked?: boolean;
  }> {
    // Check guardrails before execution
    const preCheck = await this.checkGuardrails(action, input);
    if (preCheck.blocked) {
      return {
        success: false,
        error: preCheck.violations[0]?.message || "Blocked by guardrails",
        blocked: true,
      };
    }

    if (preCheck.requires_approval) {
      return {
        success: false,
        error: preCheck.approval_reason || "Requires human approval",
        blocked: true,
      };
    }

    // Log warnings but proceed
    for (const warning of preCheck.warnings) {
      await this.log("warn", `Guardrail warning: ${warning.message}`);
    }

    // Execute the function
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
