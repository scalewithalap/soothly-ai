/**
 * Plivo Client
 * SMS and WhatsApp messaging via Plivo API
 */

import * as plivo from "plivo";

let client: plivo.Client | null = null;

/**
 * Get the singleton Plivo client instance
 */
export function getPlivoClient(): plivo.Client {
  if (!client) {
    const authId = process.env.PLIVO_AUTH_ID;
    const authToken = process.env.PLIVO_AUTH_TOKEN;

    if (!authId || !authToken) {
      throw new Error("PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN are required");
    }

    client = new plivo.Client(authId, authToken);
  }

  return client;
}

export interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

export interface WhatsAppOptions {
  to: string;
  message: string;
  from?: string;
  templateId?: string;
  templateParams?: Record<string, string>;
}

interface PlivoMessageResponse {
  messageUuid: string | string[];
  message: string;
  apiId: string;
}

/**
 * Send an SMS message
 */
export async function sendSMS(options: SMSOptions): Promise<{
  messageUuid: string;
  success: boolean;
}> {
  const plivoClient = getPlivoClient();
  const from = options.from || process.env.PLIVO_SENDER_NUMBER;

  if (!from) {
    throw new Error("PLIVO_SENDER_NUMBER is required for sending SMS");
  }

  try {
    // Plivo SDK requires positional arguments: src, dst, text
    const response = (await plivoClient.messages.create(
      from,
      options.to,
      options.message
    )) as PlivoMessageResponse;

    const uuid = Array.isArray(response.messageUuid)
      ? response.messageUuid[0]
      : response.messageUuid;

    return {
      messageUuid: uuid || "",
      success: true,
    };
  } catch (error) {
    console.error("Failed to send SMS:", error);
    throw error;
  }
}

/**
 * Send a WhatsApp message
 */
export async function sendWhatsApp(options: WhatsAppOptions): Promise<{
  messageUuid: string;
  success: boolean;
}> {
  const plivoClient = getPlivoClient();
  const from = options.from || process.env.PLIVO_WHATSAPP_NUMBER;

  if (!from) {
    throw new Error("PLIVO_WHATSAPP_NUMBER is required for sending WhatsApp");
  }

  try {
    // Format numbers for WhatsApp (requires whatsapp: prefix)
    const src = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
    const dst = options.to.startsWith("whatsapp:")
      ? options.to
      : `whatsapp:${options.to}`;

    // Plivo SDK requires positional arguments: src, dst, text, optionalParams
    const response = (await plivoClient.messages.create(
      src,
      dst,
      options.message,
      { type: "whatsapp" }
    )) as PlivoMessageResponse;

    const uuid = Array.isArray(response.messageUuid)
      ? response.messageUuid[0]
      : response.messageUuid;

    return {
      messageUuid: uuid || "",
      success: true,
    };
  } catch (error) {
    console.error("Failed to send WhatsApp:", error);
    throw error;
  }
}

/**
 * Format phone number for Plivo (E.164 format)
 */
export function formatPhoneNumber(
  phone: string,
  countryCode: string = "1"
): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // If already has country code (10+ digits), return as is
  if (digits.length >= 11) {
    return digits;
  }

  // Add country code
  return `${countryCode}${digits}`;
}
