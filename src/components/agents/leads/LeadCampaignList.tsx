"use client";

import { useState } from "react";
import { Plus, Users, BarChart3, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateCampaignDialog } from "./CreateCampaignDialog";
import type { LeadCampaign } from "@/types/database";
import { cn } from "@/lib/utils";

interface LeadCampaignListProps {
  initialCampaigns: LeadCampaign[];
}

export function LeadCampaignList({ initialCampaigns }: LeadCampaignListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [campaigns] = useState<LeadCampaign[]>(initialCampaigns);

  // MOCK DICTIONARY
  const dict = {
    agentUI: {
      leadGen: {
        title: "Lead Generation",
        createCampaign: "Create Campaign",
        leadsFound: "Leads Found",
        enrichmentStatus: "Enrichment",
        score: "Avg Score",
        outreachStatus: "Outreach",
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-host font-bold text-white">
            {dict.agentUI.leadGen.title}
          </h2>
          <p className="text-gray-400">Manage your outreach campaigns</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          {dict.agentUI.leadGen.createCampaign}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="mb-4 flex items-center justify-between">
              <div
                className={cn(
                  "rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wider",
                  campaign.status === "active"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-500/20 text-gray-400"
                )}
              >
                {campaign.status}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>

            <h3 className="mb-2 font-host text-lg font-bold text-white">
              {campaign.name}
            </h3>

            <div className="grid grid-cols-3 gap-2 py-4">
              <div className="text-center">
                <div className="mb-1 flex justify-center text-gray-400">
                  <Users className="h-4 w-4" />
                </div>
                <div className="text-lg font-bold text-white">
                  {campaign.leads_collected}
                </div>
                <div className="text-xs text-gray-500">
                  {dict.agentUI.leadGen.leadsFound}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-1 flex justify-center text-gray-400">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="text-lg font-bold text-white">
                  {/* Mocking avg score logic for now */}
                  0%
                </div>
                <div className="text-xs text-gray-500">
                  {dict.agentUI.leadGen.score}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-1 flex justify-center text-gray-400">
                  <Send className="h-4 w-4" />
                </div>
                <div className="text-lg font-bold text-white">
                  {campaign.leads_contacted}
                </div>
                <div className="text-xs text-gray-500">
                  {dict.agentUI.leadGen.outreachStatus}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              View Details
            </Button>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-xl">
            <p className="text-gray-400">
              No campaigns yet. Create one to get started.
            </p>
          </div>
        )}
      </div>

      <CreateCampaignDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          // In real app, we would invalidate queries or refresh router
          console.log("Refresh list");
        }}
      />
    </div>
  );
}
