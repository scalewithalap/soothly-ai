import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  AgentType,
  AgentTask,
  AgentResult,
  CreditCost,
  AgentEvent,
} from "./types";
import { AgentCommunicator } from "./AgentCommunicator";
import { AgentDataAccess } from "../data/AgentDataAccess";

export abstract class BaseAgent {
  abstract readonly name: AgentType;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly creditCost: CreditCost;

  protected orgId: string;
  protected db: SupabaseClient<Database>;
  protected communicator: AgentCommunicator;
  protected dataAccess: AgentDataAccess;
  private dataAccessInitialized: boolean = false;

  constructor(orgId: string, db: SupabaseClient<Database>) {
    this.orgId = orgId;
    this.db = db;
    this.communicator = AgentCommunicator.getInstance();
    // DataAccess initialized lazily since we need the agent name from subclass
    this.dataAccess = null as unknown as AgentDataAccess;
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
   * Check if there are enough credits for an action BEFORE starting task.
   * Does NOT deduct credits - just checks availability.
   */
  protected async hasEnoughCredits(
    action: string,
    quantity: number = 1,
  ): Promise<boolean> {
    const cost = (this.creditCost[action] || 0) * quantity;

    if (cost === 0) return true;

    // Get current balance from ledger
    const { data: lastEntry } = await this.db
      .from("credit_ledger")
      .select("balance_after")
      .eq("org_id", this.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Check if org is enterprise (unlimited)
    const { data: org } = await this.db
      .from("organizations")
      .select("subscription_tier")
      .eq("id", this.orgId)
      .single();

    if (org?.subscription_tier === "enterprise") return true;

    const balance = lastEntry?.balance_after ?? 0;
    return balance >= cost;
  }

  /**
   * Consume credits AFTER a task completes successfully.
   * This should be called after successful task execution, not before.
   */
  protected async consumeCreditsAfterSuccess(
    action: string,
    quantity: number = 1,
    referenceId?: string,
    referenceType?: string,
  ): Promise<boolean> {
    const cost = (this.creditCost[action] || 0) * quantity;

    if (cost === 0) return true;

    // Get current balance
    const { data: lastEntry } = await this.db
      .from("credit_ledger")
      .select("balance_after")
      .eq("org_id", this.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Check if org is enterprise (unlimited)
    const { data: org } = await this.db
      .from("organizations")
      .select("subscription_tier")
      .eq("id", this.orgId)
      .single();

    const isUnlimited = org?.subscription_tier === "enterprise";
    const currentBalance = lastEntry?.balance_after ?? 0;
    const newBalance = isUnlimited ? currentBalance : currentBalance - cost;

    // Insert ledger entry
    const { error } = await this.db.from("credit_ledger").insert({
      org_id: this.orgId,
      agent_type: this.name,
      action,
      amount: -cost, // Negative for consumption
      balance_after: newBalance,
      reference_id: referenceId,
      reference_type: referenceType,
      metadata: isUnlimited ? { unlimited: true } : {},
    });

    if (error) {
      console.error("Failed to record credit consumption:", error);
      return false;
    }

    return true;
  }

  /**
   * Charge credits for an action (alias for consumeCreditsAfterSuccess)
   * Used by agent implementations for credit deduction
   */
  protected async chargeCredits(
    action: string,
    quantity: number = 1,
  ): Promise<boolean> {
    return this.consumeCreditsAfterSuccess(action, quantity);
  }

  /**
   * Get the current credit balance for the organization
   */
  protected async getBalance(): Promise<number> {
    const { data: lastEntry } = await this.db
      .from("credit_ledger")
      .select("balance_after")
      .eq("org_id", this.orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return lastEntry?.balance_after ?? 0;
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
    console[level](`[${this.name}]`, logEntry);
  }
}
