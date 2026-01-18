"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Globe, Users, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useContent } from "@/hooks/use-content";
import type { Database } from "@/types/database";

type Partner = Database["public"]["Tables"]["partners"]["Row"];

export function PartnerDiscovery() {
  const router = useRouter();
  const { content } = useContent();
  const [isSearching, setIsSearching] = useState(false);
  const [industry, setIndustry] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch partners on mount
  useEffect(() => {
    async function fetchPartners() {
      try {
        const response = await fetch("/api/agents/partners");
        if (response.ok) {
          const data = await response.json();
          setPartners(data.partners || []);
        }
      } catch (error) {
        console.error("Failed to fetch partners:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPartners();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry) return;

    setIsSearching(true);
    try {
      const response = await fetch("/api/agents/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry, partner_type: "affiliate" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start discovery");
      }

      toast.success("Discovery job started. Check back soon for results.");
      setIndustry("");
      router.refresh();

      // Refresh partners list
      const refreshResponse = await fetch("/api/agents/partners");
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setPartners(data.partners || []);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start discovery"
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-host font-bold text-white">
          {content.agentUI.partners.title}
        </h2>
        <p className="text-gray-400">Discover and recruit new partners</p>
      </div>

      {/* Discovery Form */}
      <div className="rounded-xl border border-white/10 bg-linear-to-br from-pink-500/5 to-purple-500/5 p-6 backdrop-blur-md">
        <form onSubmit={handleSearch} className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {content.agentUI.partners.industry}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., SaaS Marketing Agencies"
                className="pl-9 bg-black/20 border-white/10 focus:border-pink-500/50"
                disabled={isSearching}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isSearching || !industry}
            className="bg-pink-600 hover:bg-pink-500 text-white min-w-[140px]"
          >
            {isSearching
              ? "Searching..."
              : content.agentUI.partners.findPartners}
          </Button>
        </form>
      </div>

      {/* Partners Grid */}
      <h3 className="text-lg font-bold text-white pt-4">Recruited Partners</h3>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400">
          Loading partners...
        </div>
      ) : partners.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
          <p className="text-gray-400">
            No partners yet. Start a discovery to find partners.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all hover:bg-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-linear-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400">
                  <Globe className="h-5 w-5" />
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded-full border ${
                    partner.status === "active"
                      ? "bg-green-500/20 text-green-400 border-green-500/20"
                      : "bg-gray-500/20 text-gray-400 border-gray-500/20"
                  }`}
                >
                  {partner.status}
                </div>
              </div>

              <h4 className="font-bold text-white mb-1">{partner.name}</h4>
              <p className="text-sm text-gray-400 mb-4">
                {partner.type} • {partner.tier}
              </p>

              <div className="flex items-center justify-between text-sm pt-4 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Handshake className="h-4 w-4 text-gray-500" />
                  <span>
                    {content.agentUI.partners.fitScore}: {partner.fit_score}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{partner.total_referrals} referrals</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

