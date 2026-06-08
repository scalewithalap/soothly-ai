/**
 * Connection Architecture - Index
 *
 * Exports all connection types:
 * 1. Webhook Receiver (Listening) - External systems push data
 * 2. OAuth Client (Active) - Authenticated API calls to external systems
 * 3. Widget Embed (Deep) - Embedded chatbot on customer sites
 */

// Webhook Receiver
export {
  verifyStripeSignature,
  verifyShopifySignature,
  verifyHmacSignature,
  logWebhookEvent,
  processStripeEvent,
  processShopifyEvent,
  createWebhookConnection,
  getWebhookConnectionByEndpoint,
  type WebhookProvider,
  type IncomingWebhookEvent,
  type WebhookConnection,
} from "./webhook-receiver";

// OAuth Client
export {
  encryptToken,
  decryptToken,
  getOAuthConfig,
  generateAuthUrl,
  exchangeCodeForTokens,
  storeOAuthConnection,
  getOAuthConnection,
  refreshOAuthToken,
  getValidAccessToken,
  disconnectOAuth,
  type OAuthProvider,
  type OAuthConnection,
} from "./oauth-client";

// Widget Embed
export {
  generateUserHmac,
  verifyUserHmac,
  createWidgetConfig,
  getWidgetConfig,
  validateWidgetOrigin,
  generateEmbedCode,
  generateSecureEmbedCode,
  ensureWidgetSession,
  registerRemoteFunctions,
  type WidgetConfig,
  type WidgetTheme,
  type WidgetSettings,
  type WidgetSession,
  type RemoteFunction,
} from "./widget-embed";
