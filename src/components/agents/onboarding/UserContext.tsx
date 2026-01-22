"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Zap, Activity } from "lucide-react";
import type { OnboardingUser } from "./OnboardingQueue";

/**
 * UserContext - Right Pane for Onboarding Agent
 * Profile and engagement details for the selected user.
 */

interface UserContextProps {
  user?: OnboardingUser;
  recommendedAgent?: string;
  engagementData?: {
    lastLogin: string;
    totalSessions: number;
    averageSessionDuration: string;
  };
}

export function UserContext({
  user,
  recommendedAgent,
  engagementData,
}: UserContextProps) {
  if (!user) return null;

  return (
    <div className="flex flex-col h-full bg-black/20">
      <div className="p-4 border-b border-white/10">
        <h2 className="font-semibold text-sm tracking-wide flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          User Profile
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Profile Card */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-blue-400">
                {user.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <h3 className="font-medium text-white">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
            <Badge
              variant="outline"
              className="mt-2 border-blue-500/20 text-blue-400"
            >
              {user.role}
            </Badge>
          </div>

          <Separator className="bg-white/10" />

          {/* Key Dates */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Timeline
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Signed Up</span>
                <span className="text-gray-300">{user.signedUpAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Activity</span>
                <span className="text-gray-300">{user.lastActivityAt}</span>
              </div>
            </div>
          </section>

          {engagementData && (
            <>
              <Separator className="bg-white/10" />
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" /> Engagement
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">
                    <div className="text-xl font-bold text-white">
                      {engagementData.totalSessions}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase">
                      Sessions
                    </div>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">
                    <div className="text-xl font-bold text-white">
                      {engagementData.averageSessionDuration}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase">
                      Avg. Time
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {recommendedAgent && (
            <>
              <Separator className="bg-white/10" />
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> AI Recommendation
                </h4>
                <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-200">
                    Based on their role, we recommend activating{" "}
                    <strong>{recommendedAgent}</strong> as their first AI agent.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
