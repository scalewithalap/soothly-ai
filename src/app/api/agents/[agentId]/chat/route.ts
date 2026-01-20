/**
 * Agent Chat API Route
 *
 * @route POST /api/agents/[agentId]/chat
 * @description Streams AI responses for agent conversations.
 *              Supports all 8 agent types plus Superagent.
 *
 * @security Requires authentication. Superagent requires yearly plan.
 *
 * @param {string} agentId - Agent type (lead_gen, seo, partnership, etc.)
 *
 * @requestBody
 * ```typescript
 * {
 *   message: string;      // User message (1-10000 chars)
 *   attachments?: Array<{
 *     id: string;
 *     url: string;        // Valid URL
 *     type: string;
 *     name: string;
 *   }>;
 * }
 * ```
 *
 * @response Streaming text/event-stream with AI response chunks
 *
 * @errors
 * - 400: Invalid agent type or request body
 * - 401: Unauthorized
 * - 403: Superagent requires yearly plan
 * - 500: Internal server error
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAgentStream, createStreamResponse } from "@/lib/ai/agent-stream";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { AppError, handleApiError } from "@/lib/errors";
import { getSystemPromptWithFallback, isSuperagent } from "@/agents/prompts";
import { getOpenAI } from "@/lib/ai";
import { createKnowledgeBase } from "@/lib/ai/knowledge-base";
import type { AgentType, AnyAgentType } from "@/agents/base/types";
import { normalizeAgentType } from "@/agents/base/types";

/**
 * Request body validation schema
 * @see https://zod.dev for schema documentation
 */
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

// Valid agent types per agents-ecosystem.md (including superagent)
const VALID_AGENT_TYPES: AgentType[] = [
  "lead_gen",
  "seo",
  "partnership",
  "proposal",
  "competitor_intel",
  "revenue_recovery",
  "onboarding",
  "customer_success",
  "superagent",
];

// Legacy agent types for backwards compatibility
const LEGACY_AGENT_TYPES = [
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

    // Validate agent type (accept both new and legacy types)
    const isValidNew = VALID_AGENT_TYPES.includes(agentId as AgentType);
    const isValidLegacy = LEGACY_AGENT_TYPES.includes(agentId);
    if (!isValidNew && !isValidLegacy) {
      return AppError.invalidAgentType(agentId).toResponse();
    }

    // Normalize to new type if legacy was provided
    const agentType = normalizeAgentType(agentId as AnyAgentType);

    // Use RBAC middleware
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;

    const { orgId } = authResult;
    const supabase = await createClient();

    // Check yearly subscription for Superagent (per pricing-strategy.md)
    // The Superagent capability is **strictly** gated by billing_interval === 'year'
    if (isSuperagent(agentType)) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("billing_interval")
        .eq("id", orgId)
        .single();

      // Superagent requires yearly billing interval per pricing-strategy.md
      if (orgData?.billing_interval !== "year") {
        return AppError.subscriptionRequired(
          "The Superagent feature requires a Yearly plan.",
        ).toResponse();
      }
    }

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

    // Get the system prompt for this agent
    const systemPrompt = getSystemPromptWithFallback(agentType);

    // For Superagent, fetch RAG context from knowledge base
    let ragContext = "";
    if (isSuperagent(agentType)) {
      try {
        const kb = createKnowledgeBase(orgId);
        ragContext = await kb.getContext(message, {
          limit: 5,
          threshold: 0.65,
        });
      } catch (ragError) {
        console.error("RAG context fetch failed:", ragError);
        // Continue without RAG context
      }
    }

    // Create async generator for response with actual AI
    async function* generateResponse(): AsyncGenerator<string, void, unknown> {
      try {
        const ai = getOpenAI();

        // Build context for the message
        let contextMessage = message;

        if (attachments?.length) {
          contextMessage += `\n\n[User has attached ${attachments.length} file(s): ${attachments.map((a) => a.name).join(", ")}]`;
        }

        // Inject RAG context for Superagent
        if (ragContext) {
          contextMessage = `[KNOWLEDGE BASE CONTEXT]\n${ragContext}\n\n[END KNOWLEDGE BASE CONTEXT]\n\n${contextMessage}`;
        }

        // Call LLM with system prompt via chat method
        const result = await ai.chat(
          [{ role: "user", content: contextMessage }],
          {
            systemPrompt,
            model: "gemini-3-flash",
            temperature: 0.7,
            maxTokens: 4000,
          },
        );

        // Stream the response word by word for natural feel
        const content = result.content;
        const words = content.split(/(\s+)/);

        for (const word of words) {
          yield word;
          // Small delay for streaming effect
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
      } catch (error) {
        console.error("AI completion error:", error);
        yield "I apologize, but I encountered an error processing your request. Please try again.";
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
          // Wait for stream to complete
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Update task status
          const usageConsumed = isSuperagent(agentType)
            ? Math.ceil(totalTokens / 50) // 2x cost for Superagent
            : Math.ceil(totalTokens / 100);

          await supabase
            .from("agent_tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              usage_consumed: usageConsumed,
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
