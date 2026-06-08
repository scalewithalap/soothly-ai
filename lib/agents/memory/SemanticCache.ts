/**
 * Semantic Cache
 * LangGraph-inspired caching using pgvector similarity search
 */

import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { getGemini } from "@/lib/ai";
import crypto from "crypto";

// Typed client for standard operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Untyped client for RPC calls not in types
const supabaseRpc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface CacheHit {
  response: unknown;
  similarity: number;
  tokensSaved: number;
  cacheId: string;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  tokensSaved: number;
  hitRate: number;
}

export interface SemanticCacheConfig {
  /** Organization ID for data isolation */
  orgId: string;
  /** Similarity threshold (0.0 - 1.0, default 0.95) */
  similarityThreshold?: number;
  /** TTL in seconds (default 24 hours) */
  ttlSeconds?: number;
  /** Model name for cache key */
  model?: string;
}

/**
 * Semantic Cache with vector similarity search
 */
export class SemanticCache {
  private config: Required<SemanticCacheConfig>;

  constructor(config: SemanticCacheConfig) {
    this.config = {
      orgId: config.orgId,
      similarityThreshold: config.similarityThreshold ?? 0.95,
      ttlSeconds: config.ttlSeconds ?? 86400, // 24 hours
      model: config.model ?? "gemini-3-flash",
    };
  }

  /**
   * Get cached response using semantic similarity
   */
  async get(query: string): Promise<CacheHit | null> {
    try {
      // Generate embedding for query
      const embedding = await this.generateEmbedding(query);
      if (!embedding) return null;

      // Search for similar queries using pgvector (untyped RPC)
      const { data: matches, error } = await supabaseRpc.rpc(
        "match_semantic_cache",
        {
          query_embedding: embedding,
          match_threshold: this.config.similarityThreshold,
          match_count: 1,
          p_org_id: this.config.orgId,
        },
      );

      if (error || !matches || (matches as unknown[]).length === 0) {
        return null;
      }

      const matchArray = matches as unknown as Array<{
        id: string;
        response: unknown;
        similarity: number;
        tokens_used: number;
      }>;
      const match = matchArray[0];

      // Update hit count
      await this.incrementHitCount(match.id);

      return {
        response: match.response,
        similarity: match.similarity,
        tokensSaved: match.tokens_used || 0,
        cacheId: match.id,
      };
    } catch (error) {
      console.error("SemanticCache get error:", error);
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(
    query: string,
    response: unknown,
    tokensUsed: number,
  ): Promise<string | null> {
    try {
      // Generate embedding for query
      const embedding = await this.generateEmbedding(query);
      const queryHash = this.hashQuery(query);

      // Calculate TTL
      const ttl = new Date(
        Date.now() + this.config.ttlSeconds * 1000,
      ).toISOString();

      // Insert cache entry (cast to any to handle schema differences)
      const { data, error } = await (supabaseAdmin as any)
        .from("semantic_cache")
        .insert({
          org_id: this.config.orgId,
          query_hash: queryHash,
          query_text: query,
          query_embedding: embedding,
          response: response as Json,
          model: this.config.model,
          tokens_used: tokensUsed,
          tokens_saved: 0,
          hit_count: 0,
          similarity_threshold: this.config.similarityThreshold,
          ttl,
        })
        .select("id")
        .single();

      if (error) {
        console.error("SemanticCache set error:", error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error("SemanticCache set error:", error);
      return null;
    }
  }

  /**
   * Get cache statistics for organization
   */
  async getStats(): Promise<CacheStats> {
    try {
      const { data, error } = await supabaseAdmin
        .from("semantic_cache")
        .select("hit_count, tokens_saved")
        .eq("org_id", this.config.orgId);

      if (error || !data) {
        return { totalEntries: 0, totalHits: 0, tokensSaved: 0, hitRate: 0 };
      }

      const totalEntries = data.length;
      const totalHits = data.reduce(
        (sum, row) => sum + (row.hit_count || 0),
        0,
      );
      const tokensSaved = data.reduce(
        (sum, row) => sum + (row.tokens_saved || 0),
        0,
      );
      const hitRate = totalEntries > 0 ? totalHits / totalEntries : 0;

      return { totalEntries, totalHits, tokensSaved, hitRate };
    } catch (error) {
      console.error("SemanticCache getStats error:", error);
      return { totalEntries: 0, totalHits: 0, tokensSaved: 0, hitRate: 0 };
    }
  }

  /**
   * Invalidate cache entry by query
   */
  async invalidate(query: string): Promise<boolean> {
    try {
      const queryHash = this.hashQuery(query);
      const { error } = await supabaseAdmin
        .from("semantic_cache")
        .delete()
        .eq("org_id", this.config.orgId)
        .eq("query_hash", queryHash);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Clear all cache entries for organization
   */
  async clear(): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from("semantic_cache")
        .delete()
        .eq("org_id", this.config.orgId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Generate embedding using Gemini
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const gemini = getGemini();
      const result = await gemini.embed(text);
      return result?.embedding || null;
    } catch (error) {
      console.error("Embedding generation error:", error);
      return null;
    }
  }

  /**
   * Hash query for exact match lookup
   */
  private hashQuery(query: string): string {
    return crypto
      .createHash("sha256")
      .update(query.toLowerCase().trim())
      .digest("hex");
  }

  /**
   * Increment hit count and tokens saved
   */
  private async incrementHitCount(cacheId: string): Promise<void> {
    try {
      const { data } = await supabaseAdmin
        .from("semantic_cache")
        .select("hit_count, tokens_used, tokens_saved")
        .eq("id", cacheId)
        .single();

      if (data) {
        await supabaseAdmin
          .from("semantic_cache")
          .update({
            hit_count: (data.hit_count || 0) + 1,
            tokens_saved: (data.tokens_saved || 0) + (data.tokens_used || 0),
          })
          .eq("id", cacheId);
      }
    } catch (error) {
      console.error("Increment hit count error:", error);
    }
  }
}

/**
 * Create semantic cache for an organization
 */
export function createSemanticCache(
  orgId: string,
  options?: Partial<Omit<SemanticCacheConfig, "orgId">>,
): SemanticCache {
  return new SemanticCache({
    orgId,
    ...options,
  });
}
