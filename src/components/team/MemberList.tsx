"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MoreVertical, Shield, User, Crown, Trash2 } from "lucide-react";
import { useContent } from "@/hooks/use-content";

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member";
  last_seen_at: string | null;
  created_at: string;
}

interface MemberListProps {
  members: Member[];
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "member";
  onRoleChange: (memberId: string, role: "admin" | "member") => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

const roleIcons: Record<string, React.ReactNode> = {
  owner: <Crown className="w-4 h-4 text-amber-500" />,
  admin: <Shield className="w-4 h-4 text-violet-500" />,
  member: <User className="w-4 h-4 text-gray-400" />,
};

const roleBadgeVariant: Record<
  string,
  "default" | "success" | "warning" | "error" | "info"
> = {
  owner: "warning",
  admin: "info",
  member: "default",
};

export function MemberList({
  members,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onRemove,
}: MemberListProps) {
  const { content } = useContent();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const canChangeRoles = currentUserRole === "owner";
  const canRemoveMembers = ["owner", "admin"].includes(currentUserRole);

  const handleRoleChange = async (
    memberId: string,
    role: "admin" | "member"
  ) => {
    setLoading(memberId);
    try {
      await onRoleChange(memberId, role);
    } finally {
      setLoading(null);
      setMenuOpen(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    setLoading(memberId);
    try {
      await onRemove(memberId);
    } finally {
      setLoading(null);
      setMenuOpen(null);
    }
  };

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isCurrentUser = member.id === currentUserId;
        const canModify =
          !isCurrentUser &&
          member.role !== "owner" &&
          (canChangeRoles || (canRemoveMembers && member.role === "member"));

        return (
          <Card
            key={member.id}
            className="p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <Avatar
                src={member.avatar_url || undefined}
                fallback={
                  member.full_name?.substring(0, 2).toUpperCase() ||
                  member.email.substring(0, 2).toUpperCase()
                }
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {member.full_name || member.email.split("@")[0]}
                  </p>
                  {isCurrentUser && (
                    <span className="text-xs text-gray-500">
                      {content.settings.team.actions.you}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {member.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={roleBadgeVariant[member.role]}>
                <span className="flex items-center gap-1.5">
                  {roleIcons[member.role]}
                  <span className="capitalize">{member.role}</span>
                </span>
              </Badge>

              {canModify && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setMenuOpen(menuOpen === member.id ? null : member.id)
                    }
                    disabled={loading === member.id}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>

                  {menuOpen === member.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                        {canChangeRoles && (
                          <>
                            {member.role !== "admin" && (
                              <button
                                onClick={() =>
                                  handleRoleChange(member.id, "admin")
                                }
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Shield className="w-4 h-4 text-violet-500" />
                                {content.settings.team.actions.makeAdmin}
                              </button>
                            )}
                            {member.role !== "member" && (
                              <button
                                onClick={() =>
                                  handleRoleChange(member.id, "member")
                                }
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <User className="w-4 h-4 text-gray-400" />
                                {content.settings.team.actions.makeMember}
                              </button>
                            )}
                            <hr className="my-1 border-gray-200 dark:border-gray-700" />
                          </>
                        )}
                        <button
                          onClick={() => handleRemove(member.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          {content.settings.team.actions.removeFromTeam}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
