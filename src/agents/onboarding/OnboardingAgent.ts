/**
 * Onboarding Agent
 * Implementation Specialist that guides new users through setup
 *
 * Role: "The Guide" - Your Implementation Specialist
 * Trigger: auth.user.created event via Supabase Auth Hook
 *
 * Flow:
 * 1. Profile Step: Analyze signup metadata (role, industry)
 * 2. Checklist Step: Generate personalized onboarding tasks
 * 3. Nudge Step: Schedule follow-up emails for incomplete tasks
 */

import { BaseAgent } from "../base/Agent";
import type { AgentTask, AgentResult, UsageCost } from "../base/types";
import { inngest } from "@/inngest/client";
import { ONBOARDING_EVENTS } from "@/inngest/events";

// User role for personalization
export type UserRole =
  | "developer"
  | "marketer"
  | "designer"
  | "founder"
  | "sales"
  | "operations"
  | "other";

// Onboarding task status
export type TaskStatus = "pending" | "in_progress" | "completed" | "skipped";

// Onboarding task definition
export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: "setup" | "integration" | "content" | "team" | "billing";
  priority: number;
  estimatedMinutes: number;
  requiredForRoles?: UserRole[];
  skipForRoles?: UserRole[];
  dependsOn?: string[];
  actionUrl?: string;
}

export class OnboardingAgent extends BaseAgent {
  readonly name = "onboarding" as const;
  readonly displayName = "Onboarding";
  readonly description =
    "Guides new users through personalized setup with smart nudges.";

  readonly usageCost: UsageCost = {
    analyze: 1,
    checklist: 1,
    nudge: 1,
  };

  // Default onboarding tasks
  private readonly defaultTasks: OnboardingTask[] = [
    {
      id: "complete_profile",
      title: "Complete Your Profile",
      description: "Add your name, photo, and company details",
      category: "setup",
      priority: 1,
      estimatedMinutes: 2,
      actionUrl: "/account/profile",
    },
    {
      id: "upload_logo",
      title: "Upload Your Logo",
      description: "Brand your workspace with your company logo",
      category: "setup",
      priority: 2,
      estimatedMinutes: 1,
      actionUrl: "/account/branding",
    },
    {
      id: "connect_stripe",
      title: "Connect Stripe",
      description: "Enable payments and billing for your customers",
      category: "integration",
      priority: 3,
      estimatedMinutes: 5,
      actionUrl: "/settings/integrations/stripe",
    },
    {
      id: "invite_team",
      title: "Invite Team Members",
      description: "Add colleagues to collaborate on your workspace",
      category: "team",
      priority: 4,
      estimatedMinutes: 3,
      skipForRoles: ["developer"],
      actionUrl: "/settings/team",
    },
    {
      id: "create_first_agent",
      title: "Activate Your First Agent",
      description: "Choose an AI agent to automate a task",
      category: "content",
      priority: 5,
      estimatedMinutes: 5,
      actionUrl: "/agents",
    },
    {
      id: "api_keys",
      title: "Get API Keys",
      description: "Access your API credentials for integration",
      category: "integration",
      priority: 3,
      estimatedMinutes: 2,
      requiredForRoles: ["developer"],
      actionUrl: "/settings/api",
    },
    {
      id: "create_campaign",
      title: "Create Your First Campaign",
      description: "Set up a marketing or outreach campaign",
      category: "content",
      priority: 6,
      estimatedMinutes: 10,
      requiredForRoles: ["marketer", "sales"],
      actionUrl: "/campaigns/new",
    },
    {
      id: "billing_setup",
      title: "Review Billing",
      description: "Confirm your subscription and billing details",
      category: "billing",
      priority: 7,
      estimatedMinutes: 3,
      actionUrl: "/account/billing",
    },
  ];

  // Nudge schedule (hours after signup)
  private readonly nudgeSchedule = [
    { hours: 1, type: "welcome" },
    { hours: 24, type: "reminder" },
    { hours: 72, type: "tip" },
    { hours: 168, type: "final" }, // 7 days
  ];

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    // No initialization needed
  }

  /**
   * Execute agent task based on action type
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const { action, params } = task;

    switch (action) {
      case "start_onboarding":
        return this.startOnboarding(
          params as {
            userId: string;
            email: string;
            role?: UserRole;
            metadata?: Record<string, unknown>;
          },
        );

      case "check_progress":
        return this.checkProgress(
          params as {
            userId: string;
          },
        );

      case "send_nudge":
        return this.sendNudge(
          params as {
            userId: string;
            nudgeType: string;
          },
        );

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // No cleanup needed
  }

  // ============================================
  // CORE METHODS
  // ============================================

  /**
   * Start onboarding for a new user
   */
  async startOnboarding(params: {
    userId: string;
    email: string;
    role?: UserRole;
    metadata?: Record<string, unknown>;
  }): Promise<AgentResult> {
    await inngest.send({
      name: ONBOARDING_EVENTS.USER_CREATED,
      data: {
        userId: params.userId,
        email: params.email,
        role: params.role || "other",
        metadata: params.metadata || {},
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { userId: params.userId, status: "onboarding_started" },
    };
  }

  /**
   * Check user's onboarding progress
   */
  async checkProgress(params: { userId: string }): Promise<AgentResult> {
    await inngest.send({
      name: ONBOARDING_EVENTS.PROGRESS_CHECK,
      data: {
        userId: params.userId,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { userId: params.userId, status: "checking_progress" },
    };
  }

  /**
   * Send a nudge email
   */
  async sendNudge(params: {
    userId: string;
    nudgeType: string;
  }): Promise<AgentResult> {
    await inngest.send({
      name: ONBOARDING_EVENTS.NUDGE_SCHEDULED,
      data: {
        userId: params.userId,
        nudgeType: params.nudgeType,
        orgId: this.orgId,
      },
    });

    return {
      success: true,
      data: { userId: params.userId, nudgeType: params.nudgeType },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get personalized tasks for a user role
   */
  getTasksForRole(role: UserRole): OnboardingTask[] {
    return this.defaultTasks.filter((task) => {
      // Skip if user's role is in skipForRoles
      if (task.skipForRoles?.includes(role)) return false;

      // Include if no requiredForRoles OR user's role is in requiredForRoles
      if (!task.requiredForRoles) return true;
      return task.requiredForRoles.includes(role);
    });
  }

  /**
   * Get the next uncompleted task for a user
   */
  getNextTask(
    tasks: Array<{ task_id: string; status: TaskStatus }>,
    role: UserRole,
  ): OnboardingTask | null {
    const availableTasks = this.getTasksForRole(role);
    const completedIds = new Set(
      tasks.filter((t) => t.status === "completed").map((t) => t.task_id),
    );

    // Find first uncompleted task by priority
    return (
      availableTasks
        .sort((a, b) => a.priority - b.priority)
        .find((task) => !completedIds.has(task.id)) || null
    );
  }

  /**
   * Calculate completion percentage
   */
  getCompletionPercentage(
    tasks: Array<{ task_id: string; status: TaskStatus }>,
    role: UserRole,
  ): number {
    const availableTasks = this.getTasksForRole(role);
    if (availableTasks.length === 0) return 100;

    const completed = tasks.filter((t) => t.status === "completed").length;
    return Math.round((completed / availableTasks.length) * 100);
  }

  /**
   * Get nudge email content based on type and progress
   */
  getNudgeContent(params: {
    nudgeType: string;
    userName: string;
    nextTask?: OnboardingTask;
    completionPercent: number;
  }): { subject: string; body: string } {
    const { nudgeType, userName, nextTask, completionPercent } = params;

    switch (nudgeType) {
      case "welcome":
        return {
          subject: "Welcome to Zero Headache! 🎉",
          body: `Hi ${userName},

Welcome aboard! You're just a few steps away from automating your business.

${nextTask ? `Your next step: **${nextTask.title}** (${nextTask.estimatedMinutes} min)` : ""}

Get started: ${nextTask?.actionUrl || "/dashboard"}

Need help? Just reply to this email.

Best,
The Zero Headache Team`,
        };

      case "reminder":
        return {
          subject: `${userName}, you're ${completionPercent}% there!`,
          body: `Hi ${userName},

Great progress! You've completed ${completionPercent}% of your setup.

${nextTask ? `Quick win: **${nextTask.title}** takes just ${nextTask.estimatedMinutes} minutes.` : "Almost done!"}

Continue setup: ${nextTask?.actionUrl || "/dashboard"}

Best,
The Zero Headache Team`,
        };

      case "tip":
        return {
          subject: "Pro tip: Get more from Zero Headache",
          body: `Hi ${userName},

Here's a tip: Users who complete onboarding see 3x better results in their first month.

${
  completionPercent < 50
    ? `You're at ${completionPercent}%. Let's get you to 100%!`
    : `Nice work hitting ${completionPercent}%!`
}

${nextTask ? `Next up: ${nextTask.title}` : ""}

Finish setup: ${nextTask?.actionUrl || "/dashboard"}

Best,
The Zero Headache Team`,
        };

      case "final":
        return {
          subject:
            completionPercent === 100
              ? "You're all set! 🚀"
              : "Last chance to complete setup",
          body:
            completionPercent === 100
              ? `Hi ${userName},

Congratulations! You've completed your onboarding.

Now it's time to let your AI agents do the work.

Go to dashboard: /dashboard

Best,
The Zero Headache Team`
              : `Hi ${userName},

We noticed your setup isn't complete yet (${completionPercent}%).

We're here to help! Reply to this email if you're stuck.

${nextTask ? `Continue with: ${nextTask.title}` : ""}

Best,
The Zero Headache Team`,
        };

      default:
        return {
          subject: "Continue your Zero Headache setup",
          body: `Hi ${userName}, continue where you left off: /dashboard`,
        };
    }
  }
}
