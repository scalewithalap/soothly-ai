import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const TestConnectionSchema = z.object({
  url: z.string().url(),
  transport: z.enum(["stdio", "sse", "websocket"]).default("sse"),
  auth_type: z
    .enum(["none", "api_key", "bearer", "basic"])
    .nullable()
    .optional(),
  credentials: z.string().optional().nullable(),
});

interface MCPHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  protocol?: string;
  version?: string;
  tools?: string[];
  error?: string;
}

/**
 * POST /api/settings/mcp/test - Test connection to an MCP server
 * Can test saved servers by ID or new connection by URL
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // If ID provided, fetch server details
    let connectionConfig: {
      url: string;
      transport: string;
      auth_type: string | null;
      credentials: string | null;
    };

    if (body.id) {
      // Test existing server
      const { data: userData } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!userData?.org_id) {
        return NextResponse.json(
          { error: "auth/no_organization" },
          { status: 403 },
        );
      }

      const { data: server, error } = await supabase
        .from("mcp_servers")
        .select("url, transport, auth_type, credentials_encrypted")
        .eq("id", body.id)
        .eq("org_id", userData.org_id)
        .single();

      if (error || !server) {
        return NextResponse.json(
          { error: "mcp/server_not_found" },
          { status: 404 },
        );
      }

      connectionConfig = {
        url: server.url,
        transport: server.transport,
        auth_type: server.auth_type,
        credentials: server.credentials_encrypted,
      };
    } else {
      // Test new connection
      const parseResult = TestConnectionSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: "validation/invalid_input",
            details: parseResult.error.issues,
          },
          { status: 400 },
        );
      }

      connectionConfig = {
        url: parseResult.data.url,
        transport: parseResult.data.transport,
        auth_type: parseResult.data.auth_type || null,
        credentials: parseResult.data.credentials || null,
      };
    }

    // Perform connection test
    const healthResult = await testMCPConnection(connectionConfig);

    // Update health status if testing existing server
    if (body.id) {
      const { data: userData } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (userData?.org_id) {
        await supabase
          .from("mcp_servers")
          .update({
            health_status: healthResult.status,
            last_health_check: new Date().toISOString(),
          })
          .eq("id", body.id)
          .eq("org_id", userData.org_id);
      }
    }

    return NextResponse.json({ result: healthResult });
  } catch (error) {
    console.error("MCP connection test error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}

/**
 * Test MCP server connection
 */
async function testMCPConnection(config: {
  url: string;
  transport: string;
  auth_type: string | null;
  credentials: string | null;
}): Promise<MCPHealthResponse> {
  const startTime = Date.now();

  try {
    // Build headers
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (config.auth_type === "bearer" && config.credentials) {
      headers["Authorization"] = `Bearer ${config.credentials}`;
    } else if (config.auth_type === "api_key" && config.credentials) {
      headers["X-API-Key"] = config.credentials;
    } else if (config.auth_type === "basic" && config.credentials) {
      headers["Authorization"] =
        `Basic ${Buffer.from(config.credentials).toString("base64")}`;
    }

    // Attempt health check based on transport
    if (config.transport === "sse" || config.transport === "websocket") {
      // Try common MCP endpoints
      const endpoints = ["/health", "/mcp/health", "/info", "/"];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${config.url}${endpoint}`, {
            method: "GET",
            headers,
            signal: AbortSignal.timeout(10000),
          });

          const latency = Date.now() - startTime;

          if (response.ok) {
            let data: Record<string, unknown> = {};
            try {
              data = await response.json();
            } catch {
              // Response may not be JSON
            }

            return {
              status: "healthy",
              latency,
              protocol: (data.protocol as string) || "MCP",
              version: (data.version as string) || "unknown",
              tools: Array.isArray(data.tools) ? data.tools : undefined,
            };
          }
        } catch {
          // Try next endpoint
          continue;
        }
      }

      // If no endpoints worked, try a simple HEAD request
      const response = await fetch(config.url, {
        method: "HEAD",
        headers,
        signal: AbortSignal.timeout(10000),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          status: "degraded",
          latency,
          protocol: "HTTP",
          version: "unknown",
        };
      }

      return {
        status: "unhealthy",
        latency,
        error: `Server returned ${response.status}`,
      };
    } else {
      // stdio transport - can't test remotely
      return {
        status: "healthy",
        latency: 0,
        protocol: "stdio",
        version: "unknown",
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;

    return {
      status: "unhealthy",
      latency,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

