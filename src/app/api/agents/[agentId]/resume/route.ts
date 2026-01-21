import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";
import { AGENT_EVENTS } from "@/inngest/events";
import type { SupabaseClient } from "@supabase/supabase-js";

// Use untyped client for tables not in generated schema
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

/**
 * POST /api/agents/[agentId]/resume
 *
 * Resumes a paused agent run via Inngest.
 * Per frontend-design/SKILL.md: "Users must be able to 'Pause' an active agent"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;

  try {
    const supabase = getUntypedClient();

    // Get current user session
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        {
          userMessage: "Authentication required",
          developerMessage: "No user session",
        },
        { status: 401 },
      );
    }

    // Get agent run details from activities table
    const { data: agentRun, error: fetchError } = await supabase
      .from("activities")
      .select("id, org_id, agent_type, metadata")
      .eq("id", agentId)
      .single();

    if (fetchError || !agentRun) {
      return NextResponse.json(
        {
          userMessage: "Agent run not found",
          developerMessage: fetchError?.message,
        },
        { status: 404 },
      );
    }

    const orgId = agentRun.org_id;
    const agentType = agentRun.agent_type;
    const metadata = (agentRun.metadata as Record<string, unknown>) || {};
    const currentStatus = (metadata.status as string) || "running";

    // Check if agent can be resumed
    if (currentStatus !== "paused") {
      return NextResponse.json(
        {
          userMessage: `Cannot resume agent with status: ${currentStatus}`,
          developerMessage: "Agent not paused",
        },
        { status: 400 },
      );
    }

    // Send resume event to Inngest
    await inngest.send({
      name: AGENT_EVENTS.CONTROL_RESUME,
      data: {
        agentRunId: agentId,
        orgId,
        agentType,
        resumedBy: user.id,
        resumedAt: new Date().toISOString(),
      },
    });

    // Update activity metadata to reflect running status
    await supabase
      .from("activities")
      .update({
        metadata: { ...metadata, status: "running" },
      })
      .eq("id", agentId);

    // Log activity
    await supabase.from("activities").insert({
      org_id: orgId,
      actor_id: user.id,
      agent_type: agentType,
      action: "agent_resumed",
      description: `Resumed ${agentType} agent`,
      metadata: { agentRunId: agentId },
    });

    return NextResponse.json({
      success: true,
      agentId,
      status: "running",
    });
  } catch (error) {
    console.error("Error resuming agent:", error);
    return NextResponse.json(
      {
        userMessage: "Failed to resume agent",
        developerMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
