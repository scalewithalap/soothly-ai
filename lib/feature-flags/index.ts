/**
 * Feature Flags Utility
 *
 * Check if features are enabled based on flags, rollout percentage, and tiers.
 */

import { createClient } from "@supabase/supabase-js";

interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  allowed_tiers: string[];
  metadata: Record<string, unknown>;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * Check if a feature is enabled for a user
 *
 * @param flagName - Name of the feature flag
 * @param userId - Optional user ID for rollout percentage check
 * @param userTier - Optional user's subscription tier
 */
export async function isFeatureEnabled(
  flagName: string,
  options?: {
    userId?: string;
    userTier?: string;
  },
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: flag, error } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("name", flagName)
      .single();

    if (error || !flag) {
      return false;
    }

    // Check if flag is globally enabled
    if (!flag.enabled) {
      return false;
    }

    // Check tier restrictions if user tier is provided
    if (
      options?.userTier &&
      flag.allowed_tiers.length > 0 &&
      !flag.allowed_tiers.includes(options.userTier)
    ) {
      return false;
    }

    // Check rollout percentage if user ID is provided
    if (options?.userId && flag.rollout_percentage < 100) {
      // Use a deterministic hash of flag name + user ID
      const hash = simpleHash(`${flagName}:${options.userId}`);
      const bucket = hash % 100;
      if (bucket >= flag.rollout_percentage) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to check feature flag:", error);
    return false;
  }
}

/**
 * Get all feature flags (for admin)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("feature_flags")
    .select("*")
    .order("name");

  if (error) {
    console.error("Failed to fetch feature flags:", error);
    return [];
  }

  return data || [];
}

/**
 * Simple deterministic hash function for rollout bucketing
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

