import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { z } from "zod";

const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

interface InvitationData {
  id: string;
  org_id: string;
  email: string;
  role: "admin" | "member";
  status: string;
  expires_at: string;
  organization?: { id: string; name: string };
}

// POST - Accept invitation
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Validate request body
  const { token } = await validateBody(request, acceptInvitationSchema);

  // Find invitation by token
  const { data: invitation, error: inviteError } = await supabase
    .from("team_invitations")
    .select("id, org_id, email, role, status, expires_at")
    .eq("token", token)
    .single();

  if (inviteError || !invitation) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Invitation not found", 404);
  }

  const typedInvite = invitation as InvitationData;

  // Verify email matches
  if (typedInvite.email.toLowerCase() !== user.email?.toLowerCase()) {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "This invitation was sent to a different email address",
      403
    );
  }

  // Check status
  if (typedInvite.status !== "pending") {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `Invitation is ${typedInvite.status}`,
      400
    );
  }

  // Check expiry
  if (new Date(typedInvite.expires_at) < new Date()) {
    // Mark as expired
    await supabase
      .from("team_invitations")
      .update({ status: "expired" } as never)
      .eq("id", typedInvite.id);

    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Invitation has expired",
      400
    );
  }

  // Check if user is already in an organization
  const { data: existingUser } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (existingUser && (existingUser as { org_id: string | null }).org_id) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "You are already a member of an organization",
      400
    );
  }

  // Accept invitation - update user's org and role
  const { error: updateError } = await supabase
    .from("users")
    .update({
      org_id: typedInvite.org_id,
      role: typedInvite.role,
    } as never)
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to update user:", updateError);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to accept invitation",
      500
    );
  }

  // Mark invitation as accepted
  await supabase
    .from("team_invitations")
    .update({ status: "accepted" } as never)
    .eq("id", typedInvite.id);

  return apiSuccess({
    success: true,
    org_id: typedInvite.org_id,
  });
});

// GET - Get invitation details by token (for preview)
export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "Token required", 400);
  }

  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("team_invitations")
    .select("id, email, role, status, expires_at, org_id")
    .eq("token", token)
    .single();

  if (error || !invitation) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Invitation not found", 404);
  }

  const typedInvite = invitation as InvitationData;

  // Get org name
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", typedInvite.org_id)
    .single();

  const isExpired = new Date(typedInvite.expires_at) < new Date();
  const isValid = typedInvite.status === "pending" && !isExpired;

  return apiSuccess({
    invitation: {
      email: typedInvite.email,
      role: typedInvite.role,
      status: isExpired ? "expired" : typedInvite.status,
      organization_name: (org as { name: string } | null)?.name || "Unknown",
      is_valid: isValid,
    },
  });
});

