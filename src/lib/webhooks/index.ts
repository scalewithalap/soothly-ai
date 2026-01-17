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

      // Log failed delivery
      await supabase.from("webhook_deliveries").insert({
        webhook_id: webhook.id,
        org_id: orgId,
        event_type: event,
        payload,
        status: "failed",
        attempts: 1,
      });
    }
  }
}

const webhookService = {
  WEBHOOK_EVENTS,
  generateWebhookSecret,
  signPayload,
  createWebhook,
  listWebhooks,
  deliverWebhookEvent,
};

export default webhookService;
