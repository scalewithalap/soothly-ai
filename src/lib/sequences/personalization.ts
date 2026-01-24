/**
 * Email Personalization Engine
 * Variable substitution and email content personalization
 */

import type { ContactData } from "./types";

// ============================================================================
// Variable Pattern
// ============================================================================

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;
const FALLBACK_PATTERN = /\{\{(\w+)\|([^}]*)\}\}/g; // {{variable|fallback}}

// ============================================================================
// Built-in Variables
// ============================================================================

type BuiltInVariables = {
  currentDate: string;
  currentYear: string;
  currentMonth: string;
  currentDay: string;
};

function getBuiltInVariables(): BuiltInVariables {
  const now = new Date();
  return {
    currentDate: now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    currentYear: now.getFullYear().toString(),
    currentMonth: now.toLocaleDateString("en-US", { month: "long" }),
    currentDay: now.toLocaleDateString("en-US", { weekday: "long" }),
  };
}

// ============================================================================
// Variable Extraction
// ============================================================================

/**
 * Extract all variable names from a template
 */
export function extractVariables(template: string): string[] {
  const variables = new Set<string>();

  // Match simple variables {{variable}}
  let match;
  while ((match = VARIABLE_PATTERN.exec(template)) !== null) {
    variables.add(match[1]);
  }

  // Reset regex state
  VARIABLE_PATTERN.lastIndex = 0;

  // Match variables with fallbacks {{variable|fallback}}
  while ((match = FALLBACK_PATTERN.exec(template)) !== null) {
    variables.add(match[1]);
  }

  // Reset regex state
  FALLBACK_PATTERN.lastIndex = 0;

  return Array.from(variables);
}

/**
 * Check if all required variables have values
 */
export function validateContactData(
  variables: string[],
  contactData: ContactData,
): { valid: boolean; missing: string[] } {
  const builtInVars = Object.keys(getBuiltInVariables());
  const flatData = flattenContactData(contactData);

  const missing: string[] = [];

  for (const variable of variables) {
    // Skip built-in variables
    if (builtInVars.includes(variable)) continue;

    // Check if contact data has this variable
    if (!flatData[variable] || flatData[variable].trim() === "") {
      missing.push(variable);
    }
  }

  return { valid: missing.length === 0, missing };
}

// ============================================================================
// Personalization
// ============================================================================

export interface PersonalizeOptions {
  fallbackBehavior?: "empty" | "keep" | "placeholder";
  placeholder?: string;
  escapeHtml?: boolean;
}

/**
 * Personalize email content by substituting variables
 */
export function personalizeEmail(
  template: string,
  contactData: ContactData,
  options: PersonalizeOptions = {},
): string {
  const {
    fallbackBehavior = "placeholder",
    placeholder = "[Missing Value]",
    escapeHtml = true,
  } = options;

  const builtInVars = getBuiltInVariables();
  const flatData = flattenContactData(contactData);

  // Combine all available variables
  const allVariables: Record<string, string> = {
    ...flatData,
    ...builtInVars,
  };

  let result = template;

  // First, handle variables with fallbacks {{variable|fallback}}
  result = result.replace(
    FALLBACK_PATTERN,
    (_, varName: string, fallback: string) => {
      const value = allVariables[varName];
      if (value && value.trim() !== "") {
        return escapeHtml ? escapeHtmlChars(value) : value;
      }
      return fallback;
    },
  );

  // Then, handle simple variables {{variable}}
  result = result.replace(VARIABLE_PATTERN, (match, varName: string) => {
    const value = allVariables[varName];

    if (value && value.trim() !== "") {
      return escapeHtml ? escapeHtmlChars(value) : value;
    }

    switch (fallbackBehavior) {
      case "empty":
        return "";
      case "keep":
        return match;
      case "placeholder":
      default:
        return placeholder;
    }
  });

  return result;
}

/**
 * Personalize both subject and body
 */
export function personalizeEmailContent(
  subject: string,
  bodyHtml: string,
  bodyText: string | null,
  contactData: ContactData,
  options: PersonalizeOptions = {},
): { subject: string; bodyHtml: string; bodyText: string | null } {
  return {
    subject: personalizeEmail(subject, contactData, {
      ...options,
      escapeHtml: false,
    }),
    bodyHtml: personalizeEmail(bodyHtml, contactData, options),
    bodyText: bodyText
      ? personalizeEmail(bodyText, contactData, {
          ...options,
          escapeHtml: false,
        })
      : null,
  };
}

// ============================================================================
// Preview
// ============================================================================

/**
 * Generate a preview with sample data
 */
export function generatePreview(
  template: string,
  sampleData?: Partial<ContactData>,
): string {
  const defaultSampleData: ContactData = {
    firstName: "John",
    lastName: "Doe",
    company: "Acme Corp",
    title: "CEO",
    customFields: {},
  };

  const mergedData = { ...defaultSampleData, ...sampleData };

  return personalizeEmail(template, mergedData, {
    fallbackBehavior: "placeholder",
    placeholder: "[Sample Value]",
  });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Flatten contact data for variable lookup
 */
function flattenContactData(contactData: ContactData): Record<string, string> {
  const result: Record<string, string> = {};

  // Standard fields
  if (contactData.firstName) result.firstName = contactData.firstName;
  if (contactData.lastName) result.lastName = contactData.lastName;
  if (contactData.company) result.company = contactData.company;
  if (contactData.title) result.title = contactData.title;
  if (contactData.phone) result.phone = contactData.phone;

  // Computed fields
  if (contactData.firstName && contactData.lastName) {
    result.fullName = `${contactData.firstName} ${contactData.lastName}`;
  }

  // Custom fields
  if (contactData.customFields) {
    for (const [key, value] of Object.entries(contactData.customFields)) {
      if (value) result[key] = value;
    }
  }

  return result;
}

/**
 * Escape HTML special characters
 */
function escapeHtmlChars(str: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return str.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

/**
 * Create unsubscribe link
 */
export function createUnsubscribeLink(
  baseUrl: string,
  enrollmentId: string,
): string {
  const token = Buffer.from(enrollmentId).toString("base64url");
  return `${baseUrl}/unsubscribe/${token}`;
}

/**
 * Add tracking pixel to email HTML
 */
export function addTrackingPixel(
  html: string,
  baseUrl: string,
  enrollmentId: string,
  stepId: string,
): string {
  const trackingUrl = `${baseUrl}/api/sequences/track/open?e=${enrollmentId}&s=${stepId}`;
  const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;" />`;

  // Add before closing body tag if it exists
  if (html.includes("</body>")) {
    return html.replace("</body>", `${trackingPixel}</body>`);
  }

  // Otherwise append to end
  return html + trackingPixel;
}

/**
 * Wrap links for click tracking
 */
export function wrapLinksForTracking(
  html: string,
  baseUrl: string,
  enrollmentId: string,
  stepId: string,
): string {
  const linkPattern = /<a\s+([^>]*href=["'])([^"']+)(["'][^>]*)>/gi;

  return html.replace(linkPattern, (match, before, url, after) => {
    // Skip internal links and special protocols
    if (
      url.startsWith("#") ||
      url.startsWith("mailto:") ||
      url.startsWith("tel:") ||
      url.includes("/unsubscribe/")
    ) {
      return match;
    }

    const encodedUrl = encodeURIComponent(url);
    const trackingUrl = `${baseUrl}/api/sequences/track/click?e=${enrollmentId}&s=${stepId}&url=${encodedUrl}`;

    return `<a ${before}${trackingUrl}${after}>`;
  });
}
