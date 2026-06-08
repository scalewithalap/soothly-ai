"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Circle,
  Mail,
  User,
  Settings,
  Zap,
  LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingUser } from "./OnboardingQueue";

/**
 * JourneyMap - Center Pane for Onboarding Agent
 * Visual representation of user's onboarding journey.
 */

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: "setup" | "integration" | "content" | "team";
  status: "pending" | "completed" | "skipped";
  estimatedMinutes: number;
  completedAt?: string;
}

export interface NudgeEvent {
  id: string;
  type: "email" | "sms";
  subject: string;
  sentAt: string;
  status: "sent" | "opened" | "clicked";
}

interface JourneyMapProps {
  user?: OnboardingUser;
  tasks: OnboardingTask[];
  nudges: NudgeEvent[];
  onCompleteTask: (taskId: string) => void;
  onSkipTask: (taskId: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  setup: <User className="w-4 h-4" />,
  integration: <LinkIcon className="w-4 h-4" />,
  content: <Zap className="w-4 h-4" />,
  team: <Settings className="w-4 h-4" />,
};

export function JourneyMap({
  user,
  tasks,
  nudges,
  onCompleteTask,
  onSkipTask,
}: JourneyMapProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "timeline">("tasks");

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 bg-[#0F0F10]">
        <User className="w-12 h-12 opacity-20" />
        <p>Select a user to view their journey</p>
      </div>
    );
  }

  const groupedTasks = tasks.reduce(
    (acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    },
    {} as Record<string, OnboardingTask[]>,
  );

  return (
    <div className="flex flex-col h-full bg-[#0F0F10] border-r border-white/10">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/10 bg-black/20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-white mb-1">
              {user.name}'s Journey
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>{user.email}</span>
              <Badge
                variant="outline"
                className="border-blue-500/20 text-blue-400 text-[10px]"
              >
                {user.role}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {user.progress}%
            </div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-4 border-b border-white/10">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "tasks"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-300",
            )}
          >
            Checklist
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "timeline"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-300",
            )}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-8">
          {activeTab === "tasks" ? (
            <div className="space-y-8">
              {Object.entries(groupedTasks).map(([category, categoryTasks]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                    {CATEGORY_ICONS[category]} {category}
                  </h3>
                  <div className="space-y-3">
                    {categoryTasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                          task.status === "completed"
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-white/5 border-white/10 hover:border-white/20",
                        )}
                      >
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                            task.status === "completed"
                              ? "bg-emerald-500 text-white"
                              : "border border-white/20",
                          )}
                        >
                          {task.status === "completed" ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Circle className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-200">
                            {task.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {task.description}
                          </div>
                        </div>
                        {task.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-gray-500 hover:text-gray-300"
                              onClick={() => onSkipTask(task.id)}
                            >
                              Skip
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs bg-blue-600 hover:bg-blue-700"
                              onClick={() => onCompleteTask(task.id)}
                            >
                              Complete
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                Nudge History
              </h3>
              {nudges.length === 0 ? (
                <p className="text-sm text-gray-500">No nudges sent yet.</p>
              ) : (
                nudges.map((nudge) => (
                  <div
                    key={nudge.id}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5"
                  >
                    <Mail className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-gray-200">
                        {nudge.subject}
                      </div>
                      <div className="text-xs text-gray-500">
                        {nudge.sentAt}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "text-[10px]",
                        nudge.status === "clicked"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : nudge.status === "opened"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-gray-500/10 text-gray-400",
                      )}
                    >
                      {nudge.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
