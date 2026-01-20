/**
 * Connection Architecture - Widget Embedding
 *
 * Provides embeddable widget for customer websites.
 * Uses HMAC user identification and remote function proxy.
 */

import { createHmac, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

// ============================================
// WIDGET CONFIGURATION
// ============================================

export interface WidgetConfig {
  id: string;
  org_id: string;
  name: string;
  agent_id: string;
  theme: WidgetTheme;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  allowed_origins: string[];
  hmac_secret: string;
  settings: WidgetSettings;
  is_active: boolean;
  created_at: string;
}

export interface WidgetTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  fontFamily?: string;
}

export interface WidgetSettings {
  welcomeMessage: string;
  placeholder: string;
  showBranding: boolean;
  collectEmail: boolean;
  autoOpen: boolean;
  autoOpenDelay?: number;
}

// ============================================
// HMAC USER IDENTIFICATION
// ============================================

/**
 * Generate HMAC signature for user identification
 * This should be done server-side on the customer's backend
 */
export function generateUserHmac(
  userId: string,
  email: string,
  secret: string,
): string {
  const payload = `${userId}:${email}`;
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify HMAC signature for incoming widget requests
 */
export function verifyUserHmac(
  userId: string,
  email: string,
  hmac: string,
  secret: string,
): boolean {
  const expected = generateUserHmac(userId, email, secret);
  return hmac === expected;
}

// ============================================
// WIDGET MANAGEMENT
// ============================================

/**
 * Create a new widget configuration
 */
export async function createWidgetConfig(
  orgId: string,
  agentId: string,
  name: string,
  allowedOrigins: string[],
  theme?: Partial<WidgetTheme>,
  settings?: Partial<WidgetSettings>,
): Promise<{ success: boolean; widget?: WidgetConfig; hmacSecret?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const hmacSecret = `whs_${randomBytes(32).toString("base64url")}`;

  const defaultTheme: WidgetTheme = {
    primaryColor: "#9382FF",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    borderRadius: 12,
    ...theme,
  };

  const defaultSettings: WidgetSettings = {
    welcomeMessage: "Hi! How can I help you today?",
    placeholder: "Type your message...",
    showBranding: true,
    collectEmail: false,
    autoOpen: false,
    ...settings,
  };

  const { data, error } = await supabase
    .from("widget_configs")
    .insert({
      org_id: orgId,
      agent_id: agentId,
      name,
      allowed_origins: allowedOrigins,
      hmac_secret: hmacSecret,
      theme: defaultTheme,
      settings: defaultSettings,
      position: "bottom-right",
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create widget config:", error);
    return { success: false };
  }

  return { success: true, widget: data as WidgetConfig, hmacSecret };
}

/**
 * Get widget configuration by ID
 */
export async function getWidgetConfig(
  widgetId: string,
): Promise<WidgetConfig | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("widget_configs")
    .select("*")
    .eq("id", widgetId)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as WidgetConfig;
}

/**
 * Validate widget request origin
 */
export function validateWidgetOrigin(
  widget: WidgetConfig,
  origin: string,
): boolean {
  // Allow all origins if empty (not recommended for production)
  if (widget.allowed_origins.length === 0) return true;

  // Check if origin matches any allowed pattern
  return widget.allowed_origins.some((allowed) => {
    // Support wildcard subdomains
    if (allowed.startsWith("*.")) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin === `https://${domain}`;
    }
    return origin === allowed;
  });
}

// ============================================
// WIDGET EMBED CODE GENERATION
// ============================================

/**
 * Generate the embed code snippet for a widget
 */
export function generateEmbedCode(
  widgetId: string,
  options?: {
    async?: boolean;
    defer?: boolean;
  },
): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://app.zeroheadache.co";
  const asyncAttr = options?.async !== false ? " async" : "";
  const deferAttr = options?.defer ? " defer" : "";

  return `<!-- Zero Headache Widget -->
<script${asyncAttr}${deferAttr}>
  (function(w,d,s,o,f,js,fjs){
    w['ZHWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','zhw','${appUrl}/widget.js'));
  zhw('init', '${widgetId}');
</script>`;
}

/**
 * Generate embed code with HMAC user identification
 */
export function generateSecureEmbedCode(
  widgetId: string,
  serverSideIntegration: {
    language: "javascript" | "python" | "php" | "ruby";
  },
): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://app.zeroheadache.co";

  const backendExamples: Record<string, string> = {
    javascript: `// Node.js server-side
const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', WIDGET_HMAC_SECRET)
  .update(\`\${userId}:\${userEmail}\`)
  .digest('hex');`,
    python: `# Python server-side
import hmac
import hashlib
signature = hmac.new(
    WIDGET_HMAC_SECRET.encode(),
    f"{user_id}:{user_email}".encode(),
    hashlib.sha256
).hexdigest()`,
    php: `// PHP server-side
$hmac = hash_hmac('sha256', $userId . ':' . $userEmail, WIDGET_HMAC_SECRET);`,
    ruby: `# Ruby server-side
hmac = OpenSSL::HMAC.hexdigest('sha256', WIDGET_HMAC_SECRET, "#{user_id}:#{user_email}")`,
  };

  return `<!-- Zero Headache Widget with User Identification -->
${backendExamples[serverSideIntegration.language] || backendExamples.javascript}

<!-- Frontend embed -->
<script async>
  (function(w,d,s,o,f,js,fjs){
    w['ZHWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','zhw','${appUrl}/widget.js'));
  
  zhw('init', '${widgetId}', {
    user: {
      id: '<%= user.id %>',
      email: '<%= user.email %>',
      name: '<%= user.name %>',
      hmac: '<%= hmac %>'  // Server-generated HMAC
    }
  });
</script>`;
}

// ============================================
// WIDGET SESSION MANAGEMENT
// ============================================

export interface WidgetSession {
  id: string;
  widget_id: string;
  visitor_id: string;
  user_id: string | null;
  user_email: string | null;
  metadata: Record<string, unknown>;
  started_at: string;
  last_activity_at: string;
}

/**
 * Create or resume a widget session
 */
export async function ensureWidgetSession(
  widgetId: string,
  visitorId: string,
  userId?: string,
  userEmail?: string,
  metadata?: Record<string, unknown>,
): Promise<WidgetSession | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Try to find existing session
  const { data: existing } = await supabase
    .from("widget_sessions")
    .select("*")
    .eq("widget_id", widgetId)
    .eq("visitor_id", visitorId)
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    // Update last activity
    await supabase
      .from("widget_sessions")
      .update({
        last_activity_at: now,
        user_id: userId || existing.user_id,
        user_email: userEmail || existing.user_email,
      })
      .eq("id", existing.id);

    return existing as WidgetSession;
  }

  // Create new session
  const { data, error } = await supabase
    .from("widget_sessions")
    .insert({
      widget_id: widgetId,
      visitor_id: visitorId,
      user_id: userId,
      user_email: userEmail,
      metadata: metadata || {},
      started_at: now,
      last_activity_at: now,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create widget session:", error);
    return null;
  }

  return data as WidgetSession;
}

// ============================================
// REMOTE FUNCTION PROXY
// ============================================

export interface RemoteFunction {
  name: string;
  description: string;
  parameters: Record<
    string,
    { type: string; required?: boolean; description?: string }
  >;
}

/**
 * Register remote functions that the widget can invoke
 */
export async function registerRemoteFunctions(
  widgetId: string,
  functions: RemoteFunction[],
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("widget_configs")
    .update({ remote_functions: functions })
    .eq("id", widgetId);

  return !error;
}
