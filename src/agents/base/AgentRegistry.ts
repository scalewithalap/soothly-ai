import type { AgentType } from "./types";
import type { BaseAgent } from "./Agent";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AgentConstructor = new (
  orgId: string,
  db: SupabaseClient<Database>
) => BaseAgent;

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<AgentType, AgentConstructor> = new Map();

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register an agent class with the registry
   */
  register(type: AgentType, agentClass: AgentConstructor): void {
    if (this.agents.has(type)) {
      console.warn(`Agent ${type} is already registered. Overwriting.`);
    }
    this.agents.set(type, agentClass);
  }

  /**
   * Get an agent class by type
   */
  get(type: AgentType): AgentConstructor | undefined {
    return this.agents.get(type);
  }

  /**
   * Create an instance of an agent
   */
  create(
    type: AgentType,
    orgId: string,
    db: SupabaseClient<Database>
  ): BaseAgent | null {
    const AgentClass = this.agents.get(type);
    if (!AgentClass) {
      console.error(`Agent ${type} is not registered.`);
      return null;
    }
    return new AgentClass(orgId, db);
  }

  /**
   * Get all registered agent types
   */
  getAll(): Map<AgentType, AgentConstructor> {
    return new Map(this.agents);
  }

  /**
   * Get all registered agent types as an array
   */
  getTypes(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Check if an agent type is registered
   */
  isRegistered(type: AgentType): boolean {
    return this.agents.has(type);
  }

  /**
   * Unregister an agent (useful for testing)
   */
  unregister(type: AgentType): boolean {
    return this.agents.delete(type);
  }

  /**
   * Clear all registered agents (useful for testing)
   */
  clear(): void {
    this.agents.clear();
  }
}

