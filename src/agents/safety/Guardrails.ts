/**
 * Guardrails - Policy enforcement layer for agent safety
 * Evaluates rules before and after agent actions
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AgentType } from "../base/types";
import { untypedQuery } from "../utils/dbUtils";
import {
  type GuardrailPolicy,
  type GuardrailRule,
  type GuardrailResult,
  type GuardrailViolation,
  type GuardrailContext,
  type EnforcementAction,
} from "./types";

export class Guardrails {
  private db: SupabaseClient<Database>;
  private orgId: string;
  private policiesCache: GuardrailPolicy[] | null = null;
  private cacheTime: number = 0;
  private cacheTTL: number = 60000; // 1 minute cache

  constructor(db: SupabaseClient<Database>, orgId: string) {
    this.db = db;
    this.orgId = orgId;
  }

  /**
   * Evaluate guardrails for a given context
   */
  async evaluate(context: GuardrailContext): Promise<GuardrailResult> {
    const policies = await this.getPolicies(context.agent_type, context.action);

    const result: GuardrailResult = {
      passed: true,
      violations: [],
      warnings: [],
      blocked: false,
      requires_approval: false,
    };

    for (const policy of policies) {
      for (const rule of policy.rules) {
        const violation = await this.evaluateRule(rule, context, policy);
        if (violation) {
          switch (violation.enforcement_action) {
            case "block":
              result.passed = false;
              result.blocked = true;
              result.violations.push(violation);
              break;
            case "require_approval":
              result.passed = false;
              result.requires_approval = true;
              result.approval_reason = violation.message;
              result.violations.push(violation);
              break;
            case "warn":
              result.warnings.push(violation);
              break;
            case "log":
              // Just log, don't affect result
              result.warnings.push(violation);
              break;
          }

          // Record the violation
          await this.recordViolation(violation);
        }
      }
    }

    return result;
  }

  /**
   * Evaluate a single rule against the context
   */
  private async evaluateRule(
    rule: GuardrailRule,
    context: GuardrailContext,
    policy: GuardrailPolicy,
  ): Promise<GuardrailViolation | null> {
    let violated = false;
    let violatedValue: string | undefined;

    try {
      switch (rule.type) {
        case "cost_cap":
          if (context.session_stats && rule.threshold !== undefined) {
            if (context.session_stats.cost_usd > rule.threshold) {
              violated = true;
              violatedValue = `$${context.session_stats.cost_usd.toFixed(2)}`;
            }
          }
          break;

        case "action_limit":
          if (context.session_stats && rule.threshold !== undefined) {
            if (context.session_stats.action_count > rule.threshold) {
              violated = true;
              violatedValue = String(context.session_stats.action_count);
            }
          }
          break;

        case "rate_limit":
          // Rate limiting would need a separate mechanism (Redis, etc.)
          // Placeholder for now
          break;

        case "pii_detection":
          const piiResult = this.checkPII(context, rule.condition);
          if (piiResult) {
            violated = true;
            violatedValue = piiResult;
          }
          break;

        case "content_policy":
          const contentResult = this.checkContent(context, rule.condition);
          if (contentResult) {
            violated = true;
            violatedValue = contentResult;
          }
          break;

        case "input_validation":
          if (context.input) {
            const inputResult = this.evaluateExpression(rule.condition, {
              input: context.input,
            });
            if (inputResult) {
              violated = true;
              violatedValue = JSON.stringify(context.input).slice(0, 100);
            }
          }
          break;

        case "output_filter":
          if (context.output) {
            const outputResult = this.evaluateExpression(rule.condition, {
              output: context.output,
            });
            if (outputResult) {
              violated = true;
              violatedValue = JSON.stringify(context.output).slice(0, 100);
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
    }

    if (violated) {
      return {
        policy_id: policy.id,
        policy_name: policy.name,
        rule_id: rule.id,
        rule_type: rule.type,
        rule_condition: rule.condition,
        violated_value: violatedValue,
        enforcement_action: rule.action,
        message: rule.message,
        agent_type: context.agent_type,
        action: context.action,
        trace_id: context.trace_id,
        created_at: new Date(),
      };
    }

    return null;
  }

  /**
   * Check for PII patterns in context
   */
  private checkPII(context: GuardrailContext, pattern: string): string | null {
    const content = JSON.stringify({
      input: context.input,
      output: context.output,
    });

    try {
      const regex = new RegExp(pattern, "gi");
      const match = content.match(regex);
      if (match) {
        return `Found: ${match.slice(0, 3).join(", ")}...`;
      }
    } catch {
      console.error("Invalid PII pattern:", pattern);
    }

    return null;
  }

  /**
   * Check content against a policy pattern
   */
  private checkContent(
    context: GuardrailContext,
    pattern: string,
  ): string | null {
    const content = JSON.stringify({
      input: context.input,
      output: context.output,
    });

    try {
      const regex = new RegExp(pattern, "gi");
      const match = content.match(regex);
      if (match) {
        return `Matched: ${match[0]}`;
      }
    } catch {
      console.error("Invalid content pattern:", pattern);
    }

    return null;
  }

  /**
   * Safely evaluate a JavaScript expression
   */
  private evaluateExpression(
    expression: string,
    context: Record<string, unknown>,
  ): boolean {
    try {
      // Create a safe evaluation context
      const func = new Function(
        ...Object.keys(context),
        `try { return !!(${expression}); } catch { return false; }`,
      );
      return func(...Object.values(context));
    } catch {
      console.error("Invalid expression:", expression);
      return false;
    }
  }

  /**
   * Get applicable policies for an agent and action
   */
  private async getPolicies(
    agentType: AgentType,
    action: string,
  ): Promise<GuardrailPolicy[]> {
    // Check cache
    if (this.policiesCache && Date.now() - this.cacheTime < this.cacheTTL) {
      return this.filterPolicies(this.policiesCache, agentType, action);
    }

    // Fetch from database
    const { data, error } = await untypedQuery(this.db)
      .from("guardrail_policies")
      .select("*")
      .eq("org_id", this.orgId)
      .eq("enabled", true)
      .order("priority", { ascending: true });

    if (error) {
      console.error("Failed to fetch policies:", error);
      return [];
    }

    this.policiesCache = (data as unknown as GuardrailPolicy[]) || [];
    this.cacheTime = Date.now();

    return this.filterPolicies(this.policiesCache, agentType, action);
  }

  /**
   * Filter policies that apply to a specific agent and action
   */
  private filterPolicies(
    policies: GuardrailPolicy[],
    agentType: AgentType,
    action: string,
  ): GuardrailPolicy[] {
    return policies.filter((policy) => {
      // Check if policy applies to this agent
      if (
        policy.applies_to_agents.length > 0 &&
        !policy.applies_to_agents.includes(agentType)
      ) {
        return false;
      }

      // Check if policy applies to this action
      if (
        policy.applies_to_actions.length > 0 &&
        !policy.applies_to_actions.includes(action)
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Record a violation to the database
   */
  private async recordViolation(violation: GuardrailViolation): Promise<void> {
    const { error } = await untypedQuery(this.db)
      .from("guardrail_violations")
      .insert({
        org_id: this.orgId,
        policy_id: violation.policy_id,
        agent_type: violation.agent_type,
        action: violation.action,
        rule_type: violation.rule_type,
        rule_condition: violation.rule_condition,
        violated_value: violation.violated_value,
        enforcement_action: violation.enforcement_action,
        trace_id: violation.trace_id,
      });

    if (error) {
      console.error("Failed to record violation:", error);
    }
  }

  /**
   * Create a new guardrail policy
   */
  async createPolicy(
    policy: Omit<GuardrailPolicy, "id" | "created_at" | "updated_at">,
  ): Promise<GuardrailPolicy | null> {
    const { data, error } = await untypedQuery(this.db)
      .from("guardrail_policies")
      .insert({
        org_id: this.orgId,
        name: policy.name,
        description: policy.description,
        applies_to_agents: policy.applies_to_agents,
        applies_to_actions: policy.applies_to_actions,
        rules: policy.rules,
        enabled: policy.enabled,
        priority: policy.priority,
        created_by: policy.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create policy:", error);
      return null;
    }

    // Invalidate cache
    this.policiesCache = null;

    return data as unknown as GuardrailPolicy;
  }

  /**
   * Update a guardrail policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<GuardrailPolicy>,
  ): Promise<boolean> {
    const { error } = await untypedQuery(this.db)
      .from("guardrail_policies")
      .update({
        ...updates,
        rules: updates.rules,
      })
      .eq("id", policyId)
      .eq("org_id", this.orgId);

    if (error) {
      console.error("Failed to update policy:", error);
      return false;
    }

    // Invalidate cache
    this.policiesCache = null;
    return true;
  }

  /**
   * Delete a guardrail policy
   */
  async deletePolicy(policyId: string): Promise<boolean> {
    const { error } = await untypedQuery(this.db)
      .from("guardrail_policies")
      .delete()
      .eq("id", policyId)
      .eq("org_id", this.orgId);

    if (error) {
      console.error("Failed to delete policy:", error);
      return false;
    }

    // Invalidate cache
    this.policiesCache = null;
    return true;
  }

  /**
   * Get violation history
   */
  async getViolations(
    options: {
      limit?: number;
      offset?: number;
      policy_id?: string;
      agent_type?: AgentType;
      start_date?: Date;
      end_date?: Date;
    } = {},
  ): Promise<GuardrailViolation[]> {
    const { limit = 50, offset = 0 } = options;

    let query = untypedQuery(this.db)
      .from("guardrail_violations")
      .select(
        `
        *,
        guardrail_policies!inner(name)
      `,
      )
      .eq("org_id", this.orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.policy_id) {
      query = query.eq("policy_id", options.policy_id);
    }

    if (options.agent_type) {
      query = query.eq("agent_type", options.agent_type);
    }

    if (options.start_date) {
      query = query.gte("created_at", options.start_date.toISOString());
    }

    if (options.end_date) {
      query = query.lte("created_at", options.end_date.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to get violations:", error);
      return [];
    }

    return (data || []).map((v) => {
      const violation = v as Record<string, unknown> & {
        guardrail_policies: { name: string };
      };
      return {
        id: violation.id as string,
        policy_id: violation.policy_id as string,
        policy_name: violation.guardrail_policies?.name || "Unknown",
        rule_id: "",
        rule_type: violation.rule_type as GuardrailViolation["rule_type"],
        rule_condition: violation.rule_condition as string,
        violated_value: violation.violated_value as string | undefined,
        enforcement_action: violation.enforcement_action as EnforcementAction,
        message: "",
        agent_type: violation.agent_type as AgentType,
        action: violation.action as string,
        trace_id: violation.trace_id as string | undefined,
        created_at: new Date(violation.created_at as string),
      };
    });
  }

  /**
   * Invalidate the policy cache
   */
  invalidateCache(): void {
    this.policiesCache = null;
  }
}
