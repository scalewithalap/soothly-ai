/**
 * API Route: /api/tools
 *
 * List available MCP tools and execute tool calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getToolRegistry, registerBuiltinTools } from "@/lib/agents/tools";
import type { ToolExecutionContext } from "@/lib/agents/tools";

// Ensure built-in tools are registered
registerBuiltinTools();

/**
 * GET /api/tools
 *
 * List all available tools and their schemas.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const registry = getToolRegistry();
    const tools = registry.list();

    // Return tool definitions without handlers
    const toolDefs = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      category: tool.category,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
      requiredPermissions: tool.requiredPermissions,
    }));

    return NextResponse.json({
      tools: toolDefs,
      count: toolDefs.length,
    });
  } catch (error) {
    console.error("Error listing tools:", error);
    return NextResponse.json(
      { error: "Failed to list tools" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/tools
 *
 * Execute a tool call.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's org_id (cast to any for untyped profiles table)
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { toolName, input, timeout } = body as {
      toolName: string;
      input: unknown;
      timeout?: number;
    };

    if (!toolName) {
      return NextResponse.json(
        { error: "toolName is required" },
        { status: 400 },
      );
    }

    const registry = getToolRegistry();

    if (!registry.has(toolName)) {
      return NextResponse.json(
        { error: `Tool "${toolName}" not found` },
        { status: 404 },
      );
    }

    // Build execution context
    const context: ToolExecutionContext = {
      orgId: profile.org_id,
      userId: user.id,
      traceId: crypto.randomUUID(),
      metadata: {
        source: "api",
        ip: request.headers.get("x-forwarded-for") || "unknown",
      },
    };

    // Execute the tool
    const response = await registry.execute({
      toolName,
      input,
      context,
      timeout,
    });

    return NextResponse.json({
      ...response,
      traceId: context.traceId,
    });
  } catch (error) {
    console.error("Error executing tool:", error);
    return NextResponse.json(
      { error: "Failed to execute tool" },
      { status: 500 },
    );
  }
}
