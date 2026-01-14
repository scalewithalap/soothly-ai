import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  CompletionOptions,
  ChatOptions,
  EmbeddingOptions,
  CompletionResult,
  EmbeddingResult,
  Message,
  AIModel,
} from "./types";

const DEFAULT_MODEL = "claude-haiku-4.5";

// Map our model names to Anthropic's API model names
const MODEL_MAP: Record<string, string> = {
  "claude-opus-4.5": "claude-opus-4-5-20260115",
  "claude-sonnet-4.5": "claude-sonnet-4-5-20260115",
  "claude-haiku-4.5": "claude-haiku-4-5-20260115",
};

function getApiModel(model?: AIModel): string {
  if (!model) return DEFAULT_MODEL;
  return MODEL_MAP[model] || model;
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async complete(
    prompt: string,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await this.client.messages.create({
      model: getApiModel(options?.model),
      max_tokens: options?.maxTokens || 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    const textContent = content.type === "text" ? content.text : "";

    return {
      content: textContent,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason || "unknown",
    };
  }

  async chat(
    messages: Message[],
    options?: ChatOptions
  ): Promise<CompletionResult> {
    const anthropicMessages: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const systemMessage = messages.find((m) => m.role === "system");

    const response = await this.client.messages.create({
      model: getApiModel(options?.model),
      max_tokens: options?.maxTokens || 1024,
      system: options?.systemPrompt || systemMessage?.content,
      messages: anthropicMessages,
    });

    const content = response.content[0];
    const textContent = content.type === "text" ? content.text : "";

    return {
      content: textContent,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason || "unknown",
    };
  }

  async embed(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    // Anthropic doesn't have a native embedding API
    // For embeddings, use OpenAI or another provider
    void text;
    void options;
    throw new Error(
      "Anthropic does not support embeddings. Use OpenAI provider for embeddings."
    );
  }
}
