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

export abstract class BaseAgent {
  abstract readonly name: AgentType;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly creditCost: CreditCost;

  protected orgId: string;
  protected db: SupabaseClient<Database>;
  protected communicator: AgentCommunicator;

  constructor(orgId: string, db: SupabaseClient<Database>) {
    this.orgId = orgId;
    this.db = db;
    this.communicator = AgentCommunicator.getInstance();
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
    quantity: number = 1
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
    referenceType?: string
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
   * @deprecated Use hasEnoughCredits() before task and consumeCreditsAfterSuccess() after.
   * This method is kept for backwards compatibility but should not be used.
   */
  protected async chargeCredits(
    action: string,
    quantity: number = 1
  ): Promise<boolean> {
    // Redirect to new method for backwards compatibility
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
    payload: Record<string, unknown>
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
    handler: (event: AgentEvent) => void | Promise<void>
  ): () => void {
    return this.communicator.subscribe(eventType, handler);
  }

  /**
   * Log an action for audit purposes
   */
  protected async log(
    level: "info" | "warn" | "error",
    message: string,
    meta?: Record<string, unknown>
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
