/**
 * AI Provider Type Definitions
 * Shared types for all AI provider implementations
 */

// All supported AI models across providers
export type AIModel =
  // OpenAI Models
  | "gpt-5.2"
  | "gpt-5.0"
  | "gpt-5-mini"
  | "gpt-5-nano"
  // Anthropic Models (Claude 4.5)
  | "claude-opus-4.5"
  | "claude-sonnet-4.5"
  | "claude-haiku-4.5"
  // Google Gemini Models
  | "gemini-3-pro"
  | "gemini-3-flash"
  | "gemini-2.5-pro";

// Model display names for UI
export const MODEL_DISPLAY_NAMES: Record<AIModel, string> = {
  // OpenAI
  "gpt-5.2": "gpt-5.2-2025-12-11",
  "gpt-5.0": "gpt-5-2025-08-07",
  "gpt-5-mini": "gpt-5-mini-2025-08-07",
  "gpt-5-nano": "gpt-5-nano-2025-08-07",
  // Claude 4.5
  "claude-opus-4.5": "Claude Opus 4.5",
  "claude-sonnet-4.5": "Claude Sonnet 4.5",
  "claude-haiku-4.5": "Claude Haiku 4.5",
  // Gemini
  "gemini-3-pro": "gemini-3-pro-preview",
  "gemini-3-flash": "gemini-3-flash-preview",
  "gemini-2.5-pro": "gemini-2.5-pro",
};

// Models available for article generation
export const ARTICLE_GENERATION_MODELS: AIModel[] = [
  "gemini-3-pro",
  "gemini-3-flash",
  "gemini-2.5-pro",
  "gpt-5.2",
  "gpt-5.0",
  "gpt-5-mini",
  "gpt-5-nano",
  "claude-haiku-4.5",
  "claude-sonnet-4.5",
  "claude-opus-4.5",
];

// Model provider mapping
export const MODEL_PROVIDER: Record<AIModel, ProviderType> = {
  "gpt-5.2": "openai",
  "gpt-5.0": "openai",
  "gpt-5-mini": "openai",
  "gpt-5-nano": "openai",
  "claude-opus-4.5": "anthropic",
  "claude-sonnet-4.5": "anthropic",
  "claude-haiku-4.5": "anthropic",
  "gemini-3-pro": "gemini",
  "gemini-3-flash": "gemini",
  "gemini-2.5-pro": "gemini",
};

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: AIModel;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
}

export interface ChatOptions extends CompletionOptions {
  systemPrompt?: string;
}

export interface EmbeddingOptions {
  model?: string;
}

export interface CompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface EmbeddingResult {
  embedding: number[];
  usage: {
    totalTokens: number;
  };
}

/**
 * Base interface for all AI providers
 */
export interface AIProvider {
  readonly name: string;

  /**
   * Generate a completion from a single prompt
   */
  complete(
    prompt: string,
    options?: CompletionOptions
  ): Promise<CompletionResult>;

  /**
   * Generate a response from a chat conversation
   */
  chat(messages: Message[], options?: ChatOptions): Promise<CompletionResult>;

  /**
   * Generate embeddings for text
   */
  embed(text: string, options?: EmbeddingOptions): Promise<EmbeddingResult>;
}

export type ProviderType = "openai" | "anthropic" | "gemini";

export interface AIProviderConfig {
  provider: ProviderType;
  apiKey: string;
  defaultModel?: AIModel;
}

