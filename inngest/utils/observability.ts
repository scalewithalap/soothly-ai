/**
 * Observability Utilities for Inngest Functions
 * Provides trace propagation and confidence score broadcasting
 *
 * Per backend-design/SKILL.md:
 * - All agents must propagate trace_id across steps
 * - Confidence scores should be broadcast for HITL integration
 * - Metrics should be traceable end-to-end
 */

import { inngest } from "@/inngest/client";
import { AGENT_EVENTS } from "@/inngest/events";
import type { AgentType } from "@/lib/agents/base/types";

/**
 * Confidence level thresholds per SKILL.md
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9, // Very confident, auto-proceed in smart mode
  MEDIUM: 0.7, // Moderate confidence, may need review
  LOW: 0.5, // Low confidence, should escalate
  CRITICAL: 0.3, // Very low, must escalate
} as const;

/**
 * Confidence event payload for broadcasting
 */
export interface ConfidenceEvent {
  trace_id: string;
  org_id: string;
  agent_type: AgentType;
  action: string;
  confidence: number;
  reasoning?: string;
  requires_review: boolean;
  timestamp: string;
}

/**
 * Trace context for propagation across steps
 */
export interface TraceContext {
  trace_id: string;
  parent_span_id?: string;
  org_id: string;
  agent_type: AgentType;
  workflow_run_id?: string;
}

/**
 * Generate a new trace ID
 * Uses crypto.randomUUID() for UUID v4
 */
export function generateTraceId(): string {
  return crypto.randomUUID();
}

/**
 * Create trace context for a new agent run
 * This should be called at the start of an Inngest function
 */
export function createTraceContext(
  eventData: {
    orgId: string;
    trace_id?: string;
    workflow_run_id?: string;
  },
  agentType: AgentType,
): TraceContext {
  return {
    trace_id: eventData.trace_id ?? generateTraceId(),
    org_id: eventData.orgId,
    agent_type: agentType,
    workflow_run_id: eventData.workflow_run_id,
  };
}

/**
 * Propagate trace context to child event
 * Use this when sending events to trigger other agents
 */
export function propagateTrace<T extends Record<string, unknown>>(
  payload: T,
  context: TraceContext,
): T & { trace_id: string; parent_span_id?: string } {
  return {
    ...payload,
    trace_id: context.trace_id,
    parent_span_id: context.parent_span_id,
  };
}

/**
 * Broadcast a confidence score event
 * Per SKILL.md: Agents should emit confidence for observability
 *
 * @param context - Trace context
 * @param action - The action being performed
 * @param confidence - Confidence score 0-1
 * @param reasoning - Optional reasoning for the score
 */
export async function broadcastConfidence(
  context: TraceContext,
  action: string,
  confidence: number,
  reasoning?: string,
): Promise<void> {
  const event: ConfidenceEvent = {
    trace_id: context.trace_id,
    org_id: context.org_id,
    agent_type: context.agent_type,
    action,
    confidence,
    reasoning,
    requires_review: confidence < CONFIDENCE_THRESHOLDS.MEDIUM,
    timestamp: new Date().toISOString(),
  };

  // Send confidence event for observability
  await inngest.send({
    name: AGENT_EVENTS.CONFIDENCE_REPORTED,
    data: event,
  });
}

/**
 * Get confidence level category from score
 */
export function getConfidenceLevel(
  confidence: number,
): "high" | "medium" | "low" | "critical" {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW) return "low";
  return "critical";
}

/**
 * Check if confidence requires human review
 * Per SKILL.md: Low confidence should trigger HITL
 */
export function requiresConfidenceReview(confidence: number): boolean {
  return confidence < CONFIDENCE_THRESHOLDS.MEDIUM;
}

/**
 * Create a span attribute object for tracing
 * Useful for adding consistent metadata to spans
 */
export function createSpanAttributes(
  context: TraceContext,
  additional?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    trace_id: context.trace_id,
    org_id: context.org_id,
    agent_type: context.agent_type,
    workflow_run_id: context.workflow_run_id,
    ...additional,
  };
}

/**
 * Log with trace context
 * Adds trace_id to all log entries for correlation
 */
export function traceLog(
  context: TraceContext,
  level: "info" | "warn" | "error",
  message: string,
  meta?: Record<string, unknown>,
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    trace_id: context.trace_id,
    org_id: context.org_id,
    agent_type: context.agent_type,
    level,
    message,
    ...meta,
  };

  // Use appropriate console method
  switch (level) {
    case "error":
      console.error(JSON.stringify(logEntry));
      break;
    case "warn":
      console.warn(JSON.stringify(logEntry));
      break;
    default:
      console.log(JSON.stringify(logEntry));
  }
}

/**
 * Measure step duration and log with trace
 */
export async function withTracedStep<T>(
  context: TraceContext,
  stepName: string,
  fn: () => Promise<T>,
): Promise<{ result: T; duration_ms: number }> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration_ms = Date.now() - startTime;

    traceLog(context, "info", `Step completed: ${stepName}`, {
      step: stepName,
      duration_ms,
      status: "success",
    });

    return { result, duration_ms };
  } catch (error) {
    const duration_ms = Date.now() - startTime;

    traceLog(context, "error", `Step failed: ${stepName}`, {
      step: stepName,
      duration_ms,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
}
