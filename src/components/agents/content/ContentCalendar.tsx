"use client";

import { useState } from "react";
import { Plus, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateBriefDialog } from "./CreateBriefDialog";
import type { ContentBrief } from "@/types/database";
import { cn } from "@/lib/utils";

interface ContentCalendarProps {
  initialBriefs: ContentBrief[];
}

export function ContentCalendar({ initialBriefs }: ContentCalendarProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [briefs] = useState<ContentBrief[]>(initialBriefs);

  // MOCK DICTIONARY
  const dict = {
    agentUI: {
      content: {
        title: "SEO Content",
        createBrief: "New Article",
        seoScore: "SEO Score",
        publish: "Publish",
      },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "in_progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "draft":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-host font-bold text-white">
            {dict.agentUI.content.title}
          </h2>
          <p className="text-gray-400">Plan and generate SEO content</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          {dict.agentUI.content.createBrief}
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
        <div className="grid grid-cols-12 gap-4 border-b border-white/10 p-4 text-sm font-medium text-gray-400">
          <div className="col-span-5">Article</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Keywords</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        <div className="divide-y divide-white/10">
          {briefs.map((brief) => (
            <div
              key={brief.id}
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
            >
              <div className="col-span-5">
                <h3 className="font-medium text-white line-clamp-1">
                  {brief.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <FileText className="h-3 w-3" />
                  {brief.content_type}
                  <span className="text-gray-600">•</span>
                  {new Date(brief.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="col-span-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    getStatusColor(brief.status)
                  )}
                >
                  {brief.status}
                </span>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-1.5 text-sm text-gray-300">
                  <Search className="h-3 w-3 text-gray-500" />
                  {brief.primary_keyword}
                </div>
              </div>
              <div className="col-span-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white"
                >
                  Edit
                </Button>
              </div>
            </div>
          ))}

          {briefs.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No briefs yet. Start by creating one.
            </div>
          )}
        </div>
      </div>

      <CreateBriefDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => console.log("Refresh list")}
      />
    </div>
  );
}
