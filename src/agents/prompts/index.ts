/**
 * Agent System Prompts Index
 * Centralized export of all agent prompts with helper functions
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
import type { AgentType } from "../base/types";

// Map agent types to their system prompts
export const AGENT_PROMPTS: Record<AgentType | "superagent", string> = {
  leads: LEADS_SYSTEM_PROMPT,
  content: CONTENT_SYSTEM_PROMPT,
  partners: PARTNERS_SYSTEM_PROMPT,
  contracts: CONTRACTS_SYSTEM_PROMPT,
  compliance: COMPLIANCE_SYSTEM_PROMPT,
  receivables: RECEIVABLES_SYSTEM_PROMPT,
  spend: SPEND_SYSTEM_PROMPT,
  pricing: PRICING_SYSTEM_PROMPT,
  superagent: SUPERAGENT_SYSTEM_PROMPT,
};

/**
 * Get the system prompt for an agent type
 * Returns undefined if agent type is not recognized
 */
export function getSystemPrompt(agentType: string): string | undefined {
  return AGENT_PROMPTS[agentType as keyof typeof AGENT_PROMPTS];
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
  return agentType === "superagent";
}

/**
 * Get list of all normal (non-superagent) agent types
 */
export function getNormalAgentTypes(): AgentType[] {
  return [
    "leads",
    "content",
    "partners",
    "contracts",
    "compliance",
    "receivables",
    "spend",
    "pricing",
  ];
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
