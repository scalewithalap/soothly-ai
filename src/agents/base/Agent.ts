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
   * Deduct credits for an action. Returns true if successful.
   */
  protected async chargeCredits(
    action: string,
    quantity: number = 1
  ): Promise<boolean> {
    const cost = (this.creditCost[action] || 0) * quantity;

    if (cost === 0) return true;

    const { data, error } = await (this.db as any).rpc("deduct_credits", {
      p_org_id: this.orgId,
      p_agent_type: this.name,
      p_action: action,
      p_amount: cost,
    });

    if (error || !(data as { success: boolean })?.success) {
      console.error(
        "Failed to deduct credits:",
        error || (data as { error?: string })?.error
      );
      return false;
    }

    return true;
  }

  /**
   * Get the current credit balance for the organization
   */
  protected async getBalance(): Promise<number> {
    const { data, error } = await (this.db as any).rpc("get_credit_balance", {
      p_org_id: this.orgId,
    });

    if (error) {
      console.error("Failed to get credit balance:", error);
      return 0;
    }

    return data || 0;
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
