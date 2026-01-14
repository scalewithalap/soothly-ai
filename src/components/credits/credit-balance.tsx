"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, TrendingDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContent } from "@/hooks/use-content";

interface CreditBalanceProps {
  variant?: "sidebar" | "card" | "compact";
  className?: string;
}

export function CreditBalance({
  variant = "sidebar",
  className,
}: CreditBalanceProps) {
  const { content } = useContent();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch("/api/core/credits");
      if (!response.ok) {
        throw new Error("Failed to fetch balance");
      }
      const data = await response.json();
      setBalance(data.balance ?? 0);
    } catch (err) {
      console.error("Failed to fetch credit balance:", err);
      setError("Unable to load");
    } finally {
      setLoading(false);
    }
  };

  const isLowBalance = balance !== null && balance < 500;

  // Sidebar variant - compact with icon
  if (variant === "sidebar") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl",
          isLowBalance
            ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
            : "bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800",
          className
        )}
      >
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            isLowBalance
              ? "bg-amber-100 dark:bg-amber-800"
              : "bg-violet-100 dark:bg-violet-800"
          )}
        >
          {isLowBalance ? (
            <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <Zap className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs font-medium",
              isLowBalance
                ? "text-amber-600 dark:text-amber-400"
                : "text-violet-600 dark:text-violet-400"
            )}
          >
            {content.dashboard.creditBalance.title}
          </p>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              isLowBalance
                ? "text-amber-900 dark:text-amber-100"
                : "text-violet-900 dark:text-violet-100"
            )}
          >
            {loading ? (
              <span className="inline-block w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : error ? (
              <span className="text-red-500 text-xs">{error}</span>
            ) : (
              balance?.toLocaleString()
            )}
          </p>
        </div>
        {isLowBalance && !loading && !error && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 px-2 py-0.5 bg-amber-100 dark:bg-amber-800 rounded-full">
            Low
          </span>
        )}
      </div>
    );
  }

  // Card variant - for dashboard
  if (variant === "card") {
    return (
      <div
        className={cn(
          "p-6 rounded-2xl border",
          isLowBalance
            ? "bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800"
            : "bg-linear-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-violet-200 dark:border-violet-800",
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isLowBalance
                ? "bg-amber-100 dark:bg-amber-800"
                : "bg-violet-100 dark:bg-violet-800"
            )}
          >
            <CreditCard
              className={cn(
                "w-6 h-6",
                isLowBalance
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-violet-600 dark:text-violet-400"
              )}
            />
          </div>
          {isLowBalance && !loading && !error && (
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 px-3 py-1 bg-amber-200/50 dark:bg-amber-700/50 rounded-full">
              {content.dashboard.creditBalance.lowBalanceWarning}
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-sm font-medium mb-1",
            isLowBalance
              ? "text-amber-600 dark:text-amber-400"
              : "text-violet-600 dark:text-violet-400"
          )}
        >
          {content.dashboard.creditBalance.title}
        </p>
        <p
          className={cn(
            "text-3xl font-bold tabular-nums",
            isLowBalance
              ? "text-amber-900 dark:text-amber-100"
              : "text-violet-900 dark:text-violet-100"
          )}
        >
          {loading ? (
            <span className="inline-block w-24 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : error ? (
            <span className="text-red-500 text-lg">{error}</span>
          ) : (
            balance?.toLocaleString()
          )}
        </p>
        {isLowBalance && !loading && !error && (
          <button className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline">
            {content.dashboard.creditBalance.upgradeCTA} →
          </button>
        )}
      </div>
    );
  }

  // Compact variant - just number
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Zap className="w-4 h-4 text-violet-500" />
      <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
        {loading ? "..." : error ? "—" : balance?.toLocaleString()}
      </span>
    </div>
  );
}
