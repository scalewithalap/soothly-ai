import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAgentStream, createStreamResponse } from "@/lib/ai/agent-stream";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { AppError, handleApiError } from "@/lib/errors";
import type { AgentType } from "@/agents/base/types";

// Validate request body
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        url: z.string().url(),
        type: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
});

// Valid agent types
const VALID_AGENT_TYPES: AgentType[] = [
  "leads",
  "content",
  "partners",
  "contracts",
  "compliance",
  "receivables",
  "spend",
  "pricing",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
    const { agentId } = await params;

    // Validate agent type
    if (!VALID_AGENT_TYPES.includes(agentId as AgentType)) {
      return AppError.invalidAgentType(agentId).toResponse();
    }

    const agentType = agentId as AgentType;

    // Use RBAC middleware
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;

    const { orgId } = authResult;
    const supabase = await createClient();

    // Validate request body
    const body = await request.json();
    const parseResult = ChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return AppError.invalidInput({
        issues: parseResult.error.issues,
      }).toResponse();
    }

    const { message, attachments } = parseResult.data;

    // Create agent task record
    const { data: task, error: taskError } = await supabase
      .from("agent_tasks")
      .insert({
        org_id: orgId,
        agent_type: agentType,
        action: "chat",
        status: "running",
        params: { message, attachments },
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (taskError) {
      throw AppError.databaseError("Failed to create agent task");
    }

    // Save user message
    const { error: userMsgError } = await supabase
      .from("agent_messages")
      .insert({
        org_id: orgId,
        agent_type: agentType,
        task_id: task.id,
        role: "user",
        content: message,
        attachments: attachments || [],
      });

    if (userMsgError) {
      console.error("Failed to save user message:", userMsgError);
    }

    // Create async generator for response (placeholder - integrate with actual LLM)
    async function* generateResponse(): AsyncGenerator<string, void, unknown> {
      // TODO: Replace with actual LLM call using agent configuration
      const response = `I'm the ${agentType} agent. I received your message: "${message.slice(0, 50)}${message.length > 50 ? "..." : ""}". ${attachments?.length ? `I also see ${attachments.length} attachment(s).` : ""} This is a placeholder response that will be replaced with actual AI processing.`;

      // Simulate streaming
      const words = response.split(" ");
      for (const word of words) {
        yield word + " ";
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    // Track accumulated content for async save
    let totalTokens = 0;

    // Create the stream
    const stream = createAgentStream(generateResponse(), {
      agentType,
      taskId: task.id,
      orgId,
      onTokenCount: (tokens) => {
        totalTokens = tokens;
      },
    });

    // Use waitUntil to persist after response completes
    const waitUntil = (
      request as unknown as { waitUntil?: (promise: Promise<void>) => void }
    ).waitUntil;

    if (waitUntil) {
      waitUntil(
        (async () => {
          // Wait for stream to complete by reading it (this happens client-side)
          // This is a simplified version - in production, use a more robust approach
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Update task status
          await supabase
            .from("agent_tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              credits_consumed: Math.ceil(totalTokens / 100), // 1 credit per 100 tokens
            })
            .eq("id", task.id);
        })(),
      );
    }

    return createStreamResponse(stream);
  } catch (error) {
    return handleApiError(error);
  }
}
