/**
 * API Route: /api/memories/search
 *
 * Semantic search across agent memories.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/memories/search
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

    // Cast to any for untyped profiles table
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
    const {
      query,
      limit = 50,
      agentType,
      memoryType,
    } = body as {
      query: string;
      limit?: number;
      agentType?: string;
      memoryType?: string;
    };

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // For now, do a simple text search
    // TODO: Implement vector similarity search when embeddings are available
    let dbQuery = (supabase as any)
      .from("agent_memories")
      .select("*")
      .eq("org_id", profile.org_id)
      .ilike("content", `%${query}%`)
      .order("importance", { ascending: false })
      .limit(Math.min(limit, 100));

    if (agentType) {
      dbQuery = dbQuery.eq("agent_type", agentType);
    }
    if (memoryType) {
      dbQuery = dbQuery.eq("memory_type", memoryType);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    return NextResponse.json({
      memories: data || [],
      query,
    });
  } catch (error) {
    console.error("Error in memory search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

