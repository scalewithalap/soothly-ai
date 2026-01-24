/**
 * AWS SES Webhook Handler
 * Processes bounce, complaint, and delivery notifications
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";
import { SEQUENCE_EVENTS } from "@/inngest/events";

interface SESNotification {
  Type: "Notification" | "SubscriptionConfirmation";
  Message: string;
  MessageId: string;
  TopicArn: string;
  SubscribeURL?: string;
}

interface SESMessage {
  notificationType: "Bounce" | "Complaint" | "Delivery";
  bounce?: {
    bounceType: "Permanent" | "Transient";
    bounceSubType: string;
    bouncedRecipients: Array<{ emailAddress: string }>;
  };
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>;
    complaintFeedbackType: string;
  };
  delivery?: {
    recipients: string[];
    timestamp: string;
  };
  mail: {
    messageId: string;
    source: string;
    destination: string[];
    headers?: Array<{ name: string; value: string }>;
  };
}

/**
 * POST /api/webhooks/ses
 * Handle AWS SES notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const notification: SESNotification = JSON.parse(body);

    // Handle SNS subscription confirmation
    if (notification.Type === "SubscriptionConfirmation") {
      console.log("SNS Subscription confirmation:", notification.SubscribeURL);
      // In production, auto-confirm by fetching the SubscribeURL
      // For now, log it for manual confirmation
      return NextResponse.json({
        success: true,
        type: "subscription_confirmation",
      });
    }

    // Parse the SES message
    const message: SESMessage = JSON.parse(notification.Message);
    const { mail, notificationType } = message;

    // Extract enrollment and step IDs from custom headers if present
    const headers = mail.headers ?? [];
    const enrollmentHeader = headers.find(
      (h) => h.name === "X-ZH-Enrollment-Id",
    );
    const stepHeader = headers.find((h) => h.name === "X-ZH-Step-Id");

    if (!enrollmentHeader?.value) {
      // Not a sequence email, skip
      return NextResponse.json({ success: true, type: "non_sequence_email" });
    }

    const enrollmentId = enrollmentHeader.value;
    const stepId = stepHeader?.value;

    const supabase = await createClient();

    // Get sequence info from enrollment
    const { data: enrollment } = await supabase
      .from("email_sequence_enrollments")
      .select("sequence_id, org_id")
      .eq("id", enrollmentId)
      .single();

    if (!enrollment) {
      console.warn(`Enrollment not found for SES event: ${enrollmentId}`);
      return NextResponse.json({ success: true, type: "enrollment_not_found" });
    }

    switch (notificationType) {
      case "Bounce": {
        const bounce = message.bounce!;

        // Record bounce event
        await supabase.from("email_sequence_events").insert({
          enrollment_id: enrollmentId,
          step_id: stepId,
          event_type: "bounced",
          ses_message_id: mail.messageId,
          metadata: {
            bounceType: bounce.bounceType,
            bounceSubType: bounce.bounceSubType,
          },
        });

        // Emit bounce event for Inngest to handle
        await inngest.send({
          name: SEQUENCE_EVENTS.BOUNCE_DETECTED,
          data: {
            enrollmentId,
            sequenceId: enrollment.sequence_id,
            bounceType: bounce.bounceType,
            sesMessageId: mail.messageId,
          },
        });

        break;
      }

      case "Complaint": {
        const complaint = message.complaint!;

        // Record complaint event
        await supabase.from("email_sequence_events").insert({
          enrollment_id: enrollmentId,
          step_id: stepId,
          event_type: "complained",
          ses_message_id: mail.messageId,
          metadata: {
            complaintType: complaint.complaintFeedbackType,
          },
        });

        // Update enrollment status to unsubscribed (complaints are serious)
        await supabase
          .from("email_sequence_enrollments")
          .update({ status: "unsubscribed", next_send_at: null })
          .eq("id", enrollmentId);

        break;
      }

      case "Delivery": {
        // Record delivery event
        await supabase.from("email_sequence_events").insert({
          enrollment_id: enrollmentId,
          step_id: stepId,
          event_type: "delivered",
          ses_message_id: mail.messageId,
        });

        break;
      }
    }

    return NextResponse.json({
      success: true,
      type: notificationType.toLowerCase(),
      enrollmentId,
    });
  } catch (error) {
    console.error("Failed to process SES webhook:", error);
    return NextResponse.json(
      {
        error: {
          code: "webhook/processing_failed",
          userMessage: "Failed to process notification",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/webhooks/ses
 * Health check for webhook endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SES webhook endpoint is active",
  });
}
