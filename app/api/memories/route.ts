/**
 * API Route: /api/memories
 *
 * List and manage agent memories.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Type for memory records
interface MemoryRecord {
  id: string;
  memory_type: "episodic" | "semantic" | "procedural";
  agent_type: string;
  content: unknown;
  created_at: string;
}

/**
 * GET /api/memories
 *
 * List memories with optional filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's org_id
    const { data: profile } = await (supabase as unknown as SupabaseClient)
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

    const url = new URL(request.url);
    const agentType = url.searchParams.get("agent_type");
    const memoryType = url.searchParams.get("memory_type");
    const limit = parseInt(url.searchParams.get("limit") || "100");

    // Build query for the agent_memories table
    let query = (supabase as unknown as SupabaseClient)
      .from("agent_memories")
      .select("*")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 500));

    if (agentType) {
      query = query.eq("agent_type", agentType);
    }
    if (memoryType) {
      query = query.eq("memory_type", memoryType);
    }

    const { data, error } = (await query) as {
      data: MemoryRecord[] | null;
      error: unknown;
    };

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch memories" },
        { status: 500 },
      );
    }

    // Calculate stats
    const stats = {
      total: data?.length || 0,
      byType: {
        episodic:
          data?.filter((m: MemoryRecord) => m.memory_type === "episodic")
            .length || 0,
        semantic:
          data?.filter((m: MemoryRecord) => m.memory_type === "semantic")
            .length || 0,
        procedural:
          data?.filter((m: MemoryRecord) => m.memory_type === "procedural")
            .length || 0,
      },
      byAgent: (data || []).reduce(
        (acc: Record<string, number>, m: MemoryRecord) => {
          acc[m.agent_type] = (acc[m.agent_type] || 0) + 1;
          return acc;
        },
        {},
      ),
    };

    return NextResponse.json({
      memories: data || [],
      stats,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
