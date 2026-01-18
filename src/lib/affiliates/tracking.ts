/**
 * Affiliate Tracking Service
 * Handles referral code detection, cookie management, and attribution
 */

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Affiliate, AffiliateReferral } from "./types";

type AnyClient = any;

const AFFILIATE_COOKIE_NAME = "zh_ref";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export interface AffiliateTrackingResult {
  tracked: boolean;
  affiliateId?: string;
  referralCode?: string;
}

/**
 * Store referral code in cookie when user visits with ?ref= param
 */
export async function trackReferralVisit(
  referralCode: string,
  metadata?: {
    landingPage?: string;
    ipAddress?: string;
    userAgent?: string;
  },
): Promise<AffiliateTrackingResult> {
  try {
    const supabase = (await createClient()) as AnyClient;

    // Verify the referral code exists and affiliate is active
    const { data: affiliate, error } = (await supabase
      .from("affiliates")
      .select("id, status")
      .eq("referral_code", referralCode)
      .single()) as {
      data: Pick<Affiliate, "id" | "status"> | null;
      error: unknown;
    };

    if (error || !affiliate || affiliate.status !== "approved") {
      return { tracked: false };
    }

    // Store in cookie
    const cookieStore = await cookies();
    cookieStore.set(AFFILIATE_COOKIE_NAME, referralCode, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    // Record the click
    await supabase.from("affiliate_referrals").insert({
      affiliate_id: affiliate.id,
      referral_code: referralCode,
      status: "clicked",
      landing_page: metadata?.landingPage,
      ip_address: metadata?.ipAddress,
      user_agent: metadata?.userAgent,
    });

    // Increment referral count
    await supabase.rpc("increment_affiliate_referrals", {
      p_affiliate_id: affiliate.id,
    });

    return {
      tracked: true,
      affiliateId: affiliate.id,
      referralCode,
    };
  } catch (error) {
    console.error("Error tracking referral:", error);
    return { tracked: false };
  }
}

/**
 * Get stored referral code from cookie
 */
export async function getStoredReferralCode(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(AFFILIATE_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

/**
 * Clear referral cookie after conversion
 */
export async function clearReferralCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AFFILIATE_COOKIE_NAME);
  } catch {
    // Ignore errors
  }
}

/**
 * Attribute a signup to an affiliate
 */
export async function attributeSignup(userId: string): Promise<boolean> {
  try {
    const referralCode = await getStoredReferralCode();
    if (!referralCode) return false;

    const supabase = (await createClient()) as AnyClient;

    // Find the affiliate
    const { data: affiliate, error: affError } = await supabase
      .from("affiliates")
      .select("id")
      .eq("referral_code", referralCode)
      .single();

    if (affError || !affiliate) return false;

    // Update or create referral record
    const { error: refError } = await supabase
      .from("affiliate_referrals")
      .update({
        referred_user_id: userId,
        status: "signed_up",
      })
      .eq("referral_code", referralCode)
      .eq("status", "clicked")
      .order("created_at", { ascending: false })
      .limit(1);

    if (refError) {
      // If update fails, create new record
      await supabase.from("affiliate_referrals").insert({
        affiliate_id: affiliate.id,
        referred_user_id: userId,
        referral_code: referralCode,
        status: "signed_up",
      });
    }

    // Update affiliate conversion count
    await supabase.rpc("increment_affiliate_conversions", {
      p_affiliate_id: affiliate.id,
    });

    return true;
  } catch (error) {
    console.error("Error attributing signup:", error);
    return false;
  }
}

/**
 * Generate a unique referral code
 */
export function generateReferralCode(prefix?: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = prefix ? `${prefix.toUpperCase()}-` : "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

