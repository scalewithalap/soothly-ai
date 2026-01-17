/**
 * PostHog Server-Side Client
 *
 * For server-side analytics and error tracking.
 */

import { PostHog } from "posthog-node";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let serverPostHog: PostHog | null = null;

/**
 * Get PostHog server client (singleton)
 */
export function getServerPostHog(): PostHog | null {
  if (!POSTHOG_KEY) {
    return null;
  }

  if (!serverPostHog) {
    serverPostHog = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1, // Send events immediately in serverless
      flushInterval: 0,
    });
  }

  return serverPostHog;
}

/**
 * Capture a server-side event
 */
export function captureServerEvent(
  distinctId: string,
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  const client = getServerPostHog();
  if (!client) return;

  client.capture({
    distinctId,
    event: eventName,
    properties,
  });
}

/**
 * Capture a server-side error
 */
export function captureServerError(
  distinctId: string,
  error: Error,
  context?: Record<string, unknown>,
): void {
  const client = getServerPostHog();
  if (!client) return;

  client.capture({
    distinctId,
    event: "$exception",
    properties: {
      $exception_message: error.message,
      $exception_type: error.name,
      $exception_stack_trace_raw: error.stack,
      $exception_source: "server",
      ...context,
    },
  });
}

/**
 * Identify a user server-side
 */
export function identifyServerUser(
  distinctId: string,
  properties?: Record<string, unknown>,
): void {
  const client = getServerPostHog();
  if (!client) return;

  client.identify({
    distinctId,
    properties,
  });
}

/**
 * Shutdown PostHog (call on server shutdown)
 */
export async function shutdownPostHog(): Promise<void> {
  if (serverPostHog) {
    await serverPostHog.shutdown();
    serverPostHog = null;
  }
}
