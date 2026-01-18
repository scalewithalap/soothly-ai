"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target, BarChart3, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateCampaignDialog } from "./CreateCampaignDialog";
import { useContent } from "@/hooks/use-content";
import type { Database } from "@/types/database";

type LeadCampaign = Database["public"]["Tables"]["lead_campaigns"]["Row"];

interface LeadCampaignListProps {
  initialCampaigns: LeadCampaign[];
}

export function LeadCampaignList({ initialCampaigns }: LeadCampaignListProps) {
  const router = useRouter();
  const { content } = useContent();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [campaigns] = useState<LeadCampaign[]>(initialCampaigns);

  const handleCampaignCreated = () => {
    setIsDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-host font-bold text-white">
            {content.agentUI.leadGen.title}
          </h2>
          <p className="text-gray-400">Manage your lead generation campaigns</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          {content.agentUI.leadGen.createCampaign}
        </Button>
      </div>

      {/* Campaign Grid */}
      {campaigns.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-xl">
          <Target className="h-12 w-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No campaigns yet
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Create your first lead generation campaign to start finding and
            qualifying potential customers automatically.
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            {content.agentUI.leadGen.createCampaign}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all hover:bg-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-linear-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400">
                  <Target className="h-5 w-5" />
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded-full border ${
                    campaign.status === "active"
                      ? "bg-green-500/20 text-green-400 border-green-500/20"
                      : campaign.status === "paused"
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
                      : "bg-gray-500/20 text-gray-400 border-gray-500/20"
                  }`}
                >
                  {campaign.status}
                </div>
              </div>

              <h4 className="font-bold text-white mb-1">{campaign.name}</h4>
              <p className="text-sm text-gray-400 mb-4">
                {campaign.description || "No description"}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm pt-4 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <BarChart3 className="h-4 w-4 text-gray-500" />
                  <span>
                    {content.agentUI.leadGen.leadsFound}:{" "}
                    {campaign.leads_collected}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>
                    {content.agentUI.leadGen.outreachStatus}:{" "}
                    {campaign.leads_contacted}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateCampaignDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleCampaignCreated}
      />
    </div>
  );
}

