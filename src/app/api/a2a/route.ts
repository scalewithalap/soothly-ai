/**
 * A2A Protocol API Route
 * JSON-RPC endpoint for A2A protocol
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getA2AServer } from "@/agents/a2a";
import type { JSONRPCRequest } from "@/agents/a2a/types";

// JSON-RPC request schema
const jsonRpcSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/a2a
 * Handle JSON-RPC requests
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32000, message: "Unauthorized" },
        },
        { status: 401 },
      );
    }

    // Get org_id
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32000, message: "No organization found" },
        },
        { status: 400 },
      );
    }

    // Parse request
    const body = await request.json();
    const parseResult = jsonRpcSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        },
        { status: 400 },
      );
    }

    // Handle request
    const server = getA2AServer();
    const response = await server.handleRequest(
      parseResult.data as JSONRPCRequest,
      userData.org_id,
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("A2A API error:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : "Internal error",
        },
      },
      { status: 500 },
    );
  }
}
