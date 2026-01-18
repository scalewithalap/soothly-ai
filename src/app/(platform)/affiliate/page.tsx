"use client";

import { AffiliateDashboard } from "@/components/affiliate/AffiliateDashboard";
import { useContent } from "@/hooks/use-content";

export default function AffiliatePage() {
  const { content } = useContent();
  const t = content.affiliate as any;

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {t?.title || "Affiliate Program"}
        </h1>
        <p className="text-muted-foreground">
          {t?.subtitle ||
            "Earn commissions by referring customers to Zero Headache"}
        </p>
      </div>
      <AffiliateDashboard />
    </div>
  );
}
