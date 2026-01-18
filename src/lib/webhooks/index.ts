/**
 * Webhook Service
 *
 * Create, manage, and deliver webhooks.
 */

import { createClient } from "@supabase/supabase-js";
import { createHmac, randomBytes } from "crypto";

export const WEBHOOK_EVENTS = [
  "agent.task.completed",
  "agent.task.failed",
  "credit.low",
  "credit.depleted",
  "subscription.renewed",
  "subscription.cancelled",
  "team.member.added",
  "team.member.removed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

interface CreateWebhookParams {
  orgId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
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

// Retry delays in seconds: 1min, 5min, 15min
const RETRY_DELAYS = [60, 300, 900];

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
 * Create a new webhook
 */
export async function createWebhook(
  params: CreateWebhookParams,
): Promise<{ success: boolean; id?: string; secret?: string; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const secret = generateWebhookSecret();

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      org_id: params.orgId,
      name: params.name,
      url: params.url,
      events: params.events,
      secret,
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
 * List webhooks for an organization
 */
export async function listWebhooks(orgId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("webhooks")
    .select("id, name, url, events, is_active, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list webhooks:", error);
    return [];
  }

  return data || [];
}

/**
 * Deliver a webhook event to all matching webhooks
 */
export async function deliverWebhookEvent(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

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
 * Calculate next retry time based on attempt number
 */
function calculateNextRetry(currentAttempt: number): string | null {
  if (currentAttempt >= RETRY_DELAYS.length) return null;
  const delaySeconds = RETRY_DELAYS[currentAttempt];
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

/**
 * Retry a failed webhook delivery with exponential backoff
 */
export async function retryWebhookDelivery(
  deliveryId: string,
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

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

  const webhook = delivery.webhooks;
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

/**
 * List delivery history for a webhook
 */
export async function getWebhookDeliveries(
  webhookId: string,
  orgId: string,
  limit: number = 50,
): Promise<WebhookDelivery[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("webhook_deliveries")
    .select("*")
    .eq("webhook_id", webhookId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch webhook deliveries:", error);
    return [];
  }

  return data || [];
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
  successRate: number;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("webhook_deliveries")
    .select("status")
    .eq("webhook_id", webhookId)
    .eq("org_id", orgId);

  if (error || !data) {
    return { total: 0, success: 0, failed: 0, successRate: 0 };
  }

  const total = data.length;
  const success = data.filter((d) => d.status === "success").length;
  const failed = data.filter((d) => d.status === "failed").length;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

  return { total, success, failed, successRate };
}

const webhookService = {
  WEBHOOK_EVENTS,
  generateWebhookSecret,
  signPayload,
  createWebhook,
  listWebhooks,
  deliverWebhookEvent,
  retryWebhookDelivery,
  getWebhookDeliveries,
  getWebhookStats,
};

export default webhookService;

