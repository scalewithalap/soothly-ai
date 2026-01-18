import OpenAI from "openai";
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

const DEFAULT_MODEL = "gpt-5-nano";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

// Map our model names to OpenAI's API model names
const MODEL_MAP: Record<string, string> = {
  "gpt-5.2": "gpt-5.2-2025-12-11",
  "gpt-5.0": "gpt-5-2025-08-07",
  "gpt-5-mini": "gpt-5-mini-2025-08-07",
  "gpt-5-nano": "gpt-5-nano-2025-08-07",
};

function getApiModel(model?: AIModel): string {
  if (!model) return DEFAULT_MODEL;
  return MODEL_MAP[model] || model;
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async complete(
    prompt: string,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create({
      model: getApiModel(options?.model),
      messages: [{ role: "user", content: prompt }],
      max_tokens: options?.maxTokens,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
      stop: options?.stop,
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason || "unknown",
    };
  }

  async chat(
    messages: Message[],
    options?: ChatOptions
  ): Promise<CompletionResult> {
    const formattedMessages: OpenAI.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      formattedMessages.push({
        role: "system",
        content: options.systemPrompt,
      });
    }

    formattedMessages.push(
      ...messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      }))
    );

    const response = await this.client.chat.completions.create({
      model: getApiModel(options?.model),
      messages: formattedMessages,
      max_tokens: options?.maxTokens,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
      stop: options?.stop,
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason || "unknown",
    };
  }

  async embed(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    const response = await this.client.embeddings.create({
      model: options?.model || DEFAULT_EMBEDDING_MODEL,
      input: text,
    });

    return {
      embedding: response.data[0].embedding,
      usage: {
        totalTokens: response.usage.total_tokens,
      },
    };
  }
}

