"use client";

/**
 * PostHog Provider Component
 *
 * Wraps the app to enable PostHog analytics and error tracking.
 */

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  initPostHog,
  posthog,
  identifyUser,
  captureError,
} from "@/lib/posthog/client";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

interface PostHogProviderProps {
  children: React.ReactNode;
  user?: {
    id: string;
    email?: string;
    name?: string;
  } | null;
}

export function PostHogProvider({ children, user }: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();

    // Set up global error handler
    const handleError = (event: ErrorEvent) => {
      captureError(event.error || new Error(event.message), {
        source: "window_error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      captureError(error, { source: "unhandled_rejection" });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  // Identify user when available
  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, {
        email: user.email,
        name: user.name,
      });
    }
  }, [user]);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}

