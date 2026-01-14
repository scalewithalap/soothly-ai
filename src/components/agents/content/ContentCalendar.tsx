"use client";

import { useState } from "react";
import { Plus, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateBriefDialog } from "./CreateBriefDialog";
import { useRouter } from "next/navigation";
import { useContent } from "@/hooks/use-content";
import type { Database } from "@/types/database";

type ContentBrief = Database["public"]["Tables"]["content_briefs"]["Row"];

interface ContentCalendarProps {
  initialBriefs: ContentBrief[];
}

export function ContentCalendar({ initialBriefs }: ContentCalendarProps) {
  const router = useRouter();
  const { content } = useContent();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [briefs] = useState<ContentBrief[]>(initialBriefs);

  const handleBriefCreated = () => {
    setIsDialogOpen(false);
    router.refresh();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500/20 text-green-400 border-green-500/20";
      case "in_progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/20";
      case "review":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-host font-bold text-white">
            {content.agentUI.content.title}
          </h2>
          <p className="text-gray-400">
            Plan and generate SEO-optimized content
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          {content.agentUI.content.createBrief}
        </Button>
      </div>

      {/* Content Grid */}
      {briefs.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/10 rounded-xl">
          <FileText className="h-12 w-12 mx-auto text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No content briefs yet
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Create your first content brief to start generating SEO-optimized
            articles with AI.
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            {content.agentUI.content.createBrief}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {briefs.map((brief) => (
            <div
              key={brief.id}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-md transition-all hover:bg-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-linear-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-purple-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(
                    brief.status
                  )}`}
                >
                  {(brief.status ?? "draft").replace("_", " ")}
                </div>
              </div>

              <h4 className="font-bold text-white mb-1">{brief.title}</h4>
              <p className="text-sm text-gray-400 mb-4">
                {content.agentUI.content.topic}: {brief.primary_keyword}
              </p>

              <div className="flex items-center justify-between text-sm pt-4 border-t border-white/10">
                <div className="flex items-center gap-1.5 text-gray-300">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>
                    {content.agentUI.content.wordCount}:{" "}
                    {brief.target_word_count}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {(brief.content_type ?? "blog_post").replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateBriefDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleBriefCreated}
      />
    </div>
  );
}
