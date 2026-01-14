/**
 * AI Provider Type Definitions
 * Shared types for all AI provider implementations
 */

export type AIModel =
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  | "claude-sonnet-4-20250514"
  | "claude-3-5-sonnet-20241022"
  | "claude-3-haiku-20240307";

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

export type ProviderType = "openai" | "anthropic";

export interface AIProviderConfig {
  provider: ProviderType;
  apiKey: string;
  defaultModel?: AIModel;
}
