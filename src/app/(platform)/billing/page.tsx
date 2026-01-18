"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CreditCard,
  Zap,
  Check,
  ArrowUpRight,
  Receipt,
  Calendar,
  Gift,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useContent } from "@/hooks/use-content";

interface SubscriptionPlan {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  credits_monthly: number;
  credits_one_time: number;
  max_seats: number;
  is_recurring: boolean;
  support_type: string;
  features: string[];
  agents_access: string[];
  api_access: string;
  display_order: number;
}

export default function BillingSettingsPage() {
  const { content } = useContent();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentTier, setCurrentTier] = useState("free");
  const [credits, setCredits] = useState({ used: 0, total: 50 });
  const [actualCredits, setActualCredits] = useState<number | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const supabase = createClient();

      // Fetch plans from API endpoint (avoids generated type issues)
      const plansRes = await fetch("/api/plans");
      if (plansRes.ok) {
        const { plans: plansData } = await plansRes.json();
        if (plansData) {
          setPlans(plansData);
        }
      }

      // Fetch user's current subscription
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("org_id")
          .eq("id", user.id)
          .single();

        if (userData?.org_id) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("subscription_tier")
            .eq("id", userData.org_id)
            .single();

          if (orgData) {
            const tier = orgData.subscription_tier || "free";
            setCurrentTier(tier);

            // Get plan for credits info from already-fetched plans
            // This is done after the state update
          }
        }
      }

      // Fetch actual credit balance from API
      const creditsRes = await fetch("/api/core/credits");
      if (creditsRes.ok) {
        const creditsJson = await creditsRes.json();
        setActualCredits(creditsJson.data?.balance || 0);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Compute credits based on current plan
  useEffect(() => {
    const currentPlan = plans.find((p) => p.tier === currentTier);
    if (currentPlan) {
      const creditsTotal =
        currentPlan.credits_monthly > 0
          ? currentPlan.credits_monthly
          : currentPlan.credits_one_time || 50;
      setCredits({
        used: 0, // TODO: Calculate from credit_ledger
        total: creditsTotal,
      });
    }
  }, [plans, currentTier]);

  // Find current plan - only fallback to free tier plan or null
  const currentPlan =
    plans.find((p) => p.tier === currentTier) ||
    plans.find((p) => p.tier === "free") ||
    null;

  // Use actualCredits from API for the "used" display (balance means remaining)
  const creditsUsed =
    actualCredits !== null ? Math.max(0, credits.total - actualCredits) : 0;
  const creditsPercentage =
    credits.total > 0 ? Math.min((creditsUsed / credits.total) * 100, 100) : 0;

  const formatPrice = (cents: number) => {
    if (cents === 0) return content.settings.billing.availablePlans.free;
    return `$${(cents / 100).toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#9382FF]/20 dark:bg-[#9382FF]/30">
              <CreditCard className="w-5 h-5 text-[#9382FF] dark:text-[#9382FF]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {content.settings.billing.currentPlan.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {content.settings.billing.currentPlan.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentPlan && !currentPlan.is_recurring && (
              <Badge variant="warning" className="gap-1">
                <Gift className="w-3 h-3" />
                {content.settings.billing.currentPlan.oneTimeBadge}
              </Badge>
            )}
            <Badge variant="default" className="capitalize text-sm px-3 py-1">
              {currentPlan?.name ||
                content.settings.billing.availablePlans.free}
            </Badge>
          </div>
        </div>

        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            {currentPlan
              ? formatPrice(currentPlan.price_monthly)
              : content.settings.billing.availablePlans.free}
          </span>
          {currentPlan && currentPlan.price_monthly > 0 && (
            <span className="text-gray-500">
              {content.settings.billing.currentPlan.monthSuffix}
            </span>
          )}
          {currentPlan?.price_monthly === 0 &&
            currentPlan?.tier === "enterprise" && (
              <span className="text-gray-500">
                {content.settings.billing.currentPlan.customPricing}
              </span>
            )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {currentPlan?.features.slice(0, 4).map((feature, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 dark:text-gray-300">
                {feature}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {currentTier !== "enterprise" && (
            <Button className="gap-2" disabled>
              <ArrowUpRight className="w-4 h-4" />
              {content.settings.billing.currentPlan.upgradeButton}
            </Button>
          )}
          {currentPlan?.is_recurring && (
            <Button variant="outline" disabled>
              {content.settings.billing.currentPlan.manageButton}
            </Button>
          )}
        </div>
      </Card>

      {/* Credits Usage */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
            <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {content.settings.billing.creditUsage.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentPlan?.is_recurring
                ? content.settings.billing.creditUsage.descriptionRecurring
                : content.settings.billing.creditUsage.descriptionOneTime}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {content.settings.billing.creditUsage.usageText
                .replace("{used}", creditsUsed.toLocaleString())
                .replace("{total}", credits.total.toLocaleString())}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(creditsPercentage)}%
            </span>
          </div>
          <Progress value={creditsPercentage} className="h-2" />
          <p className="text-xs text-gray-500">
            {currentPlan?.is_recurring
              ? content.settings.billing.creditUsage.resetTextRecurring
              : content.settings.billing.creditUsage.resetTextOneTime}
          </p>
        </div>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {content.settings.billing.availablePlans.title}
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-4 ${
                plan.tier === currentTier
                  ? "border-[#9382FF] bg-[#9382FF]/10 dark:bg-[#9382FF]/20"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h4>
                {plan.tier === currentTier && (
                  <Badge variant="info" className="text-xs">
                    {content.settings.billing.availablePlans.currentBadge}
                  </Badge>
                )}
              </div>
              <div className="mb-3">
                {plan.price_monthly > 0 ? (
                  <>
                    <span className="text-2xl font-bold">
                      {formatPrice(plan.price_monthly)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {content.settings.billing.availablePlans.monthSuffix}
                    </span>
                  </>
                ) : plan.tier === "enterprise" ? (
                  <span className="text-lg font-medium text-gray-600">
                    {content.settings.billing.availablePlans.custom}
                  </span>
                ) : (
                  <span className="text-2xl font-bold text-green-600">
                    {content.settings.billing.availablePlans.free}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {plan.features.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>

      {/* Invoice History */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <Receipt className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {content.settings.billing.invoiceHistory.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {content.settings.billing.invoiceHistory.description}
            </p>
          </div>
        </div>

        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <Calendar className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-500">
            {content.settings.billing.invoiceHistory.emptyState}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {content.settings.billing.invoiceHistory.emptyStateDesc}
          </p>
        </div>
      </Card>
    </div>
  );
}
