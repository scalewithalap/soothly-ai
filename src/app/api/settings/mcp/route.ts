import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateMCPServerSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  transport: z.enum(["stdio", "sse", "websocket"]).default("sse"),
  auth_type: z
    .enum(["none", "api_key", "bearer", "basic"])
    .nullable()
    .optional(),
  credentials: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).optional(),
});

const UpdateMCPServerSchema = CreateMCPServerSchema.partial();

/**
 * GET /api/settings/mcp - List all MCP servers for the organization
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    // Get user's org
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

    // Fetch MCP servers
    const { data: servers, error } = await supabase
      .from("mcp_servers")
      .select(
        `
        id,
        name,
        url,
        transport,
        auth_type,
        enabled,
        health_status,
        last_health_check,
        metadata,
        created_at,
        updated_at
      `,
      )
      .eq("org_id", userData.org_id)
      .order("name");

    if (error) {
      console.error("Failed to fetch MCP servers:", error);
      return NextResponse.json(
        { error: "internal/fetch_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ servers: servers || [] });
  } catch (error) {
    console.error("MCP servers API error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/mcp - Create a new MCP server
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

    const body = await request.json();
    const parseResult = CreateMCPServerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "validation/invalid_input",
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { credentials, ...serverData } = parseResult.data;

    const { data: server, error } = await supabase
      .from("mcp_servers")
      .insert({
        org_id: userData.org_id,
        ...serverData,
        credentials_encrypted: credentials || null,
        health_status: "unknown",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create MCP server:", error);
      return NextResponse.json(
        { error: "internal/create_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ server }, { status: 201 });
  } catch (error) {
    console.error("MCP server create error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings/mcp - Update an MCP server
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

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

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "validation/missing_id" },
        { status: 400 },
      );
    }

    const parseResult = UpdateMCPServerSchema.safeParse(updates);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "validation/invalid_input",
          details: parseResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { credentials, ...serverData } = parseResult.data;
    const updatePayload: Record<string, unknown> = { ...serverData };

    // Only update credentials if explicitly provided (not masked)
    if (credentials && !credentials.includes("••••")) {
      updatePayload.credentials_encrypted = credentials;
    }

    const { data: server, error } = await supabase
      .from("mcp_servers")
      .update(updatePayload)
      .eq("id", id)
      .eq("org_id", userData.org_id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update MCP server:", error);
      return NextResponse.json(
        { error: "internal/update_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ server });
  } catch (error) {
    console.error("MCP server update error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/settings/mcp - Delete an MCP server
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "validation/missing_id" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("mcp_servers")
      .delete()
      .eq("id", id)
      .eq("org_id", userData.org_id);

    if (error) {
      console.error("Failed to delete MCP server:", error);
      return NextResponse.json(
        { error: "internal/delete_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MCP server delete error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}

