/**
 * Authentication & Authorization Middleware Helpers
 * Provides standardized auth checks for API routes
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";

export interface AuthenticatedUser {
  id: string;
  email: string;
  orgId: string;
  role: "owner" | "admin" | "member";
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error: NextResponse | null;
}

/**
 * Get authenticated user from request
 * Returns user data or an error response
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      error: AppError.unauthorized().toResponse(),
    };
  }

  // Get user's organization and role
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    return {
      user: null,
      error: AppError.noOrganization().toResponse(),
    };
  }

  if (!userData.org_id) {
    return {
      user: null,
      error: AppError.noOrganization().toResponse(),
    };
  }

  // Cast role with fallback
  const role = (userData.role as "owner" | "admin" | "member") || "member";

  return {
    user: {
      id: user.id,
      email: user.email || "",
      orgId: userData.org_id,
      role,
    },
    error: null,
  };
}

/**
 * Require authenticated user - returns error response if not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser | NextResponse> {
  const { user, error } = await getAuthenticatedUser();

  if (error) return error;
  if (!user) return AppError.unauthorized().toResponse();

  return user;
}

/**
 * Require admin or owner role - returns error response if not admin/owner
 */
export async function requireAdmin(): Promise<
  AuthenticatedUser | NextResponse
> {
  const result = await requireAuth();

  if (result instanceof NextResponse) {
    return result;
  }

  if (!["owner", "admin"].includes(result.role)) {
    return AppError.adminRequired().toResponse();
  }

  return result;
}

/**
 * Helper to check if result is an error response
 */
export function isErrorResponse(
  result: AuthenticatedUser | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

