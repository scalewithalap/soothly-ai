/**
 * VectorStore - Abstraction layer for vector similarity operations
 * Uses Supabase pgvector for storage and retrieval
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { DEFAULT_EMBEDDING_CONFIG, type EmbeddingConfig } from "./types";

export class VectorStore {
  private db: SupabaseClient<Database>;
  private config: EmbeddingConfig;

  constructor(
    db: SupabaseClient<Database>,
    config: EmbeddingConfig = DEFAULT_EMBEDDING_CONFIG,
  ) {
    this.db = db;
    this.config = config;
  }

  /**
   * Generate embedding for text content using configured provider
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (this.config.provider === "openai") {
      return this.generateOpenAIEmbedding(text);
    }
    throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
  }

  /**
   * Generate embedding using OpenAI API
   */
  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        model: this.config.model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Batch generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (this.config.provider === "openai") {
      return this.generateOpenAIEmbeddings(texts);
    }
    throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
  }

  /**
   * Batch generate embeddings using OpenAI API
   */
  private async generateOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // OpenAI supports batch embeddings up to 2048 inputs
    const batchSize = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: batch,
          model: this.config.model,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI embedding error: ${error}`);
      }

      const data = await response.json();
      const embeddings = data.data
        .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
        .map((d: { embedding: number[] }) => d.embedding);

      allEmbeddings.push(...embeddings);
    }

    return allEmbeddings;
  }

  /**
   * Compute cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have same dimensions");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Create a content hash for deduplication
   */
  createContentHash(content: string): string {
    // Simple hash using Web Crypto (available in Edge Runtime)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${hash.toString(16)}-${content.length}`;
  }

  /**
   * Truncate text to fit within token limits
   */
  truncateForEmbedding(text: string, maxChars: number = 8000): string {
    if (text.length <= maxChars) {
      return text;
    }
    // Truncate and add indicator
    return text.slice(0, maxChars - 3) + "...";
  }

  /**
   * Format vector for Supabase pgvector
   */
  formatVectorForDB(embedding: number[]): string {
    return `[${embedding.join(",")}]`;
  }
}
