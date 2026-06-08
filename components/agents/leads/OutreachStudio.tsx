"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Mail,
  Sparkles,
  X,
  Building2,
  MapPin,
  Globe,
} from "lucide-react";
import type { Lead } from "./LeadQueue";
import Image from "next/image";

// Custom brand SVGs since lucide-react v1.0 removed them
function Linkedin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function Twitter(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

/**
 * OutreachStudio - Center Pane for Lead Gen Agent
 * Allows reviewing lead details and crafting personalized outreach.
 */

interface EnrichmentData {
  summary?: string;
  techStack?: string[];
  recentNews?: Array<{ title: string; date: string; url: string }>;
  socialLinks?: { linkedin?: string; twitter?: string; website?: string };
}

interface OutreachStudioProps {
  lead?: Lead & { enrichment?: EnrichmentData };
  onSendOutreach: (method: "email" | "linkedin", content: string) => void;
  onSkip: () => void;
}

export function OutreachStudio({
  lead,
  onSendOutreach,
  onSkip,
}: OutreachStudioProps) {
  const [activeTab, setActiveTab] = useState<"email" | "linkedin">("email");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  if (!lead) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a lead to start outreach
      </div>
    );
  }

  const handleAIWrite = async () => {
    if (!lead) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/agents/leads/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          channel: activeTab,
          context: lead.enrichment?.summary || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate outreach");
      }

      const data = await response.json();
      setMessage(data.data?.content || "");
    } catch (error) {
      console.error("AI generation error:", error);
      // Fallback to template if API fails
      setMessage(
        `Hi ${lead.name.split(" ")[0]},\n\nI noticed that ${lead.company} is doing great work. I would love to connect and discuss potential synergies...\n\nBest,\n[Your Name]`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F10]">
      {/* 1. Lead Profile Header */}
      <div className="px-8 py-6 border-b border-white/10 bg-black/20">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-medium text-gray-400">
              {lead.avatar ? (
                <Image
                  src={lead.avatar}
                  alt={lead.name}
                  width={64}
                  height={64}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                lead.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">
                {lead.name}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <span className="font-medium text-gray-400">{lead.title}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {lead.company}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  San Francisco, CA
                </span>
              </div>
              <div className="flex gap-2">
                {lead.enrichment?.socialLinks?.linkedin && (
                  <a
                    href={lead.enrichment.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md bg-white/5 hover:bg-[#0077b5]/20 hover:text-[#0077b5] transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {lead.enrichment?.socialLinks?.twitter && (
                  <a
                    href={lead.enrichment.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md bg-white/5 hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2] transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {lead.enrichment?.socialLinks?.website && (
                  <a
                    href={lead.enrichment.socialLinks.website}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-xs font-mono text-muted-foreground">
              Match Score
            </div>
            <Badge
              variant="outline"
              className="text-xl px-3 py-1 border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
            >
              {lead.aiScore}
            </Badge>
          </div>
        </div>

        {/* Enrichment Summary */}
        <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-300 border border-white/5">
          <p className="leading-relaxed">
            {lead.enrichment?.summary ||
              "AI is researching this lead's background and company details to find the best outreach angle..."}
          </p>
          {lead.enrichment?.techStack && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {lead.enrichment.techStack.map((tech) => (
                <Badge
                  key={tech}
                  variant="secondary"
                  className="bg-white/10 hover:bg-white/20 text-gray-300 border-none font-normal"
                >
                  {tech}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Outreach Composer */}
      <div className="flex-1 flex flex-col p-8 pt-6 overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger
                value="email"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <Mail className="w-4 h-4 mr-2" /> Email
              </TabsTrigger>
              <TabsTrigger
                value="linkedin"
                className="data-[state=active]:bg-[#0077b5]/20 data-[state=active]:text-[#0077b5]"
              >
                <Linkedin className="w-4 h-4 mr-2" /> LinkedIn
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAIWrite}
              disabled={isGenerating}
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              {isGenerating ? (
                <>Generating...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Personalized Draft
                </>
              )}
            </Button>
          </div>

          <TabsContent value="email" className="flex-1 mt-0 relative">
            <Textarea
              placeholder="Draft your email..."
              className="h-full resize-none p-6 text-base leading-relaxed bg-black/20 border-white/10 focus:border-primary/50 font-serif"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="linkedin" className="flex-1 mt-0">
            <Textarea
              placeholder="Draft connection request or InMail..."
              className="h-full resize-none p-6 text-base bg-black/20 border-white/10 focus:border-[#0077b5]/50"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 3. Action Toolbar */}
      <div className="p-6 border-t border-white/10 bg-black/40 flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-muted-foreground hover:text-white"
        >
          <X className="w-4 h-4 mr-2" /> Skip Lead
        </Button>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="bg-white/5 hover:bg-white/10 border border-white/10"
          >
            Save Draft
          </Button>
          <Button
            onClick={() => onSendOutreach(activeTab, message)}
            className="bg-primary hover:bg-primary/90 text-white px-8"
          >
            <Send className="w-4 h-4 mr-2" /> Approve & Send
          </Button>
        </div>
      </div>
    </div>
  );
}
