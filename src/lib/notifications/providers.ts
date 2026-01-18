/**
 * Multi-Channel Notification Providers
 * Supports Discord, Slack, Telegram, Jira, and Email
 */

// ============================================
// TYPES
// ============================================

export type NotificationChannel =
  | "email"
  | "discord"
  | "slack"
  | "telegram"
  | "jira";

export interface NotificationConfig {
  discord?: {
    webhookUrl: string;
  };
  slack?: {
    webhookUrl: string;
  };
  telegram?: {
    botToken: string;
    chatId: string;
  };
  jira?: {
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
  };
  email?: {
    enabled: boolean;
  };
}

export interface ChannelResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// DISCORD PROVIDER
// ============================================

export async function sendDiscordNotification(
  webhookUrl: string,
  title: string,
  message: string,
  color?: number,
): Promise<ChannelResult> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: message,
            color: color || 0x8b5cf6, // Violet
            timestamp: new Date().toISOString(),
            footer: { text: "Zero Headache" },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return { channel: "discord", success: true };
  } catch (error) {
    return {
      channel: "discord",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// SLACK PROVIDER
// ============================================

export async function sendSlackNotification(
  webhookUrl: string,
  title: string,
  message: string,
): Promise<ChannelResult> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: title, emoji: true },
          },
          {
            type: "section",
            text: { type: "mrkdwn", text: message },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Sent via Zero Headache • ${new Date().toLocaleString()}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    return { channel: "slack", success: true };
  } catch (error) {
    return {
      channel: "slack",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// TELEGRAM PROVIDER
// ============================================

export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  title: string,
  message: string,
): Promise<ChannelResult> {
  try {
    const text = `*${escapeMarkdown(title)}*\n\n${escapeMarkdown(message)}`;

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "MarkdownV2",
        }),
      },
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.description || "Telegram API error");
    }

    return {
      channel: "telegram",
      success: true,
      messageId: String(data.result?.message_id),
    };
  } catch (error) {
    return {
      channel: "telegram",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

// ============================================
// JIRA PROVIDER (Creates issues)
// ============================================

export async function createJiraIssue(
  config: NonNullable<NotificationConfig["jira"]>,
  summary: string,
  description: string,
  issueType: string = "Task",
): Promise<ChannelResult> {
  try {
    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString(
      "base64",
    );

    const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fields: {
          project: { key: config.projectKey },
          summary,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: description }],
              },
            ],
          },
          issuetype: { name: issueType },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.errors
          ? JSON.stringify(errorData.errors)
          : `Jira API error: ${response.status}`,
      );
    }

    const data = await response.json();

    return {
      channel: "jira",
      success: true,
      messageId: data.key,
    };
  } catch (error) {
    return {
      channel: "jira",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

