/**
 * Google Gemini AI Provider
 * Implementation for Gemini 3 Pro and Gemini 3 Flash models
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import type {
  AIProvider,
  Message,
  CompletionOptions,
  ChatOptions,
  CompletionResult,
  EmbeddingOptions,
  EmbeddingResult,
  AIModel,
} from "./types";

// Map our model names to Google's API model names
const MODEL_MAP: Record<string, string> = {
  "gemini-3-pro": "gemini-3-pro-preview",
  "gemini-3-flash": "gemini-3-flash-preview",
  "gemini-2.5-pro": "gemini-2.5-pro",
};

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenerativeAI;
  private defaultModel: AIModel;

  constructor(apiKey?: string, defaultModel: AIModel = "gemini-3-flash") {
    const key = apiKey || process.env.GOOGLE_AI_API_KEY;

    if (!key) {
      throw new Error("GOOGLE_AI_API_KEY is required for Gemini provider");
    }

    this.client = new GoogleGenerativeAI(key);
    this.defaultModel = defaultModel;
  }

  private getModel(modelName?: AIModel): GenerativeModel {
    const model = modelName || this.defaultModel;
    const googleModelName = MODEL_MAP[model] || "gemini-3-flash-preview";
    return this.client.getGenerativeModel({ model: googleModelName });
  }

  async complete(
    prompt: string,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const model = this.getModel(options?.model);

    const generationConfig: {
      maxOutputTokens?: number;
      temperature?: number;
      topP?: number;
      stopSequences?: string[];
    } = {};

    if (options?.maxTokens)
      generationConfig.maxOutputTokens = options.maxTokens;
    if (options?.temperature !== undefined)
      generationConfig.temperature = options.temperature;
    if (options?.topP !== undefined) generationConfig.topP = options.topP;
    if (options?.stop) generationConfig.stopSequences = options.stop;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    const response = result.response;
    const text = response.text();

    // Gemini doesn't provide detailed token usage in the same way
    const usage = {
      promptTokens: prompt.length / 4, // Rough estimate
      completionTokens: text.length / 4,
      totalTokens: (prompt.length + text.length) / 4,
    };

    return {
      content: text,
      usage,
      finishReason: response.candidates?.[0]?.finishReason || "stop",
    };
  }

  async chat(
    messages: Message[],
    options?: ChatOptions
  ): Promise<CompletionResult> {
    const model = this.getModel(options?.model);

    const generationConfig: {
      maxOutputTokens?: number;
      temperature?: number;
      topP?: number;
      stopSequences?: string[];
    } = {};

    if (options?.maxTokens)
      generationConfig.maxOutputTokens = options.maxTokens;
    if (options?.temperature !== undefined)
      generationConfig.temperature = options.temperature;
    if (options?.topP !== undefined) generationConfig.topP = options.topP;
    if (options?.stop) generationConfig.stopSequences = options.stop;

    // Build Gemini chat history
    const history: Array<{
      role: "user" | "model";
      parts: Array<{ text: string }>;
    }> = [];
    let systemInstruction = options?.systemPrompt || "";

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = msg.content;
      } else {
        history.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    // Get the last user message
    const lastMessage = history.pop();
    if (!lastMessage || lastMessage.role !== "user") {
      throw new Error("Chat must end with a user message");
    }

    const chat = model.startChat({
      history: history.length > 0 ? history : undefined,
      generationConfig,
      systemInstruction: systemInstruction || undefined,
    });

    const result = await chat.sendMessage(lastMessage.parts[0].text);
    const response = result.response;
    const text = response.text();

    // Rough token estimation
    const totalChars =
      messages.reduce((sum, m) => sum + m.content.length, 0) + text.length;
    const usage = {
      promptTokens: Math.floor((totalChars - text.length) / 4),
      completionTokens: Math.floor(text.length / 4),
      totalTokens: Math.floor(totalChars / 4),
    };

    return {
      content: text,
      usage,
      finishReason: response.candidates?.[0]?.finishReason || "stop",
    };
  }

  async embed(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResult> {
    const modelName = options?.model || "text-embedding-004";
    const model = this.client.getGenerativeModel({ model: modelName });

    const result = await model.embedContent(text);

    return {
      embedding: result.embedding.values,
      usage: {
        totalTokens: Math.floor(text.length / 4),
      },
    };
  }
}

