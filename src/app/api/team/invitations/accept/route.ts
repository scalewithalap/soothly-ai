import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Find invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from("team_invitations")
      .select("id, org_id, email, role, status, expires_at")
      .eq("token", token)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const typedInvite = invitation as InvitationData;

    // Verify email matches
    if (typedInvite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Check status
    if (typedInvite.status !== "pending") {
      return NextResponse.json(
        { error: `Invitation is ${typedInvite.status}` },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(typedInvite.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from("team_invitations")
        .update({ status: "expired" } as never)
        .eq("id", typedInvite.id);

      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if user is already in an organization
    const { data: existingUser } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (existingUser && (existingUser as { org_id: string | null }).org_id) {
      return NextResponse.json(
        { error: "You are already a member of an organization" },
        { status: 400 }
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
      return NextResponse.json(
        { error: "Failed to accept invitation" },
        { status: 500 }
      );
    }

    // Mark invitation as accepted
    await supabase
      .from("team_invitations")
      .update({ status: "accepted" } as never)
      .eq("id", typedInvite.id);

    return NextResponse.json({
      success: true,
      org_id: typedInvite.org_id,
    });
  } catch (error) {
    console.error("Accept invitation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get invitation details by token (for preview)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: invitation, error } = await supabase
      .from("team_invitations")
      .select(
        `
        id,
        email,
        role,
        status,
        expires_at,
        org_id
      `
      )
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
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

    return NextResponse.json({
      invitation: {
        email: typedInvite.email,
        role: typedInvite.role,
        status: isExpired ? "expired" : typedInvite.status,
        organization_name: (org as { name: string } | null)?.name || "Unknown",
        is_valid: isValid,
      },
    });
  } catch (error) {
    console.error("Get invitation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
