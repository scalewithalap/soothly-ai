/**
 * A2A Protocol Server
 * Implements Google's Agent-to-Agent protocol for exposing agents to external systems
 */

import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type {
  AgentCard,
  A2AServerConfig,
  Task,
  TaskState,
  TaskSendParams,
  TaskQueryParams,
  TaskCancelParams,
  TaskStatus,
  Message,
  Artifact,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
  A2AErrorCodes,
  A2AStreamEvent,
  TaskStatusUpdateEvent,
} from "./types";

// Service role client for server operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * A2A Protocol Server Implementation
 * Exposes Zero Headache agents via the A2A protocol
 */
export class A2AServer {
  private config: A2AServerConfig;

  constructor(config: A2AServerConfig) {
    this.config = config;
  }

  /**
   * Get the agent card (discovery endpoint)
   */
  getAgentCard(): AgentCard {
    return {
      name: this.config.name,
      url: this.config.baseUrl,
      version: this.config.version,
      description: this.config.description,
      provider: {
        name: this.config.providerName,
        url: this.config.providerUrl,
      },
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: true,
      },
      authentication: [
        {
          type: "bearer",
          name: "Authorization",
        },
      ],
      defaultInputModes: this.config.supportedInputModes || ["text"],
      defaultOutputModes: this.config.supportedOutputModes || ["text"],
      skills: this.config.skills,
    };
  }

  /**
   * Handle JSON-RPC request
   */
  async handleRequest(
    request: JSONRPCRequest,
    orgId: string,
  ): Promise<JSONRPCResponse> {
    try {
      switch (request.method) {
        case "tasks/send":
          return this.handleTaskSend(
            request.id,
            request.params as TaskSendParams,
            orgId,
          );
        case "tasks/get":
          return this.handleTaskGet(
            request.id,
            request.params as TaskQueryParams,
            orgId,
          );
        case "tasks/cancel":
          return this.handleTaskCancel(
            request.id,
            request.params as TaskCancelParams,
            orgId,
          );
        default:
          return this.errorResponse(request.id, {
            code: -32601,
            message: `Method not found: ${request.method}`,
          });
      }
    } catch (error) {
      console.error("A2A request error:", error);
      return this.errorResponse(request.id, {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      });
    }
  }

  /**
   * tasks/send - Create and start a task
   */
  private async handleTaskSend(
    requestId: string | number,
    params: TaskSendParams,
    orgId: string,
  ): Promise<JSONRPCResponse> {
    // Create task record
    const { data: task, error } = await supabaseAdmin
      .from("a2a_tasks")
      .insert({
        id: params.id || crypto.randomUUID(),
        org_id: orgId,
        session_id: params.sessionId,
        task_spec:
          params as unknown as Database["public"]["Tables"]["a2a_tasks"]["Insert"]["task_spec"],
        status: "submitted" as const,
        messages: [
          params.message,
        ] as unknown as Database["public"]["Tables"]["a2a_tasks"]["Insert"]["messages"],
        artifacts:
          [] as unknown as Database["public"]["Tables"]["a2a_tasks"]["Insert"]["artifacts"],
      })
      .select()
      .single();

    if (error) {
      return this.errorResponse(requestId, {
        code: -32603,
        message: `Failed to create task: ${error.message}`,
      });
    }

    // TODO: Dispatch to agent execution (Inngest job)
    // For now, mark as working
    await this.updateTaskStatus(task.id, "working");

    return {
      jsonrpc: "2.0",
      id: requestId,
      result: {
        id: task.id,
        sessionId: task.session_id || undefined,
        status: {
          state: "working",
          timestamp: new Date().toISOString(),
        },
        messages: task.messages as unknown as Message[],
        artifacts: [],
      },
    };
  }

  /**
   * tasks/get - Query task status
   */
  private async handleTaskGet(
    requestId: string | number,
    params: TaskQueryParams,
    orgId: string,
  ): Promise<JSONRPCResponse> {
    const { data: task, error } = await supabaseAdmin
      .from("a2a_tasks")
      .select("*")
      .eq("id", params.id)
      .eq("org_id", orgId)
      .single();

    if (error || !task) {
      return this.errorResponse(requestId, {
        code: -32001, // TASK_NOT_FOUND
        message: `Task not found: ${params.id}`,
      });
    }

    const messages = task.messages as unknown as Message[];
    const historyLength = params.historyLength ?? messages.length;

    return {
      jsonrpc: "2.0",
      id: requestId,
      result: {
        id: task.id,
        sessionId: task.session_id || undefined,
        status: {
          state: task.status as TaskState,
          timestamp: task.updated_at,
        },
        messages: messages.slice(-historyLength),
        artifacts: task.artifacts as unknown as Artifact[],
        history: messages,
      },
    };
  }

  /**
   * tasks/cancel - Cancel a running task
   */
  private async handleTaskCancel(
    requestId: string | number,
    params: TaskCancelParams,
    orgId: string,
  ): Promise<JSONRPCResponse> {
    const { data: task, error } = await supabaseAdmin
      .from("a2a_tasks")
      .select("*")
      .eq("id", params.id)
      .eq("org_id", orgId)
      .single();

    if (error || !task) {
      return this.errorResponse(requestId, {
        code: -32001, // TASK_NOT_FOUND
        message: `Task not found: ${params.id}`,
      });
    }

    // Check if task can be cancelled
    const cancelableStates: TaskState[] = [
      "submitted",
      "working",
      "input-required",
    ];
    if (!cancelableStates.includes(task.status as TaskState)) {
      return this.errorResponse(requestId, {
        code: -32002, // TASK_NOT_CANCELABLE
        message: `Task cannot be canceled in state: ${task.status}`,
      });
    }

    // Update status to canceled
    await this.updateTaskStatus(params.id, "canceled");

    return {
      jsonrpc: "2.0",
      id: requestId,
      result: {
        id: task.id,
        sessionId: task.session_id || undefined,
        status: {
          state: "canceled",
          timestamp: new Date().toISOString(),
        },
        messages: task.messages as unknown as Message[],
        artifacts: task.artifacts as unknown as Artifact[],
      },
    };
  }

  /**
   * Update task status in database
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskState,
    message?: Message,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (message) {
      // Append message to existing messages
      const { data: task } = await supabaseAdmin
        .from("a2a_tasks")
        .select("messages")
        .eq("id", taskId)
        .single();

      if (task) {
        const messages = task.messages as unknown as Message[];
        messages.push(message);
        update.messages = messages;
      }
    }

    await supabaseAdmin.from("a2a_tasks").update(update).eq("id", taskId);
  }

  /**
   * Add artifact to task
   */
  async addArtifact(taskId: string, artifact: Artifact): Promise<void> {
    const { data: task } = await supabaseAdmin
      .from("a2a_tasks")
      .select("artifacts")
      .eq("id", taskId)
      .single();

    if (task) {
      const artifacts = task.artifacts as unknown as Artifact[];

      // Handle append mode
      if (artifact.append && artifact.index !== undefined) {
        const existing = artifacts.find((a) => a.index === artifact.index);
        if (existing) {
          existing.parts.push(...artifact.parts);
          existing.lastChunk = artifact.lastChunk;
        } else {
          artifacts.push(artifact);
        }
      } else {
        artifacts.push(artifact);
      }

      await supabaseAdmin
        .from("a2a_tasks")
        .update({
          artifacts: artifacts as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskId);
    }
  }

  /**
   * Complete task with final result
   */
  async completeTask(
    taskId: string,
    result: unknown,
    finalMessage?: Message,
  ): Promise<void> {
    const update: Record<string, unknown> = {
      status: "completed",
      result,
      updated_at: new Date().toISOString(),
    };

    if (finalMessage) {
      const { data: task } = await supabaseAdmin
        .from("a2a_tasks")
        .select("messages")
        .eq("id", taskId)
        .single();

      if (task) {
        const messages = task.messages as unknown as Message[];
        messages.push(finalMessage);
        update.messages = messages;
      }
    }

    await supabaseAdmin.from("a2a_tasks").update(update).eq("id", taskId);
  }

  /**
   * Fail task with error
   */
  async failTask(taskId: string, errorMessage: string): Promise<void> {
    await supabaseAdmin
      .from("a2a_tasks")
      .update({
        status: "failed",
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);
  }

  /**
   * Create SSE stream for task updates
   */
  async *streamTask(
    taskId: string,
    orgId: string,
  ): AsyncGenerator<A2AStreamEvent> {
    // Initial status
    const { data: task } = await supabaseAdmin
      .from("a2a_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("org_id", orgId)
      .single();

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    yield {
      id: task.id,
      status: {
        state: task.status as TaskState,
        timestamp: task.updated_at,
      },
      final: false,
    } as TaskStatusUpdateEvent;

    // Poll for updates (in production, use Supabase Realtime)
    const terminalStates: TaskState[] = ["completed", "failed", "canceled"];
    let currentStatus = task.status as TaskState;

    while (!terminalStates.includes(currentStatus)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { data: updated } = await supabaseAdmin
        .from("a2a_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (updated && updated.status !== currentStatus) {
        currentStatus = updated.status as TaskState;
        yield {
          id: updated.id,
          status: {
            state: currentStatus,
            timestamp: updated.updated_at,
          },
          final: terminalStates.includes(currentStatus),
        } as TaskStatusUpdateEvent;
      }
    }
  }

  /**
   * Helper: Create error response
   */
  private errorResponse(
    id: string | number,
    error: JSONRPCError,
  ): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      id,
      error,
    };
  }
}

// Default server instance
let defaultServer: A2AServer | null = null;

export function getA2AServer(): A2AServer {
  if (!defaultServer) {
    defaultServer = new A2AServer({
      name: "Zero Headache AI Platform",
      version: "1.0.0",
      description:
        "Multi-agent AI platform for content creation, lead generation, and business automation",
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://zeroheadache.co",
      providerName: "Zero Headache",
      providerUrl: "https://zeroheadache.co",
      skills: [
        {
          id: "content-creation",
          name: "Content Creation",
          description:
            "Generate SEO-optimized articles, blog posts, and marketing content",
          inputModes: ["text"],
          outputModes: ["text"],
          tags: ["content", "seo", "marketing"],
        },
        {
          id: "lead-generation",
          name: "Lead Generation",
          description:
            "Discover and qualify potential leads using AI-powered web scraping",
          inputModes: ["text"],
          outputModes: ["text"],
          tags: ["leads", "sales", "outreach"],
        },
        {
          id: "partner-discovery",
          name: "Partner Discovery",
          description:
            "Find and evaluate potential business partners and affiliates",
          inputModes: ["text"],
          outputModes: ["text"],
          tags: ["partnerships", "affiliates", "business-development"],
        },
      ],
    });
  }
  return defaultServer;
}

