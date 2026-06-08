"use client";

/**
 * API Documentation Page
 *
 * Interactive documentation for Soothly AI APIs.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Code2,
  ChevronDown,
  ChevronRight,
  Lock,
  Copy,
  CheckCircle,
} from "lucide-react";

// interface Endpoint {
//   method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
//   path: string;
//   description: string;
//   auth: boolean;
//   params?: { name: string; type: string; required: boolean; desc: string }[];
//   response?: string;
// }

const API_SECTIONS = [
  {
    title: "Authentication",
    endpoints: [
      {
        method: "POST" as const,
        path: "/api/auth/login",
        description: "Sign in with email and password",
        auth: false,
        params: [
          { name: "email", type: "string", required: true, desc: "User email" },
          {
            name: "password",
            type: "string",
            required: true,
            desc: "User password",
          },
        ],
        response: '{ "user": {...}, "session": {...} }',
      },
      {
        method: "POST" as const,
        path: "/api/auth/signup",
        description: "Create a new account",
        auth: false,
        params: [
          { name: "email", type: "string", required: true, desc: "User email" },
          {
            name: "password",
            type: "string",
            required: true,
            desc: "Password (min 8 chars)",
          },
          {
            name: "full_name",
            type: "string",
            required: false,
            desc: "Full name",
          },
        ],
      },
      {
        method: "POST" as const,
        path: "/api/auth/logout",
        description: "Sign out current user",
        auth: true,
      },
      {
        method: "GET" as const,
        path: "/api/auth/me",
        description: "Get current user profile",
        auth: true,
        response: '{ "user": {...}, "subscription": {...} }',
      },
    ],
  },
  {
    title: "MFA",
    endpoints: [
      {
        method: "POST" as const,
        path: "/api/auth/mfa/enroll",
        description: "Start TOTP enrollment (Starter+ required)",
        auth: true,
        response: '{ "factorId": "...", "qrCode": "...", "secret": "..." }',
      },
      {
        method: "POST" as const,
        path: "/api/auth/mfa/verify",
        description: "Verify TOTP code",
        auth: true,
        params: [
          {
            name: "factorId",
            type: "uuid",
            required: true,
            desc: "Factor ID from enrollment",
          },
          {
            name: "code",
            type: "string",
            required: true,
            desc: "6-digit TOTP code",
          },
        ],
      },
      {
        method: "DELETE" as const,
        path: "/api/auth/mfa/unenroll",
        description: "Remove MFA factor",
        auth: true,
        params: [
          {
            name: "factorId",
            type: "uuid",
            required: true,
            desc: "Factor ID to remove",
          },
        ],
      },
    ],
  },
  {
    title: "Agents",
    endpoints: [
      {
        method: "GET" as const,
        path: "/api/agents",
        description: "List available agents",
        auth: true,
        response: '{ "agents": [...] }',
      },
      {
        method: "POST" as const,
        path: "/api/agents/tasks",
        description: "Create a new agent task",
        auth: true,
        params: [
          {
            name: "agent_type",
            type: "string",
            required: true,
            desc: "Agent type identifier",
          },
          {
            name: "prompt",
            type: "string",
            required: true,
            desc: "Task prompt/instructions",
          },
        ],
      },
    ],
  },
  {
    title: "Notifications",
    endpoints: [
      {
        method: "GET" as const,
        path: "/api/notifications",
        description: "Get user notifications",
        auth: true,
        response: '{ "notifications": [...], "unreadCount": 5 }',
      },
      {
        method: "PATCH" as const,
        path: "/api/notifications",
        description: "Mark notifications as read",
        auth: true,
        params: [
          {
            name: "ids",
            type: "uuid[]",
            required: true,
            desc: "Notification IDs to mark read",
          },
        ],
      },
    ],
  },
  {
    title: "Health",
    endpoints: [
      {
        method: "GET" as const,
        path: "/api/health",
        description: "System health check",
        auth: false,
        response: '{ "status": "healthy", "checks": {...} }',
      },
    ],
  },
];

const METHOD_COLORS = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-purple-100 text-purple-700",
  DELETE: "bg-red-100 text-red-700",
};

export default function ApiDocsPage() {
  const [expanded, setExpanded] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setExpanded((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const copyEndpoint = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopied(path);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="w-8 h-8 text-[#9382FF]" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              API Documentation
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Reference documentation for the Soothly AI REST API
          </p>
          <div className="mt-4 p-4 bg-[#9382FF]/10 dark:bg-[#9382FF]/20 rounded-lg">
            <p className="text-sm text-[#9382FF] dark:text-[#B8AEFF]">
              <strong>Base URL:</strong>{" "}
              <code className="bg-[#9382FF]/20 dark:bg-[#9382FF]/30 px-1 rounded">
                {typeof window !== "undefined"
                  ? window.location.origin
                  : "https://your-domain.com"}
              </code>
            </p>
            <p className="text-sm text-[#9382FF] dark:text-[#B8AEFF] mt-2">
              <strong>Authentication:</strong> Include your API key in the{" "}
              <code className="bg-[#9382FF]/20 dark:bg-[#9382FF]/30 px-1 rounded">
                Authorization
              </code>{" "}
              header as <code>Bearer YOUR_API_KEY</code>
            </p>
          </div>
        </div>

        {/* API Sections */}
        <div className="space-y-4">
          {API_SECTIONS.map((section) => (
            <Card key={section.title} className="overflow-hidden">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <span className="font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="default" size="sm">
                    {section.endpoints.length} endpoints
                  </Badge>
                  {expanded.includes(section.title) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </button>

              {expanded.includes(section.title) && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  {section.endpoints.map((endpoint) => (
                    <div
                      key={endpoint.path}
                      className="p-4 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                              METHOD_COLORS[endpoint.method]
                            }`}
                          >
                            {endpoint.method}
                          </span>
                          <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
                            {endpoint.path}
                          </code>
                          {endpoint.auth && (
                            <Lock className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyEndpoint(endpoint.path)}
                        >
                          {copied === endpoint.path ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {endpoint.description}
                      </p>

                      {endpoint.params && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Parameters:
                          </p>
                          <div className="space-y-1">
                            {endpoint.params.map((param) => (
                              <div
                                key={param.name}
                                className="text-xs flex items-center gap-2"
                              >
                                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                  {param.name}
                                </code>
                                <span className="text-gray-400">
                                  {param.type}
                                </span>
                                {param.required && (
                                  <span className="text-red-500">required</span>
                                )}
                                <span className="text-gray-500">
                                  — {param.desc}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {endpoint.response && (
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Response:
                          </p>
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded block overflow-x-auto">
                            {endpoint.response}
                          </code>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
