"use client";

import { useState, useEffect, useCallback } from "react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

interface UserTier {
  tier: string;
  isLoading: boolean;
}

export function useRequirePremium() {
  const [userTier, setUserTier] = useState<UserTier>({
    tier: "free",
    isLoading: true,
  });
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState<string | undefined>();

  const fetchUserTier = async () => {
    try {
      const res = await fetch("/api/user/tier");
      if (res.ok) {
        const data = await res.json();
        setUserTier({ tier: data.tier || "free", isLoading: false });
      } else {
        setUserTier({ tier: "free", isLoading: false });
      }
    } catch {
      setUserTier({ tier: "free", isLoading: false });
    }
  };

  useEffect(() => {
    fetchUserTier();
  }, []);

  const isPremium = userTier.tier !== "free";
  const isEnterprise = userTier.tier === "enterprise";

  /**
   * Checks if user has premium access. If not, shows upgrade modal.
   * @param featureName - Optional name of the feature being accessed
   * @returns true if user can proceed, false if blocked
   */
  const requirePremium = useCallback(
    (featureName?: string): boolean => {
      if (userTier.isLoading) return false;

      if (!isPremium) {
        setBlockedFeature(featureName);
        setUpgradeModalOpen(true);
        return false;
      }

      return true;
    },
    [userTier.isLoading, isPremium]
  );

  /**
   * Checks if user has enterprise access.
   */
  const requireEnterprise = useCallback(
    (featureName?: string): boolean => {
      if (userTier.isLoading) return false;

      if (!isEnterprise) {
        setBlockedFeature(featureName);
        setUpgradeModalOpen(true);
        return false;
      }

      return true;
    },
    [userTier.isLoading, isEnterprise]
  );

  const UpgradeModalComponent = () => (
    <UpgradeModal
      open={upgradeModalOpen}
      onClose={() => setUpgradeModalOpen(false)}
      feature={blockedFeature}
    />
  );

  return {
    tier: userTier.tier,
    isLoading: userTier.isLoading,
    isPremium,
    isEnterprise,
    requirePremium,
    requireEnterprise,
    UpgradeModal: UpgradeModalComponent,
  };
}
