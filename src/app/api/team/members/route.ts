import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface UserData {
  org_id: string | null;
  role: "owner" | "admin" | "member";
}

// GET - List all team members
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

    // Get user's organization
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

    // Get all members
    const { data: members, error } = await supabase
      .from("users")
      .select(
        "id, email, full_name, avatar_url, role, last_seen_at, created_at"
      )
      .eq("org_id", typedUser.org_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to get members:", error);
      return NextResponse.json(
        { error: "Failed to get team members" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      members: members || [],
      currentUserId: user.id,
      currentUserRole: typedUser.role || "member",
    });
  } catch (error) {
    console.error("Team members API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update member role
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user's organization and role
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

    // Only owners can change roles
    if (typedUser.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can change member roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role || !["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid member ID or role" },
        { status: 400 }
      );
    }

    // Can't change owner's role
    if (memberId === user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
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
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (typedTarget.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change owner's role" },
        { status: 400 }
      );
    }

    // Update role
    const { error: updateError } = await supabase
      .from("users")
      .update({ role } as never)
      .eq("id", memberId);

    if (updateError) {
      console.error("Failed to update role:", updateError);
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Team members API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove member from organization
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

    // Get current user's organization and role
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

    // Only owners and admins can remove members
    if (!["owner", "admin"].includes(typedUser.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID required" },
        { status: 400 }
      );
    }

    // Can't remove yourself
    if (memberId === user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 400 }
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
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Can't remove owner
    if (typedTarget.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove owner" },
        { status: 400 }
      );
    }

    // Admins can't remove other admins
    if (typedUser.role === "admin" && typedTarget.role === "admin") {
      return NextResponse.json(
        { error: "Admins cannot remove other admins" },
        { status: 403 }
      );
    }

    // Remove from organization (set org_id to null)
    const { error: removeError } = await supabase
      .from("users")
      .update({ org_id: null, role: "member" } as never)
      .eq("id", memberId);

    if (removeError) {
      console.error("Failed to remove member:", removeError);
      return NextResponse.json(
        { error: "Failed to remove member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team members API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
