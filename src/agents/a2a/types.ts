/**
 * A2A Protocol Types
 * Google's Agent-to-Agent protocol for cross-platform interoperability
 * @see https://google.github.io/a2a/
 */

// ==================== Agent Card ====================

export interface AgentCard {
  /** Human-readable name */
  name: string;
  /** Base URL of the agent */
  url: string;
  /** Semantic version */
  version: string;
  /** Description of capabilities */
  description: string;
  /** Provider information */
  provider: AgentProvider;
  /** Supported capabilities */
  capabilities: AgentCapabilities;
  /** Authentication methods */
  authentication: AuthConfig[];
  /** Default input modes */
  defaultInputModes?: ContentType[];
  /** Default output modes */
  defaultOutputModes?: ContentType[];
  /** Supported skills */
  skills?: AgentSkill[];
}

export interface AgentProvider {
  name: string;
  url: string;
}

export interface AgentCapabilities {
  /** Whether agent supports streaming */
  streaming: boolean;
  /** Whether agent supports push notifications */
  pushNotifications: boolean;
  /** Whether agent supports state transfer */
  stateTransitionHistory: boolean;
}

export interface AuthConfig {
  /** Type of auth: api_key, bearer, oauth2 */
  type: "api_key" | "bearer" | "oauth2" | "none";
  /** Header or query param name */
  name?: string;
  /** For OAuth2 */
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  inputModes?: ContentType[];
  outputModes?: ContentType[];
  tags?: string[];
}

// ==================== Content Types ====================

export type ContentType = "text" | "image" | "audio" | "video" | "file";

export interface Part {
  type: ContentType;
  text?: string;
  file?: FilePart;
  data?: string; // Base64 for inline data
  mimeType?: string;
}

export interface FilePart {
  name: string;
  mimeType: string;
  uri?: string;
  bytes?: string; // Base64
}

export interface Message {
  role: "user" | "agent";
  parts: Part[];
  metadata?: Record<string, unknown>;
}

// ==================== Task Types ====================

export type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "canceled";

export interface Task {
  id: string;
  sessionId?: string;
  status: TaskStatus;
  messages?: Message[];
  artifacts?: Artifact[];
  history?: Message[];
  metadata?: Record<string, unknown>;
}

export interface TaskStatus {
  state: TaskState;
  message?: Message;
  timestamp: string | null;
}

export interface Artifact {
  id: string;
  name: string;
  parts: Part[];
  mimeType?: string;
  index?: number;
  append?: boolean;
  lastChunk?: boolean;
}

// ==================== Request/Response Types ====================

export interface TaskSendParams {
  id: string;
  message: Message;
  sessionId?: string;
  historyLength?: number;
  pushNotification?: PushNotificationConfig;
  metadata?: Record<string, unknown>;
}

export interface TaskQueryParams {
  id: string;
  historyLength?: number;
}

export interface TaskCancelParams {
  id: string;
}

export interface PushNotificationConfig {
  url: string;
  token?: string;
  authentication?: AuthConfig;
}

// ==================== JSON-RPC Types ====================

export interface JSONRPCRequest<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: T;
}

export interface JSONRPCResponse<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  result?: T;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

// A2A Error Codes
export const A2AErrorCodes = {
  TASK_NOT_FOUND: -32001,
  TASK_NOT_CANCELABLE: -32002,
  PUSH_NOTIFICATION_NOT_SUPPORTED: -32003,
  UNSUPPORTED_OPERATION: -32004,
  CONTENT_TYPE_NOT_SUPPORTED: -32005,
  INVALID_AGENT_RESPONSE: -32006,
} as const;

// ==================== Streaming Types ====================

export interface TaskStatusUpdateEvent {
  id: string;
  status: TaskStatus;
  final: boolean;
}

export interface TaskArtifactUpdateEvent {
  id: string;
  artifact: Artifact;
}

export type A2AStreamEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

// ==================== Database Types ====================

export interface A2ATaskRecord {
  id: string;
  org_id: string;
  session_id?: string;
  external_agent_url?: string;
  task_spec: TaskSendParams;
  status: TaskState;
  messages: Message[];
  artifacts: Artifact[];
  result?: unknown;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// ==================== Config Types ====================

export interface A2AServerConfig {
  name: string;
  version: string;
  description: string;
  baseUrl: string;
  providerName: string;
  providerUrl: string;
  skills: AgentSkill[];
  supportedInputModes?: ContentType[];
  supportedOutputModes?: ContentType[];
}
