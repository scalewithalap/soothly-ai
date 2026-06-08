/**
 * Customer Success Agent Inngest Functions
 * Background jobs for handling support tickets with RAG + AI
 *
 * Function: Support Ticket Processing
 * Trigger: 'support/ticket.created' or 'support/process.requested'
 *
 * Flow:
 * 1. retrieve-context: RAG search on docs + past tickets
 * 2. classify-intent: Determine ticket category
 * 3. generate-response: AI creates helpful answer
 * 4. execute-action: Perform safe actions if needed
 * 5. save-response: Store answer and update ticket
 *
 * Resiliency:
 * - Retries: 3x on AI failures with exponential backoff
 * - Escalation: Falls back to human if confidence < 0.7
 */

import { inngest } from "@/inngest/client";
import { SUPPORT_EVENTS } from "@/inngest/events";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getGemini } from "@/lib/ai";
import { createSemanticCache } from "@/lib/agents/memory";
import {
  parseAgentEventData,
  requiresApproval,
  requestApprovalAndWait,
} from "@/inngest/utils";
import {
  notifyAgentCompletion,
  getOrgOwnerNotificationPreferences,
} from "@/lib/notifications";
import type { SupabaseClient } from "@supabase/supabase-js";

// Type helper
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

/**
 * Get organization owner for notifications
 */
async function getOrgOwner(orgId: string): Promise<{
  email?: string;
  phone?: string;
  name?: string;
} | null> {
  const supabase = getUntypedClient();
  const { data } = await supabase
    .from("users")
    .select("email, phone, full_name")
    .eq("org_id", orgId)
    .single();

  if (!data) return null;
  return { email: data.email, phone: data.phone, name: data.full_name };
}

/**
 * Classify ticket intent based on keywords
 */
function classifyIntent(
  question: string,
): "billing" | "account" | "technical" | "feature" | "general" | "unknown" {
  const lower = question.toLowerCase();

  if (
    lower.includes("invoice") ||
    lower.includes("bill") ||
    lower.includes("payment") ||
    lower.includes("subscription")
  )
    return "billing";
  if (
    lower.includes("password") ||
    lower.includes("login") ||
    lower.includes("account")
  )
    return "account";
  if (
    lower.includes("error") ||
    lower.includes("bug") ||
    lower.includes("not working")
  )
    return "technical";
  if (lower.includes("feature") || lower.includes("request")) return "feature";
  if (
    lower.includes("how") ||
    lower.includes("what") ||
    lower.includes("where")
  )
    return "general";

  return "unknown";
}

// ============================================
// MAIN TICKET PROCESSING WORKFLOW
// ============================================

/**
 * Process a new support ticket created via chat widget
 */
export const handleTicketCreated = inngest.createFunction(
  {
    id: "support-ticket-created",
    name: "Process Support Ticket",
    retries: 3,
    triggers: [{ event: "support/ticket.created" }],
  },
  async ({ event, step }) => {
    // Parse event data with SKILL.md compliance
    const eventData = parseAgentEventData<{
      ticketId: string;
      orgId: string;
      question: string;
      userId: string;
    }>(event.data);
    const { ticketId, orgId, question, userId, model, autonomy_mode } =
      eventData;

    // Step 1: Get user context
    const userContext = await step.run("get-user-context", async () => {
      const supabase = getUntypedClient();

      const { data: user } = await supabase
        .from("users")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      const { data: org } = await supabase
        .from("organizations")
        .select("name, plan")
        .eq("id", orgId)
        .single();

      return {
        userName: user?.full_name || "Customer",
        userEmail: user?.email,
        orgName: org?.name,
        plan: org?.plan || "free",
      };
    });

    // Step 2: Classify intent
    const intent = await step.run("classify-intent", async () => {
      return classifyIntent(question);
    });

    // Step 3: Check semantic cache for similar questions
    const cachedResponse = await step.run("check-cache", async () => {
      const cache = createSemanticCache(orgId);
      return cache.get(question);
    });

    if (cachedResponse) {
      // Use cached response
      await step.run("save-cached-response", async () => {
        const supabase = getUntypedClient();
        await supabase
          .from("support_tickets")
          .update({
            status: "resolved",
            response: cachedResponse.response,
            resolved_at: new Date().toISOString(),
            ai_confidence: 0.95,
            from_cache: true,
          })
          .eq("id", ticketId);
      });

      return {
        success: true,
        ticketId,
        answer: cachedResponse.response,
        fromCache: true,
      };
    }

    // Step 4: RAG search for relevant documentation
    const ragResults = await step.run("retrieve-context", async () => {
      const supabase = getUntypedClient();

      // Search knowledge base for relevant docs
      const { data: docs } = await supabase
        .from("knowledge_base")
        .select("title, content")
        .textSearch("content", question.split(" ").slice(0, 5).join(" | "))
        .limit(5);

      // Search past resolved tickets for similar questions
      const { data: pastTickets } = await supabase
        .from("support_tickets")
        .select("question, response")
        .eq("org_id", orgId)
        .eq("status", "resolved")
        .not("response", "is", null)
        .textSearch("question", question.split(" ").slice(0, 5).join(" | "))
        .limit(3);

      return {
        docs: docs?.map((d) => `[${d.title}]: ${d.content}`) || [],
        pastTickets:
          pastTickets?.map((t) => ({ q: t.question, a: t.response })) || [],
      };
    });

    // Step 5: Generate AI response
    const aiResponse = await step.run("generate-response", async () => {
      const ai = getGemini();

      const prompt = `You are a helpful customer support agent for Soothly AI.

## User Context
- Name: ${userContext.userName}
- Plan: ${userContext.plan}
- Intent: ${intent}

## Their Question
"${question}"

## Relevant Documentation
${ragResults.docs.length > 0 ? ragResults.docs.join("\n\n") : "No specific documentation found."}

## Similar Past Questions
${ragResults.pastTickets.length > 0 ? ragResults.pastTickets.map((t) => `Q: ${t.q}\nA: ${t.a}`).join("\n\n") : "No similar past questions."}

## Instructions
1. Answer the question helpfully and concisely
2. Reference documentation when applicable
3. If you need to perform an action, specify it
4. Be honest if you're uncertain

Return JSON:
{
  "answer": "Your helpful response",
  "action": null | { "type": "send_password_reset" | "get_invoice" | "check_status" | "escalate", "reason": "..." },
  "confidence": 0.0-1.0,
  "shouldEscalate": false
}`;

      const result = await ai.complete(prompt, {
        model,
        temperature: 0.3,
      });

      try {
        return JSON.parse(result.content);
      } catch {
        return {
          answer: result.content,
          confidence: 0.5,
          shouldEscalate: true,
        };
      }
    });

    // Step 6: Handle actions if needed
    if (aiResponse.action && !aiResponse.shouldEscalate) {
      // Check if approval required for actions
      if (requiresApproval(aiResponse.action.type, autonomy_mode)) {
        const approval = await requestApprovalAndWait(step as any, {
          orgId,
          agentType: "customer_success",
          action: aiResponse.action.type,
          title: `Execute support action: ${aiResponse.action.type}`,
          description: aiResponse.action.reason || "Requested by AI agent",
          params: { ticketId, userId },
          previewData: { question, proposedAnswer: aiResponse.answer },
          riskLevel: "low",
        });

        if (!approval.approved) {
          aiResponse.shouldEscalate = true;
          aiResponse.answer +=
            "\n\nI'll have a team member follow up with you shortly.";
        }
      }

      if (!aiResponse.shouldEscalate) {
        await step.run("execute-action", async () => {
          const supabase = getUntypedClient();

          switch (aiResponse.action.type) {
            case "send_password_reset":
              // Log the action - actual reset would be triggered separately
              await supabase.from("activities").insert({
                org_id: orgId,
                agent_type: "customer_success",
                action: "password_reset_sent",
                entity_type: "user",
                entity_id: userId,
                description: "Password reset triggered by AI support",
              });
              break;

            case "get_invoice":
              // Would retrieve invoice URL
              break;

            case "check_status":
              // Would check subscription status
              break;
          }
        });
      }
    }

    // Step 7: Handle escalation if needed
    if (aiResponse.shouldEscalate || aiResponse.confidence < 0.7) {
      await step.run("escalate-to-human", async () => {
        const supabase = getUntypedClient();
        await supabase
          .from("support_tickets")
          .update({
            status: "escalated",
            ai_response: aiResponse.answer,
            ai_confidence: aiResponse.confidence,
            escalation_reason:
              aiResponse.confidence < 0.7
                ? "Low confidence"
                : "AI requested escalation",
          })
          .eq("id", ticketId);

        // Notify org owner of escalation
        const owner = await getOrgOwner(orgId);
        if (owner?.email) {
          const ownerPrefs = await getOrgOwnerNotificationPreferences(orgId);
          if (ownerPrefs?.preferences.eventPreferences.agentCompletion) {
            await notifyAgentCompletion(
              owner,
              {
                agentName: "Customer Success",
                action: "Ticket Escalated",
                details: `Support ticket requires human attention: "${question.substring(0, 100)}..."`,
              },
              ownerPrefs.preferences.channels,
              ownerPrefs.preferences.config,
            );
          }
        }
      });

      return {
        success: true,
        ticketId,
        escalated: true,
        reason:
          aiResponse.confidence < 0.7
            ? "Low confidence"
            : "Complex issue requiring human attention",
      };
    }

    // Step 8: Save response and resolve ticket
    await step.run("save-response", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("support_tickets")
        .update({
          status: "resolved",
          response: aiResponse.answer,
          resolved_at: new Date().toISOString(),
          ai_confidence: aiResponse.confidence,
          ai_model: model,
        })
        .eq("id", ticketId);

      // Cache the response for future similar questions
      const cache = createSemanticCache(orgId);
      await cache.set(question, aiResponse.answer, 500);
    });

    // Step 9: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "customer_success",
        action: "ticket_resolved",
        entity_type: "support_ticket",
        entity_id: ticketId,
        description: `Support ticket resolved (${intent} intent, ${Math.round(aiResponse.confidence * 100)}% confidence)`,
        metadata: { intent, confidence: aiResponse.confidence },
      });
    });

    return {
      success: true,
      ticketId,
      answer: aiResponse.answer,
      confidence: aiResponse.confidence,
      intent,
    };
  },
);

/**
 * Process an existing ticket (manual trigger)
 */
export const processTicket = inngest.createFunction(
  {
    id: "support-process-ticket",
    name: "Reprocess Support Ticket",
    retries: 2,
    triggers: [{ event: "support/process.requested" }],
  },
  async ({ event, step }) => {
    const eventData = parseAgentEventData<{
      ticketId: string;
      orgId: string;
    }>(event.data);
    const { ticketId, orgId, model } = eventData;

    // Get ticket details
    const ticket = await step.run("get-ticket", async () => {
      const supabase = getUntypedClient();
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();
      return data;
    });

    if (!ticket) {
      return { success: false, error: "Ticket not found" };
    }

    // Re-trigger the main workflow
    await inngest.send({
      name: SUPPORT_EVENTS.TICKET_CREATED,
      data: {
        ticketId,
        orgId,
        question: ticket.question,
        userId: ticket.user_id,
        model,
      },
    });

    return { success: true, message: "Ticket reprocessing triggered" };
  },
);
