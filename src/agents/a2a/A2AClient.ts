/**
 * A2A Protocol Client
 * Connect to remote A2A-compatible agents
 */

import type {
  AgentCard,
  Task,
  TaskSendParams,
  Message,
  JSONRPCRequest,
  JSONRPCResponse,
  AuthConfig,
  A2AStreamEvent,
} from "./types";

export interface A2AClientConfig {
  /** Base URL of the remote agent */
  agentUrl: string;
  /** Authentication configuration */
  auth?: {
    type: "bearer" | "api_key";
    token: string;
    headerName?: string;
  };
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Client for connecting to remote A2A agents
 */
export class A2AClient {
  private config: A2AClientConfig;
  private agentCard: AgentCard | null = null;

  constructor(config: A2AClientConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Discover agent capabilities
   */
  async discoverAgent(): Promise<AgentCard> {
    if (this.agentCard) {
      return this.agentCard;
    }

    const wellKnownUrl = new URL(
      "/.well-known/agent.json",
      this.config.agentUrl,
    );

    const response = await fetch(wellKnownUrl.toString(), {
      method: "GET",
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      throw new Error(`Failed to discover agent: ${response.statusText}`);
    }

    this.agentCard = await response.json();
    return this.agentCard!;
  }

  /**
   * Send a task to the remote agent
   */
  async sendTask(params: TaskSendParams): Promise<Task> {
    const request: JSONRPCRequest<TaskSendParams> = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tasks/send",
      params,
    };

    const response = await this.rpcCall<Task>(request);
    return response;
  }

  /**
   * Query task status
   */
  async getTask(taskId: string, historyLength?: number): Promise<Task> {
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tasks/get",
      params: { id: taskId, historyLength },
    };

    return this.rpcCall<Task>(request);
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<Task> {
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tasks/cancel",
      params: { id: taskId },
    };

    return this.rpcCall<Task>(request);
  }

  /**
   * Stream task updates via SSE
   */
  async *streamTask(taskId: string): AsyncGenerator<A2AStreamEvent> {
    const streamUrl = new URL(
      `/api/a2a/tasks/${taskId}/stream`,
      this.config.agentUrl,
    );

    const response = await fetch(streamUrl.toString(), {
      method: "GET",
      headers: {
        ...this.getHeaders(),
        Accept: "text/event-stream",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to stream task: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return;
            }
            try {
              const event = JSON.parse(data) as A2AStreamEvent;
              yield event;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Wait for task completion (polling)
   */
  async waitForResult(
    taskId: string,
    options?: {
      pollIntervalMs?: number;
      timeoutMs?: number;
    },
  ): Promise<Task> {
    const pollInterval = options?.pollIntervalMs || 2000;
    const timeout = options?.timeoutMs || 300000; // 5 minutes
    const startTime = Date.now();

    const terminalStates = ["completed", "failed", "canceled"];

    while (Date.now() - startTime < timeout) {
      const task = await this.getTask(taskId);

      if (terminalStates.includes(task.status.state)) {
        return task;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Task ${taskId} timed out after ${timeout}ms`);
  }

  /**
   * Convenience: Send task and wait for result
   */
  async executeTask(message: Message): Promise<Task> {
    const taskId = crypto.randomUUID();
    await this.sendTask({
      id: taskId,
      message,
    });

    return this.waitForResult(taskId);
  }

  /**
   * Make JSON-RPC call
   */
  private async rpcCall<T>(request: JSONRPCRequest): Promise<T> {
    const apiUrl = new URL("/api/a2a", this.config.agentUrl);

    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      throw new Error(`RPC call failed: ${response.statusText}`);
    }

    const rpcResponse: JSONRPCResponse<T> = await response.json();

    if (rpcResponse.error) {
      throw new Error(
        `RPC error ${rpcResponse.error.code}: ${rpcResponse.error.message}`,
      );
    }

    return rpcResponse.result as T;
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.auth) {
      const { type, token, headerName } = this.config.auth;

      if (type === "bearer") {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (type === "api_key") {
        headers[headerName || "X-API-Key"] = token;
      }
    }

    return headers;
  }
}

/**
 * Create A2A client for a remote agent
 */
export function createA2AClient(
  agentUrl: string,
  authToken?: string,
): A2AClient {
  return new A2AClient({
    agentUrl,
    auth: authToken
      ? {
          type: "bearer",
          token: authToken,
        }
      : undefined,
  });
}
