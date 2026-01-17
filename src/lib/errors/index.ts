import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Standard API error codes for backend-to-frontend communication.
 * These codes map to i18n keys in the frontend.
 */
export const ErrorCodes = {
  // Auth
  AUTH_UNAUTHORIZED: "auth/unauthorized",
  AUTH_SESSION_EXPIRED: "auth/session_expired",
  AUTH_FORBIDDEN: "auth/forbidden",
  AUTH_NO_ORGANIZATION: "auth/no_organization",
  AUTH_INVALID_CREDENTIALS: "auth/invalid_credentials",
  AUTH_EMAIL_NOT_VERIFIED: "auth/email_not_verified",

  // Validation
  VALIDATION_INVALID_INPUT: "validation/invalid_input",
  VALIDATION_MISSING_FIELD: "validation/missing_field",
  VALIDATION_ERROR: "validation/error",
  VALIDATION_INVALID_FORMAT: "validation/invalid_format",

  // Credits
  CREDIT_INSUFFICIENT: "credit/insufficient_balance",
  CREDIT_LIMIT_REACHED: "credit/limit_reached",

  // Database
  DATABASE_ERROR: "database/error",

  // Agents
  AGENT_NOT_FOUND: "agent/not_found",
  AGENT_INVALID_TYPE: "agent/invalid_type",
  AGENT_TASK_FAILED: "agent/task_failed",
  AGENT_ALREADY_RUNNING: "agent/already_running",

  // Billing
  BILLING_PAYMENT_FAILED: "billing/payment_failed",
  BILLING_SUBSCRIPTION_REQUIRED: "billing/subscription_required",

  // Team
  TEAM_INVITE_EXPIRED: "team/invite_expired",
  TEAM_INVITE_INVALID: "team/invite_invalid",
  TEAM_MEMBER_NOT_FOUND: "team/member_not_found",
  TEAM_ADMIN_REQUIRED: "team/admin_required",

  // MCP
  MCP_CONNECTION_FAILED: "mcp/connection_failed",
  MCP_SERVER_NOT_FOUND: "mcp/server_not_found",

  // Generic
  SERVER_ERROR: "server/internal_error",
  NOT_FOUND: "server/not_found",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * AppError - Standardized error class for API responses.
 * Use this instead of throwing generic Errors.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }

  /**
   * Convert AppError to NextResponse
   */
  toResponse(): NextResponse {
    return NextResponse.json(this.toJSON(), { status: this.statusCode });
  }

  // ============================================
  // STATIC FACTORY METHODS
  // ============================================

  static unauthorized(message = "Authentication required"): AppError {
    return new AppError(ErrorCodes.AUTH_UNAUTHORIZED, message, 401);
  }

  static forbidden(message = "Access denied"): AppError {
    return new AppError(ErrorCodes.AUTH_FORBIDDEN, message, 403);
  }

  static noOrganization(): AppError {
    return new AppError(
      ErrorCodes.AUTH_NO_ORGANIZATION,
      "User has no organization",
      403,
    );
  }

  static invalidInput(details?: Record<string, unknown>): AppError {
    return new AppError(
      ErrorCodes.VALIDATION_INVALID_INPUT,
      "Invalid input",
      400,
      details,
    );
  }

  static missingField(field: string): AppError {
    return new AppError(
      ErrorCodes.VALIDATION_MISSING_FIELD,
      `Missing required field: ${field}`,
      400,
      { field },
    );
  }

  static serverError(message = "An unexpected error occurred"): AppError {
    return new AppError(ErrorCodes.SERVER_ERROR, message, 500);
  }

  static databaseError(message = "Database operation failed"): AppError {
    return new AppError(ErrorCodes.DATABASE_ERROR, message, 500);
  }

  static insufficientCredits(): AppError {
    return new AppError(
      ErrorCodes.CREDIT_INSUFFICIENT,
      "Insufficient credits",
      402,
    );
  }

  static agentNotFound(agentId?: string): AppError {
    return new AppError(
      ErrorCodes.AGENT_NOT_FOUND,
      agentId ? `Agent ${agentId} not found` : "Agent not found",
      404,
    );
  }

  static invalidAgentType(type: string): AppError {
    return new AppError(
      ErrorCodes.AGENT_INVALID_TYPE,
      `Invalid agent type: ${type}`,
      400,
      { type },
    );
  }

  static adminRequired(): AppError {
    return new AppError(
      ErrorCodes.TEAM_ADMIN_REQUIRED,
      "Admin privileges required",
      403,
    );
  }

  static notFound(resource = "Resource"): AppError {
    return new AppError(ErrorCodes.NOT_FOUND, `${resource} not found`, 404);
  }

  static subscriptionRequired(message = "Subscription required"): AppError {
    return new AppError(ErrorCodes.BILLING_SUBSCRIPTION_REQUIRED, message, 403);
  }
}

/**
 * Zod validation error transformer.
 * Converts Zod errors into AppError format.
 */
export function fromZodError(error: z.ZodError): AppError {
  const firstIssue = error.issues[0];
  const message = firstIssue
    ? `${firstIssue.path.join(".")}: ${firstIssue.message}`
    : "Validation failed";

  return new AppError(ErrorCodes.VALIDATION_INVALID_INPUT, message, 400, {
    issues: error.issues,
  });
}

/**
 * Handle unknown errors and convert to AppError response
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return error.toResponse();
  }

  console.error("Unhandled API error:", error);
  return AppError.serverError().toResponse();
}
