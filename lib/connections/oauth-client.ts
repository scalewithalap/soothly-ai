/**
 * Connection Architecture - OAuth Client
 *
 * Manages OAuth 2.0 flows for active integrations (HubSpot, WordPress, Salesforce, etc.)
 * Handles token storage, refresh, and secure API calls.
 */

import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ============================================
// TOKEN ENCRYPTION (AES-256-GCM)
// ============================================

const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || "";
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypt a token for secure storage
 */
export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn("OAUTH_ENCRYPTION_KEY not set, storing token unencrypted");
    return token;
  }

  const iv = randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a stored token
 */
export function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY) {
    return encryptedToken;
  }

  const [ivHex, authTagHex, encrypted] = encryptedToken.split(":");
  if (!ivHex || !authTagHex || !encrypted) {
    return encryptedToken; // Not encrypted
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = Buffer.from(ENCRYPTION_KEY, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ============================================
// OAUTH PROVIDER CONFIGURATIONS
// ============================================

export type OAuthProvider =
  | "hubspot"
  | "wordpress"
  | "salesforce"
  | "google"
  | "shopify";

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

/**
 * Get OAuth configuration for a provider
 */
export function getOAuthConfig(provider: OAuthProvider): OAuthConfig | null {
  const configs: Record<OAuthProvider, () => OAuthConfig | null> = {
    hubspot: () => ({
      clientId: process.env.HUBSPOT_CLIENT_ID || "",
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET || "",
      authorizationUrl: "https://app.hubspot.com/oauth/authorize",
      tokenUrl: "https://api.hubapi.com/oauth/v1/token",
      scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write"],
    }),
    wordpress: () => ({
      clientId: process.env.WORDPRESS_CLIENT_ID || "",
      clientSecret: process.env.WORDPRESS_CLIENT_SECRET || "",
      authorizationUrl: "https://public-api.wordpress.com/oauth2/authorize",
      tokenUrl: "https://public-api.wordpress.com/oauth2/token",
      scopes: ["posts", "media"],
    }),
    salesforce: () => ({
      clientId: process.env.SALESFORCE_CLIENT_ID || "",
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET || "",
      authorizationUrl:
        "https://login.salesforce.com/services/oauth2/authorize",
      tokenUrl: "https://login.salesforce.com/services/oauth2/token",
      scopes: ["api", "refresh_token"],
    }),
    google: () => ({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    }),
    shopify: () => ({
      clientId: process.env.SHOPIFY_CLIENT_ID || "",
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
      authorizationUrl: "", // Shop-specific
      tokenUrl: "", // Shop-specific
      scopes: ["read_products", "read_orders", "read_customers"],
    }),
  };

  return configs[provider]?.() || null;
}

// ============================================
// OAUTH CONNECTION MANAGEMENT
// ============================================

export interface OAuthConnection {
  id: string;
  org_id: string;
  provider: OAuthProvider;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(
  provider: OAuthProvider,
  orgId: string,
  redirectUri: string,
): string | null {
  const config = getOAuthConfig(provider);
  if (!config || !config.clientId) return null;

  const state = Buffer.from(JSON.stringify({ orgId, provider })).toString(
    "base64url",
  );

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  provider: OAuthProvider,
  code: string,
  redirectUri: string,
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  const config = getOAuthConfig(provider);
  if (!config) return { success: false, error: "Invalid provider" };

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  try {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Token exchange failed:", error);
    return { success: false, error: "Token exchange failed" };
  }
}

/**
 * Store OAuth connection in database
 */
export async function storeOAuthConnection(
  orgId: string,
  provider: OAuthProvider,
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number | null,
  metadata: Record<string, unknown> = {},
): Promise<{ success: boolean; id?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const expiresAt = expiresIn
    ? new Date(Date.now() + expiresIn * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("oauth_connections")
    .upsert(
      {
        org_id: orgId,
        provider,
        access_token_encrypted: encryptToken(accessToken),
        refresh_token_encrypted: refreshToken
          ? encryptToken(refreshToken)
          : null,
        token_expires_at: expiresAt,
        metadata,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,provider" },
    )
    .select("id")
    .single();

  if (error) {
    console.error("Failed to store OAuth connection:", error);
    return { success: false };
  }

  return { success: true, id: data.id };
}

/**
 * Get active OAuth connection
 */
export async function getOAuthConnection(
  orgId: string,
  provider: OAuthProvider,
): Promise<OAuthConnection | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("oauth_connections")
    .select("*")
    .eq("org_id", orgId)
    .eq("provider", provider)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as OAuthConnection;
}

/**
 * Refresh expired OAuth token
 */
export async function refreshOAuthToken(
  orgId: string,
  provider: OAuthProvider,
): Promise<{ success: boolean; accessToken?: string }> {
  const connection = await getOAuthConnection(orgId, provider);
  if (!connection || !connection.refresh_token_encrypted) {
    return { success: false };
  }

  const config = getOAuthConfig(provider);
  if (!config) return { success: false };

  const refreshToken = decryptToken(connection.refresh_token_encrypted);

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text());
      return { success: false };
    }

    const data = await response.json();

    // Update stored tokens
    await storeOAuthConnection(
      orgId,
      provider,
      data.access_token,
      data.refresh_token || refreshToken,
      data.expires_in,
      connection.metadata,
    );

    return { success: true, accessToken: data.access_token };
  } catch (error) {
    console.error("Token refresh error:", error);
    return { success: false };
  }
}

/**
 * Get valid access token (refreshes if needed)
 */
export async function getValidAccessToken(
  orgId: string,
  provider: OAuthProvider,
): Promise<string | null> {
  const connection = await getOAuthConnection(orgId, provider);
  if (!connection) return null;

  // Check if token is expired or expiring soon (5 min buffer)
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at).getTime();
    const bufferMs = 5 * 60 * 1000;

    if (Date.now() > expiresAt - bufferMs) {
      const refreshResult = await refreshOAuthToken(orgId, provider);
      if (refreshResult.success && refreshResult.accessToken) {
        return refreshResult.accessToken;
      }
      return null;
    }
  }

  return decryptToken(connection.access_token_encrypted);
}

/**
 * Disconnect OAuth integration
 */
export async function disconnectOAuth(
  orgId: string,
  provider: OAuthProvider,
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("oauth_connections")
    .update({ is_active: false })
    .eq("org_id", orgId)
    .eq("provider", provider);

  return !error;
}
