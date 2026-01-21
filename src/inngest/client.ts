/**
 * Inngest Client
 * Durable workflow engine for background jobs
 */

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "zero-headache",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

/**
 * Common event types for agent operations
 */
export const AgentEvents = {
  // Lead Generation Events
  "leads/campaign.created": "leads/campaign.created",
  "leads/scrape.requested": "leads/scrape.requested",
  "leads/enrich.requested": "leads/enrich.requested",
  "leads/score.requested": "leads/score.requested",
  "leads/outreach.scheduled": "leads/outreach.scheduled",

  // SEO Content Events
  "content/brief.created": "content/brief.created",
  "content/article.generate": "content/article.generate",
  "content/article.optimize": "content/article.optimize",
  "content/article.publish": "content/article.publish",

  // Partnership Events
  "partners/discover.requested": "partners/discover.requested",
  "partners/qualify.requested": "partners/qualify.requested",
  "partners/outreach.scheduled": "partners/outreach.scheduled",

  // Proposal Generator Events
  "proposal/create.full": "proposal/create.full",
  "proposal/analyze.requested": "proposal/analyze.requested",
  "proposal/generate.requested": "proposal/generate.requested",

  // Customer Success Events
  "support/ticket.created": "support/ticket.created",
  "support/process.requested": "support/process.requested",

  // Revenue Recovery Events
  "recovery/payment.failed": "recovery/payment.failed",
  "recovery/payment.retry": "recovery/payment.retry",
  "recovery/card.updated": "recovery/card.updated",
  "recovery/email.scheduled": "recovery/email.scheduled",

  // Onboarding Events
  "onboarding/user.created": "onboarding/user.created",
  "onboarding/progress.check": "onboarding/progress.check",
  "onboarding/task.completed": "onboarding/task.completed",
  "onboarding/nudge.scheduled": "onboarding/nudge.scheduled",

  // Competitor Intel Events
  "intel/scan.daily": "intel/scan.daily",
  "intel/competitor.check": "intel/competitor.check",
  "intel/competitor.add": "intel/competitor.add",

  // Superagent Events
  "superagent/campaign.plan": "superagent/campaign.plan",
  "superagent/campaign.execute": "superagent/campaign.execute",
  "superagent/campaign.status": "superagent/campaign.status",
  "superagent/campaign.cancel": "superagent/campaign.cancel",

  // HITL Approval Events
  "approval/resolved": "approval/resolved",

  // Cross-Agent Events
  "agent/task.completed": "agent/task.completed",
  "agent/error.occurred": "agent/error.occurred",
} as const;

export type AgentEventType = (typeof AgentEvents)[keyof typeof AgentEvents];
