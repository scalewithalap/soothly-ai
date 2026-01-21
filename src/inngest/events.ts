/**
 * Agent Event Registry
 * Centralized, typed event names for Inter-Agent Protocol
 *
 * Per agents-ecosystem/SKILL.md and backend-design/SKILL.md:
 * - All events follow `domain/entity.action` convention
 * - Events must be typed for compile-time safety
 * - Consistent naming enables tracing and debugging
 */

import type { AgentType } from "@/agents/base/types";

/**
 * Event naming convention:
 * - Format: `domain/entity.action`
 * - Domain: Agent or feature area (seo, leads, partners, etc.)
 * - Entity: Resource being acted upon (brief, campaign, ticket, etc.)
 * - Action: Verb describing the event (created, completed, failed, etc.)
 *
 * Examples:
 * - `content/brief.created` - New SEO content brief created
 * - `leads/campaign.created` - Lead generation campaign started
 * - `support/ticket.created` - Customer support ticket opened
 */

// =============================================================================
// SEO / Content Events
// =============================================================================
export const SEO_EVENTS = {
  BRIEF_CREATED: "content/brief.created",
  ARTICLE_GENERATE: "content/article.generate",
  ARTICLE_OPTIMIZE: "content/article.optimize",
  ARTICLE_COMPLETED: "content/article.completed",
  ARTICLE_FAILED: "content/article.failed",
} as const;

// =============================================================================
// Lead Generation Events
// =============================================================================
export const LEAD_EVENTS = {
  CAMPAIGN_CREATED: "leads/campaign.created",
  SCRAPE_REQUESTED: "leads/scrape.requested",
  ENRICH_REQUESTED: "leads/enrich.requested",
  ENRICH_COMPLETED: "leads/enrich.completed",
  OUTREACH_SCHEDULED: "leads/outreach.scheduled",
  OUTREACH_SENT: "leads/outreach.sent",
} as const;

// =============================================================================
// Partnership Events
// =============================================================================
export const PARTNERSHIP_EVENTS = {
  DISCOVERY_START: "partners/discovery.start",
  DISCOVERY_REQUESTED: "partners/discover.requested",
  DISCOVERY_COMPLETED: "partners/discovery.completed",
  QUALIFY_SINGLE: "partners/qualify.single",
  QUALIFY_COMPLETED: "partners/qualify.completed",
  OUTREACH_SEND: "partners/outreach.send",
  OUTREACH_SENT: "partners/outreach.sent",
} as const;

// =============================================================================
// Proposal Events
// =============================================================================
export const PROPOSAL_EVENTS = {
  CREATE_FULL: "proposal/create.full",
  ANALYZE_REQUESTED: "proposal/analyze.requested",
  ANALYZE_COMPLETED: "proposal/analyze.completed",
  GENERATE_REQUESTED: "proposal/generate.requested",
  GENERATE_COMPLETED: "proposal/generate.completed",
} as const;

// =============================================================================
// Onboarding Events
// =============================================================================
export const ONBOARDING_EVENTS = {
  USER_CREATED: "onboarding/user.created",
  PROGRESS_CHECK: "onboarding/progress.check",
  TASK_COMPLETED: "onboarding/task.completed",
  NUDGE_SCHEDULED: "onboarding/nudge.scheduled",
  FLOW_COMPLETED: "onboarding/flow.completed",
} as const;

// =============================================================================
// Customer Success / Support Events
// =============================================================================
export const SUPPORT_EVENTS = {
  TICKET_CREATED: "support/ticket.created",
  PROCESS_REQUESTED: "support/process.requested",
  TICKET_RESOLVED: "support/ticket.resolved",
  TICKET_ESCALATED: "support/ticket.escalated",
} as const;

// =============================================================================
// Revenue Recovery Events
// =============================================================================
export const RECOVERY_EVENTS = {
  PAYMENT_FAILED: "recovery/payment.failed",
  PAYMENT_RETRY: "recovery/payment.retry",
  EMAIL_SCHEDULED: "recovery/email.scheduled",
  CARD_UPDATED: "recovery/card.updated",
  PAYMENT_RECOVERED: "recovery/payment.recovered",
} as const;

// =============================================================================
// Competitor Intelligence Events
// =============================================================================
export const INTEL_EVENTS = {
  SCAN_DAILY: "intel/scan.daily",
  COMPETITOR_CHECK: "intel/competitor.check",
  COMPETITOR_ADD: "intel/competitor.add",
  CHANGE_DETECTED: "intel/change.detected",
} as const;

// =============================================================================
// Superagent Orchestration Events
// =============================================================================
export const SUPERAGENT_EVENTS = {
  CAMPAIGN_PLAN: "superagent/campaign.plan",
  CAMPAIGN_EXECUTE: "superagent/campaign.execute",
  CAMPAIGN_STATUS: "superagent/campaign.status",
  CAMPAIGN_CANCEL: "superagent/campaign.cancel",
  CAMPAIGN_COMPLETED: "superagent/campaign.completed",
} as const;

// =============================================================================
// Agent Lifecycle Events (HITL)
// =============================================================================
export const AGENT_EVENTS = {
  CONTROL_PAUSE: "agent/control.pause",
  CONTROL_RESUME: "agent/control.resume",
  CONTROL_CANCEL: "agent/control.cancel",
  PAUSED: "agent/run.paused",
  RESUMED: "agent/run.resumed",
  CANCELLED: "agent/run.cancelled",
  CONFIDENCE_REPORTED: "agent/confidence.reported",
} as const;

// =============================================================================
// Approval Events
// =============================================================================
export const APPROVAL_EVENTS = {
  REQUESTED: "approval/requested",
  RESOLVED: "approval/resolved",
  EXPIRED: "approval/expired",
} as const;

// =============================================================================
// Combined Event Types
// =============================================================================
export type SeoEventName = (typeof SEO_EVENTS)[keyof typeof SEO_EVENTS];
export type LeadEventName = (typeof LEAD_EVENTS)[keyof typeof LEAD_EVENTS];
export type PartnershipEventName =
  (typeof PARTNERSHIP_EVENTS)[keyof typeof PARTNERSHIP_EVENTS];
export type ProposalEventName =
  (typeof PROPOSAL_EVENTS)[keyof typeof PROPOSAL_EVENTS];
export type OnboardingEventName =
  (typeof ONBOARDING_EVENTS)[keyof typeof ONBOARDING_EVENTS];
export type SupportEventName =
  (typeof SUPPORT_EVENTS)[keyof typeof SUPPORT_EVENTS];
export type RecoveryEventName =
  (typeof RECOVERY_EVENTS)[keyof typeof RECOVERY_EVENTS];
export type IntelEventName = (typeof INTEL_EVENTS)[keyof typeof INTEL_EVENTS];
export type SuperagentEventName =
  (typeof SUPERAGENT_EVENTS)[keyof typeof SUPERAGENT_EVENTS];
export type AgentEventName = (typeof AGENT_EVENTS)[keyof typeof AGENT_EVENTS];
export type ApprovalEventName =
  (typeof APPROVAL_EVENTS)[keyof typeof APPROVAL_EVENTS];

export type AllEventName =
  | SeoEventName
  | LeadEventName
  | PartnershipEventName
  | ProposalEventName
  | OnboardingEventName
  | SupportEventName
  | RecoveryEventName
  | IntelEventName
  | SuperagentEventName
  | AgentEventName
  | ApprovalEventName;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the standard event name for an agent action
 * Used by Superagent for dynamic event dispatch
 */
export function getEventName(agentType: AgentType, action: string): string {
  const eventMap: Record<AgentType, Record<string, string>> = {
    seo: {
      generate_article: SEO_EVENTS.ARTICLE_GENERATE,
      optimize_article: SEO_EVENTS.ARTICLE_OPTIMIZE,
    },
    lead_gen: {
      create_campaign: LEAD_EVENTS.CAMPAIGN_CREATED,
      enrich_leads: LEAD_EVENTS.ENRICH_REQUESTED,
      send_outreach: LEAD_EVENTS.OUTREACH_SCHEDULED,
    },
    partnership: {
      discover: PARTNERSHIP_EVENTS.DISCOVERY_START,
      qualify: PARTNERSHIP_EVENTS.QUALIFY_SINGLE,
      outreach: PARTNERSHIP_EVENTS.OUTREACH_SEND,
    },
    proposal: {
      create_proposal: PROPOSAL_EVENTS.CREATE_FULL,
      analyze: PROPOSAL_EVENTS.ANALYZE_REQUESTED,
    },
    onboarding: {
      start: ONBOARDING_EVENTS.USER_CREATED,
      check_progress: ONBOARDING_EVENTS.PROGRESS_CHECK,
    },
    customer_success: {
      process_ticket: SUPPORT_EVENTS.PROCESS_REQUESTED,
    },
    revenue_recovery: {
      handle_failure: RECOVERY_EVENTS.PAYMENT_FAILED,
      retry_payment: RECOVERY_EVENTS.PAYMENT_RETRY,
    },
    competitor_intel: {
      scan: INTEL_EVENTS.SCAN_DAILY,
      check: INTEL_EVENTS.COMPETITOR_CHECK,
    },
    superagent: {
      plan: SUPERAGENT_EVENTS.CAMPAIGN_PLAN,
      execute: SUPERAGENT_EVENTS.CAMPAIGN_EXECUTE,
    },
  };

  return eventMap[agentType]?.[action] ?? `${agentType}/${action}`;
}

/**
 * Get all events for an agent type
 */
export function getAgentEvents(agentType: AgentType): string[] {
  const eventsByAgent: Record<AgentType, Record<string, string>> = {
    seo: SEO_EVENTS,
    lead_gen: LEAD_EVENTS,
    partnership: PARTNERSHIP_EVENTS,
    proposal: PROPOSAL_EVENTS,
    onboarding: ONBOARDING_EVENTS,
    customer_success: SUPPORT_EVENTS,
    revenue_recovery: RECOVERY_EVENTS,
    competitor_intel: INTEL_EVENTS,
    superagent: SUPERAGENT_EVENTS,
  };

  const events = eventsByAgent[agentType];
  return events ? Object.values(events) : [];
}
