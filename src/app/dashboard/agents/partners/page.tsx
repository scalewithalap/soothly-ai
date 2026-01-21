"use client";

import { useState, useEffect, useCallback } from "react";
import { AgentWorkspace } from "@/components/agents/workspace/AgentWorkspace";
import {
  PartnerPipeline,
  type Partner,
} from "@/components/agents/partners/PartnerPipeline";
import { DealRoom } from "@/components/agents/partners/DealRoom";
import { PartnerScorecard } from "@/components/agents/partners/PartnerScorecard";
import { toast } from "sonner";

interface APIPartner {
  id: string;
  name: string;
  type: string;
  status: string;
  fit_score: number;
  website?: string;
  logo_url?: string;
  linkedin_url?: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

interface QualificationResult {
  fit_score: number;
  breakdown: {
    audience_overlap: number;
    product_fit: number;
    brand_alignment: number;
    market_reach: number;
  };
  strengths: string[];
  concerns: string[];
  recommendation: "proceed" | "maybe" | "pass";
  reasoning: string;
}

interface PartnerDetails {
  partner: {
    id: string;
    name: string;
    type: string;
    status: string;
    fitScore: number;
    website?: string;
    contactPerson?: string;
    description?: string;
  };
  qualification: QualificationResult | null;
}

function mapAPIPartner(p: APIPartner): Partner {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    status: p.status as Partner["status"],
    fitScore: p.fit_score || 0,
    logoUrl: p.logo_url,
    updatedAt: formatRelativeTime(p.updated_at),
  };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function PartnershipPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerDetails, setPartnerDetails] = useState<PartnerDetails | null>(
    null,
  );

  // Fetch all partners on mount
  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agents/partners");
      if (!response.ok) throw new Error("Failed to fetch partners");

      const data = await response.json();
      const mapped = (data.data?.partners || []).map(mapAPIPartner);
      setPartners(mapped);

      // Auto-select first partner
      if (mapped.length > 0 && !activePartnerId) {
        setActivePartnerId(mapped[0].id);
      }
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to load partners");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch partner details when selection changes
  const fetchPartnerDetails = useCallback(async (partnerId: string) => {
    try {
      const response = await fetch(`/api/agents/partners/${partnerId}`);
      if (response.ok) {
        const data = await response.json();
        setPartnerDetails(data.data);
      }
    } catch (error) {
      console.error("Error fetching partner details:", error);
    }
  }, []);

  useEffect(() => {
    if (activePartnerId) {
      fetchPartnerDetails(activePartnerId);
    }
  }, [activePartnerId, fetchPartnerDetails]);

  const activePartner = partners.find((p) => p.id === activePartnerId);

  const handleSendMessage = async (content: string) => {
    if (!activePartnerId || !content.trim()) return;

    toast.success("Message sent to partner");
    // Future: POST to /api/agents/partners/[id]/outreach
  };

  // Build props for DealRoom
  const dealRoomPartner =
    activePartner && partnerDetails
      ? {
          ...activePartner,
          website: partnerDetails.partner.website,
          contactPerson: partnerDetails.partner.contactPerson,
          description: partnerDetails.partner.description,
        }
      : activePartner
        ? { ...activePartner }
        : undefined;

  return (
    <AgentWorkspace
      queue={
        <PartnerPipeline
          partners={partners}
          activePartnerId={activePartnerId || undefined}
          onSelectPartner={setActivePartnerId}
          isLoading={isLoading}
        />
      }
      execution={
        <DealRoom partner={dealRoomPartner} onSendMessage={handleSendMessage} />
      }
      insight={
        <PartnerScorecard
          partnerName={activePartner?.name}
          qualification={partnerDetails?.qualification || undefined}
        />
      }
    />
  );
}
