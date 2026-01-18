"use client";

import { useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";

/**
 * Client component that captures ?ref= param and tracks the visit
 * Place this in the root layout to capture all referral visits
 */
export function AffiliateTracker() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (!refCode) return;

    // Track the referral visit
    fetch("/api/affiliates/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: refCode,
        landing_page: pathname,
      }),
    }).catch((err) => {
      console.error("Failed to track referral:", err);
    });
  }, [searchParams, pathname]);

  return null;
}

