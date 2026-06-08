"use client";

import { useState, useEffect } from "react";
import { AgentWorkspace } from "@/components/agents/workspace/AgentWorkspace";
import {
  OnboardingQueue,
  type OnboardingUser,
} from "@/components/agents/onboarding/OnboardingQueue";
import {
  JourneyMap,
  type OnboardingTask,
  type NudgeEvent,
} from "@/components/agents/onboarding/JourneyMap";
import { UserContext } from "@/components/agents/onboarding/UserContext";
import { toast } from "sonner";

export default function OnboardingPage() {
  const [users, setUsers] = useState<OnboardingUser[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [nudges, setNudges] = useState<NudgeEvent[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  async function fetchUsers() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/agents/onboarding/users");
      if (!response.ok) throw new Error("Failed to fetch users");

      const data = await response.json();
      const mapped = data.data?.users || [];
      setUsers(mapped);

      if (mapped.length > 0 && !activeId) {
        setActiveId(mapped[0].id);
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchDetails(id: string) {
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`/api/agents/onboarding/users/${id}`);
      if (!response.ok) throw new Error("Failed to fetch details");

      const data = await response.json();
      setTasks(data.data?.tasks || []);
      setNudges(data.data?.nudges || []);
    } catch {
      console.error("Error fetching details");
    } finally {
      setIsLoadingDetails(false);
    }
  }

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch details when activeId changes
  useEffect(() => {
    if (activeId) {
      fetchDetails(activeId);
    } else {
      setTasks([]);
      setNudges([]);
    }
  }, [activeId]);

  const activeUser = users.find((u) => u.id === activeId);

  const handleCompleteTask = async (taskId: string) => {
    if (!activeId) return;
    try {
      const response = await fetch(
        `/api/agents/onboarding/tasks/${taskId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: activeId }),
        },
      );

      if (!response.ok) throw new Error("Failed to complete task");

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: "completed" as const } : t,
        ),
      );
      toast.success("Task marked as completed");
    } catch {
      toast.error("Failed to complete task");
    }
  };

  const handleSkipTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: "skipped" as const } : t,
      ),
    );
    toast.info("Task skipped");
  };

  return (
    <AgentWorkspace
      queue={
        <OnboardingQueue
          users={users}
          activeId={activeId || undefined}
          onSelect={setActiveId}
          isLoading={isLoading}
        />
      }
      execution={
        <JourneyMap
          user={activeUser}
          tasks={tasks}
          nudges={nudges}
          onCompleteTask={handleCompleteTask}
          onSkipTask={handleSkipTask}
        />
      }
      insight={
        <UserContext
          user={activeUser}
          recommendedAgent={
            activeUser?.role === "marketer" ? "SEO Agent" : "Lead Gen Agent"
          }
          engagementData={{
            lastLogin: "Today",
            totalSessions: 5,
            averageSessionDuration: "8m",
          }}
        />
      }
    />
  );
}
