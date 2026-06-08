/**
 * Onboarding Agent Inngest Functions
 * Background jobs for guiding new users through setup
 *
 * Function: User Onboarding Workflow
 * Trigger: 'onboarding/user.created' (Supabase Auth Hook)
 *
 * Flow:
 * 1. analyze-user: Determine role from signup metadata
 * 2. create-checklist: Generate personalized onboarding tasks
 * 3. schedule-nudges: Set up timed follow-up emails
 * 4. check-progress: Monitor completion and send reminders
 *
 * Resiliency:
 * - Sleeps: Uses step.sleep for timed nudges
 * - Idempotent: Checks completion before sending nudges
 */

import { inngest } from "@/inngest/client";
import { ONBOARDING_EVENTS } from "@/inngest/events";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseAgentEventData } from "@/inngest/utils";
import { sendNotification } from "@/lib/notifications";
import type { SupabaseClient } from "@supabase/supabase-js";

// Type helper
function getUntypedClient() {
  return createSupabaseAdminClient() as unknown as SupabaseClient;
}

// User role type
type UserRole =
  | "developer"
  | "marketer"
  | "designer"
  | "founder"
  | "sales"
  | "operations"
  | "other";

// Default onboarding tasks
const DEFAULT_TASKS = [
  {
    id: "complete_profile",
    title: "Complete Your Profile",
    description: "Add your name, photo, and company details",
    category: "setup",
    priority: 1,
    estimatedMinutes: 2,
  },
  {
    id: "upload_logo",
    title: "Upload Your Logo",
    description: "Brand your workspace with your company logo",
    category: "setup",
    priority: 2,
    estimatedMinutes: 1,
  },
  {
    id: "connect_stripe",
    title: "Connect Stripe",
    description: "Enable payments and billing",
    category: "integration",
    priority: 3,
    estimatedMinutes: 5,
  },
  {
    id: "invite_team",
    title: "Invite Team Members",
    description: "Add colleagues to collaborate",
    category: "team",
    priority: 4,
    estimatedMinutes: 3,
    skipForRoles: ["developer"],
  },
  {
    id: "create_first_agent",
    title: "Activate Your First Agent",
    description: "Choose an AI agent to automate a task",
    category: "content",
    priority: 5,
    estimatedMinutes: 5,
  },
  {
    id: "api_keys",
    title: "Get API Keys",
    description: "Access your API credentials",
    category: "integration",
    priority: 3,
    estimatedMinutes: 2,
    requiredForRoles: ["developer"],
  },
];

/**
 * Get tasks filtered by user role
 */
function getTasksForRole(role: UserRole): typeof DEFAULT_TASKS {
  return DEFAULT_TASKS.filter((task) => {
    if ((task as { skipForRoles?: string[] }).skipForRoles?.includes(role))
      return false;
    const required = (task as { requiredForRoles?: string[] }).requiredForRoles;
    if (!required) return true;
    return required.includes(role);
  });
}

// ============================================
// MAIN ONBOARDING WORKFLOW
// ============================================

/**
 * Handle new user signup - start onboarding
 */
export const handleUserCreated = inngest.createFunction(
  {
    id: "onboarding-user-created",
    name: "Start User Onboarding",
    retries: 3,
    triggers: [{ event: "onboarding/user.created" }],
  },
  async ({ event, step }) => {
    // Parse event data
    const eventData = parseAgentEventData<{
      userId: string;
      email: string;
      role: UserRole;
      orgId: string;
      metadata?: Record<string, unknown>;
    }>(event.data);
    const { userId, email, role, orgId, metadata } = eventData;

    // Step 1: Get or infer user role
    const userRole = await step.run("analyze-user", async () => {
      // Use provided role or infer from metadata
      if (role && role !== "other") return role;

      // Try to infer from job title or other metadata
      const jobTitle = ((metadata?.job_title as string) || "").toLowerCase();
      if (jobTitle.includes("develop") || jobTitle.includes("engineer"))
        return "developer";
      if (jobTitle.includes("market") || jobTitle.includes("growth"))
        return "marketer";
      if (jobTitle.includes("design")) return "designer";
      if (
        jobTitle.includes("founder") ||
        jobTitle.includes("ceo") ||
        jobTitle.includes("owner")
      )
        return "founder";
      if (jobTitle.includes("sales") || jobTitle.includes("account"))
        return "sales";

      return "other" as UserRole;
    });

    // Step 2: Create personalized checklist
    const tasks = await step.run("create-checklist", async () => {
      const supabase = getUntypedClient();
      const personalizedTasks = getTasksForRole(userRole);

      // Insert tasks into database
      const taskRecords = personalizedTasks.map((task) => ({
        user_id: userId,
        org_id: orgId,
        task_id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        estimated_minutes: task.estimatedMinutes,
        status: "pending",
      }));

      await supabase.from("onboarding_tasks").insert(taskRecords);

      return personalizedTasks;
    });

    // Step 3: Update user with onboarding status
    await step.run("update-user-status", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("users")
        .update({
          onboarding_status: "in_progress",
          onboarding_started_at: new Date().toISOString(),
          detected_role: userRole,
        })
        .eq("id", userId);
    });

    // Step 4: Send welcome email immediately
    await step.run("send-welcome", async () => {
      const firstTask = tasks[0];
      await sendNotification({
        recipient: { email, name: email.split("@")[0] },
        subject: "Welcome to Soothly AI! 🎉",
        message: `Welcome aboard! You're just a few steps away from automating your business.

Your first step: **${firstTask?.title}** (${firstTask?.estimatedMinutes} min)

Get started: /dashboard

Need help? Just reply to this email.

Best,
The Soothly AI Team`,
        channels: ["email"],
      });
    });

    // Step 5: Schedule nudge after 1 hour
    await step.sleep("wait-1h", "1h");

    // Step 6: Check progress and send 1-hour nudge if needed
    const progress1h = await step.run("check-1h-progress", async () => {
      const supabase = getUntypedClient();
      const { data: completedTasks } = await supabase
        .from("onboarding_tasks")
        .select("task_id")
        .eq("user_id", userId)
        .eq("status", "completed");

      const completionPercent = Math.round(
        ((completedTasks?.length || 0) / tasks.length) * 100,
      );

      return { completedCount: completedTasks?.length || 0, completionPercent };
    });

    // Only nudge if < 50% complete
    if (progress1h.completionPercent < 50) {
      await step.run("send-1h-nudge", async () => {
        const nextTask = tasks[progress1h.completedCount];
        await sendNotification({
          recipient: { email },
          subject: `Quick win waiting for you!`,
          message: `${nextTask?.title} takes just ${nextTask?.estimatedMinutes} minutes.

Continue: /dashboard`,
          channels: ["email"],
        });
      });
    }

    // Step 7: Schedule 24-hour check
    await step.sleep("wait-24h", "23h"); // Already waited 1h

    const progress24h = await step.run("check-24h-progress", async () => {
      const supabase = getUntypedClient();
      const { data: completedTasks } = await supabase
        .from("onboarding_tasks")
        .select("task_id")
        .eq("user_id", userId)
        .eq("status", "completed");

      return {
        completedCount: completedTasks?.length || 0,
        completionPercent: Math.round(
          ((completedTasks?.length || 0) / tasks.length) * 100,
        ),
      };
    });

    if (progress24h.completionPercent < 100) {
      await step.run("send-24h-nudge", async () => {
        await sendNotification({
          recipient: { email },
          subject: `You're ${progress24h.completionPercent}% there!`,
          message: `Great progress! Complete your setup to unlock all features.

Continue: /dashboard`,
          channels: ["email"],
        });
      });
    }

    // Step 8: Log activity
    await step.run("log-activity", async () => {
      const supabase = getUntypedClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "onboarding",
        action: "onboarding_started",
        entity_type: "user",
        entity_id: userId,
        description: `Onboarding started for ${userRole} with ${tasks.length} tasks`,
        metadata: { role: userRole, taskCount: tasks.length },
      });
    });

    return {
      success: true,
      userId,
      role: userRole,
      tasksCreated: tasks.length,
    };
  },
);

/**
 * Check onboarding progress for a user
 */
export const checkProgress = inngest.createFunction(
  {
    id: "onboarding-check-progress",
    name: "Check Onboarding Progress",
    triggers: [{ event: "onboarding/progress.check" }],
  },
  async ({ event, step }) => {
    const eventData = parseAgentEventData<{
      userId: string;
      orgId: string;
    }>(event.data);
    const { userId, orgId } = eventData;

    // Get current progress
    const progress = await step.run("get-progress", async () => {
      const supabase = getUntypedClient();

      const { data: tasks } = await supabase
        .from("onboarding_tasks")
        .select("task_id, status, title")
        .eq("user_id", userId);

      if (!tasks || tasks.length === 0) {
        return { total: 0, completed: 0, percent: 0, nextTask: null };
      }

      const completed = tasks.filter((t) => t.status === "completed").length;
      const pending = tasks.find((t) => t.status === "pending");

      return {
        total: tasks.length,
        completed,
        percent: Math.round((completed / tasks.length) * 100),
        nextTask: pending
          ? { id: pending.task_id, title: pending.title }
          : null,
      };
    });

    // Update user's onboarding status if complete
    if (progress.percent === 100) {
      await step.run("mark-complete", async () => {
        const supabase = getUntypedClient();
        await supabase
          .from("users")
          .update({
            onboarding_status: "completed",
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await supabase.from("activities").insert({
          org_id: orgId,
          agent_type: "onboarding",
          action: "onboarding_completed",
          entity_type: "user",
          entity_id: userId,
          description: "User completed onboarding successfully",
        });
      });
    }

    return {
      success: true,
      userId,
      ...progress,
    };
  },
);

/**
 * Mark a task as completed
 */
export const completeTask = inngest.createFunction(
  {
    id: "onboarding-complete-task",
    name: "Complete Onboarding Task",
    triggers: [{ event: "onboarding/task.completed" }],
  },
  async ({ event, step }) => {
    const { userId, taskId, orgId } = event.data as {
      userId: string;
      taskId: string;
      orgId: string;
    };

    // Update task status
    await step.run("update-task", async () => {
      const supabase = getUntypedClient();
      await supabase
        .from("onboarding_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("task_id", taskId);
    });

    // Check overall progress
    await inngest.send({
      name: ONBOARDING_EVENTS.PROGRESS_CHECK,
      data: { userId, orgId },
    });

    return { success: true, taskId, status: "completed" };
  },
);
