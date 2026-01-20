"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Sparkles,
  Brain,
  Zap,
  Lock,
  ArrowRight,
  Loader2,
  BarChart3,
  Users,
  FileText,
  Shield,
  DollarSign,
  TrendingUp,
  Bot,
} from "lucide-react";
import { ChatInterface } from "@/components/agents/ChatInterface";
import { useContent } from "@/hooks/use-content";
import { SUPERAGENT_METADATA } from "@/agents/base/types";

interface UserTierData {
  tier: string;
  hasAccess: boolean;
}

// Agent icons for the dashboard
const AGENT_ICONS: Record<string, React.ReactNode> = {
  leads: <Users className="w-5 h-5" />,
  content: <FileText className="w-5 h-5" />,
  partners: <TrendingUp className="w-5 h-5" />,
  contracts: <FileText className="w-5 h-5" />,
  compliance: <Shield className="w-5 h-5" />,
  receivables: <DollarSign className="w-5 h-5" />,
  spend: <BarChart3 className="w-5 h-5" />,
  pricing: <TrendingUp className="w-5 h-5" />,
};

export default function SuperagentPage() {
  const router = useRouter();
  const { content } = useContent();
  const t = content.superagentPage || {};

  const [loading, setLoading] = useState(true);
  const [tierData, setTierData] = useState<UserTierData | null>(null);

  // Check user subscription tier
  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch("/api/user/tier");
        if (!response.ok) throw new Error("Failed to fetch tier");

        const { tier } = await response.json();
        const hasAccess = tier !== "free";
        setTierData({ tier, hasAccess });
      } catch (error) {
        console.error("Failed to check access:", error);
        setTierData({ tier: "free", hasAccess: false });
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#9382FF]" />
      </div>
    );
  }

  // Upsell for free tier users
  if (!tierData?.hasAccess) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <Card className="overflow-hidden">
          {/* Premium gradient header */}
          <div className="bg-linear-to-br from-[#9382FF] via-purple-600 to-indigo-700 p-8 text-white relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Crown className="w-8 h-8" />
                </div>
                <div>
                  <Badge
                    variant="error"
                    className="bg-white/20 text-white border-0"
                  >
                    {t.premiumBadge || "Premium Feature"}
                  </Badge>
                </div>
              </div>

              <h1 className="text-3xl font-bold mb-3">
                {t.title || "Superagent"}
              </h1>
              <p className="text-lg text-white/80 max-w-xl">
                {t.description || SUPERAGENT_METADATA.longDescription}
              </p>
            </div>
          </div>

          {/* Features list */}
          <div className="p-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              {t.featuresTitle || "What Superagent Can Do"}
            </h2>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                {
                  icon: <Brain className="w-5 h-5 text-[#9382FF]" />,
                  title: t.feature1 || "Cross-Agent Intelligence",
                  desc:
                    t.feature1Desc ||
                    "See patterns across all your agents that individual agents can't detect.",
                },
                {
                  icon: <Zap className="w-5 h-5 text-amber-500" />,
                  title: t.feature2 || "Unified Command Center",
                  desc:
                    t.feature2Desc ||
                    "Control all agents from one conversation interface.",
                },
                {
                  icon: <BarChart3 className="w-5 h-5 text-green-500" />,
                  title: t.feature3 || "Business Health Dashboard",
                  desc:
                    t.feature3Desc ||
                    "Get real-time insights across leads, content, finance, and operations.",
                },
                {
                  icon: <Sparkles className="w-5 h-5 text-blue-500" />,
                  title: t.feature4 || "Strategic Recommendations",
                  desc:
                    t.feature4Desc ||
                    "Receive prioritized action items based on all your data.",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800"
                >
                  <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 h-fit">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center text-center p-6 rounded-xl bg-linear-to-r from-[#9382FF]/10 to-[#8B5CF6]/10 dark:from-[#9382FF]/20 dark:to-[#8B5CF6]/20">
              <Lock className="w-10 h-10 text-[#9382FF] mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t.upgradeTitle || "Unlock Superagent"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                {t.upgradeDesc ||
                  "Upgrade to any paid plan to access Superagent and take control of all your AI agents from one place."}
              </p>
              <Button
                size="lg"
                onClick={() => router.push("/billing")}
                className="gap-2 bg-linear-to-r from-[#9382FF] to-purple-600 hover:from-[#7B6AF0] hover:to-purple-700"
              >
                {t.upgradeButton || "View Plans"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Full Superagent experience for paid users
  return (
    <div className="h-[calc(100vh-120px)] flex gap-6">
      {/* Chat Interface - Main area */}
      <div className="flex-1 min-w-0">
        <ChatInterface
          agentType="superagent"
          agentName="Superagent"
          agentIcon={<Crown className="w-5 h-5 text-amber-500" />}
          className="h-full"
        />
      </div>

      {/* Sidebar - Agent Status Dashboard */}
      <div className="w-80 shrink-0 hidden lg:block">
        <Card className="h-full p-4 overflow-auto">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-[#9382FF]" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t.agentStatus || "Agent Status"}
            </h3>
          </div>

          <div className="space-y-3">
            {Object.entries(AGENT_ICONS).map(([agentType, icon]) => (
              <button
                key={agentType}
                onClick={() => router.push(`/agents/${agentType}`)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-[#9382FF]/40 dark:hover:border-[#9382FF]/40 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {agentType}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {t.clickToView || "Click to view"}
                  </p>
                </div>
                <Badge
                  variant="info"
                  className="text-green-600 border-green-200 dark:border-green-800"
                >
                  {t.online || "Online"}
                </Badge>
              </button>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t.quickActions || "Quick Actions"}
            </h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => router.push("/library")}
              >
                <FileText className="w-4 h-4" />
                {t.viewAssets || "View Assets Library"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => router.push("/billing/ledger")}
              >
                <BarChart3 className="w-4 h-4" />
                {t.viewUsage || "Usage Stats"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
