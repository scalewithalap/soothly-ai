"use client";

/**
 * SSO Configuration Page (Admin/Owner Only)
 *
 * View and manage enterprise SSO settings.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Key, Building2, ExternalLink, Info } from "lucide-react";
import { useContent } from "@/hooks/use-content";

export default function SSOConfigPage() {
  const { content } = useContent();
  const admin = content.admin;
  const t = admin.ssoPage || {};
  const saml = t.samlConfig || {};
  const setup = t.setupProcess || {};

  const [copied, setCopied] = useState(false);

  const acsUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/callback`
      : "";
  const entityId =
    typeof window !== "undefined" ? `${window.location.origin}/sso` : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Key className="w-6 h-6" />
          {t.title || "Single Sign-On (SSO)"}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t.description || "Configure enterprise SSO for your organization"}
        </p>
      </div>

      {/* Enterprise tier notice */}
      <Card className="p-6 bg-[#9382FF]/10 dark:bg-[#9382FF]/20 border-[#9382FF]/20 dark:border-[#9382FF]/30">
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-[#9382FF] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-[#9382FF] dark:text-[#B8AEFF]">
              {t.enterpriseFeature || "Enterprise Feature"}
            </h3>
            <p className="text-sm text-[#9382FF] dark:text-[#B8AEFF] mt-1">
              {t.enterpriseDescription ||
                "SAML SSO is available on the Enterprise plan. Contact our sales team to enable SSO for your organization."}
            </p>
            <Button size="sm" className="mt-3" asChild>
              <a href="mailto:sales@zeroheadache.co">
                {t.contactSales || "Contact Sales"}
              </a>
            </Button>
          </div>
        </div>
      </Card>

      {/* SAML Configuration */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" />
          {saml.title || "SAML 2.0 Configuration"}
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {saml.description ||
            "Use these values to configure your Identity Provider (IdP):"}
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {saml.acsUrl || "ACS URL (Assertion Consumer Service)"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(acsUrl)}
              >
                {copied ? saml.copied || "Copied!" : saml.copy || "Copy"}
              </Button>
            </div>
            <code className="text-xs text-gray-600 dark:text-gray-400 break-all">
              {acsUrl}
            </code>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {saml.entityId || "Entity ID / Audience URI"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(entityId)}
              >
                {saml.copy || "Copy"}
              </Button>
            </div>
            <code className="text-xs text-gray-600 dark:text-gray-400 break-all">
              {entityId}
            </code>
          </div>
        </div>
      </Card>

      {/* Supported Providers */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
          {t.supportedProviders || "Supported Identity Providers"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            "Okta",
            "Azure AD",
            "Google Workspace",
            "OneLogin",
            "PingIdentity",
            "Auth0",
          ].map((provider) => (
            <div
              key={provider}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-sm"
            >
              {provider}
            </div>
          ))}
        </div>
      </Card>

      {/* Setup steps */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5" />
          {setup.title || "Setup Process"}
        </h2>
        <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <Badge variant="default" size="sm" className="mt-0.5">
              1
            </Badge>
            <span>
              {setup.step1 ||
                "Contact our team to enable SSO for your organization"}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="default" size="sm" className="mt-0.5">
              2
            </Badge>
            <span>
              {setup.step2 ||
                "Configure your IdP with the ACS URL and Entity ID above"}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="default" size="sm" className="mt-0.5">
              3
            </Badge>
            <span>
              {setup.step3 ||
                "Provide your IdP metadata URL or XML to our team"}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Badge variant="default" size="sm" className="mt-0.5">
              4
            </Badge>
            <span>
              {setup.step4 || "SSO will be enabled for your configured domains"}
            </span>
          </li>
        </ol>
      </Card>

      {/* Documentation link */}
      <Card className="p-4 flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t.helpText || "Need help setting up SSO?"}
        </span>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a
            href="https://supabase.com/docs/guides/auth/enterprise-sso/auth-sso-saml"
            target="_blank"
            rel="noopener"
          >
            {t.viewDocs || "View Documentation"}
            <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
      </Card>
    </div>
  );
}
