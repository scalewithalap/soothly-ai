import { z } from "zod";

/**
 * Standard API error codes for backend-to-frontend communication.
 * These codes map to i18n keys in the frontend.
 */
export const ErrorCodes = {
  // Auth
  AUTH_UNAUTHORIZED: "auth/unauthorized",
  AUTH_SESSION_EXPIRED: "auth/session_expired",
  AUTH_FORBIDDEN: "auth/forbidden",

  // Validation
  VALIDATION_INVALID_INPUT: "validation/invalid_input",
  VALIDATION_MISSING_FIELD: "validation/missing_field",
  VALIDATION_ERROR: "validation/error",

  // Credits
  CREDIT_INSUFFICIENT: "credit/insufficient_balance",
  CREDIT_LIMIT_REACHED: "credit/limit_reached",

  // Database
  DATABASE_ERROR: "database/error",

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
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
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
