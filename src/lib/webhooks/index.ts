/**
 * Webhook Service
 *
 * Create, manage, and deliver webhooks for Zapier/Make integration.
 * Supports outbound webhooks with HMAC signing and retry logic.
 */

import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes } from "crypto";

// ============================================================================
// Webhook Events - Comprehensive list for all agent activities
// ============================================================================

export const WEBHOOK_EVENTS = [
  // Agent Lifecycle Events
  "agent.task.started",
  "agent.task.completed",
  "agent.task.failed",
  "agent.approval.requested",
  "agent.approval.resolved",
  "agent.approval.expired",

  // Lead Generation Events
  "lead.campaign.created",
  "lead.campaign.completed",
  "lead.scraped",
  "lead.enriched",
  "lead.scored",
  "lead.enrolled_sequence",

  // Email Sequence Events
  "sequence.created",
  "sequence.activated",
  "sequence.email.sent",
  "sequence.email.opened",
  "sequence.email.clicked",
  "sequence.email.replied",
  "sequence.email.bounced",
  "sequence.enrollment.created",
  "sequence.enrollment.completed",
  "sequence.enrollment.paused",

  // Content/SEO Events
  "content.brief.created",
  "content.article.generated",
  "content.article.optimized",
  "content.article.published",

  // Partnership Events
  "partner.discovered",
  "partner.qualified",
  "partner.outreach.sent",
  "partner.outreach.replied",

  // Proposal Events
  "proposal.created",
  "proposal.sent",
  "proposal.viewed",

  // Revenue/Payment Events
  "payment.failed",
  "payment.retry.scheduled",
  "payment.recovered",
  "subscription.renewed",
  "subscription.cancelled",
  "subscription.upgraded",
  "subscription.downgraded",

  // Customer Success Events
  "customer.health.changed",
  "customer.churn.risk.detected",
  "support.ticket.created",
  "support.ticket.resolved",

  // Competitor Intelligence Events
  "competitor.change.detected",
  "competitor.added",

  // Team/Admin Events
  "team.member.added",
  "team.member.removed",
  "team.member.role.changed",
  "usage.limit.reached",
  "usage.limit.warning",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// Event categories for UI grouping
export const WEBHOOK_EVENT_CATEGORIES = {
  "Agent Lifecycle": [
    "agent.task.started",
    "agent.task.completed",
    "agent.task.failed",
    "agent.approval.requested",
    "agent.approval.resolved",
    "agent.approval.expired",
  ],
  "Lead Generation": [
    "lead.campaign.created",
    "lead.campaign.completed",
    "lead.scraped",
    "lead.enriched",
    "lead.scored",
    "lead.enrolled_sequence",
  ],
  "Email Sequences": [
    "sequence.created",
    "sequence.activated",
    "sequence.email.sent",
    "sequence.email.opened",
    "sequence.email.clicked",
    "sequence.email.replied",
    "sequence.email.bounced",
    "sequence.enrollment.created",
    "sequence.enrollment.completed",
    "sequence.enrollment.paused",
  ],
  "Content & SEO": [
    "content.brief.created",
    "content.article.generated",
    "content.article.optimized",
    "content.article.published",
  ],
  Partnerships: [
    "partner.discovered",
    "partner.qualified",
    "partner.outreach.sent",
    "partner.outreach.replied",
  ],
  Proposals: ["proposal.created", "proposal.sent", "proposal.viewed"],
  "Revenue & Payments": [
    "payment.failed",
    "payment.retry.scheduled",
    "payment.recovered",
    "subscription.renewed",
    "subscription.cancelled",
    "subscription.upgraded",
    "subscription.downgraded",
  ],
  "Customer Success": [
    "customer.health.changed",
    "customer.churn.risk.detected",
    "support.ticket.created",
    "support.ticket.resolved",
  ],
  "Competitor Intelligence": ["competitor.change.detected", "competitor.added"],
  "Team & Admin": [
    "team.member.added",
    "team.member.removed",
    "team.member.role.changed",
    "usage.limit.reached",
    "usage.limit.warning",
  ],
} as const;

// ============================================================================
// Types
// ============================================================================

interface CreateWebhookParams {
  orgId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  description?: string;
}

interface UpdateWebhookParams {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  description?: string;
  isActive?: boolean;
}

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  status: string;
  attempts: number;
  response_status: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  delivered_at: string | null;
  next_retry_at: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  url: string;
  secret: string;
  events: WebhookEvent[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Retry delays in seconds: 1min, 5min, 15min
const RETRY_DELAYS = [60, 300, 900];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Supabase admin client
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * Generate a webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

/**
 * Sign a payload with the webhook secret
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Calculate next retry time based on attempt number
 */
function calculateNextRetry(currentAttempt: number): string | null {
  if (currentAttempt >= RETRY_DELAYS.length) return null;
  const delaySeconds = RETRY_DELAYS[currentAttempt];
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

// ============================================================================
// Webhook CRUD Operations
// ============================================================================

/**
 * Create a new webhook
 */
export async function createWebhook(
  params: CreateWebhookParams,
): Promise<{ success: boolean; id?: string; secret?: string; error?: string }> {
  const supabase = getSupabaseAdmin();
  const secret = generateWebhookSecret();

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      org_id: params.orgId,
      name: params.name,
      description: params.description,
      url: params.url,
      events: params.events,
      secret,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create webhook:", error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id, secret };
}

/**
 * Update an existing webhook
 */
export async function updateWebhook(
  webhookId: string,
  orgId: string,
  params: UpdateWebhookParams,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.url !== undefined) updateData.url = params.url;
  if (params.events !== undefined) updateData.events = params.events;
  if (params.description !== undefined)
    updateData.description = params.description;
  if (params.isActive !== undefined) updateData.is_active = params.isActive;

  const { error } = await supabase
    .from("webhooks")
    .update(updateData)
    .eq("id", webhookId)
    .eq("org_id", orgId);

  if (error) {
    console.error("Failed to update webhook:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(
  webhookId: string,
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", webhookId)
    .eq("org_id", orgId);

  if (error) {
    console.error("Failed to delete webhook:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Toggle webhook active status
 */
export async function toggleWebhook(
  webhookId: string,
  orgId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  return updateWebhook(webhookId, orgId, { isActive });
}

/**
 * Get a single webhook by ID
 */
export async function getWebhook(
  webhookId: string,
  orgId: string,
): Promise<Webhook | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("id", webhookId)
    .eq("org_id", orgId)
    .single();

  if (error) {
    console.error("Failed to get webhook:", error);
    return null;
  }

  return data;
}

/**
 * List webhooks for an organization
 */
export async function listWebhooks(
  orgId: string,
  options?: { limit?: number; offset?: number; isActive?: boolean },
): Promise<{ webhooks: Webhook[]; total: number }> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("webhooks")
    .select("*", { count: "exact" })
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (options?.isActive !== undefined) {
    query = query.eq("is_active", options.isActive);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1,
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to list webhooks:", error);
    return { webhooks: [], total: 0 };
  }

  return { webhooks: data || [], total: count || 0 };
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(
  webhookId: string,
  orgId: string,
): Promise<{ success: boolean; secret?: string; error?: string }> {
  const supabase = getSupabaseAdmin();
  const newSecret = generateWebhookSecret();

  const { error } = await supabase
    .from("webhooks")
    .update({ secret: newSecret })
    .eq("id", webhookId)
    .eq("org_id", orgId);

  if (error) {
    console.error("Failed to regenerate webhook secret:", error);
    return { success: false, error: error.message };
  }

  return { success: true, secret: newSecret };
}

// ============================================================================
// Webhook Delivery
// ============================================================================

/**
 * Test a webhook by sending a test payload
 */
export async function testWebhook(
  webhookId: string,
  orgId: string,
): Promise<{
  success: boolean;
  responseStatus?: number;
  responseTime?: number;
  error?: string;
}> {
  const webhook = await getWebhook(webhookId, orgId);
  if (!webhook) {
    return { success: false, error: "Webhook not found" };
  }

  const testPayload: WebhookPayload = {
    event: "agent.task.completed",
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: "This is a test webhook from Zero Headache",
      webhookId,
    },
  };

  const payloadString = JSON.stringify(testPayload);
  const signature = signPayload(payloadString, webhook.secret);

  try {
    const startTime = Date.now();
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": "agent.task.completed",
        "X-Webhook-Test": "true",
      },
      body: payloadString,
    });

    const responseTime = Date.now() - startTime;

    return {
      success: response.ok,
      responseStatus: response.status,
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Deliver a webhook event to all matching webhooks
 */
export async function deliverWebhookEvent(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Get matching webhooks
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("id, url, secret")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .contains("events", [event]);

  if (!webhooks?.length) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);

  // Deliver to each webhook
  for (const webhook of webhooks) {
    const signature = signPayload(payloadString, webhook.secret);

    try {
      const startTime = Date.now();
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body: payloadString,
      });

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text().catch(() => "");

      // Log delivery
      await supabase.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        org_id: orgId,
        event_type: event,
        payload,
        status: response.ok ? "success" : "failed",
        attempts: 1,
        response_status: response.status,
        response_body: responseBody.substring(0, 1000),
        response_time_ms: responseTime,
        delivered_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Webhook delivery failed for ${webhook.id}:`, error);

      // Log failed delivery with retry scheduling
      const nextRetryAt = calculateNextRetry(1);
      await supabase.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        org_id: orgId,
        event_type: event,
        payload,
        status: "pending_retry",
        attempts: 1,
        next_retry_at: nextRetryAt,
      });
    }
  }
}

/**
 * Retry a failed webhook delivery with exponential backoff
 */
export async function retryWebhookDelivery(
  deliveryId: string,
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  // Get delivery and webhook info
  const { data: delivery, error: fetchError } = await supabase
    .from("webhook_deliveries")
    .select("*, webhooks!inner(url, secret, max_retries)")
    .eq("id", deliveryId)
    .eq("org_id", orgId)
    .single();

  if (fetchError || !delivery) {
    return { success: false, error: "delivery_not_found" };
  }

  const webhook = delivery.webhooks as { url: string; secret: string };
  const payloadString = JSON.stringify(delivery.payload);
  const signature = signPayload(payloadString, webhook.secret);

  try {
    const startTime = Date.now();
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": delivery.event_type,
        "X-Webhook-Retry": String(delivery.attempts),
      },
      body: payloadString,
    });

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text().catch(() => "");

    // Update delivery record
    await supabase
      .from("webhook_deliveries")
      .update({
        status: response.ok ? "success" : "failed",
        attempts: delivery.attempts + 1,
        response_status: response.status,
        response_body: responseBody.substring(0, 1000),
        response_time_ms: responseTime,
        delivered_at: response.ok ? new Date().toISOString() : null,
        next_retry_at: response.ok
          ? null
          : calculateNextRetry(delivery.attempts + 1),
      })
      .eq("id", deliveryId);

    return { success: response.ok };
  } catch (error) {
    console.error(`Webhook retry failed for ${deliveryId}:`, error);

    const nextAttempt = delivery.attempts + 1;
    const nextRetry = calculateNextRetry(nextAttempt);

    await supabase
      .from("webhook_deliveries")
      .update({
        status: nextRetry ? "pending_retry" : "failed",
        attempts: nextAttempt,
        next_retry_at: nextRetry,
      })
      .eq("id", deliveryId);

    return { success: false, error: "delivery_failed" };
  }
}

// ============================================================================
// Delivery History
// ============================================================================

/**
 * List delivery history for a webhook
 */
export async function getWebhookDeliveries(
  webhookId: string,
  orgId: string,
  options?: { limit?: number; offset?: number },
): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
  const supabase = getSupabaseAdmin();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const { data, error, count } = await supabase
    .from("webhook_deliveries")
    .select("*", { count: "exact" })
    .eq("webhook_id", webhookId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Failed to fetch webhook deliveries:", error);
    return { deliveries: [], total: 0 };
  }

  return { deliveries: data || [], total: count || 0 };
}

/**
 * Get webhook delivery statistics
 */
export async function getWebhookStats(
  webhookId: string,
  orgId: string,
): Promise<{
  total: number;
  success: number;
  failed: number;
  pending: number;
  successRate: number;
  avgResponseTime: number;
}> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("webhook_deliveries")
    .select("status, response_time_ms")
    .eq("webhook_id", webhookId)
    .eq("org_id", orgId);

  if (error || !data) {
    return {
      total: 0,
      success: 0,
      failed: 0,
      pending: 0,
      successRate: 0,
      avgResponseTime: 0,
    };
  }

  const total = data.length;
  const success = data.filter((d) => d.status === "success").length;
  const failed = data.filter((d) => d.status === "failed").length;
  const pending = data.filter((d) => d.status === "pending_retry").length;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

  const responseTimes = data
    .filter((d) => d.response_time_ms !== null)
    .map((d) => d.response_time_ms as number);
  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        )
      : 0;

  return { total, success, failed, pending, successRate, avgResponseTime };
}

// ============================================================================
// Default Export
// ============================================================================

const webhookService = {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CATEGORIES,
  generateWebhookSecret,
  signPayload,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  getWebhook,
  listWebhooks,
  regenerateWebhookSecret,
  testWebhook,
  deliverWebhookEvent,
  retryWebhookDelivery,
  getWebhookDeliveries,
  getWebhookStats,
};

export default webhookService;
