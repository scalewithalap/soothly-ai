/**
 * AI Provider Factory
 * Unified interface for multiple AI providers
 */

import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import type {
  AIProvider,
  ProviderType,
  AIProviderConfig,
} from "./providers/types";

export * from "./providers/types";

/**
 * Create an AI provider instance
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case "openai":
      return new OpenAIProvider(config.apiKey);
    case "anthropic":
      return new AnthropicProvider(config.apiKey);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

/**
 * Get the default AI provider based on environment configuration
 */
export function getDefaultProvider(): AIProvider {
  const provider = (process.env.DEFAULT_AI_PROVIDER ||
    "openai") as ProviderType;

  switch (provider) {
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
      }
      return new AnthropicProvider();
    case "openai":
    default:
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required for OpenAI provider");
      }
      return new OpenAIProvider();
  }
}

/**
 * Singleton instances for performance
 */
let openaiInstance: OpenAIProvider | null = null;
let anthropicInstance: AnthropicProvider | null = null;

export function getOpenAI(): OpenAIProvider {
  if (!openaiInstance) {
    openaiInstance = new OpenAIProvider();
  }
  return openaiInstance;
}

export function getAnthropic(): AnthropicProvider {
  if (!anthropicInstance) {
    anthropicInstance = new AnthropicProvider();
  }
  return anthropicInstance;
}
