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
 * POST /api/agents/[agentId]/cancel
 *
 * Cancels an active or paused agent run.
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

    // Check if agent can be cancelled
    if (!["running", "paused"].includes(currentStatus)) {
      return NextResponse.json(
        {
          userMessage: `Cannot cancel agent with status: ${currentStatus}`,
          developerMessage: "Agent not active",
        },
        { status: 400 },
      );
    }

    // Send cancel event to Inngest
    await inngest.send({
      name: AGENT_EVENTS.CONTROL_CANCEL,
      data: {
        agentRunId: agentId,
        orgId,
        agentType,
        cancelledBy: user.id,
        cancelledAt: new Date().toISOString(),
      },
    });

    // Update activity metadata to reflect cancelled status
    await supabase
      .from("activities")
      .update({
        metadata: { ...metadata, status: "cancelled" },
      })
      .eq("id", agentId);

    // Log activity
    await supabase.from("activities").insert({
      org_id: orgId,
      actor_id: user.id,
      agent_type: agentType,
      action: "agent_cancelled",
      description: `Cancelled ${agentType} agent`,
      metadata: { agentRunId: agentId },
    });

    return NextResponse.json({
      success: true,
      agentId,
      status: "cancelled",
    });
  } catch (error) {
    console.error("Error cancelling agent:", error);
    return NextResponse.json(
      {
        userMessage: "Failed to cancel agent",
        developerMessage:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
