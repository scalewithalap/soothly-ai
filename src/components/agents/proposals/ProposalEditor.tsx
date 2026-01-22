"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Save,
  Download,
  Send,
  Wand2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Prospect } from "./ProposalQueue";

/**
 * ProposalEditor - Center Pane for Proposal Generator Agent
 * View and edit the AI-generated proposal content.
 */

export interface ProposalContent {
  title: string;
  executiveSummary: string;
  challenge: string;
  solution: string;
  outcomes: string[];
  whyUs: string[];
  pricing: Array<{ item: string; price: number }>;
}

interface ProposalEditorProps {
  prospect?: Prospect;
  content?: ProposalContent;
  status: "active" | "draft" | "sent";
  onSave: (content: ProposalContent) => void;
  onSend: () => void;
  onRegenerate: (section: string) => void;
}

export function ProposalEditor({
  prospect,
  content,
  status,
  onSave,
  onSend,
  onRegenerate,
}: ProposalEditorProps) {
  const [activeContent, setActiveContent] = useState<
    ProposalContent | undefined
  >(content);
  const [editMode, setEditMode] = useState(false);

  if (!prospect || !activeContent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 bg-[#0F0F10]">
        <FileText className="w-12 h-12 opacity-20" />
        <p>Select a prospect to view proposal</p>
      </div>
    );
  }

  const handleUpdate = (field: keyof ProposalContent, value: any) => {
    setActiveContent((prev) =>
      prev ? { ...prev, [field]: value } : undefined,
    );
    setEditMode(true);
  };

  const handleSave = () => {
    if (activeContent) {
      onSave(activeContent);
      setEditMode(false);
      toast.success("Proposal saved successfully");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F10] border-r border-white/10">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 bg-black/20">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
              Proposal for {prospect.companyName}
              <Badge
                variant="outline"
                className="border-purple-500/30 text-purple-400 bg-purple-500/5"
              >
                {status.toUpperCase()}
              </Badge>
            </h1>
            <p className="text-sm text-gray-500">{prospect.websiteUrl}</p>
          </div>
          <div className="flex gap-2">
            {editMode && (
              <Button
                variant="ghost"
                onClick={handleSave}
                className="text-gray-400 hover:text-white"
              >
                <Save className="w-4 h-4 mr-2" /> Save Draft
              </Button>
            )}
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5"
            >
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            <Button
              onClick={onSend}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="w-4 h-4 mr-2" /> Send to Client
            </Button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Executive Summary */}
          <Section
            title="Executive Summary"
            onRegenerate={() => onRegenerate("executiveSummary")}
          >
            <Textarea
              value={activeContent.executiveSummary}
              onChange={(e) => handleUpdate("executiveSummary", e.target.value)}
              className="min-h-[120px] bg-black/20 border-white/5 text-lg leading-relaxed text-gray-300 resize-none focus-visible:ring-1 focus-visible:ring-purple-500/50"
            />
          </Section>

          {/* The Challenge */}
          <Section
            title="The Challenge"
            onRegenerate={() => onRegenerate("challenge")}
          >
            <Textarea
              value={activeContent.challenge}
              onChange={(e) => handleUpdate("challenge", e.target.value)}
              className="min-h-[100px] bg-black/20 border-white/5 text-gray-300"
            />
          </Section>

          {/* The Solution */}
          <Section
            title="Proposed Solution"
            highlight
            onRegenerate={() => onRegenerate("solution")}
          >
            <Textarea
              value={activeContent.solution}
              onChange={(e) => handleUpdate("solution", e.target.value)}
              className="min-h-[150px] bg-purple-500/5 border-purple-500/20 text-gray-200"
            />
          </Section>

          <div className="grid grid-cols-2 gap-8">
            {/* Outcomes */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Expected Outcomes
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onRegenerate("outcomes")}
                >
                  <Wand2 className="h-3 w-3 text-purple-400" />
                </Button>
              </div>
              <div className="space-y-2">
                {activeContent.outcomes.map((outcome, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <Input
                      value={outcome}
                      onChange={(e) => {
                        const newOutcomes = [...activeContent!.outcomes];
                        newOutcomes[i] = e.target.value;
                        handleUpdate("outcomes", newOutcomes);
                      }}
                      className="h-8 bg-transparent border-transparent hover:bg-white/5 focus:bg-white/5"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Why Us */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Why Us?
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onRegenerate("whyUs")}
                >
                  <Wand2 className="h-3 w-3 text-purple-400" />
                </Button>
              </div>
              <div className="space-y-2">
                {activeContent.whyUs.map((reason, i) => (
                  <div key={i} className="flex gap-2">
                    <ChevronRight className="w-4 h-4 text-purple-500 mt-1" />
                    <Input
                      value={reason}
                      onChange={(e) => {
                        const newReasons = [...activeContent!.whyUs];
                        newReasons[i] = e.target.value;
                        handleUpdate("whyUs", newReasons);
                      }}
                      className="h-8 bg-transparent border-transparent hover:bg-white/5 focus:bg-white/5"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function Section({
  title,
  children,
  highlight,
  onRegenerate,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
  onRegenerate?: () => void;
}) {
  return (
    <div
      className={cn(
        "space-y-2 p-4 rounded-lg transition-colors",
        highlight
          ? "bg-purple-500/5 border border-purple-500/10"
          : "hover:bg-white/5",
      )}
    >
      <div className="flex justify-between items-center mb-2">
        <h3
          className={cn(
            "text-sm font-semibold uppercase tracking-wider",
            highlight ? "text-purple-300" : "text-gray-500",
          )}
        >
          {title}
        </h3>
        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-purple-400 hover:text-purple-300"
            onClick={onRegenerate}
          >
            <Wand2 className="w-3 h-3 mr-1.5" /> AI Improve
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
