"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Settings,
  CreditCard,
  LogOut,
  Zap,
  Crown,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LanguageContext } from "@/context/language-context";

interface UserProfile {
  email: string;
  fullName: string;
  avatarUrl?: string;
}

interface AccountData {
  user: UserProfile | null;
  credits: number;
  tier: string;
  loading: boolean;
}

export function AccountDropdown() {
  const router = useRouter();
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.header?.account || {}) as Record<string, string>;

  const [accountData, setAccountData] = useState<AccountData>({
    user: null,
    credits: 0,
    tier: "free",
    loading: true,
  });

  const fetchAccountData = async () => {
    try {
      // Fetch user profile
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Fetch credits
      const creditsRes = await fetch("/api/core/credits");
      const creditsJson = creditsRes.ok ? await creditsRes.json() : null;
      const creditsData = creditsJson?.data ?? { balance: 0 };

      // Fetch tier
      const tierRes = await fetch("/api/user/tier");
      const tierData = tierRes.ok ? await tierRes.json() : { tier: "free" };

      setAccountData({
        user: user
          ? {
              email: user.email || "",
              fullName: user.user_metadata?.full_name || "",
              avatarUrl: user.user_metadata?.avatar_url,
            }
          : null,
        credits: creditsData.balance || 0,
        tier: tierData.tier || "free",
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch account data:", error);
      setAccountData((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getTierBadge = () => {
    const tier = accountData.tier;
    if (tier === "enterprise") {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-linear-to-r from-amber-400 to-orange-500 text-white rounded-full">
          Enterprise
        </span>
      );
    }
    if (tier === "scale") {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-linear-to-r from-violet-500 to-purple-600 text-white rounded-full">
          Scale
        </span>
      );
    }
    if (tier === "growth") {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-linear-to-r from-blue-500 to-cyan-500 text-white rounded-full">
          Growth
        </span>
      );
    }
    if (tier === "starter") {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-full">
          Starter
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
        Free
      </span>
    );
  };

  const getInitials = () => {
    const name = accountData.user?.fullName || accountData.user?.email || "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/20">
          <Avatar
            src={accountData.user?.avatarUrl}
            fallback={getInitials()}
            size="sm"
          />
          <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {/* User Info Header */}
        <div className="p-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={accountData.user?.avatarUrl}
              fallback={getInitials()}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {accountData.user?.fullName || "User"}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {accountData.user?.email}
              </p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Credits & Plan */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.credits || "Credits"}
              </span>
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
              {accountData.loading
                ? "..."
                : accountData.credits.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.plan || "Plan"}
              </span>
            </div>
            {getTierBadge()}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuItem
          onClick={() => router.push("/settings/profile")}
          className="cursor-pointer"
        >
          <User className="w-4 h-4 mr-2" />
          {t.profile || "Profile"}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => router.push("/billing")}
          className="cursor-pointer"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {t.billing || "Billing"}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => router.push("/settings")}
          className="cursor-pointer"
        >
          <Settings className="w-4 h-4 mr-2" />
          {t.settings || "Settings"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-600 dark:text-red-400"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t.logout || "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
