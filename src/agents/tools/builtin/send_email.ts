/**
 * Built-in MCP Tool: Send Email
 *
 * Allows agents to send emails via AWS SES.
 */

import type { MCPTool, MCPToolResult, ToolExecutionContext } from "../types";

export const sendEmailTool: MCPTool = {
  name: "send_email",
  description:
    "Send an email to a recipient via AWS SES. Supports HTML content.",
  category: "communication",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description: "Recipient email address",
      },
      subject: {
        type: "string",
        description: "Email subject line",
        maxLength: 200,
      },
      body: {
        type: "string",
        description: "Email body content (plain text or HTML)",
      },
      isHtml: {
        type: "boolean",
        description: "Whether the body is HTML (default: false)",
      },
      replyTo: {
        type: "string",
        description: "Reply-to email address (optional)",
      },
    },
    required: ["to", "subject", "body"],
  },
  annotations: {
    title: "Send Email",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    costHint: 0.5,
  },
  requiredPermissions: ["email:send"],

  handler: async (
    input: unknown,
    _context: ToolExecutionContext,
  ): Promise<MCPToolResult> => {
    const params = input as {
      to: string;
      subject: string;
      body: string;
      isHtml?: boolean;
      replyTo?: string;
    };

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.to)) {
      return {
        content: [
          {
            type: "error",
            code: "INVALID_EMAIL",
            message: `Invalid recipient email: ${params.to}`,
          },
        ],
        isError: true,
      };
    }

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return {
        content: [
          {
            type: "error",
            code: "NOT_CONFIGURED",
            message:
              "AWS SES is not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.",
          },
        ],
        isError: true,
      };
    }

    try {
      // Dynamic import to avoid build-time initialization
      const { SESClient, SendEmailCommand } =
        await import("@aws-sdk/client-ses");

      const client = new SESClient({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const fromAddress =
        process.env.EMAIL_FROM_ADDRESS || "noreply@zeroheadache.co";

      const command = new SendEmailCommand({
        Source: fromAddress,
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: {
            Charset: "UTF-8",
            Data: params.subject,
          },
          Body: params.isHtml
            ? {
                Html: {
                  Charset: "UTF-8",
                  Data: params.body,
                },
              }
            : {
                Text: {
                  Charset: "UTF-8",
                  Data: params.body,
                },
              },
        },
        ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
      });

      const response = await client.send(command);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              messageId: response.MessageId,
              to: params.to,
              subject: params.subject,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "error",
            code: "EXECUTION_FAILED",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
        isError: true,
      };
    }
  },
};
