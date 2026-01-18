/**
 * AgentTracer - Execution tracing and observability for AI agents
 * Provides OpenTelemetry-compatible tracing with LLM-specific metrics
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AgentType } from "../base/types";
import { untypedQuery } from "../utils/dbUtils";
import {
  type AgentSpan,
  type CreateSpanInput,
  type CompleteSpanInput,
  type TraceSummary,
  type TraceFilterOptions,
  type TraceStatus,
  DEFAULT_COST_CONFIG,
} from "./types";

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

export class AgentTracer {
  private db: SupabaseClient<Database>;
  private orgId: string;
  private agentType: AgentType;
  private currentTraceId: string | null = null;
  private currentSpanId: string | null = null;
  private spanStack: string[] = [];

  constructor(
    db: SupabaseClient<Database>,
    orgId: string,
    agentType: AgentType,
  ) {
    this.db = db;
    this.orgId = orgId;
    this.agentType = agentType;
  }

  /**
   * Start a new trace (root span)
   */
  async startTrace(input: CreateSpanInput): Promise<string> {
    this.currentTraceId = generateUUID();
    return this.startSpan(input);
  }

  /**
   * Start a new span within the current trace
   */
  async startSpan(input: CreateSpanInput): Promise<string> {
    if (!this.currentTraceId) {
      this.currentTraceId = generateUUID();
    }

    const spanId = generateUUID();
    const parentSpanId = input.parent_span_id || this.currentSpanId;

    // Truncate input preview to avoid storing too much data
    const inputPreview = input.input_preview
      ? this.truncateObject(input.input_preview, 1000)
      : null;

    const { error } = await untypedQuery(this.db)
      .from("agent_traces")
      .insert({
        trace_id: this.currentTraceId,
        span_id: spanId,
        parent_span_id: parentSpanId,
        org_id: this.orgId,
        agent_type: this.agentType,
        action: input.action,
        status: "running",
        input_preview: inputPreview,
        workflow_run_id: input.workflow_run_id,
        task_id: input.task_id,
        attributes: input.attributes || {},
        started_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to start span:", error);
    }

    // Push to span stack
    if (this.currentSpanId) {
      this.spanStack.push(this.currentSpanId);
    }
    this.currentSpanId = spanId;

    return spanId;
  }

  /**
   * Complete the current span
   */
  async endSpan(input: CompleteSpanInput): Promise<void> {
    if (!this.currentSpanId || !this.currentTraceId) {
      console.warn("No active span to end");
      return;
    }

    const completedAt = new Date();

    // Get the span to calculate duration
    const { data: span } = await untypedQuery(this.db)
      .from("agent_traces")
      .select("started_at")
      .eq("span_id", this.currentSpanId)
      .single();

    const startedAt = span?.started_at
      ? new Date(span.started_at)
      : completedAt;
    const durationMs = completedAt.getTime() - startedAt.getTime();

    // Calculate cost if token counts provided
    let costUsd = input.cost_usd;
    if (
      costUsd === undefined &&
      input.model &&
      (input.tokens_in || input.tokens_out)
    ) {
      costUsd = this.calculateCost(
        input.model,
        input.tokens_in || 0,
        input.tokens_out || 0,
      );
    }

    // Truncate output preview
    const outputPreview = input.output_preview
      ? this.truncateObject(input.output_preview, 1000)
      : null;

    const { error } = await untypedQuery(this.db)
      .from("agent_traces")
      .update({
        status: input.status,
        output_preview: outputPreview,
        error_message: input.error_message,
        error_stack: input.error_stack?.slice(0, 2000),
        model: input.model,
        tokens_in: input.tokens_in,
        tokens_out: input.tokens_out,
        cost_usd: costUsd,
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        attributes: input.attributes,
      })
      .eq("span_id", this.currentSpanId);

    if (error) {
      console.error("Failed to end span:", error);
    }

    // Pop from span stack
    this.currentSpanId = this.spanStack.pop() || null;

    // If no more spans, clear trace
    if (!this.currentSpanId) {
      this.currentTraceId = null;
    }
  }

  /**
   * End span with success status
   */
  async success(
    output?: Record<string, unknown>,
    metrics?: { model?: string; tokens_in?: number; tokens_out?: number },
  ): Promise<void> {
    await this.endSpan({
      status: "success",
      output_preview: output,
      ...metrics,
    });
  }

  /**
   * End span with error status
   */
  async error(
    err: Error | string,
    output?: Record<string, unknown>,
  ): Promise<void> {
    const errorMessage = typeof err === "string" ? err : err.message;
    const errorStack = typeof err === "string" ? undefined : err.stack;

    await this.endSpan({
      status: "error",
      error_message: errorMessage,
      error_stack: errorStack,
      output_preview: output,
    });
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string | null {
    return this.currentTraceId;
  }

  /**
   * Get current span ID
   */
  getSpanId(): string | null {
    return this.currentSpanId;
  }

  /**
   * Get trace by ID
   */
  async getTrace(traceId: string): Promise<AgentSpan[]> {
    const { data, error } = await (this.db as any).rpc("get_trace_tree", {
      p_trace_id: traceId,
    });

    if (error) {
      console.error("Failed to get trace:", error);
      return [];
    }

    return (data as unknown as AgentSpan[]) || [];
  }

  /**
   * List traces for this organization
   */
  async listTraces(options: TraceFilterOptions = {}): Promise<TraceSummary[]> {
    const {
      agent_types,
      statuses,
      start_date,
      end_date,
      has_errors,
      workflow_run_id,
      limit = 50,
      offset = 0,
    } = options;

    let query = untypedQuery(this.db)
      .from("agent_traces")
      .select(
        `
        trace_id,
        agent_type,
        action,
        status,
        started_at,
        completed_at,
        duration_ms,
        tokens_in,
        tokens_out,
        cost_usd
      `,
      )
      .eq("org_id", this.orgId)
      .is("parent_span_id", null) // Root spans only
      .order("started_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (agent_types?.length) {
      query = query.in("agent_type", agent_types);
    }

    if (statuses?.length) {
      query = query.in("status", statuses);
    }

    if (start_date) {
      query = query.gte("started_at", start_date.toISOString());
    }

    if (end_date) {
      query = query.lte("started_at", end_date.toISOString());
    }

    if (has_errors) {
      query = query.eq("status", "error");
    }

    if (workflow_run_id) {
      query = query.eq("workflow_run_id", workflow_run_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to list traces:", error);
      return [];
    }

    // Map to TraceSummary format
    return (data || []).map((trace) => {
      const t = trace as {
        trace_id: string;
        agent_type: AgentType;
        action: string;
        status: TraceStatus;
        started_at: string;
        completed_at: string | null;
        duration_ms: number | null;
        tokens_in: number | null;
        tokens_out: number | null;
        cost_usd: number | null;
      };
      return {
        trace_id: t.trace_id,
        org_id: this.orgId,
        root_agent_type: t.agent_type,
        root_action: t.action,
        status: t.status,
        span_count: 1, // Would need additional query for full count
        total_tokens_in: t.tokens_in || 0,
        total_tokens_out: t.tokens_out || 0,
        total_cost_usd: t.cost_usd || 0,
        started_at: new Date(t.started_at),
        completed_at: t.completed_at ? new Date(t.completed_at) : undefined,
        total_duration_ms: t.duration_ms || 0,
      };
    });
  }

  /**
   * Get aggregated statistics
   */
  async getStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total_traces: number;
    total_tokens: number;
    total_cost_usd: number;
    avg_duration_ms: number;
    error_rate: number;
    by_agent: Record<string, { traces: number; tokens: number; cost: number }>;
    daily_stats: Array<{
      date: string;
      traces: number;
      tokens: number;
      cost: number;
      error_count: number;
    }>;
  }> {
    let query = untypedQuery(this.db)
      .from("agent_traces")
      .select(
        "agent_type, status, tokens_in, tokens_out, cost_usd, duration_ms, started_at",
      )
      .eq("org_id", this.orgId)
      .is("parent_span_id", null);

    if (startDate) {
      query = query.gte("started_at", startDate.toISOString());
    }

    if (endDate) {
      query = query.lte("started_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error || !data) {
      return {
        total_traces: 0,
        total_tokens: 0,
        total_cost_usd: 0,
        avg_duration_ms: 0,
        error_rate: 0,
        by_agent: {},
        daily_stats: [],
      };
    }

    const by_agent: Record<
      string,
      { traces: number; tokens: number; cost: number }
    > = {};
    const daily_stats: Record<
      string,
      {
        traces: number;
        tokens: number;
        cost: number;
        error_count: number;
      }
    > = {};

    let totalTokens = 0;
    let totalCost = 0;
    let totalDuration = 0;
    let errorCount = 0;

    for (const trace of data) {
      const t = trace as {
        agent_type: string;
        status: string;
        tokens_in: number | null;
        tokens_out: number | null;
        cost_usd: number | null;
        duration_ms: number | null;
        started_at: string;
      };

      const tokens = (t.tokens_in || 0) + (t.tokens_out || 0);
      const cost = t.cost_usd || 0;
      const duration = t.duration_ms || 0;

      totalTokens += tokens;
      totalCost += cost;
      totalDuration += duration;

      if (t.status === "error") {
        errorCount++;
      }

      if (!by_agent[t.agent_type]) {
        by_agent[t.agent_type] = { traces: 0, tokens: 0, cost: 0 };
      }
      by_agent[t.agent_type].traces++;
      by_agent[t.agent_type].tokens += tokens;
      by_agent[t.agent_type].cost += cost;

      // Daily stats
      const date = new Date(t.started_at).toISOString().split("T")[0];
      if (!daily_stats[date]) {
        daily_stats[date] = {
          traces: 0,
          tokens: 0,
          cost: 0,
          error_count: 0,
        };
      }
      daily_stats[date].traces++;
      daily_stats[date].tokens += tokens;
      daily_stats[date].cost += cost;
      if (t.status === "error") {
        daily_stats[date].error_count++;
      }
    }

    return {
      total_traces: data.length,
      total_tokens: totalTokens,
      total_cost_usd: totalCost,
      avg_duration_ms: data.length > 0 ? totalDuration / data.length : 0,
      error_rate: data.length > 0 ? errorCount / data.length : 0,
      by_agent,
      daily_stats: Object.entries(daily_stats)
        .map(([date, stat]) => ({
          date,
          ...stat,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Calculate cost for a model usage
   */
  private calculateCost(
    model: string,
    tokensIn: number,
    tokensOut: number,
  ): number {
    const config = DEFAULT_COST_CONFIG[model];
    if (!config) {
      return 0;
    }

    return (
      (tokensIn / 1000) * config.input_per_1k +
      (tokensOut / 1000) * config.output_per_1k
    );
  }

  /**
   * Truncate an object to a maximum string length
   */
  private truncateObject(
    obj: Record<string, unknown>,
    maxLength: number,
  ): Record<string, unknown> {
    const str = JSON.stringify(obj);
    if (str.length <= maxLength) {
      return obj;
    }

    // Return a truncated version with indicator
    return {
      _truncated: true,
      _original_length: str.length,
      preview: str.slice(0, maxLength - 50),
    };
  }
}
