/**
 * PostHog Client-Side Initialization
 *
 * For browser-side analytics, error tracking, and session replay.
 */

import posthog from "posthog-js";

export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
export const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

/**
 * Initialize PostHog on the client side
 */
export function initPostHog(): void {
  if (typeof window === "undefined") return;
  if (initialized) return;
  if (!POSTHOG_KEY) {
    console.warn("PostHog key not configured - analytics disabled");
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false, // We capture manually in the provider
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
      },
    },
  });

  initialized = true;
}

/**
 * Identify a user for analytics
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized || typeof window === "undefined") return;
  posthog.identify(userId, properties);
}

/**
 * Reset user identity (on logout)
 */
export function resetUser(): void {
  if (!initialized || typeof window === "undefined") return;
  posthog.reset();
}

/**
 * Capture a custom event
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized || typeof window === "undefined") return;
  posthog.capture(eventName, properties);
}

/**
 * Capture an error
 */
export function captureError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  if (!initialized || typeof window === "undefined") return;
  posthog.capture("$exception", {
    $exception_message: error.message,
    $exception_type: error.name,
    $exception_stack_trace_raw: error.stack,
    ...context,
  });
}

export { posthog };
