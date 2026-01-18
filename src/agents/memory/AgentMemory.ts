/**
 * AgentMemory - Long-term memory persistence for AI agents
 * Enables episodic, semantic, and procedural memory with vector similarity search
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AgentType } from "../base/types";
import { untypedQuery } from "../utils/dbUtils";
import { VectorStore } from "./VectorStore";
import {
  type MemoryRecord,
  type CreateMemoryInput,
  type MemoryRetrievalOptions,
  type MemorySearchResult,
  type MemoryConsolidationResult,
  type MemoryType,
  DEFAULT_EMBEDDING_CONFIG,
} from "./types";

export class AgentMemory {
  private db: SupabaseClient<Database>;
  private vectorStore: VectorStore;
  private orgId: string;
  private agentType: AgentType;

  constructor(
    db: SupabaseClient<Database>,
    orgId: string,
    agentType: AgentType,
  ) {
    this.db = db;
    this.orgId = orgId;
    this.agentType = agentType;
    this.vectorStore = new VectorStore(db);
  }

  /**
   * Store a new memory with automatic embedding generation
   */
  async store(input: CreateMemoryInput): Promise<MemoryRecord | null> {
    const contentHash = this.vectorStore.createContentHash(input.content);

    // Check for duplicate
    const { data: existing } = await untypedQuery(this.db)
      .from("agent_memories")
      .select("id")
      .eq("org_id", this.orgId)
      .eq("agent_type", this.agentType)
      .eq("content_hash", contentHash)
      .single();

    if (existing) {
      // Update access instead of duplicating
      await this.access(existing.id);
      return this.getById(existing.id);
    }

    // Generate embedding for the content
    const truncatedContent = this.vectorStore.truncateForEmbedding(
      input.content,
    );
    const embedding =
      await this.vectorStore.generateEmbedding(truncatedContent);

    // Insert new memory
    const { data, error } = await untypedQuery(this.db)
      .from("agent_memories")
      .insert({
        org_id: this.orgId,
        agent_type: this.agentType,
        memory_type: input.memory_type,
        content: input.content,
        content_hash: contentHash,
        embedding: this.vectorStore.formatVectorForDB(
          embedding,
        ) as unknown as number[],
        embedding_model: DEFAULT_EMBEDDING_CONFIG.model,
        importance: input.importance ?? 0.5,
        source_task_id: input.source_task_id,
        source_action: input.source_action,
        related_entity_type: input.related_entity_type,
        related_entity_id: input.related_entity_id,
        metadata: input.metadata ?? {},
        tags: input.tags ?? [],
        expires_at: input.expires_at?.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to store memory:", error);
      return null;
    }

    return data as unknown as MemoryRecord;
  }

  /**
   * Retrieve memories similar to a query using vector similarity search
   */
  async recall(
    query: string,
    options: MemoryRetrievalOptions = {},
  ): Promise<MemorySearchResult[]> {
    const {
      memory_types,
      min_importance = 0,
      match_threshold = 0.7,
      limit = 10,
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.vectorStore.generateEmbedding(query);

    // Use the database function for efficient similarity search
    const { data, error } = await (this.db as any).rpc(
      "search_agent_memories",
      {
        p_org_id: this.orgId,
        p_agent_type: this.agentType,
        p_query_embedding: this.vectorStore.formatVectorForDB(queryEmbedding),
        p_memory_types: memory_types ?? null,
        p_min_importance: min_importance,
        p_match_threshold: match_threshold,
        p_limit: limit,
      },
    );

    if (error) {
      console.error("Memory recall error:", error);
      return [];
    }

    // Mark accessed memories
    const memoryIds = (data as MemorySearchResult[])?.map(
      (m: MemorySearchResult) => m.id,
    );
    if (memoryIds?.length) {
      await Promise.all(memoryIds.map((id: string) => this.access(id)));
    }

    return (data as MemorySearchResult[]) || [];
  }

  /**
   * Get a specific memory by ID
   */
  async getById(id: string): Promise<MemoryRecord | null> {
    const { data, error } = await untypedQuery(this.db)
      .from("agent_memories")
      .select("*")
      .eq("id", id)
      .eq("org_id", this.orgId)
      .single();

    if (error) {
      return null;
    }

    return data as unknown as MemoryRecord;
  }

  /**
   * Update memory access (increases importance slightly)
   */
  async access(memoryId: string): Promise<void> {
    await (this.db as any).rpc("access_agent_memory", {
      p_memory_id: memoryId,
    });
  }

  /**
   * Update memory importance manually
   */
  async updateImportance(memoryId: string, importance: number): Promise<void> {
    await untypedQuery(this.db)
      .from("agent_memories")
      .update({ importance: Math.max(0, Math.min(1, importance)) })
      .eq("id", memoryId)
      .eq("org_id", this.orgId);
  }

  /**
   * Add tags to a memory
   */
  async addTags(memoryId: string, tags: string[]): Promise<void> {
    const { data } = await untypedQuery(this.db)
      .from("agent_memories")
      .select("tags")
      .eq("id", memoryId)
      .single();

    if (data) {
      const currentTags = (data.tags as string[]) || [];
      const newTags = [...new Set([...currentTags, ...tags])];

      await untypedQuery(this.db)
        .from("agent_memories")
        .update({ tags: newTags })
        .eq("id", memoryId);
    }
  }

  /**
   * Get memories by type
   */
  async getByType(
    memoryType: MemoryType,
    limit: number = 50,
  ): Promise<MemoryRecord[]> {
    const { data, error } = await untypedQuery(this.db)
      .from("agent_memories")
      .select("*")
      .eq("org_id", this.orgId)
      .eq("agent_type", this.agentType)
      .eq("memory_type", memoryType)
      .order("importance", { ascending: false })
      .order("accessed_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to get memories by type:", error);
      return [];
    }

    return (data as unknown as MemoryRecord[]) || [];
  }

  /**
   * Get recent memories
   */
  async getRecent(limit: number = 20): Promise<MemoryRecord[]> {
    const { data, error } = await untypedQuery(this.db)
      .from("agent_memories")
      .select("*")
      .eq("org_id", this.orgId)
      .eq("agent_type", this.agentType)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to get recent memories:", error);
      return [];
    }

    return (data as unknown as MemoryRecord[]) || [];
  }

  /**
   * Search memories by tags
   */
  async searchByTags(
    tags: string[],
    limit: number = 20,
  ): Promise<MemoryRecord[]> {
    const { data, error } = await untypedQuery(this.db)
      .from("agent_memories")
      .select("*")
      .eq("org_id", this.orgId)
      .eq("agent_type", this.agentType)
      .overlaps("tags", tags)
      .order("importance", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Failed to search by tags:", error);
      return [];
    }

    return (data as unknown as MemoryRecord[]) || [];
  }

  /**
   * Delete a specific memory
   */
  async forget(memoryId: string): Promise<boolean> {
    const { error } = await untypedQuery(this.db)
      .from("agent_memories")
      .delete()
      .eq("id", memoryId)
      .eq("org_id", this.orgId);

    return !error;
  }

  /**
   * Consolidate memories (decay low-importance, clean expired, promote frequent)
   */
  async consolidate(): Promise<MemoryConsolidationResult> {
    const result: MemoryConsolidationResult = {
      decayed_count: 0,
      expired_count: 0,
      promoted_count: 0,
    };

    // Delete expired memories
    const { count: expiredCount } = await untypedQuery(this.db)
      .from("agent_memories")
      .delete()
      .eq("org_id", this.orgId)
      .eq("agent_type", this.agentType)
      .lt("expires_at", new Date().toISOString());

    result.expired_count = expiredCount || 0;

    // Decay low-importance, low-access memories
    const { data: decayable } = await untypedQuery(this.db)
      .from("agent_memories")
      .select("id, importance, decay_rate, access_count")
      .eq("org_id", this.orgId)
      .eq("agent_type", this.agentType)
      .lt("importance", 0.3)
      .lt("access_count", 3);

    if (decayable?.length) {
      for (const memory of decayable) {
        const mem = memory as {
          id: string;
          importance: number;
          decay_rate: number;
        };
        const newImportance = Math.max(0, mem.importance - mem.decay_rate);
        if (newImportance < 0.05) {
          // Delete very low importance memories
          await this.forget(mem.id);
          result.decayed_count++;
        } else {
          await this.updateImportance(mem.id, newImportance);
          result.decayed_count++;
        }
      }
    }

    // Promote frequently accessed memories
    const { data: promotable, count: promotedCount } = await untypedQuery(
      this.db,
    )
      .from("agent_memories")
      .update({ importance: 0.8 })
      .eq("org_id", this.orgId)
      .eq("agent_type", this.agentType)
      .gt("access_count", 10)
      .lt("importance", 0.7)
      .select();

    result.promoted_count = promotedCount || promotable?.length || 0;

    return result;
  }

  /**
   * Get memory statistics for this agent
   */
  async getStats(): Promise<{
    total: number;
    by_type: Record<MemoryType, number>;
    avg_importance: number;
    oldest: Date | null;
  }> {
    const { data, error } = await untypedQuery(this.db)
      .from("agent_memories")
      .select("memory_type, importance, created_at")
      .eq("org_id", this.orgId)
      .eq("agent_type", this.agentType);

    if (error || !data) {
      return {
        total: 0,
        by_type: { episodic: 0, semantic: 0, procedural: 0 },
        avg_importance: 0,
        oldest: null,
      };
    }

    const by_type: Record<MemoryType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
    };

    let totalImportance = 0;
    let oldest: Date | null = null;

    for (const memory of data) {
      const mem = memory as {
        memory_type: MemoryType;
        importance: number;
        created_at: string;
      };
      by_type[mem.memory_type]++;
      totalImportance += mem.importance;
      const created = new Date(mem.created_at);
      if (!oldest || created < oldest) {
        oldest = created;
      }
    }

    return {
      total: data.length,
      by_type,
      avg_importance: data.length > 0 ? totalImportance / data.length : 0,
      oldest,
    };
  }
}

