/**
 * Observability Types for Agent Tracing
 * OpenTelemetry-compatible span and trace definitions
 */

import type { AgentType } from "../base/types";

/**
 * Trace status values
 */
export type TraceStatus = "running" | "success" | "error" | "cancelled";

/**
 * Span represents a single unit of work within a trace
 */
export interface AgentSpan {
  id: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  org_id: string;
  agent_type: AgentType;
  action: string;
  status: TraceStatus;

  // Input/Output previews (truncated for storage)
  input_preview?: Record<string, unknown>;
  output_preview?: Record<string, unknown>;
  error_message?: string;
  error_stack?: string;

  // LLM-specific metrics
  model?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;

  // Timing
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;

  // Context
  workflow_run_id?: string;
  task_id?: string;

  // Additional attributes
  attributes: Record<string, unknown>;
}

/**
 * Input for creating a new span
 */
export interface CreateSpanInput {
  action: string;
  parent_span_id?: string;
  workflow_run_id?: string;
  task_id?: string;
  input_preview?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
}

/**
 * Input for completing a span
 */
export interface CompleteSpanInput {
  status: TraceStatus;
  output_preview?: Record<string, unknown>;
  error_message?: string;
  error_stack?: string;
  model?: string;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  attributes?: Record<string, unknown>;
}

/**
 * Trace summary (aggregated view)
 */
export interface TraceSummary {
  trace_id: string;
  org_id: string;
  root_agent_type: AgentType;
  root_action: string;
  status: TraceStatus;
  span_count: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  started_at: Date;
  completed_at?: Date;
  total_duration_ms: number;
}

/**
 * Trace filter options
 */
export interface TraceFilterOptions {
  agent_types?: AgentType[];
  statuses?: TraceStatus[];
  start_date?: Date;
  end_date?: Date;
  min_duration_ms?: number;
  max_duration_ms?: number;
  has_errors?: boolean;
  workflow_run_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Cost estimate configuration
 */
export interface CostConfig {
  [model: string]: {
    input_per_1k: number;
    output_per_1k: number;
  };
}

/**
 * Default cost configuration for common models
 */
export const DEFAULT_COST_CONFIG: CostConfig = {
  "gpt-4o": { input_per_1k: 0.0025, output_per_1k: 0.01 },
  "gpt-4o-mini": { input_per_1k: 0.00015, output_per_1k: 0.0006 },
  "gpt-4-turbo": { input_per_1k: 0.01, output_per_1k: 0.03 },
  "gpt-3.5-turbo": { input_per_1k: 0.0005, output_per_1k: 0.0015 },
  "claude-3-5-sonnet": { input_per_1k: 0.003, output_per_1k: 0.015 },
  "claude-3-haiku": { input_per_1k: 0.00025, output_per_1k: 0.00125 },
  "text-embedding-3-small": { input_per_1k: 0.00002, output_per_1k: 0 },
  "text-embedding-3-large": { input_per_1k: 0.00013, output_per_1k: 0 },
};
