import { createClient } from "@/lib/supabase/server";
import { sendInvitationEmail } from "@/lib/email/service";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { inviteTeamMemberSchema } from "@/lib/validation/schemas";

interface UserData {
  org_id: string | null;
  role: "owner" | "admin" | "member";
}

interface InvitationData {
  id: string;
  email: string;
  role: "admin" | "member";
  status: string;
  expires_at: string;
  created_at: string;
  invited_by: string;
  token: string;
  inviter?: { full_name: string | null; email: string };
}

// GET - List pending invitations
export const GET = withErrorHandler(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  const typedUser = userData as UserData | null;

  if (!typedUser?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "No organization found", 404);
  }

  const { data: invitations, error } = await supabase
    .from("team_invitations")
    .select("id, email, role, status, expires_at, created_at, invited_by")
    .eq("org_id", typedUser.org_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to get invitations:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to get invitations",
      500
    );
  }

  return apiSuccess({ invitations: invitations || [] });
});

// POST - Create new invitation
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  const typedUser = userData as UserData | null;

  if (!typedUser?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "No organization found", 404);
  }

  if (!["owner", "admin"].includes(typedUser.role)) {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Only owners and admins can invite members",
      403
    );
  }

  // Validate request body
  const { email, role } = await validateBody(request, inviteTeamMemberSchema);
  const normalizedEmail = email.toLowerCase();

  // Check if user already exists in org
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .eq("org_id", typedUser.org_id)
    .single();

  if (existingUser) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "User is already a member",
      400
    );
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await supabase
    .from("team_invitations")
    .select("id")
    .eq("org_id", typedUser.org_id)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Invitation already pending for this email",
      400
    );
  }

  // Create invitation
  const { data: invitation, error: createError } = await supabase
    .from("team_invitations")
    .insert({
      org_id: typedUser.org_id,
      email: normalizedEmail,
      role,
      invited_by: user.id,
    } as never)
    .select("id, email, role, token, expires_at")
    .single();

  if (createError) {
    console.error("Failed to create invitation:", createError);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to create invitation",
      500
    );
  }

  const typedInvitation = invitation as InvitationData;

  // Get inviter and org info for the email
  const { data: inviterData } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const { data: orgData } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", typedUser.org_id)
    .single();

  const inviterName =
    (inviterData as { full_name: string | null; email: string } | null)
      ?.full_name ||
    (inviterData as { full_name: string | null; email: string } | null)
      ?.email ||
    "A team member";
  const organizationName =
    (orgData as { name: string } | null)?.name || "your organization";

  // Send invitation email via AWS SES
  try {
    await sendInvitationEmail({
      email: typedInvitation.email,
      inviterName,
      organizationName,
      role: role as "admin" | "member",
      token: typedInvitation.token,
    });
  } catch (emailError) {
    console.error("Failed to send invitation email:", emailError);
    // Don't fail the request, invitation was created successfully
  }

  return apiSuccess({
    success: true,
    invitation: {
      id: typedInvitation.id,
      email: typedInvitation.email,
      role: typedInvitation.role,
      expires_at: typedInvitation.expires_at,
    },
  });
});

// DELETE - Revoke invitation
export const DELETE = withErrorHandler(async (request: Request) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  const typedUser = userData as UserData | null;

  if (!typedUser?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "No organization found", 404);
  }

  if (!["owner", "admin"].includes(typedUser.role)) {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Insufficient permissions",
      403
    );
  }

  const { searchParams } = new URL(request.url);
  const invitationId = searchParams.get("id");

  if (!invitationId) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Invitation ID required",
      400
    );
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(invitationId)) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid invitation ID format",
      400
    );
  }

  const { error: updateError } = await supabase
    .from("team_invitations")
    .update({ status: "revoked" } as never)
    .eq("id", invitationId)
    .eq("org_id", typedUser.org_id);

  if (updateError) {
    console.error("Failed to revoke invitation:", updateError);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to revoke invitation",
      500
    );
  }

  return apiSuccess({ success: true });
});

