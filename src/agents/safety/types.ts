/**
 * Guardrails Types for Safety Constraints
 * Configurable policy enforcement for agent behavior
 */

import type { AgentType } from "../base/types";

/**
 * Rule types for different safety checks
 */
export type GuardrailRuleType =
  | "input_validation"
  | "output_filter"
  | "action_limit"
  | "cost_cap"
  | "content_policy"
  | "pii_detection"
  | "rate_limit";

/**
 * Actions taken when a rule is violated
 */
export type EnforcementAction = "block" | "warn" | "require_approval" | "log";

/**
 * A single guardrail rule
 */
export interface GuardrailRule {
  id: string;
  type: GuardrailRuleType;
  name: string;
  description?: string;

  // Rule configuration
  condition: string; // Expression or regex pattern
  threshold?: number; // For numeric limits

  // Enforcement
  action: EnforcementAction;
  message: string; // Message to show when triggered

  // Optional severity
  severity?: "low" | "medium" | "high" | "critical";
}

/**
 * A guardrail policy containing multiple rules
 */
export interface GuardrailPolicy {
  id: string;
  org_id: string;
  name: string;
  description?: string;

  // Scope
  applies_to_agents: AgentType[]; // Empty = all agents
  applies_to_actions: string[]; // Empty = all actions

  // Rules
  rules: GuardrailRule[];

  // Status
  enabled: boolean;
  priority: number; // Lower = higher priority

  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Result of guardrail evaluation
 */
export interface GuardrailResult {
  passed: boolean;
  violations: GuardrailViolation[];
  warnings: GuardrailViolation[];
  blocked: boolean;
  requires_approval: boolean;
  approval_reason?: string;
}

/**
 * A recorded violation
 */
export interface GuardrailViolation {
  id?: string;
  policy_id: string;
  policy_name: string;
  rule_id: string;
  rule_type: GuardrailRuleType;
  rule_condition: string;
  violated_value?: string;
  enforcement_action: EnforcementAction;
  message: string;
  agent_type: AgentType;
  action: string;
  trace_id?: string;
  created_at: Date;
}

/**
 * Context passed to guardrail evaluation
 */
export interface GuardrailContext {
  agent_type: AgentType;
  action: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  session_stats?: {
    action_count: number;
    token_count: number;
    cost_usd: number;
    duration_ms: number;
  };
  trace_id?: string;
}

/**
 * Preset policy templates
 */
export const GUARDRAIL_TEMPLATES = {
  basic_safety: {
    name: "Basic Safety",
    description: "Standard safety rules for all agents",
    rules: [
      {
        id: "cost-cap-100",
        type: "cost_cap" as GuardrailRuleType,
        name: "Cost Cap $100",
        condition: "session_cost > 100",
        threshold: 100,
        action: "block" as EnforcementAction,
        message: "Session cost cap of $100 exceeded",
        severity: "high" as const,
      },
      {
        id: "action-limit-1000",
        type: "action_limit" as GuardrailRuleType,
        name: "Action Limit",
        condition: "action_count > 1000",
        threshold: 1000,
        action: "block" as EnforcementAction,
        message: "Maximum actions per session exceeded",
        severity: "medium" as const,
      },
    ],
  },
  enterprise_compliance: {
    name: "Enterprise Compliance",
    description: "Strict compliance rules for enterprise deployments",
    rules: [
      {
        id: "pii-detection",
        type: "pii_detection" as GuardrailRuleType,
        name: "PII Detection",
        condition: "(SSN|credit.?card|passport)",
        action: "block" as EnforcementAction,
        message: "Potential PII detected in output",
        severity: "critical" as const,
      },
      {
        id: "high-risk-approval",
        type: "action_limit" as GuardrailRuleType,
        name: "High-Risk Action Approval",
        condition: "risk_level === 'high' || risk_level === 'critical'",
        action: "require_approval" as EnforcementAction,
        message: "High-risk action requires approval",
        severity: "high" as const,
      },
    ],
  },
};

