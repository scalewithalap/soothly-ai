/**
 * API Key Service
 *
 * Generate, validate, and manage API keys.
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const API_KEY_PREFIX = "zh_pk_";

interface CreateApiKeyParams {
  orgId: string;
  name: string;
  permissions?: { read: boolean; write: boolean };
  rateLimit?: number;
  expiresAt?: Date;
  createdBy: string;
}

interface ApiKeyResult {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: { read: boolean; write: boolean };
  rateLimit: number;
  createdAt: string;
  expiresAt: string | null;
}

/**
 * Generate a new API key
 */
export function generateApiKey(): {
  key: string;
  hash: string;
  prefix: string;
} {
  const randomPart = randomBytes(24).toString("base64url");
  const key = `${API_KEY_PREFIX}${randomPart}`;
  const hash = createHash("sha256").update(key).digest("hex");
  const prefix = key.substring(0, 12);

  return { key, hash, prefix };
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Create a new API key
 */
export async function createApiKey(params: CreateApiKeyParams): Promise<{
  success: boolean;
  key?: string;
  data?: ApiKeyResult;
  error?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { key, hash, prefix } = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      org_id: params.orgId,
      name: params.name,
      key_hash: hash,
      key_prefix: prefix,
      permissions: params.permissions || { read: true, write: false },
      rate_limit: params.rateLimit || 100,
      expires_at: params.expiresAt?.toISOString(),
      created_by: params.createdBy,
    })
    .select(
      "id, name, key_prefix, permissions, rate_limit, created_at, expires_at",
    )
    .single();

  if (error) {
    console.error("Failed to create API key:", error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    key, // Return the full key only on creation
    data: {
      id: data.id,
      name: data.name,
      keyPrefix: data.key_prefix,
      permissions: data.permissions,
      rateLimit: data.rate_limit,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    },
  };
}

/**
 * Validate an API key
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  orgId?: string;
  permissions?: { read: boolean; write: boolean };
  rateLimit?: number;
  error?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const hash = hashApiKey(key);

  const { data, error } = await supabase.rpc("validate_api_key", {
    p_key_hash: hash,
  });

  if (error) {
    console.error("API key validation error:", error);
    return { valid: false, error: "validation_failed" };
  }

  return data;
}

/**
 * List API keys for an organization
 */
export async function listApiKeys(orgId: string): Promise<ApiKeyResult[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("api_keys")
    .select(
      "id, name, key_prefix, permissions, rate_limit, created_at, expires_at, last_used_at, usage_count",
    )
    .eq("org_id", orgId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list API keys:", error);
    return [];
  }

  return (data || []).map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.key_prefix,
    permissions: k.permissions,
    rateLimit: k.rate_limit,
    createdAt: k.created_at,
    expiresAt: k.expires_at,
    lastUsedAt: k.last_used_at,
    usageCount: k.usage_count,
  }));
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  orgId: string,
  keyId: string,
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("org_id", orgId);

  return !error;
}

/**
 * Rotate an API key - generates new key while keeping same ID/settings
 */
export async function rotateApiKey(
  orgId: string,
  keyId: string,
): Promise<{
  success: boolean;
  key?: string;
  error?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Generate new key
  const { key, hash, prefix } = generateApiKey();

  // Call the RPC to rotate
  const { data, error } = await supabase.rpc("rotate_api_key", {
    p_key_id: keyId,
    p_new_hash: hash,
    p_new_prefix: prefix,
  });

  if (error || !data?.success) {
    console.error("Failed to rotate API key:", error || data?.error);
    return { success: false, error: error?.message || data?.error };
  }

  return { success: true, key };
}

/**
 * Get usage statistics for an API key
 */
export async function getApiKeyUsageStats(
  orgId: string,
  keyId: string,
  days: number = 30,
): Promise<{
  success: boolean;
  stats?: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time_ms: number;
    unique_ips: number;
  };
  daily_usage?: Array<{ date: string; requests: number }>;
  error?: string;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.rpc("get_api_key_usage_stats", {
    p_key_id: keyId,
    p_days: days,
  });

  if (error || !data?.success) {
    console.error("Failed to get API key stats:", error || data?.error);
    return { success: false, error: error?.message || data?.error };
  }

  return {
    success: true,
    stats: data.stats,
    daily_usage: data.daily_usage,
  };
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(params: {
  apiKeyId: string;
  orgId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
  errorCode?: string;
}): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  await supabase.from("api_key_usage_logs").insert({
    api_key_id: params.apiKeyId,
    org_id: params.orgId,
    endpoint: params.endpoint,
    method: params.method,
    status_code: params.statusCode,
    response_time_ms: params.responseTimeMs,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
    error_code: params.errorCode,
  });
}

const apiKeyService = {
  generateApiKey,
  hashApiKey,
  createApiKey,
  validateApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  getApiKeyUsageStats,
  logApiKeyUsage,
};

export default apiKeyService;
