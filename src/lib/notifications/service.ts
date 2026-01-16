/**
 * Unified Notification Service
 * Multi-channel notifications via Email, Discord, Slack, Telegram, Jira
 */

import { sendEmail } from "@/lib/email/service";
import {
  sendDiscordNotification,
  sendSlackNotification,
  sendTelegramNotification,
  createJiraIssue,
  type NotificationChannel,
  type NotificationConfig,
  type ChannelResult,
} from "./providers";

export type { NotificationChannel, NotificationConfig, ChannelResult };

export interface NotificationRecipient {
  email?: string;
  name?: string;
}

export interface NotificationOptions {
  recipient: NotificationRecipient;
  subject: string;
  message: string;
  channels?: NotificationChannel[];
  config?: NotificationConfig;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  results: ChannelResult[];
  allSucceeded: boolean;
}

/**
 * Send a notification via one or more channels
 */
export async function sendNotification(
  options: NotificationOptions,
): Promise<NotificationResult> {
  const channels = options.channels || ["email"];
  const config = options.config || {};
  const results: ChannelResult[] = [];

  for (const channel of channels) {
    try {
      switch (channel) {
        case "email":
          if (options.recipient.email) {
            await sendEmail({
              to: options.recipient.email,
              subject: options.subject,
              text: options.message,
              html: formatEmailHtml(options.subject, options.message),
            });
            results.push({ channel: "email", success: true });
          } else {
            results.push({
              channel: "email",
              success: false,
              error: "No email address provided",
            });
          }
          break;

        case "discord":
          if (config.discord?.webhookUrl) {
            const discordResult = await sendDiscordNotification(
              config.discord.webhookUrl,
              options.subject,
              options.message,
            );
            results.push(discordResult);
          } else {
            results.push({
              channel: "discord",
              success: false,
              error: "Discord webhook not configured",
            });
          }
          break;

        case "slack":
          if (config.slack?.webhookUrl) {
            const slackResult = await sendSlackNotification(
              config.slack.webhookUrl,
              options.subject,
              options.message,
            );
            results.push(slackResult);
          } else {
            results.push({
              channel: "slack",
              success: false,
              error: "Slack webhook not configured",
            });
          }
          break;

        case "telegram":
          if (config.telegram?.botToken && config.telegram?.chatId) {
            const telegramResult = await sendTelegramNotification(
              config.telegram.botToken,
              config.telegram.chatId,
              options.subject,
              options.message,
            );
            results.push(telegramResult);
          } else {
            results.push({
              channel: "telegram",
              success: false,
              error: "Telegram bot not configured",
            });
          }
          break;

        case "jira":
          if (config.jira) {
            const jiraResult = await createJiraIssue(
              config.jira,
              options.subject,
              options.message,
            );
            results.push(jiraResult);
          } else {
            results.push({
              channel: "jira",
              success: false,
              error: "Jira not configured",
            });
          }
          break;
      }
    } catch (error) {
      results.push({
        channel,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    results,
    allSucceeded: results.every((r) => r.success),
  };
}

/**
 * Send notification to multiple recipients
 */
export async function sendBulkNotification(
  recipients: NotificationRecipient[],
  subject: string,
  message: string,
  channels?: NotificationChannel[],
  config?: NotificationConfig,
): Promise<Map<string, NotificationResult>> {
  const results = new Map<string, NotificationResult>();

  for (const recipient of recipients) {
    const key = recipient.email || "unknown";
    const recipientResult = await sendNotification({
      recipient,
      subject,
      message,
      channels,
      config,
    });
    results.set(key, recipientResult);
  }

  return results;
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export interface AgentNotificationParams {
  agentName: string;
  action: string;
  resultCount?: number;
  details?: string;
}

/**
 * Send agent completion notification
 */
export async function notifyAgentCompletion(
  recipient: NotificationRecipient,
  params: AgentNotificationParams,
  channels?: NotificationChannel[],
  config?: NotificationConfig,
): Promise<NotificationResult> {
  const subject = `✅ ${params.agentName} completed: ${params.action}`;
  const message = buildAgentCompletionMessage(params);

  return sendNotification({
    recipient,
    subject,
    message,
    channels,
    config,
  });
}

/**
 * Send agent error notification
 */
export async function notifyAgentError(
  recipient: NotificationRecipient,
  params: AgentNotificationParams & { error: string },
  channels?: NotificationChannel[],
  config?: NotificationConfig,
): Promise<NotificationResult> {
  const subject = `❌ ${params.agentName} failed: ${params.action}`;
  const message = `Your ${params.agentName} agent encountered an error:\n\n${params.error}\n\nPlease check your dashboard for details.`;

  return sendNotification({
    recipient,
    subject,
    message,
    channels,
    config,
  });
}

// ============================================
// HELPERS
// ============================================

function formatEmailHtml(subject: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">${subject}</h1>
          </div>
          <div class="content">
            <p>${message.replace(/\n/g, "<br>")}</p>
          </div>
          <div class="footer">
            <p>Zero Headache - Your AI Business Automation Platform</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildAgentCompletionMessage(params: AgentNotificationParams): string {
  let message = `Your ${params.agentName} agent has completed: ${params.action}`;

  if (params.resultCount !== undefined) {
    message += `\n\nResults: ${params.resultCount} items processed`;
  }

  if (params.details) {
    message += `\n\n${params.details}`;
  }

  message += "\n\nCheck your Zero Headache dashboard for full details.";

  return message;
}
