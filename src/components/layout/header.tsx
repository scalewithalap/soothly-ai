"use client";

import { useState, useEffect, useContext } from "react";
import { Search, Zap, Crown } from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { AccountDropdown } from "./AccountDropdown";
import { NotificationBell } from "./NotificationBell";
import { LanguageContext } from "@/context/language-context";

export function Header() {
  const { content } = useContent();
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.header || {}) as Record<string, string>;

  const [credits, setCredits] = useState<number | null>(null);
  const [tier, setTier] = useState("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeaderData();
  }, []);

  const fetchHeaderData = async () => {
    try {
      // Fetch credits
      const creditsRes = await fetch("/api/core/credits");
      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCredits(data.data?.balance || 0);
      }

      // Fetch tier
      const tierRes = await fetch("/api/user/tier");
      if (tierRes.ok) {
        const data = await tierRes.json();
        setTier(data.tier || "free");
      }
    } catch (error) {
      console.error("Failed to fetch header data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTierLabel = () => {
    // Capitalize the tier name for display
    if (!tier || tier === "free") return "Free";
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const getTierColors = () => {
    if (tier === "enterprise") {
      return "bg-linear-to-r from-amber-400 to-orange-500 text-white";
    }
    if (tier === "scale") {
      return "bg-linear-to-r from-[#9382FF] to-[#8B5CF6] text-white";
    }
    if (tier === "growth") {
      return "bg-linear-to-r from-blue-500 to-cyan-500 text-white";
    }
    if (tier === "starter") {
      return "bg-linear-to-r from-green-500 to-emerald-500 text-white";
    }
    return "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-4 flex-1">
        {/* Search - Hidden on mobile, visible on desktop */}
        <div className="w-full max-w-sm hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={content.header.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9382FF]/20 text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Credits Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#9382FF]/10 dark:bg-[#9382FF]/20 rounded-full border border-[#9382FF]/20 dark:border-[#9382FF]/30">
          <Zap className="w-4 h-4 text-[#9382FF]" />
          <span className="text-sm font-semibold text-[#9382FF] dark:text-[#9382FF] tabular-nums">
            {loading ? "" : credits?.toLocaleString() || 0}
          </span>
          <span className="text-sm text-[#9382FF] dark:text-[#9382FF]">
            {t.credits || "Credits"}
          </span>
        </div>

        {/* Plan Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1">
          <Crown className="w-4 h-4 text-amber-500" />
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTierColors()}`}
          >
            {getTierLabel()}
          </span>
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Account Dropdown */}
        <div className="pl-2 border-l border-gray-200 dark:border-gray-800">
          <AccountDropdown />
        </div>
      </div>
    </header>
  );
}
