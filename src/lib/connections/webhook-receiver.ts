/**
 * Connection Architecture - Webhook Receivers
 *
 * Handles incoming webhooks from external platforms (Stripe, Shopify, etc.)
 * Uses HMAC signature verification for security.
 */

import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

// ============================================
// HMAC SIGNATURE VERIFICATION
// ============================================

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const parts = signature.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1Sig = parts.find((p) => p.startsWith("v1="))?.slice(3);

  if (!timestamp || !v1Sig) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSig = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return v1Sig === expectedSig;
}

/**
 * Verify Shopify webhook signature
 */
export function verifyShopifySignature(
  payload: string,
  hmac: string,
  secret: string,
): boolean {
  const computed = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("base64");
  return computed === hmac;
}

/**
 * Verify generic HMAC-SHA256 signature (for custom integrations)
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  encoding: "hex" | "base64" = "hex",
): boolean {
  const computed = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest(encoding);
  return computed === signature;
}

// ============================================
// WEBHOOK EVENT TYPES
// ============================================

export type WebhookProvider = "stripe" | "shopify" | "hubspot" | "custom";

export interface IncomingWebhookEvent {
  provider: WebhookProvider;
  event_type: string;
  payload: Record<string, unknown>;
  received_at: string;
  org_id: string;
  raw_headers: Record<string, string>;
}

// ============================================
// WEBHOOK EVENT HANDLERS
// ============================================

/**
 * Log and store incoming webhook events
 */
export async function logWebhookEvent(
  event: IncomingWebhookEvent,
): Promise<{ success: boolean; id?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("webhook_events")
    .insert({
      org_id: event.org_id,
      provider: event.provider,
      event_type: event.event_type,
      payload: event.payload,
      received_at: event.received_at,
    })
    .select("id")
    .single();

  if (error) {
    // Log error to monitoring system if configured
    return { success: false };
  }

  return { success: true, id: data.id };
}

// ============================================
// STRIPE EVENT HANDLERS
// ============================================

export interface StripeEventHandler {
  "checkout.session.completed": (
    data: Record<string, unknown>,
  ) => Promise<void>;
  "customer.subscription.created": (
    data: Record<string, unknown>,
  ) => Promise<void>;
  "customer.subscription.updated": (
    data: Record<string, unknown>,
  ) => Promise<void>;
  "customer.subscription.deleted": (
    data: Record<string, unknown>,
  ) => Promise<void>;
  "invoice.payment_succeeded": (data: Record<string, unknown>) => Promise<void>;
  "invoice.payment_failed": (data: Record<string, unknown>) => Promise<void>;
}

/**
 * Process Stripe webhook events
 */
export async function processStripeEvent(
  eventType: string,
  data: Record<string, unknown>,
  orgId: string,
): Promise<void> {
  // Log the event first
  await logWebhookEvent({
    provider: "stripe",
    event_type: eventType,
    payload: data,
    received_at: new Date().toISOString(),
    org_id: orgId,
    raw_headers: {},
  });

  // Route to specific handlers
  switch (eventType) {
    case "checkout.session.completed":
      // Handle checkout completion
      // TODO: Implement checkout handler
      break;
    case "invoice.payment_failed":
      // Handle failed payment - send notification
      // TODO: Implement payment failure handler
      break;
    case "customer.subscription.deleted":
      // Handle subscription cancellation
      // TODO: Implement cancellation handler
      break;
    default:
      // Unhandled event type - no action needed
      break;
  }
}

// ============================================
// SHOPIFY EVENT HANDLERS
// ============================================

/**
 * Process Shopify webhook events
 */
export async function processShopifyEvent(
  topic: string,
  data: Record<string, unknown>,
  orgId: string,
): Promise<void> {
  // Log the event
  await logWebhookEvent({
    provider: "shopify",
    event_type: topic,
    payload: data,
    received_at: new Date().toISOString(),
    org_id: orgId,
    raw_headers: {},
  });

  // Route to specific handlers
  switch (topic) {
    case "orders/create":
      // Handle new order
      // TODO: Implement order handler
      break;
    case "orders/fulfilled":
      // Handle fulfilled order
      // TODO: Implement fulfillment handler
      break;
    case "customers/create":
      // Handle new customer
      // TODO: Implement customer handler
      break;
    case "app/uninstalled":
      // Handle app uninstall
      // TODO: Implement uninstall handler
      break;
    default:
      // Unhandled topic - no action needed
      break;
  }
}

// ============================================
// CONNECTION REGISTRY
// ============================================

export interface WebhookConnection {
  id: string;
  org_id: string;
  provider: WebhookProvider;
  endpoint_path: string;
  secret_key: string;
  is_active: boolean;
  events_subscribed: string[];
  created_at: string;
}

/**
 * Create a new webhook connection for an organization
 */
export async function createWebhookConnection(
  orgId: string,
  provider: WebhookProvider,
  events: string[],
): Promise<{ success: boolean; endpoint?: string; secret?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Generate unique endpoint and secret
  const crypto = await import("crypto");
  const endpointId = crypto.randomBytes(16).toString("hex");
  const secret = `whsec_${crypto.randomBytes(32).toString("base64url")}`;
  const endpointPath = `/api/webhooks/receive/${provider}/${endpointId}`;

  const { data, error } = await supabase
    .from("webhook_connections")
    .insert({
      org_id: orgId,
      provider,
      endpoint_path: endpointPath,
      secret_key: secret,
      events_subscribed: events,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    // Log error to monitoring system if configured
    return { success: false };
  }

  return {
    success: true,
    endpoint: `${process.env.NEXT_PUBLIC_APP_URL}${endpointPath}`,
    secret,
  };
}

/**
 * Get webhook connection by endpoint path
 */
export async function getWebhookConnectionByEndpoint(
  endpointPath: string,
): Promise<WebhookConnection | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPAAB_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("webhook_connections")
    .select("*")
    .eq("endpoint_path", endpointPath)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as WebhookConnection;
}
