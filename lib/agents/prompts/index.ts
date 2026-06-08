/**
 * Agent System Prompts Index
 * Centralized export of all agent prompts with helper functions
 */

import { LEAD_GEN_SYSTEM_PROMPT } from "./lead_gen";
import { SEO_SYSTEM_PROMPT } from "./seo";
import { PARTNERSHIP_SYSTEM_PROMPT } from "./partnership";
import { PROPOSAL_SYSTEM_PROMPT } from "./proposal";
import { COMPETITOR_INTEL_SYSTEM_PROMPT } from "./competitor_intel";
import { REVENUE_RECOVERY_SYSTEM_PROMPT } from "./revenue_recovery";
import { ONBOARDING_SYSTEM_PROMPT } from "./onboarding";
import { CUSTOMER_SUCCESS_SYSTEM_PROMPT } from "./customer_success";
import { SUPERAGENT_SYSTEM_PROMPT } from "./superagent";
import type { AgentType, AnyAgentType } from "../base/types";
import { normalizeAgentType, NORMAL_AGENT_TYPES } from "../base/types";

// Map agent types to their system prompts
export const AGENT_PROMPTS: Record<AgentType, string> = {
  lead_gen: LEAD_GEN_SYSTEM_PROMPT,
  seo: SEO_SYSTEM_PROMPT,
  partnership: PARTNERSHIP_SYSTEM_PROMPT,
  proposal: PROPOSAL_SYSTEM_PROMPT,
  competitor_intel: COMPETITOR_INTEL_SYSTEM_PROMPT,
  revenue_recovery: REVENUE_RECOVERY_SYSTEM_PROMPT,
  onboarding: ONBOARDING_SYSTEM_PROMPT,
  customer_success: CUSTOMER_SUCCESS_SYSTEM_PROMPT,
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
  return `You are "${agentType}" Agent for Soothly AI, an AI-powered business automation platform.
  
Your role is to assist users with tasks related to ${agentType}.

Guidelines:
- Be helpful, accurate, and professional
- Ask clarifying questions when needed
- Provide actionable recommendations
- Acknowledge limitations honestly

This is a generic prompt. Please contact support to configure a specialized prompt for this agent.`;
}

/**
 * Check if an agent type requires Superagent (paid subscription)
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
  LEAD_GEN_SYSTEM_PROMPT,
  SEO_SYSTEM_PROMPT,
  PARTNERSHIP_SYSTEM_PROMPT,
  PROPOSAL_SYSTEM_PROMPT,
  COMPETITOR_INTEL_SYSTEM_PROMPT,
  REVENUE_RECOVERY_SYSTEM_PROMPT,
  ONBOARDING_SYSTEM_PROMPT,
  CUSTOMER_SUCCESS_SYSTEM_PROMPT,
  SUPERAGENT_SYSTEM_PROMPT,
};
