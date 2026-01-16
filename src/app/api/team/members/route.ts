import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import { updateMemberRoleSchema } from "@/lib/validation/schemas";

interface UserData {
  org_id: string | null;
  role: "owner" | "admin" | "member";
}

// GET - List all team members
export const GET = withErrorHandler(async () => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get user's organization
  const { data: userData } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  const typedUser = userData as UserData | null;

  if (!typedUser?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "No organization found", 404);
  }

  // Get all members
  const { data: members, error } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url, role, last_seen_at, created_at")
    .eq("org_id", typedUser.org_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to get members:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to get team members",
      500
    );
  }

  return apiSuccess({
    members: members || [],
    currentUserId: user.id,
    currentUserRole: typedUser.role || "member",
  });
});

// PATCH - Update member role
export const PATCH = withErrorHandler(async (request: Request) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get current user's organization and role
  const { data: userData } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  const typedUser = userData as UserData | null;

  if (!typedUser?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "No organization found", 404);
  }

  // Only owners can change roles
  if (typedUser.role !== "owner") {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Only owners can change member roles",
      403
    );
  }

  // Validate request body
  const { memberId, role } = await validateBody(
    request,
    updateMemberRoleSchema
  );

  // Can't change owner's own role
  if (memberId === user.id) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Cannot change your own role",
      400
    );
  }

  // Verify member belongs to same org
  const { data: targetMember } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", memberId)
    .single();

  const typedTarget = targetMember as UserData | null;

  if (!typedTarget || typedTarget.org_id !== typedUser.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Member not found", 404);
  }

  if (typedTarget.role === "owner") {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Cannot change owner's role",
      400
    );
  }

  // Update role
  const { error: updateError } = await supabase
    .from("users")
    .update({ role } as never)
    .eq("id", memberId);

  if (updateError) {
    console.error("Failed to update role:", updateError);
    throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to update role", 500);
  }

  return apiSuccess({ success: true, role });
});

// DELETE - Remove member from organization
export const DELETE = withErrorHandler(async (request: Request) => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  // Get current user's organization and role
  const { data: userData } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single();

  const typedUser = userData as UserData | null;

  if (!typedUser?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "No organization found", 404);
  }

  // Only owners and admins can remove members
  if (!["owner", "admin"].includes(typedUser.role)) {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Insufficient permissions",
      403
    );
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  if (!memberId) {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "Member ID required", 400);
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(memberId)) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Invalid member ID format",
      400
    );
  }

  // Can't remove yourself
  if (memberId === user.id) {
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      "Cannot remove yourself",
      400
    );
  }

  // Verify member belongs to same org and check their role
  const { data: targetMember } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", memberId)
    .single();

  const typedTarget = targetMember as UserData | null;

  if (!typedTarget || typedTarget.org_id !== typedUser.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Member not found", 404);
  }

  // Can't remove owner
  if (typedTarget.role === "owner") {
    throw new AppError(ErrorCodes.VALIDATION_ERROR, "Cannot remove owner", 400);
  }

  // Admins can't remove other admins
  if (typedUser.role === "admin" && typedTarget.role === "admin") {
    throw new AppError(
      ErrorCodes.AUTH_FORBIDDEN,
      "Admins cannot remove other admins",
      403
    );
  }

  // Remove from organization (set org_id to null)
  const { error: removeError } = await supabase
    .from("users")
    .update({ org_id: null, role: "member" } as never)
    .eq("id", memberId);

  if (removeError) {
    console.error("Failed to remove member:", removeError);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to remove member",
      500
    );
  }

  return apiSuccess({ success: true });
});
