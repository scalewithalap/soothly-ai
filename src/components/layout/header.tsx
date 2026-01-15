"use client";

import { useState, useEffect, useContext } from "react";
import { Bell, Search, Zap, Crown } from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { AccountDropdown } from "./AccountDropdown";
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
      return "bg-linear-to-r from-violet-500 to-purple-600 text-white";
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Credits Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-full border border-violet-100 dark:border-violet-800">
          <Zap className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300 tabular-nums">
            {loading ? "" : credits?.toLocaleString() || 0}
          </span>
          <span className="text-sm text-violet-600 dark:text-violet-400">
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
        <button className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
        </button>

        {/* Account Dropdown */}
        <div className="pl-2 border-l border-gray-200 dark:border-gray-800">
          <AccountDropdown />
        </div>
      </div>
    </header>
  );
}
