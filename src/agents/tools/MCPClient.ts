/**
 * MCP Client
 *
 * Client for connecting to external MCP servers.
 * Supports WebSocket and HTTP transports.
 */

import {
  type MCPServerConfig,
  type MCPServerCapabilities,
  type MCPTool,
  type MCPToolResult,
  type MCPResource,
  type MCPPrompt,
  type ToolExecutionContext,
  MCPErrorCodes,
} from "./types";

// Message types for MCP protocol
interface MCPRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface MCPNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export class MCPClient {
  private config: MCPServerConfig;
  private socket: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests: Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private isConnected = false;
  private capabilities: MCPServerCapabilities | null = null;
  private cachedTools: MCPTool[] = [];
  private cachedResources: MCPResource[] = [];

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<MCPServerCapabilities> {
    if (this.config.transport === "websocket") {
      return this.connectWebSocket();
    } else if (this.config.transport === "http") {
      return this.connectHTTP();
    } else {
      throw new Error(`Unsupported transport: ${this.config.transport}`);
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.capabilities = null;
    this.pendingRequests.forEach((req) => {
      clearTimeout(req.timeout);
      req.reject(new Error("Connection closed"));
    });
    this.pendingRequests.clear();
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): MCPServerCapabilities | null {
    return this.capabilities;
  }

  /**
   * List available tools from the server
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    if (this.cachedTools.length > 0) {
      return this.cachedTools;
    }

    const response = await this.sendRequest("tools/list", {});
    const rawTools = (response as { tools: unknown[] }).tools || [];

    // Convert server tools to our MCPTool format
    // Using any to handle external server response format flexibility
    this.cachedTools = rawTools.map((t: any) => ({
      name: String(t.name),
      description: String(t.description || ""),
      inputSchema: (t.inputSchema || { type: "object" }) as any,
      annotations: t.annotations,
      // Create a handler that proxies to the remote server
      handler: async (input: unknown, context: ToolExecutionContext) => {
        return this.callTool(String(t.name), input, context);
      },
    })) as MCPTool[];

    return this.cachedTools;
  }

  /**
   * Call a tool on the remote server
   */
  async callTool(
    name: string,
    input: unknown,
    _context: ToolExecutionContext,
  ): Promise<MCPToolResult> {
    if (!this.isConnected) {
      return {
        content: [
          {
            type: "error",
            code: MCPErrorCodes.SERVER_UNAVAILABLE,
            message: "Not connected to MCP server",
          },
        ],
        isError: true,
      };
    }

    try {
      const response = await this.sendRequest("tools/call", {
        name,
        arguments: input,
      });

      return response as MCPToolResult;
    } catch (error) {
      return {
        content: [
          {
            type: "error",
            code: MCPErrorCodes.EXECUTION_FAILED,
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * List available resources from the server
   */
  async listResources(): Promise<MCPResource[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    if (this.cachedResources.length > 0) {
      return this.cachedResources;
    }

    const response = await this.sendRequest("resources/list", {});
    this.cachedResources =
      (response as { resources: MCPResource[] }).resources || [];

    return this.cachedResources;
  }

  /**
   * Read a resource from the server
   */
  async readResource(uri: string): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.sendRequest("resources/read", { uri });
    return (response as { contents: unknown[] }).contents;
  }

  /**
   * List available prompts from the server
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.sendRequest("prompts/list", {});
    return (response as { prompts: MCPPrompt[] }).prompts || [];
  }

  /**
   * Get a prompt from the server
   */
  async getPrompt(
    name: string,
    args?: Record<string, string>,
  ): Promise<{ messages: unknown[] }> {
    if (!this.isConnected) {
      throw new Error("Not connected to MCP server");
    }

    const response = await this.sendRequest("prompts/get", {
      name,
      arguments: args,
    });
    return response as { messages: unknown[] };
  }

  // Private methods

  private async connectWebSocket(): Promise<MCPServerCapabilities> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.config.url);

        // Add auth if configured
        if (this.config.auth) {
          if (this.config.auth.type === "bearer") {
            url.searchParams.set("token", this.config.auth.credentials);
          }
        }

        this.socket = new WebSocket(url.toString());

        this.socket.onopen = async () => {
          try {
            // Perform initialization handshake
            const initResult = await this.sendRequest("initialize", {
              protocolVersion: "2024-11-05",
              capabilities: {
                tools: {},
                resources: {},
                prompts: {},
              },
              clientInfo: {
                name: "ZeroHeadache",
                version: "1.0.0",
              },
            });

            this.capabilities =
              (initResult as { capabilities: MCPServerCapabilities })
                .capabilities || {};
            this.isConnected = true;

            // Send initialized notification
            this.sendNotification("notifications/initialized", {});

            resolve(this.capabilities);
          } catch (error) {
            reject(error);
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as MCPResponse;
            this.handleMessage(message);
          } catch {
            console.error("Failed to parse MCP message:", event.data);
          }
        };

        this.socket.onerror = () => {
          reject(new Error(`WebSocket connection failed`));
        };

        this.socket.onclose = () => {
          this.isConnected = false;
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async connectHTTP(): Promise<MCPServerCapabilities> {
    // For HTTP transport, perform initialization request
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.auth) {
      if (this.config.auth.type === "bearer") {
        headers["Authorization"] = `Bearer ${this.config.auth.credentials}`;
      } else if (this.config.auth.type === "api_key") {
        headers["X-API-Key"] = this.config.auth.credentials;
      }
    }

    const response = await fetch(`${this.config.url}/initialize`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.requestId++,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "ZeroHeadache",
            version: "1.0.0",
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP initialization failed: ${response.statusText}`);
    }

    const result = (await response.json()) as MCPResponse;
    if (result.error) {
      throw new Error(result.error.message);
    }

    this.capabilities =
      (result.result as { capabilities: MCPServerCapabilities }).capabilities ||
      {};
    this.isConnected = true;

    return this.capabilities;
  }

  private async sendRequest(
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const id = this.requestId++;

    if (this.config.transport === "http") {
      return this.sendHTTPRequest(method, params, id);
    }

    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const request: MCPRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout for ${method}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.socket.send(JSON.stringify(request));
    });
  }

  private async sendHTTPRequest(
    method: string,
    params: Record<string, unknown>,
    id: number,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.auth) {
      if (this.config.auth.type === "bearer") {
        headers["Authorization"] = `Bearer ${this.config.auth.credentials}`;
      } else if (this.config.auth.type === "api_key") {
        headers["X-API-Key"] = this.config.auth.credentials;
      }
    }

    const response = await fetch(this.config.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP request failed: ${response.statusText}`);
    }

    const result = (await response.json()) as MCPResponse;
    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.result;
  }

  private sendNotification(
    method: string,
    params: Record<string, unknown>,
  ): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const notification: MCPNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    this.socket.send(JSON.stringify(notification));
  }

  private handleMessage(message: MCPResponse): void {
    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.id);

    if (message.error) {
      pending.reject(new Error(message.error.message));
    } else {
      pending.resolve(message.result);
    }
  }
}

/**
 * MCP Client Manager
 *
 * Manages multiple MCP server connections.
 */
export class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();
  private configs: Map<string, MCPServerConfig> = new Map();
  private static instance: MCPClientManager | null = null;

  private constructor() {}

  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  /**
   * Add a server configuration
   */
  addServer(config: MCPServerConfig): void {
    this.configs.set(config.id, config);
  }

  /**
   * Remove a server
   */
  removeServer(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      client.disconnect();
      this.clients.delete(id);
    }
    this.configs.delete(id);
  }

  /**
   * Get or create a client for a server
   */
  async getClient(serverId: string): Promise<MCPClient> {
    const existing = this.clients.get(serverId);
    if (existing?.connected) {
      return existing;
    }

    const config = this.configs.get(serverId);
    if (!config) {
      throw new Error(`Server "${serverId}" not configured`);
    }

    if (!config.enabled) {
      throw new Error(`Server "${serverId}" is disabled`);
    }

    const client = new MCPClient(config);
    await client.connect();
    this.clients.set(serverId, client);

    return client;
  }

  /**
   * List all configured servers
   */
  listServers(): MCPServerConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * List all connected clients
   */
  listConnectedServers(): string[] {
    return Array.from(this.clients.entries())
      .filter(([, client]) => client.connected)
      .map(([id]) => id);
  }

  /**
   * Disconnect all clients
   */
  disconnectAll(): void {
    this.clients.forEach((client) => client.disconnect());
    this.clients.clear();
  }
}

export const getMCPClientManager = MCPClientManager.getInstance;

