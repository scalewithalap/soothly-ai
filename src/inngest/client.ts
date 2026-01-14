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

  // Cross-Agent Events
  "agent/task.completed": "agent/task.completed",
  "agent/error.occurred": "agent/error.occurred",
} as const;

export type AgentEventType = (typeof AgentEvents)[keyof typeof AgentEvents];
