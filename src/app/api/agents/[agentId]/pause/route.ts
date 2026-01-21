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
 * POST /api/agents/[agentId]/pause
 *
 * Pauses an active agent run via Inngest.
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

    // Get agent run details - use a2a_tasks or activities table instead
    // For now, we'll use activities to track agent runs
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

    // Check if agent can be paused
    if (currentStatus !== "running") {
      return NextResponse.json(
        {
          userMessage: `Cannot pause agent with status: ${currentStatus}`,
          developerMessage: "Agent not running",
        },
        { status: 400 },
      );
    }

    // Send pause event to Inngest
    await inngest.send({
      name: AGENT_EVENTS.CONTROL_PAUSE,
      data: {
        agentRunId: agentId,
        orgId,
        agentType,
        pausedBy: user.id,
        pausedAt: new Date().toISOString(),
      },
    });

    // Update activity metadata to reflect paused status
    await supabase
      .from("activities")
      .update({
        metadata: { ...metadata, status: "paused" },
      })
      .eq("id", agentId);

    // Log activity
    await supabase.from("activities").insert({
      org_id: orgId,
      actor_id: user.id,
      agent_type: agentType,
      action: "agent_paused",
      description: `Paused ${agentType} agent`,
      metadata: { agentRunId: agentId },
    });

    return NextResponse.json({
      success: true,
      agentId,
      status: "paused",
    });
  } catch (error) {
    console.error("Error pausing agent:", error);
    return NextResponse.json(
      {
        userMessage: "Failed to pause agent",
        developerMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
