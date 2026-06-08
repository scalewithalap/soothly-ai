/**
 * Web Push Notification Service
 *
 * Handles sending push notifications to subscribed browsers.
 */

import webpush from "web-push";

// VAPID keys for web push - generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@soothly.ai";

// Configure web-push with VAPID credentials
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a push notification to a subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload,
): Promise<{ success: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured - push notifications disabled");
    return { success: false, error: "VAPID keys not configured" };
  }

  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/badge-72x72.png",
      data: {
        url: payload.url || "/",
        ...payload.data,
      },
      tag: payload.tag,
    });

    await webpush.sendNotification(subscription, notificationPayload);

    return { success: true };
  } catch (error) {
    console.error("Failed to send push notification:", error);

    // Handle expired subscriptions
    if (error instanceof webpush.WebPushError && error.statusCode === 410) {
      return { success: false, error: "subscription_expired" };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send push notification to multiple subscriptions
 */
export async function sendPushNotificationToMany(
  subscriptions: PushSubscription[],
  payload: PushNotificationPayload,
): Promise<{ sent: number; failed: number; expired: string[] }> {
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload)),
  );

  const expired: string[] = [];
  let sent = 0;
  let failed = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value.success) {
      sent++;
    } else {
      failed++;
      if (
        result.status === "fulfilled" &&
        result.value.error === "subscription_expired"
      ) {
        expired.push(subscriptions[index].endpoint);
      }
    }
  });

  return { sent, failed, expired };
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
