/**
 * Customer Success Agent
 * AI-powered Level 1 Support that handles common customer queries
 *
 * Role: "The Brain" - Your Level 1 Support Rep
 * Trigger: Chat Widget Message (support_ticket.created)
 *
 * Flow:
 * 1. Retrieve Step: RAG Search on docs + past tickets
 * 2. Action Step: Call safe backend tools if needed
 * 3. Respond Step: Stream helpful answer
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, UsageCost } from "../base/types";
import { inngest, AgentEvents } from "@/inngest/client";
import type { Database } from "@/types/database";

// Supported action types the agent can perform
export type CustomerSuccessAction =
  | "answer_question"
  | "send_password_reset"
  | "resend_invoice"
  | "check_subscription_status"
  | "escalate_to_human";

// Intent categories for routing
export type TicketIntent =
  | "billing"
  | "technical"
  | "account"
  | "feature"
  | "general"
  | "unknown";

// Safe tools the agent can invoke
export interface SafeTool {
  name: string;
  description: string;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export class CustomerSuccessAgent extends BaseAgent {
  readonly name = "customer_success" as const;
  readonly displayName = "Customer Success";
  readonly description =
    "AI-powered support agent that handles common queries using RAG and safe actions.";

  readonly usageCost: UsageCost = {
    answer: 1,
    action: 2,
    escalate: 0,
  };

  // Confidence threshold below which we escalate to human
  private confidenceThreshold = 0.7;

  // Available safe tools
  private safeTools: SafeTool[] = [];

  /**
   * Initialize the agent with safe tools
   */
  async initialize(): Promise<void> {
    // Register safe tools that the agent can call
    this.safeTools = [
      {
        name: "sendPasswordReset",
        description: "Send a password reset email to the user",
        handler: async (params) => {
          // Implementation would call auth service
          return { sent: true, email: params.email };
        },
      },
      {
        name: "getInvoiceUrl",
        description: "Get the URL for a user's latest invoice",
        handler: async (params) => {
          // Implementation would call billing service
          return { url: `/invoices/${params.userId}/latest` };
        },
      },
      {
        name: "checkSubscriptionStatus",
        description: "Check the user's current subscription status",
        handler: async (params) => {
          // Implementation would call billing service
          return { status: "active", plan: params.plan || "pro" };
        },
      },
    ];
  }

  /**
   * Execute agent task based on action type
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const { action, params } = task;

    switch (action) {
      case "answer_question":
        return this.answerQuestion(
          params as {
            ticketId: string;
            question: string;
            userId: string;
          },
        );

      case "process_ticket":
        return this.processTicket(
          params as {
            ticketId: string;
          },
        );

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.safeTools = [];
  }

  // ============================================
  // CORE METHODS
  // ============================================

  /**
   * Answer a customer question using RAG + tools
   */
  async answerQuestion(params: {
    ticketId: string;
    question: string;
    userId: string;
  }): Promise<AgentResult> {
    // Trigger the full workflow via Inngest
    await inngest.send({
      name: "support/ticket.created",
      data: {
        ticketId: params.ticketId,
        orgId: this.orgId,
        question: params.question,
        userId: params.userId,
      },
    });

    return {
      success: true,
      data: { ticketId: params.ticketId, status: "processing" },
    };
  }

  /**
   * Process an existing support ticket
   */
  async processTicket(params: { ticketId: string }): Promise<AgentResult> {
    await inngest.send({
      name: "support/process.requested",
      data: {
        ticketId: params.ticketId,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { ticketId: params.ticketId, status: "reprocessing" },
    };
  }

  // ============================================
  // INTENT CLASSIFICATION
  // ============================================

  /**
   * Classify the intent of a support question
   */
  classifyIntent(question: string): TicketIntent {
    const lowerQuestion = question.toLowerCase();

    // Billing-related
    if (
      lowerQuestion.includes("invoice") ||
      lowerQuestion.includes("bill") ||
      lowerQuestion.includes("payment") ||
      lowerQuestion.includes("charge") ||
      lowerQuestion.includes("refund") ||
      lowerQuestion.includes("subscription") ||
      lowerQuestion.includes("cancel")
    ) {
      return "billing";
    }

    // Account-related
    if (
      lowerQuestion.includes("password") ||
      lowerQuestion.includes("login") ||
      lowerQuestion.includes("account") ||
      lowerQuestion.includes("email") ||
      lowerQuestion.includes("profile")
    ) {
      return "account";
    }

    // Technical issues
    if (
      lowerQuestion.includes("error") ||
      lowerQuestion.includes("bug") ||
      lowerQuestion.includes("not working") ||
      lowerQuestion.includes("broken") ||
      lowerQuestion.includes("issue") ||
      lowerQuestion.includes("problem")
    ) {
      return "technical";
    }

    // Feature requests
    if (
      lowerQuestion.includes("feature") ||
      lowerQuestion.includes("request") ||
      lowerQuestion.includes("suggestion") ||
      lowerQuestion.includes("would be nice") ||
      lowerQuestion.includes("can you add")
    ) {
      return "feature";
    }

    // General questions
    if (
      lowerQuestion.includes("how") ||
      lowerQuestion.includes("what") ||
      lowerQuestion.includes("where") ||
      lowerQuestion.includes("when")
    ) {
      return "general";
    }

    return "unknown";
  }

  // ============================================
  // PROMPT BUILDING
  // ============================================

  /**
   * Build the system prompt for the support agent
   */
  buildSystemPrompt(context: {
    userPlan: string;
    relevantDocs: string[];
    previousTickets?: Array<{ question: string; answer: string }>;
  }): string {
    return `You are a helpful customer support agent for Soothly AI, an AI-powered business automation platform.

## Your Capabilities
- Answer questions about the product and its features
- Help with billing inquiries (invoices, subscriptions, refunds)
- Assist with account issues (password resets, profile updates)
- Provide technical guidance
- Escalate to human support when uncertain

## User Context
- Current Plan: ${context.userPlan}
- Has access to: All features available in ${context.userPlan} plan

## Relevant Documentation
${context.relevantDocs.map((doc, i) => `[Doc ${i + 1}]: ${doc}`).join("\n\n")}

## Previous Conversations
${
  context.previousTickets
    ? context.previousTickets
        .map((t) => `Q: ${t.question}\nA: ${t.answer}`)
        .join("\n\n")
    : "No previous conversations"
}

## Guidelines
1. Be helpful, concise, and polite
2. Reference specific documentation when applicable
3. If you need to perform an action (like sending a password reset), clearly state what you're doing
4. NEVER make up features or policies - if unsure, say "I'll check with our team"
5. For complex technical issues, offer to create a detailed ticket for engineering
6. Always verify you're addressing the actual question

## Available Actions
You can use these tools to help users:
- sendPasswordReset(email): Send a password reset link
- getInvoiceUrl(userId): Get link to latest invoice
- checkSubscriptionStatus(userId): Check subscription details

If the user's question requires an action you cannot perform, escalate to a human agent.`;
  }

  /**
   * Build a response prompt for answering a specific question
   */
  buildResponsePrompt(params: {
    question: string;
    intent: TicketIntent;
    ragResults: string[];
    userContext: { name?: string; plan?: string };
  }): string {
    return `Answer this customer support question:

Question: "${params.question}"
Detected Intent: ${params.intent}
Customer Name: ${params.userContext.name || "Customer"}
Current Plan: ${params.userContext.plan || "Unknown"}

## Relevant Information from Knowledge Base:
${params.ragResults.length > 0 ? params.ragResults.join("\n\n---\n\n") : "No relevant documentation found."}

## Response Guidelines:
1. Address the question directly and helpfully
2. If you need to take an action (password reset, etc.), state it clearly
3. If you're not confident in the answer (confidence < 70%), suggest escalation
4. Keep the response concise but complete
5. End with a follow-up question if appropriate

Respond with JSON:
{
  "answer": "Your helpful response here",
  "action": null | { "type": "sendPasswordReset" | "getInvoiceUrl" | "escalate", "params": {} },
  "confidence": 0.0-1.0,
  "suggestedFollowUp": "Optional follow-up question"
}`;
  }
}
