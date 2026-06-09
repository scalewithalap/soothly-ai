/**
 * VectorStore - Abstraction layer for vector similarity operations
 * Uses Supabase pgvector for storage and retrieval
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { DEFAULT_EMBEDDING_CONFIG, type EmbeddingConfig } from "./types";
import {
  generateEmbedding as sharedGenerateEmbedding,
  generateEmbeddings as sharedGenerateEmbeddings,
} from "@/lib/ai/embeddings";

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
   * Generate embedding via the shared embedding service (ADR-006:
   * Gemini text-embedding-004, 768 dims — one provider for all vectors).
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return sharedGenerateEmbedding(text);
  }


  /**
   * Batch generate embeddings via the shared embedding service.
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return sharedGenerateEmbeddings(texts);
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

