"use client";

import { useContext } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Check, ArrowRight } from "lucide-react";
import { LanguageContext } from "@/context/language-context";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

const PRO_BENEFITS = [
  "Unlimited AI agent tasks",
  "5,000 credits per month",
  "Priority support",
  "Advanced analytics",
  "Custom integrations",
  "Team collaboration",
];

export function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  const router = useRouter();
  const ctx = useContext(LanguageContext);
  const t = (ctx?.content?.billing?.upgrade || {}) as Record<string, string>;

  const handleUpgrade = () => {
    onClose();
    router.push("/billing");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-linear-to-br from-amber-400 to-orange-500">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-xl">
              {t.title || "Upgrade to Pro"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {feature
              ? `${feature} ${
                  t.featureRequiresPro || "requires a Pro subscription"
                }`
              : t.description ||
                "Unlock the full power of Zero Headache with a Pro subscription."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 rounded-xl bg-linear-to-br from-[#9382FF]/10 to-[#8B5CF6]/10 dark:from-[#9382FF]/20 dark:to-[#8B5CF6]/20 border border-[#9382FF]/20 dark:border-[#9382FF]/30">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-[#9382FF] dark:text-[#9382FF]" />
            <span className="font-semibold text-gray-900 dark:text-white">
              {t.proTitle || "Pro Plan Benefits"}
            </span>
          </div>

          <ul className="space-y-2">
            {PRO_BENEFITS.map((benefit, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <Check className="w-4 h-4 text-green-500 shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.startingAt || "Starting at"}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              $49<span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
          </div>
          <Button onClick={handleUpgrade} className="gap-2">
            {t.upgradeNow || "Upgrade Now"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 mt-2">
          {t.cancelAnytime || "Cancel anytime. No questions asked."}
        </p>
      </DialogContent>
    </Dialog>
  );
}
