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
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentTier, setCurrentTier] = useState("free");
  const [credits, setCredits] = useState({ used: 0, total: 50 });

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

  const currentPlan = plans.find((p) => p.tier === currentTier) || plans[0];
  const creditsPercentage =
    credits.total > 0 ? Math.min((credits.used / credits.total) * 100, 100) : 0;

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <CreditCard className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Current Plan
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your subscription
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentPlan && !currentPlan.is_recurring && (
              <Badge variant="warning" className="gap-1">
                <Gift className="w-3 h-3" />
                One-time
              </Badge>
            )}
            <Badge variant="default" className="capitalize text-sm px-3 py-1">
              {currentPlan?.name || "Free"}
            </Badge>
          </div>
        </div>

        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            {currentPlan ? formatPrice(currentPlan.price_monthly) : "Free"}
          </span>
          {currentPlan && currentPlan.price_monthly > 0 && (
            <span className="text-gray-500">/month</span>
          )}
          {currentPlan?.price_monthly === 0 &&
            currentPlan?.tier === "enterprise" && (
              <span className="text-gray-500">Custom pricing</span>
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
              Upgrade Plan (Coming Soon)
            </Button>
          )}
          {currentPlan?.is_recurring && (
            <Button variant="outline" disabled>
              Manage Subscription
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
              Credit Usage
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentPlan?.is_recurring
                ? "Track your monthly credit consumption"
                : "Your one-time credits"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {credits.used.toLocaleString()} of{" "}
              {credits.total.toLocaleString()} credits used
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.round(creditsPercentage)}%
            </span>
          </div>
          <Progress value={creditsPercentage} className="h-2" />
          <p className="text-xs text-gray-500">
            {currentPlan?.is_recurring
              ? "Credits reset on the 1st of each month"
              : "One-time credits do not expire"}
          </p>
        </div>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Available Plans
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`p-4 ${
                plan.tier === currentTier
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-900/10"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h4>
                {plan.tier === currentTier && (
                  <Badge variant="info" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>
              <div className="mb-3">
                {plan.price_monthly > 0 ? (
                  <>
                    <span className="text-2xl font-bold">
                      {formatPrice(plan.price_monthly)}
                    </span>
                    <span className="text-sm text-gray-500">/mo</span>
                  </>
                ) : plan.tier === "enterprise" ? (
                  <span className="text-lg font-medium text-gray-600">
                    Custom
                  </span>
                ) : (
                  <span className="text-2xl font-bold text-green-600">
                    Free
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
              Invoice History
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Download past invoices
            </p>
          </div>
        </div>

        <div className="p-8 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <Calendar className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-500">No invoices yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Invoices will appear here after your first payment
          </p>
        </div>
      </Card>
    </div>
  );
}
