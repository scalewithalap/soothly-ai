"use client";

import { useState } from "react";
import { Search, Globe, Users, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function PartnerDiscovery() {
  const [isSearching, setIsSearching] = useState(false);
  const [industry, setIndustry] = useState("");

  // MOCK DICTIONARY
  const dict = {
    agentUI: {
      partners: {
        title: "Partnerships",
        findPartners: "Find Partners",
        industry: "Target Industry",
        partnerType: "Partner Type",
      },
    },
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry) return;

    setIsSearching(true);
    try {
      // TODO: Call API
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("Discovery job started. Check back soon for results.");
    } catch {
      toast.error("Failed to start discovery");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-host font-bold text-white">
          {dict.agentUI.partners.title}
        </h2>
        <p className="text-gray-400">Discover and recruit new partners</p>
      </div>

      {/* Discovery Form */}
      <div className="rounded-xl border border-white/10 bg-linear-to-br from-pink-500/5 to-purple-500/5 p-6 backdrop-blur-md">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {dict.agentUI.partners.industry}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. SaaS Marketing Agencies"
                className="pl-9 bg-black/20 border-white/10 focus:border-pink-500/50"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isSearching || !industry}
            className="bg-pink-600 hover:bg-pink-500 text-white min-w-[140px]"
          >
            {isSearching ? "Searching..." : dict.agentUI.partners.findPartners}
          </Button>
        </form>
      </div>

      {/* Recent Partners Grid (Placeholder) */}
      <h3 className="text-lg font-bold text-white pt-4">Recruited Partners</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all hover:bg-white/10"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-10 w-10 rounded-lg bg-linear-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400">
                <Globe className="h-5 w-5" />
              </div>
              <div className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/20">
                Active
              </div>
            </div>

            <h4 className="font-bold text-white mb-1">TechGrowth Agency</h4>
            <p className="text-sm text-gray-400 mb-4">
              Marketing Partner • USA
            </p>

            <div className="flex items-center justify-between text-sm pt-4 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-gray-300">
                <Handshake className="h-4 w-4 text-gray-500" />
                <span>$2.4k rev</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-300">
                <Users className="h-4 w-4 text-gray-500" />
                <span>12 referrals</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
