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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PlanInfo {
  name: string;
  tier: string;
  price: number;
  credits: number;
  seats: number;
  features: string[];
}

const PLANS: Record<string, PlanInfo> = {
  starter: {
    name: "Starter",
    tier: "starter",
    price: 49,
    credits: 500,
    seats: 1,
    features: [
      "Lead Generation Agent",
      "SEO Content Agent",
      "500 credits/month",
      "1 team seat",
      "Email support",
    ],
  },
  growth: {
    name: "Growth",
    tier: "growth",
    price: 149,
    credits: 2000,
    seats: 3,
    features: [
      "All Starter features",
      "Partnership Agent",
      "2,000 credits/month",
      "3 team seats",
      "All AI models",
      "Email support",
    ],
  },
  scale: {
    name: "Scale",
    tier: "scale",
    price: 399,
    credits: 6000,
    seats: 10,
    features: [
      "All Growth features",
      "6,000 credits/month",
      "10 team seats",
      "Full API access",
      "Custom integrations",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    tier: "enterprise",
    price: 0,
    credits: -1,
    seats: -1,
    features: [
      "All Scale features",
      "Unlimited credits",
      "Unlimited team seats",
      "SSO/SAML",
      "Dedicated support",
      "Custom contracts",
    ],
  },
};

export default function BillingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState("starter");
  const [credits, setCredits] = useState({ used: 0, total: 500 });

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      const supabase = createClient();
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
            setCurrentTier(orgData.subscription_tier || "starter");
            // Credits usage will be fetched from credit_ledger in real implementation
            const creditsTotal =
              PLANS[orgData.subscription_tier || "starter"]?.credits || 500;
            setCredits({
              used: 0, // TODO: Calculate from credit_ledger
              total: creditsTotal,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = PLANS[currentTier] || PLANS.starter;
  const creditsPercentage = Math.min((credits.used / credits.total) * 100, 100);

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
          <Badge variant="default" className="capitalize text-sm px-3 py-1">
            {currentPlan.name}
          </Badge>
        </div>

        <div className="flex items-baseline gap-1 mb-4">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">
            ${currentPlan.price}
          </span>
          {currentPlan.price > 0 && (
            <span className="text-gray-500">/month</span>
          )}
          {currentPlan.price === 0 && (
            <span className="text-gray-500">Custom pricing</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {currentPlan.features.slice(0, 4).map((feature, i) => (
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
          <Button variant="outline" disabled>
            Manage Subscription
          </Button>
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
              Track your monthly credit consumption
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
            Credits reset on the 1st of each month
          </p>
        </div>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Available Plans
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(PLANS).map(([key, plan]) => (
            <Card
              key={key}
              className={`p-4 ${
                key === currentTier
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-900/10"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {plan.name}
                </h4>
                {key === currentTier && (
                  <Badge variant="info" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>
              <div className="mb-3">
                {plan.price > 0 ? (
                  <>
                    <span className="text-2xl font-bold">${plan.price}</span>
                    <span className="text-sm text-gray-500">/mo</span>
                  </>
                ) : (
                  <span className="text-lg font-medium text-gray-600">
                    Custom
                  </span>
                )}
              </div>
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
