"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useContent } from "@/hooks/use-content";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MemberList } from "@/components/team/MemberList";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";
import { UserPlus, Mail, Clock, X } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member";
  last_seen_at: string | null;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: "admin" | "member";
  status: string;
  expires_at: string;
  created_at: string;
}

export default function TeamSettingsPage() {
  const { content } = useContent();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<
    "owner" | "admin" | "member"
  >("member");

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/team/invitations"),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
        // Set current user info from the response
        if (data.currentUserId) {
          setCurrentUserId(data.currentUserId);
        }
        if (data.currentUserRole) {
          setCurrentUserRole(data.currentUserRole);
        }
      }

      if (invitesRes.ok) {
        const data = await invitesRes.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error("Failed to fetch team data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (
    memberId: string,
    role: "admin" | "member"
  ) => {
    try {
      const res = await fetch("/api/team/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m))
      );
      toast.success(`Role updated to ${role}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      );
      throw error;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/team/members?memberId=${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Member removed from team");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
      throw error;
    }
  };

  const handleInvite = async (email: string, role: "admin" | "member") => {
    const res = await fetch("/api/team/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Failed to send invitation");
      throw new Error(data.error || "Failed to send invitation");
    }

    const data = await res.json();
    setInvitations((prev) => [data.invitation, ...prev]);
    toast.success(`Invitation sent to ${email}`);
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    const res = await fetch(`/api/team/invitations?id=${invitationId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      toast.success("Invitation revoked");
    } else {
      toast.error("Failed to revoke invitation");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {content.settings.team.title}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {content.settings.team.description}
          </p>
        </div>
        {["owner", "admin"].includes(currentUserRole) && (
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            {content.settings.team.inviteButton}
          </Button>
        )}
      </div>

      {/* Members Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {content.settings.team.membersList.title} ({members.length})
        </h2>
        <MemberList
          members={members}
          currentUserId={currentUserId || ""}
          currentUserRole={currentUserRole}
          onRoleChange={handleRoleChange}
          onRemove={handleRemoveMember}
        />
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {content.settings.team.pendingInvites.title} ({invitations.length})
          </h2>
          <div className="space-y-3">
            {invitations.map((invite) => (
              <Card
                key={invite.id}
                className="p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invite.email}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {content.settings.team.pendingInvites.expires}{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="default" className="capitalize">
                    {invite.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvitation(invite.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />
    </div>
  );
}
