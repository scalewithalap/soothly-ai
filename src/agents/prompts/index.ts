/**
 * Agent System Prompts Index
 * Centralized export of all agent prompts with helper functions
 *
 * Prompt files use legacy names but are mapped to new agent types:
 * - leads.ts → lead_gen
 * - content.ts → seo
 * - partners.ts → partnership
 * - contracts.ts → proposal
 * - compliance.ts → competitor_intel
 * - receivables.ts → revenue_recovery
 * - spend.ts → onboarding
 * - pricing.ts → customer_success
 */

import { LEADS_SYSTEM_PROMPT } from "./leads";
import { CONTENT_SYSTEM_PROMPT } from "./content";
import { PARTNERS_SYSTEM_PROMPT } from "./partners";
import { CONTRACTS_SYSTEM_PROMPT } from "./contracts";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { RECEIVABLES_SYSTEM_PROMPT } from "./receivables";
import { SPEND_SYSTEM_PROMPT } from "./spend";
import { PRICING_SYSTEM_PROMPT } from "./pricing";
import { SUPERAGENT_SYSTEM_PROMPT } from "./superagent";
import type { AgentType, AnyAgentType } from "../base/types";
import { normalizeAgentType, NORMAL_AGENT_TYPES } from "../base/types";

// Map agent types to their system prompts (new names per agents-ecosystem.md)
export const AGENT_PROMPTS: Record<AgentType, string> = {
  lead_gen: LEADS_SYSTEM_PROMPT,
  seo: CONTENT_SYSTEM_PROMPT,
  partnership: PARTNERS_SYSTEM_PROMPT,
  proposal: CONTRACTS_SYSTEM_PROMPT,
  competitor_intel: COMPLIANCE_SYSTEM_PROMPT,
  revenue_recovery: RECEIVABLES_SYSTEM_PROMPT,
  onboarding: SPEND_SYSTEM_PROMPT,
  customer_success: PRICING_SYSTEM_PROMPT,
  superagent: SUPERAGENT_SYSTEM_PROMPT,
};

/**
 * Get the system prompt for an agent type
 * Supports both new and legacy agent type names
 * Returns undefined if agent type is not recognized
 */
export function getSystemPrompt(agentType: string): string | undefined {
  // Normalize legacy types to new types
  const normalizedType = normalizeAgentType(agentType as AnyAgentType);
  return AGENT_PROMPTS[normalizedType];
}

/**
 * Get the system prompt for an agent, with fallback to a generic prompt
 */
export function getSystemPromptWithFallback(agentType: string): string {
  const prompt = getSystemPrompt(agentType);

  if (prompt) return prompt;

  // Fallback generic prompt for unrecognized agent types
  return `You are "${agentType}" Agent for Zero Headache, an AI-powered business automation platform.
  
Your role is to assist users with tasks related to ${agentType}.

Guidelines:
- Be helpful, accurate, and professional
- Ask clarifying questions when needed
- Provide actionable recommendations
- Acknowledge limitations honestly

This is a generic prompt. Please contact support to configure a specialized prompt for this agent.`;
}

/**
 * Check if an agent type requires Superagent (yearly subscription)
 */
export function isSuperagent(agentType: string): boolean {
  const normalized = normalizeAgentType(agentType as AnyAgentType);
  return normalized === "superagent";
}

/**
 * Get list of all normal (non-superagent) agent types
 */
export function getNormalAgentTypes(): AgentType[] {
  return [...NORMAL_AGENT_TYPES];
}

// Re-export individual prompts for direct use
export {
  LEADS_SYSTEM_PROMPT,
  CONTENT_SYSTEM_PROMPT,
  PARTNERS_SYSTEM_PROMPT,
  CONTRACTS_SYSTEM_PROMPT,
  COMPLIANCE_SYSTEM_PROMPT,
  RECEIVABLES_SYSTEM_PROMPT,
  SPEND_SYSTEM_PROMPT,
  PRICING_SYSTEM_PROMPT,
  SUPERAGENT_SYSTEM_PROMPT,
};
