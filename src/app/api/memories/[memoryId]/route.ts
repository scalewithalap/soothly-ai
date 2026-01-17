/**
 * API Route: /api/memories/[memoryId]
 *
 * Get, update, or delete a specific memory.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ memoryId: string }>;
}

/**
 * GET /api/memories/[memoryId]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { memoryId } = await params;
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

    const { data, error } = await (supabase as any)
      .from("agent_memories")
      .select("*")
      .eq("id", memoryId)
      .eq("org_id", profile.org_id as string)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching memory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/memories/[memoryId]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { memoryId } = await params;
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

    const { error } = await (supabase as any)
      .from("agent_memories")
      .delete()
      .eq("id", memoryId)
      .eq("org_id", profile.org_id as string);

    if (error) {
      console.error("Error deleting memory:", error);
      return NextResponse.json(
        { error: "Failed to delete memory" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting memory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
