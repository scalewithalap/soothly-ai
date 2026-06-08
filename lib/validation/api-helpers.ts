import { NextResponse } from "next/server";
import { ZodSchema, z } from "zod";
import { AppError, fromZodError, ErrorCodes } from "@/lib/errors";

/**
 * Standard API response format.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Create a success response.
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create an error response from AppError.
 */
export function apiError(error: AppError): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: error.statusCode }
  );
}

/**
 * Validate request body with Zod schema.
 * Returns parsed data or throws AppError.
 */
export async function validateBody<T extends ZodSchema>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    if (error instanceof SyntaxError) {
      throw new AppError(
        ErrorCodes.VALIDATION_INVALID_INPUT,
        "Invalid JSON body",
        400
      );
    }
    throw error;
  }
}

/**
 * Validate query params with Zod schema.
 * Returns parsed data or throws AppError.
 */
export function validateQuery<T extends ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  try {
    const params = Object.fromEntries(searchParams.entries());
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }
}

/**
 * Wrapper for API route handlers with automatic error handling.
 */
export function withErrorHandler(
  handler: (request: Request) => Promise<NextResponse>
): (request: Request) => Promise<NextResponse> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error("[API Error]", error);

      if (error instanceof AppError) {
        return apiError(error);
      }

      return apiError(
        new AppError(
          ErrorCodes.SERVER_ERROR,
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
          500
        )
      );
    }
  };
}

