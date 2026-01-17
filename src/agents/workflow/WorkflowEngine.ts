/**
 * WorkflowEngine - DAG-based multi-agent orchestration
 * Executes workflows with parallel, conditional, and loop support
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { AgentRegistry } from "../base/AgentRegistry";
import { ApprovalGate } from "../hitl/ApprovalGate";
import { untypedQuery } from "../utils/dbUtils";
import {
  type Workflow,
  type WorkflowRun,
  type WorkflowNode,
  type WorkflowEdge,
  type NodeExecution,
  type ExecutionContext,
  type CreateWorkflowInput,
  type StartRunInput,
  type RunStatus,
} from "./types";

export class WorkflowEngine {
  private db: SupabaseClient<Database>;
  private orgId: string;
  private approvalGate: ApprovalGate;

  constructor(db: SupabaseClient<Database>, orgId: string) {
    this.db = db;
    this.orgId = orgId;
    this.approvalGate = new ApprovalGate(db, orgId);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(input: CreateWorkflowInput): Promise<Workflow | null> {
    // Validate the graph
    const validation = this.validateGraph(input.nodes, input.edges);
    if (!validation.valid) {
      throw new Error(`Invalid workflow: ${validation.error}`);
    }

    const { data, error } = await untypedQuery(this.db)
      .from("workflows")
      .insert({
        org_id: this.orgId,
        name: input.name,
        description: input.description,
        nodes: input.nodes,
        edges: input.edges,
        trigger_type: input.trigger_type || "manual",
        trigger_config: input.trigger_config || {},
        max_retries: input.max_retries || 3,
        timeout_seconds: input.timeout_seconds || 3600,
        parallel_limit: input.parallel_limit || 5,
        status: "draft",
        version: 1,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create workflow:", error);
      return null;
    }

    return data as unknown as Workflow;
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const { data, error } = await untypedQuery(this.db)
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("org_id", this.orgId)
      .single();

    if (error) {
      return null;
    }

    return data as unknown as Workflow;
  }

  /**
   * Start a workflow run
   */
  async startRun(input: StartRunInput): Promise<WorkflowRun | null> {
    const workflow = await this.getWorkflow(input.workflow_id);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.status !== "active") {
      throw new Error("Workflow is not active");
    }

    // Create the run record
    const { data: run, error } = await untypedQuery(this.db)
      .from("workflow_runs")
      .insert({
        workflow_id: input.workflow_id,
        org_id: this.orgId,
        status: "pending",
        state: {},
        input: input.input || {},
        triggered_by: input.triggered_by || "user",
        triggered_by_user_id: input.triggered_by_user_id,
        completed_nodes: [],
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create run:", error);
      return null;
    }

    // Start execution asynchronously
    this.executeRun(run as unknown as WorkflowRun, workflow).catch((err) => {
      console.error("Workflow execution error:", err);
    });

    return run as unknown as WorkflowRun;
  }

  /**
   * Execute a workflow run
   */
  private async executeRun(
    run: WorkflowRun,
    workflow: Workflow,
  ): Promise<void> {
    // Update status to running
    await this.updateRunStatus(run.id, "running", {
      started_at: new Date().toISOString(),
    });

    const context: ExecutionContext = {
      workflow,
      run,
      variables: { input: run.input },
    };

    try {
      // Find start nodes (nodes with no incoming edges)
      const startNodes = this.findStartNodes(workflow);

      // Execute from start nodes
      await this.executeNodes(startNodes, context);

      // Mark as completed
      await this.updateRunStatus(run.id, "completed", {
        output: context.variables,
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.updateRunStatus(run.id, "failed", {
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Execute a set of nodes (potentially in parallel)
   */
  private async executeNodes(
    nodes: WorkflowNode[],
    context: ExecutionContext,
  ): Promise<void> {
    const { workflow } = context;

    // Group parallel nodes
    const parallelGroups = this.groupParallelNodes(nodes, workflow);

    for (const group of parallelGroups) {
      if (group.length === 1) {
        // Sequential execution
        await this.executeNode(group[0], context);
      } else {
        // Parallel execution with limit
        const parallelLimit = workflow.parallel_limit || 5;
        for (let i = 0; i < group.length; i += parallelLimit) {
          const batch = group.slice(i, i + parallelLimit);
          await Promise.all(
            batch.map((node) => this.executeNode(node, context)),
          );
        }
      }

      // Get next nodes
      const nextNodes = this.getNextNodes(group, context);
      if (nextNodes.length > 0) {
        await this.executeNodes(nextNodes, context);
      }
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<void> {
    const { run } = context;

    // Create node execution record
    const executionId = await this.createNodeExecution(run.id, node.id);

    try {
      await this.updateNodeExecution(executionId, {
        status: "running",
        started_at: new Date().toISOString(),
      });

      let result: Record<string, unknown> | null = null;

      switch (node.type) {
        case "agent":
          result = await this.executeAgentNode(node, context);
          break;
        case "condition":
          result = await this.executeConditionNode(node, context);
          break;
        case "loop":
          result = await this.executeLoopNode(node, context);
          break;
        case "delay":
          await this.executeDelayNode(node);
          result = {};
          break;
        case "transform":
          result = await this.executeTransformNode(node, context);
          break;
        case "human_review":
          result = await this.executeHumanReviewNode(node, context);
          break;
        default:
          result = {};
      }

      // Store result in context variables
      context.variables[node.id] = result;

      // Mark node as completed
      await this.updateNodeExecution(executionId, {
        status: "completed",
        output: result,
        completed_at: new Date().toISOString(),
      });

      // Add to completed nodes
      await this.addCompletedNode(run.id, node.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.updateNodeExecution(executionId, {
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      });

      // Handle error based on node configuration
      if (node.on_error === "skip") {
        context.variables[node.id] = null;
        await this.addCompletedNode(run.id, node.id);
      } else if (node.on_error === "retry" && node.max_retries) {
        // Retry logic would go here
        throw error;
      } else {
        throw error;
      }
    }
  }

  /**
   * Execute an agent node
   */
  private async executeAgentNode(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    if (!node.agent_type || !node.action) {
      throw new Error("Agent node missing agent_type or action");
    }

    // Get agent from registry using singleton pattern
    const agent = AgentRegistry.getInstance().create(
      node.agent_type,
      this.orgId,
      this.db,
    );

    if (!agent) {
      throw new Error(`Agent not found: ${node.agent_type}`);
    }

    // Prepare params with variable interpolation
    const params = this.interpolateParams(node.params || {}, context);

    // Execute agent task
    const result = await agent.execute({
      id: crypto.randomUUID(),
      action: node.action,
      params,
      priority: "normal",
    });

    if (!result.success) {
      throw new Error(result.error || "Agent execution failed");
    }

    return { success: true, data: result.data };
  }

  /**
   * Execute a condition node
   */
  private async executeConditionNode(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    if (!node.condition) {
      throw new Error("Condition node missing condition expression");
    }

    const result = this.evaluateExpression(node.condition, context.variables);
    return { result: Boolean(result) };
  }

  /**
   * Execute a loop node
   */
  private async executeLoopNode(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    if (!node.loop_over) {
      throw new Error("Loop node missing loop_over expression");
    }

    const items = this.evaluateExpression(
      node.loop_over,
      context.variables,
    ) as unknown[];

    if (!Array.isArray(items)) {
      throw new Error("Loop expression must return an array");
    }

    const maxIterations = node.max_iterations || 100;
    const results: unknown[] = [];

    for (let i = 0; i < Math.min(items.length, maxIterations); i++) {
      context.loop_index = i;
      context.variables["$item"] = items[i];
      context.variables["$index"] = i;

      // Execute child nodes would go here
      results.push(items[i]);
    }

    return { items: results, count: results.length };
  }

  /**
   * Execute a delay node
   */
  private async executeDelayNode(node: WorkflowNode): Promise<void> {
    const delayMs = node.delay_ms || 1000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  /**
   * Execute a transform node
   */
  private async executeTransformNode(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    if (!node.transform_expression) {
      throw new Error("Transform node missing expression");
    }

    const result = this.evaluateExpression(
      node.transform_expression,
      context.variables,
    );
    return { result };
  }

  /**
   * Execute a human review node
   */
  private async executeHumanReviewNode(
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    // Create approval request
    const approval = await this.approvalGate.requestApproval({
      agent_type: "superagent",
      action: "workflow_review",
      title: node.name || "Workflow Review Required",
      description: node.description,
      params: context.variables,
      risk_level: "medium",
      workflow_run_id: context.run.id,
    });

    // Update run status
    await this.updateRunStatus(context.run.id, "waiting_approval");

    // Wait for approval
    const { approved, request } = await this.approvalGate.waitForApproval(
      approval.id,
      context.workflow.timeout_seconds * 1000,
    );

    if (!approved) {
      throw new Error("Human review rejected or timed out");
    }

    // Resume running
    await this.updateRunStatus(context.run.id, "running");

    return {
      approved: true,
      approved_by: request?.approved_by,
      comment: request?.resolution_comment,
    };
  }

  /**
   * Validate workflow graph structure
   */
  private validateGraph(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): { valid: boolean; error?: string } {
    if (nodes.length === 0) {
      return { valid: false, error: "Workflow must have at least one node" };
    }

    // Check for duplicate node IDs
    const nodeIds = new Set(nodes.map((n) => n.id));
    if (nodeIds.size !== nodes.length) {
      return { valid: false, error: "Duplicate node IDs found" };
    }

    // Check edges reference valid nodes
    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        return { valid: false, error: `Edge source not found: ${edge.source}` };
      }
      if (!nodeIds.has(edge.target)) {
        return { valid: false, error: `Edge target not found: ${edge.target}` };
      }
    }

    return { valid: true };
  }

  /**
   * Find start nodes (no incoming edges)
   */
  private findStartNodes(workflow: Workflow): WorkflowNode[] {
    const targetIds = new Set(workflow.edges.map((e) => e.target));
    return workflow.nodes.filter((node) => !targetIds.has(node.id));
  }

  /**
   * Group nodes that can run in parallel
   */
  private groupParallelNodes(
    nodes: WorkflowNode[],
    workflow: Workflow,
  ): WorkflowNode[][] {
    // Simple implementation: each node is its own group
    // More sophisticated topological sorting could be added
    return nodes.map((node) => [node]);
  }

  /**
   * Get next nodes to execute after completing current nodes
   */
  private getNextNodes(
    completedNodes: WorkflowNode[],
    context: ExecutionContext,
  ): WorkflowNode[] {
    const { workflow, run } = context;
    const completedIds = new Set([
      ...completedNodes.map((n) => n.id),
      ...(run.completed_nodes || []),
    ]);

    const nextIds = new Set<string>();

    for (const node of completedNodes) {
      // Find edges from this node
      const outEdges = workflow.edges.filter((e) => e.source === node.id);

      for (const edge of outEdges) {
        // Check if condition passes (if any)
        if (edge.condition) {
          const result = this.evaluateExpression(
            edge.condition,
            context.variables,
          );
          if (!result) continue;
        }

        // Check if target not already completed
        if (!completedIds.has(edge.target)) {
          nextIds.add(edge.target);
        }
      }
    }

    return workflow.nodes.filter((n) => nextIds.has(n.id));
  }

  /**
   * Interpolate params with context variables
   */
  private interpolateParams(
    params: Record<string, unknown>,
    context: ExecutionContext,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (
        typeof value === "string" &&
        value.startsWith("{{") &&
        value.endsWith("}}")
      ) {
        const expr = value.slice(2, -2).trim();
        result[key] = this.evaluateExpression(expr, context.variables);
      } else if (typeof value === "object" && value !== null) {
        result[key] = this.interpolateParams(
          value as Record<string, unknown>,
          context,
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Safely evaluate a JavaScript expression
   */
  private evaluateExpression(
    expression: string,
    variables: Record<string, unknown>,
  ): unknown {
    try {
      const func = new Function(
        ...Object.keys(variables),
        `try { return ${expression}; } catch { return null; }`,
      );
      return func(...Object.values(variables));
    } catch {
      console.error("Expression evaluation error:", expression);
      return null;
    }
  }

  /**
   * Update workflow run status
   */
  private async updateRunStatus(
    runId: string,
    status: RunStatus,
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await untypedQuery(this.db)
      .from("workflow_runs")
      .update({ status, ...extra })
      .eq("id", runId);
  }

  /**
   * Create a node execution record
   */
  private async createNodeExecution(
    runId: string,
    nodeId: string,
  ): Promise<string> {
    const { data } = await untypedQuery(this.db)
      .from("workflow_node_executions")
      .insert({
        run_id: runId,
        node_id: nodeId,
        status: "pending",
      })
      .select("id")
      .single();

    return data?.id || "";
  }

  /**
   * Update a node execution record
   */
  private async updateNodeExecution(
    executionId: string,
    updates: Partial<NodeExecution>,
  ): Promise<void> {
    await untypedQuery(this.db)
      .from("workflow_node_executions")
      .update(updates)
      .eq("id", executionId);
  }

  /**
   * Add a node to the completed nodes list
   */
  private async addCompletedNode(runId: string, nodeId: string): Promise<void> {
    const { data } = await untypedQuery(this.db)
      .from("workflow_runs")
      .select("completed_nodes")
      .eq("id", runId)
      .single();

    const completedNodes = (data?.completed_nodes as string[]) || [];
    completedNodes.push(nodeId);

    await untypedQuery(this.db)
      .from("workflow_runs")
      .update({ completed_nodes: completedNodes })
      .eq("id", runId);
  }

  /**
   * Get a workflow run
   */
  async getRun(runId: string): Promise<WorkflowRun | null> {
    const { data, error } = await untypedQuery(this.db)
      .from("workflow_runs")
      .select("*")
      .eq("id", runId)
      .eq("org_id", this.orgId)
      .single();

    if (error) {
      return null;
    }

    return data as unknown as WorkflowRun;
  }

  /**
   * List workflow runs
   */
  async listRuns(
    workflowId?: string,
    options: { limit?: number; offset?: number; status?: RunStatus } = {},
  ): Promise<WorkflowRun[]> {
    const { limit = 50, offset = 0, status } = options;

    let query = untypedQuery(this.db)
      .from("workflow_runs")
      .select("*")
      .eq("org_id", this.orgId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (workflowId) {
      query = query.eq("workflow_id", workflowId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to list runs:", error);
      return [];
    }

    return (data as unknown as WorkflowRun[]) || [];
  }

  /**
   * Cancel a running workflow
   */
  async cancelRun(runId: string): Promise<boolean> {
    const { error } = await untypedQuery(this.db)
      .from("workflow_runs")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId)
      .eq("org_id", this.orgId)
      .in("status", ["pending", "running", "paused", "waiting_approval"]);

    return !error;
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(workflowId: string): Promise<boolean> {
    const { error } = await untypedQuery(this.db)
      .from("workflows")
      .update({ status: "active" })
      .eq("id", workflowId)
      .eq("org_id", this.orgId);

    return !error;
  }

  /**
   * Pause a workflow
   */
  async pauseWorkflow(workflowId: string): Promise<boolean> {
    const { error } = await untypedQuery(this.db)
      .from("workflows")
      .update({ status: "paused" })
      .eq("id", workflowId)
      .eq("org_id", this.orgId);

    return !error;
  }
}
