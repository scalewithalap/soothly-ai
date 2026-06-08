"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * AgentWorkspace - The Standard 3-Pane Layout for all Soothly AI Agents.
 *
 * Enforced by frontend-design/SKILL.md §2 "Unified Workspace Pattern".
 *
 * @param queue - Left Pane (20%): Input stream (Tickets, Leads, Drafts).
 * @param execution - Center Pane (50%): The Work (Chat, Editor).
 * @param insight - Right Pane (30%): The Intelligence (Scores, Context).
 */

interface AgentWorkspaceProps {
  queue: ReactNode;
  execution: ReactNode;
  insight: ReactNode;
  className?: string;
}

export function AgentWorkspace({
  queue,
  execution,
  insight,
  className,
}: AgentWorkspaceProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[280px_1fr_320px] h-[calc(100vh-64px)] w-full overflow-hidden bg-background",
        className,
      )}
    >
      {/* Pane 1: The Queue */}
      <aside className="border-r border-white/10 bg-black/20 backdrop-blur-xl overflow-y-auto">
        {queue}
      </aside>

      {/* Pane 2: The Execution */}
      <main className="relative flex flex-col bg-background/50 overflow-hidden">
        {execution}
      </main>

      {/* Pane 3: The Insight */}
      <aside className="border-l border-white/10 bg-black/20 backdrop-blur-xl overflow-y-auto">
        {insight}
      </aside>
    </div>
  );
}
