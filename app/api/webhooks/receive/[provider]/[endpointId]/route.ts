/**
 * POST /api/webhooks/receive/[provider]/[endpointId] — the "Listening"
 * connection (connection-architecture.md §1): customers paste this URL into
 * their own Stripe/Shopify/custom tools so Soothly agents can react to their
 * billing events.
 *
 * Phase 4c audit: createWebhookConnection() (lib/connections/webhook-receiver)
 * issued endpoint paths under /api/webhooks/receive/... but NO route existed
 * here — the Revenue Recovery agent (trigger: customer's invoice.payment_failed)
 * was unreachable, and processStripeEvent's payment_failed case was a TODO.
 *
 * Flow: resolve connection by path → verify HMAC signature (provider-specific)
 * → log event → map to internal Inngest events (recovery/payment.failed,
 * recovery/card.updated) → 200.
 *
 * Security: signature verification against the per-connection secret. Raw body
 * is read before parsing (signatures are computed over raw bytes). Unknown
 * endpoints 404 without revealing whether the path format is valid.
 */
import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import {
  getWebhookConnectionByEndpoint,
  verifyStripeSignature,
  verifyShopifySignature,
  verifyHmacSignature,
  logWebhookEvent,
} from "@/lib/connections/webhook-receiver";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string; endpointId: string }> },
) {
  const { provider, endpointId } = await params;
  const endpointPath = `/api/webhooks/receive/${provider}/${endpointId}`;

  const connection = await getWebhookConnectionByEndpoint(endpointPath);
  if (!connection || connection.provider !== provider) {
    return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
  }

  const rawBody = await request.text();

  // --- Verify signature per provider ---
  let verified = false;
  if (provider === "stripe") {
    const sig = request.headers.get("stripe-signature") ?? "";
    verified = verifyStripeSignature(rawBody, sig, connection.secret_key);
  } else if (provider === "shopify") {
    const hmac = request.headers.get("x-shopify-hmac-sha256") ?? "";
    verified = verifyShopifySignature(rawBody, hmac, connection.secret_key);
  } else {
    // custom/hubspot: x-soothly-signature = HMAC-SHA256(rawBody, secret)
    const sig = request.headers.get("x-soothly-signature") ?? "";
    verified = verifyHmacSignature(rawBody, sig, connection.secret_key);
  }
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType =
    (payload.type as string) ?? // Stripe shape
    request.headers.get("x-shopify-topic") ?? // Shopify shape
    (payload.event as string) ??
    "unknown";

  // Subscription filter: only process events the customer opted into
  // ("*" or empty list = accept all).
  const subscribed = connection.events_subscribed ?? [];
  const accepted =
    subscribed.length === 0 ||
    subscribed.includes("*") ||
    subscribed.includes(eventType);

  await logWebhookEvent({
    provider: connection.provider,
    event_type: eventType,
    payload,
    received_at: new Date().toISOString(),
    org_id: connection.org_id,
    raw_headers: { "user-agent": request.headers.get("user-agent") ?? "" },
  });

  if (!accepted) {
    // Acknowledge but skip — prevents provider retries for unwanted events.
    return NextResponse.json({ received: true, skipped: true });
  }

  // --- Map external events to internal agent triggers ---
  try {
    if (eventType === "invoice.payment_failed") {
      const obj =
        ((payload.data as Record<string, unknown>)?.object as Record<
          string,
          unknown
        >) ?? payload;
      await inngest.send({
        name: "recovery/payment.failed",
        data: {
          orgId: connection.org_id,
          invoiceId: (obj.id as string) ?? `inv_${Date.now()}`,
          customerId: (obj.customer as string) ?? "unknown",
          customerEmail:
            (obj.customer_email as string) ??
            ((obj.customer_details as Record<string, unknown>)
              ?.email as string) ??
            null,
          // Stripe amounts are in cents
          amount:
            typeof obj.amount_due === "number" ? obj.amount_due / 100 : null,
          currency: ((obj.currency as string) ?? "usd").toUpperCase(),
          failureCode:
            ((
              (obj.last_finalization_error as Record<string, unknown>) ?? {}
            ).code as string) ?? "generic_decline",
        },
      });
    } else if (
      eventType === "payment_method.attached" ||
      eventType === "customer.source.updated"
    ) {
      const obj =
        ((payload.data as Record<string, unknown>)?.object as Record<
          string,
          unknown
        >) ?? payload;
      await inngest.send({
        name: "recovery/card.updated",
        data: {
          orgId: connection.org_id,
          customerId: (obj.customer as string) ?? "unknown",
        },
      });
    }
    // Other event types are logged (above) for future handlers.
  } catch (dispatchError) {
    // Event is logged in webhook_events — replayable. Don't 500 the provider
    // (that triggers their retry storm); surface in our logs instead.
    console.error("Webhook→Inngest dispatch failed:", dispatchError);
  }

  return NextResponse.json({ received: true });
}
