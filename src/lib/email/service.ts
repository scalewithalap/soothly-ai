import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "./ses-client";

const FROM_EMAIL = process.env.SES_FROM_EMAIL || "noreply@zeroheadache.co";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email via AWS SES
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<{ success: boolean; messageId?: string }> {
  const toAddresses = Array.isArray(to) ? to : [to];

  try {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: html,
          },
          ...(text && {
            Text: {
              Charset: "UTF-8",
              Data: text,
            },
          }),
        },
      },
    });

    const response = await sesClient.send(command);

    return {
      success: true,
      messageId: response.MessageId,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false };
  }
}

/**
 * Send a team invitation email
 */
export async function sendInvitationEmail({
  email,
  inviterName,
  organizationName,
  role,
  token,
}: {
  email: string;
  inviterName: string;
  organizationName: string;
  role: "admin" | "member";
  token: string;
}): Promise<boolean> {
  const inviteUrl = `${APP_URL}/invite/${token}`;
  const roleLabel = role === "admin" ? "Admin" : "Team Member";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${organizationName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding: 40px 32px; text-align: center;">
              <div style="width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="color: #ffffff; font-size: 24px; font-weight: bold;">Z</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Zero Headache</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #18181b; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
                You're invited! 🎉
              </h2>
              <p style="color: #52525b; font-size: 16px; margin: 0 0 24px 0;">
                <strong style="color: #18181b;">${inviterName}</strong> has invited you to join 
                <strong style="color: #18181b;">${organizationName}</strong> as a <strong style="color: #7c3aed;">${roleLabel}</strong>.
              </p>
              
              <p style="color: #52525b; font-size: 14px; margin: 0 0 32px 0;">
                Click the button below to accept this invitation and get started with AI-powered business automation.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #a1a1aa; font-size: 12px; margin: 32px 0 0 0; text-align: center;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 32px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Zero Headache. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
You're invited to join ${organizationName}!

${inviterName} has invited you to join ${organizationName} as a ${roleLabel}.

Click here to accept the invitation:
${inviteUrl}

This invitation expires in 7 days.

If you didn't expect this email, you can safely ignore it.

© ${new Date().getFullYear()} Zero Headache. All rights reserved.
  `.trim();

  const result = await sendEmail({
    to: email,
    subject: `You're invited to join ${organizationName} on Zero Headache`,
    html,
    text,
  });

  return result.success;
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail({
  email,
  name,
}: {
  email: string;
  name: string;
}): Promise<boolean> {
  const dashboardUrl = `${APP_URL}/dashboard`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Zero Headache</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding: 40px 32px; text-align: center;">
              <div style="width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="color: #ffffff; font-size: 24px; font-weight: bold;">Z</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Welcome to Zero Headache!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #18181b; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
                Hey ${name}! 👋
              </h2>
              <p style="color: #52525b; font-size: 16px; margin: 0 0 24px 0;">
                Thanks for joining Zero Headache. Your account is ready to go.
              </p>
              <p style="color: #52525b; font-size: 14px; margin: 0 0 24px 0;">
                <strong>Here's how to get started:</strong>
              </p>
              <ul style="color: #52525b; font-size: 14px; margin: 0 0 32px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Configure your AI agents for lead generation</li>
                <li style="margin-bottom: 8px;">Set up integrations with your tools</li>
                <li style="margin-bottom: 8px;">Start automating your workflows</li>
              </ul>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 32px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Zero Headache. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Hey ${name}!

Thanks for joining Zero Headache. Your account is ready to go.

Here's how to get started:
- Configure your AI agents for lead generation
- Set up integrations with your tools
- Start automating your workflows

Go to Dashboard: ${dashboardUrl}

© ${new Date().getFullYear()} Zero Headache. All rights reserved.
  `.trim();

  const result = await sendEmail({
    to: email,
    subject: "Welcome to Zero Headache! 🎉",
    html,
    text,
  });

  return result.success;
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail({
  email,
  resetUrl,
}: {
  email: string;
  resetUrl: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding: 40px 32px; text-align: center;">
              <div style="width: 48px; height: 48px; background-color: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="color: #ffffff; font-size: 24px; font-weight: bold;">Z</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Zero Headache</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="color: #18181b; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
                Reset your password 🔐
              </h2>
              <p style="color: #52525b; font-size: 16px; margin: 0 0 24px 0;">
                We received a request to reset your password. Click the button below to choose a new one.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color: #a1a1aa; font-size: 12px; margin: 32px 0 0 0; text-align: center;">
                This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 24px 32px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Zero Headache. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Reset your password

We received a request to reset your password.

Click here to reset: ${resetUrl}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.

© ${new Date().getFullYear()} Zero Headache. All rights reserved.
  `.trim();

  const result = await sendEmail({
    to: email,
    subject: "Reset your Zero Headache password",
    html,
    text,
  });

  return result.success;
}

/**
 * Send a notification email (generic wrapper for various notification types)
 */
export async function sendNotificationEmail({
  email,
  title,
  message,
  actionUrl,
  actionLabel,
}: {
  email: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}): Promise<boolean> {
  const ctaButton = actionUrl
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
        <tr>
          <td align="center">
            <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
              ${actionLabel || "View Details"}
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); padding: 24px 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0;">Zero Headache</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="color: #18181b; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
                ${title}
              </h2>
              <p style="color: #52525b; font-size: 14px; margin: 0;">
                ${message}
              </p>
              ${ctaButton}
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 16px 32px; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; font-size: 11px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} Zero Headache
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
${title}

${message}

${actionUrl ? `${actionLabel || "View Details"}: ${actionUrl}` : ""}

© ${new Date().getFullYear()} Zero Headache
  `.trim();

  const result = await sendEmail({
    to: email,
    subject: title,
    html,
    text,
  });

  return result.success;
}
