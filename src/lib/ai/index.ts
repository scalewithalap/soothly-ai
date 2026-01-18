/**
 * AI Provider Factory
 * Unified interface for multiple AI providers (OpenAI, Anthropic, Gemini)
 */

import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";
import type {
  AIProvider,
  ProviderType,
  AIProviderConfig,
  AIModel,
  CompletionOptions,
  CompletionResult,
} from "./providers/types";
import { MODEL_PROVIDER } from "./providers/types";

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
    case "gemini":
      return new GeminiProvider(config.apiKey);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

/**
 * Get the default AI provider based on environment configuration
 */
export function getDefaultProvider(): AIProvider {
  const provider = (process.env.DEFAULT_AI_PROVIDER ||
    "gemini") as ProviderType;

  switch (provider) {
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
      }
      return new AnthropicProvider();
    case "openai":
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required for OpenAI provider");
      }
      return new OpenAIProvider();
    case "gemini":
    default:
      if (!process.env.GOOGLE_AI_API_KEY) {
        throw new Error("GOOGLE_AI_API_KEY is required for Gemini provider");
      }
      return new GeminiProvider();
  }
}

/**
 * Singleton instances for performance
 */
let openaiInstance: OpenAIProvider | null = null;
let anthropicInstance: AnthropicProvider | null = null;
let geminiInstance: GeminiProvider | null = null;

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

export function getGemini(): GeminiProvider {
  if (!geminiInstance) {
    geminiInstance = new GeminiProvider();
  }
  return geminiInstance;
}

/**
 * Get the appropriate provider for a specific model
 */
export function getProviderForModel(model: AIModel): AIProvider {
  const providerType = MODEL_PROVIDER[model];

  switch (providerType) {
    case "openai":
      return getOpenAI();
    case "anthropic":
      return getAnthropic();
    case "gemini":
      return getGemini();
    default:
      return getGemini();
  }
}

/**
 * Generate a completion using any supported model
 * Automatically routes to the correct provider
 */
export async function generateWithModel(
  model: AIModel,
  prompt: string,
  options?: Omit<CompletionOptions, "model">,
): Promise<CompletionResult> {
  const provider = getProviderForModel(model);
  return provider.complete(prompt, { ...options, model });
}
