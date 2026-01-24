/**
 * Email Sequence Inngest Functions
 * Durable workflows for automated email outreach
 *
 * Follows backend-design/SKILL.md patterns:
 * - All AI/external calls wrapped in step.run for durability
 * - Proper error handling with retries
 * - Events for orchestration
 */

import { inngest } from "../client";
import { SEQUENCE_EVENTS } from "../events";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/service";
import {
  getSequenceWithSteps,
  getEnrollment,
  advanceEnrollment,
  completeEnrollment,
  updateEnrollmentStatus,
  getPendingEnrollments,
  updateSequenceStats,
} from "@/lib/sequences";
import {
  personalizeEmailContent,
  addTrackingPixel,
  wrapLinksForTracking,
  createUnsubscribeLink,
} from "@/lib/sequences/personalization";
import type { ContactData, SequenceSettings } from "@/lib/sequences/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// =============================================================================
// Enrollment Created Handler
// =============================================================================

/**
 * Handle new enrollment - validates and schedules first email
 */
export const handleEnrollmentCreated = inngest.createFunction(
  {
    id: "sequence-enrollment-created",
    retries: 3,
  },
  { event: SEQUENCE_EVENTS.ENROLLMENT_CREATED },
  async ({ event, step }) => {
    const { enrollmentId, sequenceId, orgId, contactEmail } = event.data;

    // Step 1: Validate enrollment and sequence
    const { sequence, enrollment } = await step.run(
      "validate-enrollment",
      async () => {
        const [seq, enroll] = await Promise.all([
          getSequenceWithSteps(sequenceId),
          getEnrollment(enrollmentId),
        ]);

        if (!seq) throw new Error(`Sequence ${sequenceId} not found`);
        if (!enroll) throw new Error(`Enrollment ${enrollmentId} not found`);
        if (seq.status !== "active") {
          throw new Error(`Sequence ${sequenceId} is not active`);
        }
        if (seq.steps.length === 0) {
          throw new Error(`Sequence ${sequenceId} has no steps`);
        }

        return { sequence: seq, enrollment: enroll };
      },
    );

    // Step 2: Update sequence stats
    await step.run("update-stats", async () => {
      await updateSequenceStats(sequenceId, {
        enrolled: (sequence.stats.enrolled || 0) + 1,
        active: (sequence.stats.active || 0) + 1,
      });
    });

    // Step 3: Log activity
    await step.run("log-activity", async () => {
      const supabase = await createClient();
      await supabase.from("activities").insert({
        org_id: orgId,
        agent_type: "sequence",
        action: "enrollment_created",
        entity_type: "enrollment",
        entity_id: enrollmentId,
        description: `Enrolled ${contactEmail} in sequence "${sequence.name}"`,
        metadata: { sequenceId, contactEmail },
      });
    });

    return { success: true, enrollmentId, sequenceId };
  },
);

// =============================================================================
// Scheduler Tick - Cron job to process pending emails
// =============================================================================

/**
 * Process pending sequence emails every 5 minutes
 */
export const sequenceSchedulerTick = inngest.createFunction(
  {
    id: "sequence-scheduler-tick",
    retries: 2,
  },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    // Step 1: Get pending enrollments
    const pendingEnrollments = await step.run(
      "get-pending",
      async () => await getPendingEnrollments(50),
    );

    if (pendingEnrollments.length === 0) {
      return { processed: 0 };
    }

    // Step 2: Emit step.send events for each pending enrollment
    await step.run("trigger-sends", async () => {
      for (const enrollment of pendingEnrollments) {
        await inngest.send({
          name: SEQUENCE_EVENTS.STEP_SEND,
          data: {
            enrollmentId: enrollment.id,
            sequenceId: enrollment.sequenceId,
            orgId: enrollment.orgId,
            currentStep: enrollment.currentStep,
          },
        });
      }
    });

    return { processed: pendingEnrollments.length };
  },
);

// =============================================================================
// Step Send - Execute individual email send
// =============================================================================

/**
 * Send a single sequence step email
 */
export const sendSequenceStep = inngest.createFunction(
  {
    id: "sequence-step-send",
    retries: 3,
    concurrency: {
      limit: 10, // Limit concurrent sends
    },
  },
  { event: SEQUENCE_EVENTS.STEP_SEND },
  async ({ event, step }) => {
    const { enrollmentId, sequenceId, currentStep } = event.data;

    // Step 1: Get enrollment and sequence data
    const data = await step.run("fetch-data", async () => {
      const [enrollment, sequence] = await Promise.all([
        getEnrollment(enrollmentId),
        getSequenceWithSteps(sequenceId),
      ]);

      if (!enrollment || enrollment.status !== "active") {
        return {
          skip: true as const,
          reason: "Enrollment not active",
          complete: false,
        };
      }

      if (!sequence || sequence.status !== "active") {
        return {
          skip: true as const,
          reason: "Sequence not active",
          complete: false,
        };
      }

      const stepToSend = sequence.steps[currentStep];
      if (!stepToSend) {
        return { skip: true as const, reason: "No more steps", complete: true };
      }

      return {
        skip: false as const,
        enrollment,
        sequence,
        stepToSend,
        nextStep: sequence.steps[currentStep + 1] ?? null,
      };
    });

    // Handle skip cases
    if (data.skip === true) {
      if (data.complete) {
        await step.run("complete-enrollment", async () => {
          await completeEnrollment(enrollmentId);
          await updateSequenceStats(sequenceId, {
            active: Math.max(0, -1), // Decrement active
            completed: 1, // Increment completed
          });
        });
      }
      return { success: false, reason: data.reason };
    }

    // After this point, we know skip is false, so safely destructure
    const enrollment = data.enrollment;
    const sequence = data.sequence;
    const stepToSend = data.stepToSend;
    const nextStep = data.nextStep;
    const settings = sequence.settings as SequenceSettings;

    // Step 2: Personalize email content
    const personalizedContent = await step.run("personalize", async () => {
      const contactData = enrollment.contactData as ContactData;
      let { subject, bodyHtml, bodyText } = personalizeEmailContent(
        stepToSend.subject,
        stepToSend.bodyHtml,
        stepToSend.bodyText,
        contactData,
      );

      // Add tracking pixel
      bodyHtml = addTrackingPixel(
        bodyHtml,
        APP_URL,
        enrollmentId,
        stepToSend.id,
      );

      // Wrap links for click tracking
      bodyHtml = wrapLinksForTracking(
        bodyHtml,
        APP_URL,
        enrollmentId,
        stepToSend.id,
      );

      // Add unsubscribe link
      const unsubscribeLink = createUnsubscribeLink(APP_URL, enrollmentId);
      const unsubscribeFooter = `
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
          <a href="${unsubscribeLink}" style="color: #6b7280;">Unsubscribe</a>
        </div>
      `;
      bodyHtml = bodyHtml.replace("</body>", `${unsubscribeFooter}</body>`);
      if (!bodyHtml.includes("</body>")) {
        bodyHtml += unsubscribeFooter;
      }

      return { subject, bodyHtml, bodyText };
    });

    // Step 3: Send email via AWS SES (wrapped for durability)
    const sendResult = await step.run("send-email", async () => {
      return await sendEmail({
        to: enrollment.contactEmail,
        subject: personalizedContent.subject,
        html: personalizedContent.bodyHtml,
        text: personalizedContent.bodyText ?? undefined,
      });
    });

    if (!sendResult.success) {
      // Log failure but don't throw - will retry via Inngest
      await step.run("log-failure", async () => {
        const supabase = await createClient();
        await supabase.from("email_sequence_events").insert({
          enrollment_id: enrollmentId,
          step_id: stepToSend.id,
          event_type: "bounced",
          metadata: { error: "Send failed" },
        });
      });

      throw new Error("Email send failed");
    }

    // Step 4: Record send event
    await step.run("record-event", async () => {
      const supabase = await createClient();
      await supabase.from("email_sequence_events").insert({
        enrollment_id: enrollmentId,
        step_id: stepToSend.id,
        event_type: "sent",
        ses_message_id: sendResult.messageId,
      });
    });

    // Step 5: Update stats
    await step.run("update-stats", async () => {
      await updateSequenceStats(sequenceId, {
        totalSent: (sequence.stats.totalSent || 0) + 1,
      });
    });

    // Step 6: Schedule next step or complete
    if (nextStep) {
      await step.run("schedule-next", async () => {
        await advanceEnrollment(enrollmentId, {
          days: nextStep.delayDays,
          hours: nextStep.delayHours,
        });
      });
    } else {
      await step.run("complete-sequence", async () => {
        await completeEnrollment(enrollmentId);
        await updateSequenceStats(sequenceId, {
          active: Math.max(0, (sequence.stats.active || 0) - 1),
          completed: (sequence.stats.completed || 0) + 1,
        });
      });
    }

    return {
      success: true,
      messageId: sendResult.messageId,
      stepId: stepToSend.id,
      hasNextStep: !!nextStep,
    };
  },
);

// =============================================================================
// Reply Detected Handler
// =============================================================================

/**
 * Handle detected reply - stops sequence if configured
 */
export const handleReplyDetected = inngest.createFunction(
  {
    id: "sequence-reply-detected",
    retries: 2,
  },
  { event: SEQUENCE_EVENTS.REPLY_DETECTED },
  async ({ event, step }) => {
    const { enrollmentId, sequenceId, orgId } = event.data;

    // Step 1: Get sequence settings
    const sequence = await step.run("get-sequence", async () => {
      return await getSequenceWithSteps(sequenceId);
    });

    if (!sequence) {
      return { success: false, reason: "Sequence not found" };
    }

    const settings = sequence.settings as SequenceSettings;

    // Step 2: Update enrollment if stopOnReply is enabled
    if (settings.stopOnReply) {
      await step.run("stop-sequence", async () => {
        await updateEnrollmentStatus(enrollmentId, "replied");
      });
    }

    // Step 3: Record reply event
    await step.run("record-event", async () => {
      const supabase = await createClient();
      await supabase.from("email_sequence_events").insert({
        enrollment_id: enrollmentId,
        event_type: "replied",
      });
    });

    // Step 4: Update stats
    await step.run("update-stats", async () => {
      await updateSequenceStats(sequenceId, {
        totalReplied: (sequence.stats.totalReplied || 0) + 1,
        active: settings.stopOnReply
          ? Math.max(0, (sequence.stats.active || 0) - 1)
          : sequence.stats.active,
      });
    });

    return { success: true, stopped: settings.stopOnReply };
  },
);

// =============================================================================
// Bounce Detected Handler
// =============================================================================

/**
 * Handle bounce notification from SES webhook
 */
export const handleBounceDetected = inngest.createFunction(
  {
    id: "sequence-bounce-detected",
    retries: 2,
  },
  { event: SEQUENCE_EVENTS.BOUNCE_DETECTED },
  async ({ event, step }) => {
    const { enrollmentId, sequenceId, bounceType, sesMessageId } = event.data;

    // Step 1: Update enrollment status
    await step.run("update-status", async () => {
      await updateEnrollmentStatus(enrollmentId, "bounced");
    });

    // Step 2: Record bounce event
    await step.run("record-event", async () => {
      const supabase = await createClient();
      await supabase.from("email_sequence_events").insert({
        enrollment_id: enrollmentId,
        event_type: "bounced",
        ses_message_id: sesMessageId,
        metadata: { bounceType },
      });
    });

    // Step 3: Update stats
    await step.run("update-stats", async () => {
      const sequence = await getSequenceWithSteps(sequenceId);
      if (sequence) {
        await updateSequenceStats(sequenceId, {
          totalBounced: (sequence.stats.totalBounced || 0) + 1,
          active: Math.max(0, (sequence.stats.active || 0) - 1),
        });
      }
    });

    return { success: true };
  },
);
