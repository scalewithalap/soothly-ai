/**
 * Workflow Types for Multi-Agent Orchestration
 * DAG-based pipeline definitions and execution state
 */

import type { AgentType } from "../base/types";

/**
 * Workflow node types
 */
export type WorkflowNodeType =
  | "agent"
  | "condition"
  | "loop"
  | "parallel"
  | "human_review"
  | "trigger"
  | "delay"
  | "transform";

/**
 * Workflow trigger types
 */
export type TriggerType = "manual" | "schedule" | "webhook" | "event";

/**
 * Workflow status
 */
export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

/**
 * Workflow run status
 */
export type RunStatus =
  | "pending"
  | "running"
  | "paused"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Node execution status
 */
export type NodeStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/**
 * A workflow node definition
 */
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description?: string;

  // Position for visual builder
  position?: { x: number; y: number };

  // Agent-specific
  agent_type?: AgentType;
  action?: string;
  params?: Record<string, unknown>;

  // Condition-specific
  condition?: string; // JavaScript expression

  // Loop-specific
  loop_over?: string; // Expression returning array
  max_iterations?: number;

  // Delay-specific
  delay_ms?: number;

  // Transform-specific
  transform_expression?: string;

  // Error handling
  on_error?: "fail" | "skip" | "retry";
  max_retries?: number;
  retry_delay_ms?: number;
}

/**
 * A workflow edge (connection between nodes)
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string; // For conditional branches
}

/**
 * A complete workflow definition
 */
export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description?: string;

  // Graph structure
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];

  // Trigger configuration
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;

  // Execution settings
  max_retries: number;
  timeout_seconds: number;
  parallel_limit: number;

  // Status
  status: WorkflowStatus;
  version: number;

  // Metadata
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * A workflow execution run
 */
export interface WorkflowRun {
  id: string;
  workflow_id: string;
  org_id: string;

  // Execution status
  status: RunStatus;

  // State management
  current_node_id?: string;
  completed_nodes: string[];
  state: Record<string, unknown>;

  // Input/Output
  input: Record<string, unknown>;
  output?: Record<string, unknown>;

  // Error tracking
  error_message?: string;
  error_node_id?: string;
  retry_count: number;

  // Context
  triggered_by: string;
  triggered_by_user_id?: string;

  // Timing
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

/**
 * Node execution record
 */
export interface NodeExecution {
  id: string;
  run_id: string;
  node_id: string;

  status: NodeStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error_message?: string;

  started_at?: string;
  completed_at?: string;
  duration_ms?: number;

  usage_consumed?: number;
  tokens_in?: number;
  tokens_out?: number;
}

/**
 * Workflow execution context passed between nodes
 */
export interface ExecutionContext {
  workflow: Workflow;
  run: WorkflowRun;
  variables: Record<string, unknown>;
  loop_index?: number;
  parent_context?: ExecutionContext;
}

/**
 * Input for creating a workflow
 */
export interface CreateWorkflowInput {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  trigger_type?: TriggerType;
  trigger_config?: Record<string, unknown>;
  max_retries?: number;
  timeout_seconds?: number;
  parallel_limit?: number;
}

/**
 * Input for starting a workflow run
 */
export interface StartRunInput {
  workflow_id: string;
  input?: Record<string, unknown>;
  triggered_by?: string;
  triggered_by_user_id?: string;
}
