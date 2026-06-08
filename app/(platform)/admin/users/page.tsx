"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, User, RefreshCw } from "lucide-react";
import { useContent } from "@/hooks/use-content";
import { toast } from "sonner";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminUsersPage() {
  const { content } = useContent();
  const admin = content.admin;

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, role: string) => {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role } : u)),
        );
        toast.success(
          admin.usersPage?.toasts?.roleUpdated || "User role updated",
        );
      } else {
        toast.error(
          admin.usersPage?.toasts?.roleUpdateFailed || "Failed to update role",
        );
      }
    } catch {
      toast.error(
        admin.usersPage?.toasts?.roleUpdateFailed || "Failed to update role",
      );
    } finally {
      setUpdating(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const roles = admin.usersPage?.roles || {};
    switch (role) {
      case "owner":
        return (
          <Badge variant="default" className="gap-1 bg-[#9382FF]">
            <Shield className="w-3 h-3" />
            {roles.owner || "Owner"}
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="default" className="gap-1 bg-blue-600">
            <Shield className="w-3 h-3" />
            {roles.admin || "Admin"}
          </Badge>
        );
      default:
        return (
          <Badge variant="info" className="gap-1">
            <User className="w-3 h-3" />
            {roles.member || "Member"}
          </Badge>
        );
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return admin.usersPage?.never || "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#9382FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const headers = admin.usersPage?.tableHeaders || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            {admin.usersPage?.title || "User Management"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {users.length}{" "}
            {admin.usersPage?.description || "users in your organization"}
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {admin.refresh || "Refresh"}
        </Button>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {headers.user || "User"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {headers.role || "Role"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {headers.joined || "Joined"}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {headers.lastActive || "Last Active"}
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {headers.actions || "Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.full_name || admin.usersPage?.noName || "No name"}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(user.last_sign_in_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.role !== "owner" && (
                      <select
                        value={user.role}
                        onChange={(e) => updateRole(user.id, e.target.value)}
                        disabled={updating === user.id}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800"
                      >
                        <option value="member">
                          {admin.usersPage?.roles?.member || "Member"}
                        </option>
                        <option value="admin">
                          {admin.usersPage?.roles?.admin || "Admin"}
                        </option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

