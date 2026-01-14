import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendInvitationEmail } from "@/lib/email/service";

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
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    const typedUser = userData as UserData | null;

    if (!typedUser?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    const { data: invitations, error } = await supabase
      .from("team_invitations")
      .select("id, email, role, status, expires_at, created_at, invited_by")
      .eq("org_id", typedUser.org_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to get invitations:", error);
      return NextResponse.json(
        { error: "Failed to get invitations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitations: invitations || [] });
  } catch (error) {
    console.error("Invitations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new invitation
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    const typedUser = userData as UserData | null;

    if (!typedUser?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    if (!["owner", "admin"].includes(typedUser.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can invite members" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = "member" } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if user already exists in org
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("org_id", typedUser.org_id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 400 }
      );
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("org_id", typedUser.org_id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json(
        { error: "Invitation already pending for this email" },
        { status: 400 }
      );
    }

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from("team_invitations")
      .insert({
        org_id: typedUser.org_id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
      } as never)
      .select("id, email, role, token, expires_at")
      .single();

    if (createError) {
      console.error("Failed to create invitation:", createError);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
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

    return NextResponse.json({
      success: true,
      invitation: {
        id: typedInvitation.id,
        email: typedInvitation.email,
        role: typedInvitation.role,
        expires_at: typedInvitation.expires_at,
      },
    });
  } catch (error) {
    console.error("Invitations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke invitation
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single();

    const typedUser = userData as UserData | null;

    if (!typedUser?.org_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    if (!["owner", "admin"].includes(typedUser.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID required" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("team_invitations")
      .update({ status: "revoked" } as never)
      .eq("id", invitationId)
      .eq("org_id", typedUser.org_id);

    if (updateError) {
      console.error("Failed to revoke invitation:", updateError);
      return NextResponse.json(
        { error: "Failed to revoke invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invitations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
