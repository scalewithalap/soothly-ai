/**
 * Revenue Recovery Agent
 * Automated collections team that handles failed payments and reduces churn
 *
 * Role: "The Defender" - Your Automated Collections Team
 * Trigger: Stripe Webhook (invoice.payment_failed)
 *
 * Flow:
 * 1. Analyze Step: Identify failure code and determine strategy
 * 2. Link Step: Generate "Magic Link" for card update
 * 3. Notify Step: Send Email + SMS with recovery link
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, UsageCost } from "../base/types";
import { inngest } from "@/inngest/client";
import { RECOVERY_EVENTS } from "@/inngest/events";

// Payment failure codes from Stripe
export type FailureCode =
  | "generic_decline"
  | "insufficient_funds"
  | "expired_card"
  | "incorrect_cvc"
  | "processing_error"
  | "lost_card"
  | "stolen_card"
  | "unknown";

// Recovery strategy based on failure type
export type RecoveryStrategy =
  | "retry_immediately"
  | "retry_delayed"
  | "update_card"
  | "manual_review"
  | "block";

// Recovery attempt status
export type RecoveryStatus =
  | "pending"
  | "link_sent"
  | "card_updated"
  | "payment_retried"
  | "recovered"
  | "failed"
  | "cancelled";

export class RevenueRecoveryAgent extends BaseAgent {
  readonly name = "revenue_recovery" as const;
  readonly displayName = "Revenue Recovery";
  readonly description =
    "Automated collections agent that recovers failed payments and reduces involuntary churn.";

  readonly usageCost: UsageCost = {
    analyze: 1,
    notify: 2,
    retry: 1,
  };

  // Retry configuration per failure code
  private readonly retryConfig: Record<
    FailureCode,
    { strategy: RecoveryStrategy; delayHours?: number; maxRetries: number }
  > = {
    generic_decline: {
      strategy: "retry_delayed",
      delayHours: 24,
      maxRetries: 3,
    },
    insufficient_funds: {
      strategy: "retry_delayed",
      delayHours: 72,
      maxRetries: 2,
    },
    expired_card: { strategy: "update_card", maxRetries: 0 },
    incorrect_cvc: { strategy: "update_card", maxRetries: 0 },
    processing_error: { strategy: "retry_immediately", maxRetries: 3 },
    lost_card: { strategy: "block", maxRetries: 0 },
    stolen_card: { strategy: "block", maxRetries: 0 },
    unknown: { strategy: "manual_review", maxRetries: 1 },
  };

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    // No initialization needed
  }

  /**
   * Execute agent task based on action type
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const { action, params } = task;

    switch (action) {
      case "process_failed_payment":
        return this.processFailedPayment(
          params as {
            invoiceId: string;
            customerId: string;
            failureCode: FailureCode;
            amount: number;
          },
        );

      case "send_recovery_email":
        return this.sendRecoveryEmail(
          params as {
            recoveryId: string;
          },
        );

      case "retry_payment":
        return this.retryPayment(
          params as {
            invoiceId: string;
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
    // No cleanup needed
  }

  // ============================================
  // CORE METHODS
  // ============================================

  /**
   * Process a failed payment event
   */
  async processFailedPayment(params: {
    invoiceId: string;
    customerId: string;
    failureCode: FailureCode;
    amount: number;
  }): Promise<AgentResult> {
    await inngest.send({
      name: RECOVERY_EVENTS.PAYMENT_FAILED,
      data: {
        invoiceId: params.invoiceId,
        customerId: params.customerId,
        failureCode: params.failureCode,
        amount: params.amount,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: {
        invoiceId: params.invoiceId,
        status: "processing",
        strategy: this.getRecoveryStrategy(params.failureCode),
      },
    };
  }

  /**
   * Send recovery email with magic link
   */
  async sendRecoveryEmail(params: {
    recoveryId: string;
  }): Promise<AgentResult> {
    await inngest.send({
      name: RECOVERY_EVENTS.EMAIL_SCHEDULED,
      data: {
        recoveryId: params.recoveryId,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { recoveryId: params.recoveryId, status: "email_queued" },
    };
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(params: { invoiceId: string }): Promise<AgentResult> {
    await inngest.send({
      name: RECOVERY_EVENTS.PAYMENT_RETRY,
      data: {
        invoiceId: params.invoiceId,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { invoiceId: params.invoiceId, status: "retry_queued" },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get recovery strategy based on failure code
   */
  getRecoveryStrategy(failureCode: FailureCode): RecoveryStrategy {
    return this.retryConfig[failureCode]?.strategy || "manual_review";
  }

  /**
   * Get retry configuration for a failure code
   */
  getRetryConfig(failureCode: FailureCode): {
    strategy: RecoveryStrategy;
    delayHours?: number;
    maxRetries: number;
  } {
    return (
      this.retryConfig[failureCode] || {
        strategy: "manual_review",
        maxRetries: 1,
      }
    );
  }

  /**
   * Determine if the failure code is recoverable
   */
  isRecoverable(failureCode: FailureCode): boolean {
    const strategy = this.getRecoveryStrategy(failureCode);
    return strategy !== "block" && strategy !== "manual_review";
  }

  /**
   * Build personalized recovery email content
   */
  buildRecoveryEmailContent(params: {
    customerName: string;
    amount: number;
    currency: string;
    failureCode: FailureCode;
    magicLink: string;
  }): { subject: string; body: string } {
    const strategy = this.getRecoveryStrategy(params.failureCode);

    if (strategy === "update_card") {
      return {
        subject: "Action Required: Update Your Payment Method",
        body: `Hi ${params.customerName},

We weren't able to process your payment of ${params.currency}${params.amount.toFixed(2)} because your card has expired.

Don't lose access to your account! Update your payment method in seconds:

${params.magicLink}

This secure link expires in 24 hours.

If you have any questions, just reply to this email.

Best,
The Soothly AI Team`,
      };
    }

    return {
      subject: "Quick Fix: Your Payment Needs Attention",
      body: `Hi ${params.customerName},

We had trouble processing your payment of ${params.currency}${params.amount.toFixed(2)}.

Keep your subscription active with one tap:

${params.magicLink}

This secure link expires in 24 hours.

If you're having trouble, just reply to this email.

Best,
The Soothly AI Team`,
    };
  }

  /**
   * Generate a time-limited magic link for card update
   * Returns a signed URL that expires in 24 hours
   */
  generateMagicLink(params: {
    customerId: string;
    invoiceId: string;
    baseUrl: string;
  }): string {
    // In production, this would generate a signed JWT with expiration
    const token = Buffer.from(
      JSON.stringify({
        cid: params.customerId,
        inv: params.invoiceId,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      }),
    ).toString("base64url");

    return `${params.baseUrl}/update-payment?token=${token}`;
  }
}
