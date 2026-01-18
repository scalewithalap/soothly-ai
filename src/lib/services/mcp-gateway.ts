/**
 * MCP Gateway Service
 *
 * Handles connections to user-configured MCP (Model Context Protocol) servers
 * for extensibility and external tool integration.
 */

import { createClient } from "@/lib/supabase/server";

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  transport: "stdio" | "sse" | "websocket";
  authType: "none" | "api_key" | "bearer" | "basic" | null;
  enabled: boolean;
  healthStatus: "healthy" | "degraded" | "unhealthy" | "unknown";
}

export interface MCPToolCall {
  serverId: string;
  toolName: string;
  params: Record<string, unknown>;
}

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * MCP Gateway class for managing connections to MCP servers
 */
export class MCPGateway {
  private orgId: string;
  private connections: Map<string, unknown> = new Map();

  constructor(orgId: string) {
    this.orgId = orgId;
  }

  /**
   * Get all configured MCP servers for the organization
   */
  async listServers(): Promise<MCPServer[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("mcp_servers")
      .select("id, name, url, transport, auth_type, enabled, health_status")
      .eq("org_id", this.orgId)
      .order("name");

    if (error) {
      console.error("Failed to fetch MCP servers:", error);
      return [];
    }

    return data.map((server) => ({
      id: server.id,
      name: server.name,
      url: server.url,
      transport: server.transport as MCPServer["transport"],
      authType: server.auth_type as MCPServer["authType"],
      enabled: server.enabled ?? true,
      healthStatus: server.health_status as MCPServer["healthStatus"],
    }));
  }

  /**
   * Validate connection to an MCP server
   */
  async validateConnection(serverId: string): Promise<boolean> {
    const supabase = await createClient();

    const { data: server, error } = await supabase
      .from("mcp_servers")
      .select("url, transport, auth_type, credentials_encrypted")
      .eq("id", serverId)
      .eq("org_id", this.orgId)
      .single();

    if (error || !server) {
      console.error("MCP server not found:", error);
      return false;
    }

    try {
      // Perform health check based on transport type
      // TODO: Implement actual MCP protocol handshake
      const response = await fetch(server.url, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });

      const isHealthy = response.ok;

      // Update health status
      await supabase
        .from("mcp_servers")
        .update({
          health_status: isHealthy ? "healthy" : "unhealthy",
          last_health_check: new Date().toISOString(),
        })
        .eq("id", serverId);

      return isHealthy;
    } catch (err) {
      console.error("MCP health check failed:", err);

      await supabase
        .from("mcp_servers")
        .update({
          health_status: "unhealthy",
          last_health_check: new Date().toISOString(),
        })
        .eq("id", serverId);

      return false;
    }
  }

  /**
   * Invoke a tool on an MCP server
   */
  async invoke(call: MCPToolCall): Promise<MCPToolResult> {
    const supabase = await createClient();

    const { data: server, error } = await supabase
      .from("mcp_servers")
      .select("url, transport, auth_type, credentials_encrypted, enabled")
      .eq("id", call.serverId)
      .eq("org_id", this.orgId)
      .single();

    if (error || !server) {
      return {
        success: false,
        error: "MCP server not found",
      };
    }

    if (!server.enabled) {
      return {
        success: false,
        error: "MCP server is disabled",
      };
    }

    try {
      // TODO: Implement actual MCP protocol for tool invocation
      // This is a placeholder that will be replaced with proper MCP client
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add auth headers based on auth type
      if (server.auth_type === "bearer" && server.credentials_encrypted) {
        // TODO: Decrypt credentials using Supabase Vault
        headers["Authorization"] = `Bearer ${server.credentials_encrypted}`;
      } else if (
        server.auth_type === "api_key" &&
        server.credentials_encrypted
      ) {
        headers["X-API-Key"] = server.credentials_encrypted;
      }

      const response = await fetch(`${server.url}/tools/${call.toolName}`, {
        method: "POST",
        headers,
        body: JSON.stringify(call.params),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`MCP call failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
      };
    } catch (err) {
      console.error("MCP invocation failed:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * Cleanup connections
   */
  async cleanup(): Promise<void> {
    this.connections.clear();
  }
}

