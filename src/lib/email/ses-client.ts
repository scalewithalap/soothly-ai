import { SESClient } from "@aws-sdk/client-ses";

/**
 * AWS SES Client
 *
 * Environment variables required:
 * - AWS_REGION (e.g., 'us-east-1')
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 *
 * For production, use IAM roles instead of access keys.
 */
export const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined, // Uses default credential chain (IAM role, env vars, etc.)
});

