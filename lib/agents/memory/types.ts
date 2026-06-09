/**
 * Memory Types for Agent Memory System
 * Defines interfaces for episodic, semantic, and procedural memory
 */

import type { AgentType } from "../base/types";

/**
 * Memory classification types following cognitive architecture patterns
 * - episodic: Specific experiences and interactions
 * - semantic: Facts, entities, and relationships
 * - procedural: Learned patterns and optimized behaviors
 */
export type MemoryType = "episodic" | "semantic" | "procedural";

/**
 * Base memory record as stored in the database
 */
export interface MemoryRecord {
  id: string;
  org_id: string;
  agent_type: AgentType;
  memory_type: MemoryType;
  content: string;
  content_hash: string;
  embedding?: number[];
  embedding_model?: string;
  importance: number;
  access_count: number;
  decay_rate: number;
  source_task_id?: string;
  source_action?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata: Record<string, unknown>;
  tags: string[];
  created_at: Date;
  accessed_at: Date;
  expires_at?: Date;
}

/**
 * Input for creating a new memory
 */
export interface CreateMemoryInput {
  content: string;
  memory_type: MemoryType;
  importance?: number;
  source_task_id?: string;
  source_action?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  expires_at?: Date;
}

/**
 * Options for memory retrieval
 */
export interface MemoryRetrievalOptions {
  memory_types?: MemoryType[];
  min_importance?: number;
  match_threshold?: number;
  limit?: number;
  tags?: string[];
  include_expired?: boolean;
}

/**
 * Result from similarity search
 */
export interface MemorySearchResult extends MemoryRecord {
  similarity: number;
}

/**
 * Memory consolidation result (periodic cleanup/reorganization)
 */
export interface MemoryConsolidationResult {
  decayed_count: number;
  expired_count: number;
  promoted_count: number;
}

/**
 * Embedding provider configuration
 */
export interface EmbeddingConfig {
  provider: "gemini" | "openai" | "local";
  model: string;
  dimensions: number;
  apiKey?: string;
}

/**
 * Default embedding configuration (shared Gemini service — ADR-006)
 */
export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  // ADR-006: all embeddings via shared Gemini service (lib/ai/embeddings)
  provider: "gemini",
  model: "text-embedding-004",
  dimensions: 768,
};

