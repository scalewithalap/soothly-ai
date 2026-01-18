/**
 * MCP (Model Context Protocol) Type Definitions
 *
 * Based on the MCP specification for standardized tool integration.
 * @see https://modelcontextprotocol.io/docs/concepts/tools
 */

// JSON Schema type for tool input/output validation
export interface JSONSchema {
  type: "object" | "string" | "number" | "boolean" | "array" | "null";
  properties?: Record<string, JSONSchema>;
  required?: string[];
  description?: string;
  items?: JSONSchema;
  enum?: (string | number | boolean)[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

// Tool annotations for additional metadata
export interface ToolAnnotations {
  /** Human-readable title for the tool */
  title?: string;
  /** If true, the tool only reads data and has no side effects */
  readOnlyHint?: boolean;
  /** If true, the tool may perform destructive operations */
  destructiveHint?: boolean;
  /** If true, calling the tool multiple times with same params yields same result */
  idempotentHint?: boolean;
  /** If true, this tool may take a long time to execute */
  longRunningHint?: boolean;
  /** Estimated cost in credits for this tool */
  costHint?: number;
}

// Content types for tool results
export type MCPContentType = "text" | "image" | "resource" | "error";

export interface MCPTextContent {
  type: "text";
  text: string;
}

export interface MCPImageContent {
  type: "image";
  data: string; // base64 encoded
  mimeType: string;
}

export interface MCPResourceContent {
  type: "resource";
  uri: string;
  mimeType?: string;
  text?: string;
}

export interface MCPErrorContent {
  type: "error";
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type MCPContent =
  | MCPTextContent
  | MCPImageContent
  | MCPResourceContent
  | MCPErrorContent;

// Tool result structure
export interface MCPToolResult {
  content: MCPContent[];
  isError?: boolean;
  metadata?: {
    duration_ms?: number;
    tokens_used?: number;
    cost_usd?: number;
  };
}

// Tool definition
export interface MCPTool {
  /** Unique tool identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for input validation */
  inputSchema: JSONSchema;
  /** Optional JSON Schema for output validation */
  outputSchema?: JSONSchema;
  /** Tool handler function */
  handler: (
    input: unknown,
    context: ToolExecutionContext,
  ) => Promise<MCPToolResult>;
  /** Additional tool metadata */
  annotations?: ToolAnnotations;
  /** Tool category for organization */
  category?: ToolCategory;
  /** Required permissions to use this tool */
  requiredPermissions?: string[];
}

// Tool categories for organization
export type ToolCategory =
  | "database"
  | "communication"
  | "content"
  | "search"
  | "calculation"
  | "integration"
  | "utility"
  | "custom";

// Execution context passed to tool handlers
export interface ToolExecutionContext {
  /** Organization ID for data isolation */
  orgId: string;
  /** User ID executing the tool */
  userId?: string;
  /** Agent type if called from an agent */
  agentType?: string;
  /** Trace ID for observability */
  traceId?: string;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

// Registry configuration
export interface MCPRegistryConfig {
  /** Maximum concurrent tool executions */
  maxConcurrency?: number;
  /** Default timeout for tool execution (ms) */
  defaultTimeoutMs?: number;
  /** Enable input validation */
  validateInput?: boolean;
  /** Enable output validation */
  validateOutput?: boolean;
  /** Hook for logging/tracing */
  onToolExecute?: (
    tool: MCPTool,
    input: unknown,
    result: MCPToolResult,
  ) => void;
}

// Tool execution request
export interface ToolExecutionRequest {
  toolName: string;
  input: unknown;
  context: ToolExecutionContext;
  timeout?: number;
}

// Tool execution response
export interface ToolExecutionResponse {
  result: MCPToolResult;
  executionTime: number;
  toolName: string;
}

// External MCP server configuration
export interface MCPServerConfig {
  /** Server identifier */
  id: string;
  /** Server display name */
  name: string;
  /** Server URL (WebSocket or HTTP) */
  url: string;
  /** Transport type */
  transport: "websocket" | "http" | "stdio";
  /** Authentication credentials */
  auth?: {
    type: "bearer" | "api_key" | "basic";
    credentials: string;
  };
  /** Enabled state */
  enabled: boolean;
  /** Last successful connection time */
  lastConnected?: Date;
  /** Server capabilities */
  capabilities?: MCPServerCapabilities;
}

// Server capabilities advertised during handshake
export interface MCPServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
  experimental?: Record<string, boolean>;
}

// Resource definition (for MCPClient)
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Prompt definition (for MCPClient)
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[];
}

// Error codes aligned with MCP spec
export const MCPErrorCodes = {
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  INVALID_INPUT: "INVALID_INPUT",
  EXECUTION_FAILED: "EXECUTION_FAILED",
  TIMEOUT: "TIMEOUT",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export type MCPErrorCode = (typeof MCPErrorCodes)[keyof typeof MCPErrorCodes];

