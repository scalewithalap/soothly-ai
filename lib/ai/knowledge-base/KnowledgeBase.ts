/**
 * KnowledgeBase Service - RAG implementation for Superagent
 *
 * Provides:
 * - Document ingestion with chunking
 * - Embedding generation via OpenAI
 * - Semantic search via pgvector
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
// Embeddings delegated to the shared service (ADR-006): Gemini
// text-embedding-004, 768 dims, matching vector(768) columns.
import { generateEmbedding, EMBEDDING_MODEL } from "@/lib/ai/embeddings";

// Types
interface KnowledgeDocument {
  id?: string;
  title: string;
  content: string;
  sourceType: "manual" | "agent_output" | "import";
  sourceAgent?: string;
  sourceReferenceId?: string;
  metadata?: Record<string, unknown>;
}

interface SearchResult {
  documentId: string;
  title: string;
  content: string;
  sourceType: string;
  sourceAgent: string | null;
  metadata: Record<string, unknown>;
  similarity: number;
}

interface KnowledgeBaseStats {
  totalDocuments: number;
  embeddedDocuments: number;
  totalEmbeddings: number;
  bySource: Record<string, number>;
}

// Configuration
const MAX_CHUNK_SIZE = 1500; // characters
const CHUNK_OVERLAP = 200; // characters

/**
 * Split text into chunks for embedding
 */
function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_SIZE) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + MAX_CHUNK_SIZE;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start + MAX_CHUNK_SIZE / 2) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - CHUNK_OVERLAP;
  }

  return chunks.filter((chunk) => chunk.length > 50);
}

/**
 * Generate content hash for deduplication
 */
function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 32);
}

/**
 * KnowledgeBase class for managing RAG documents
 */
export class KnowledgeBase {
  private supabase;
  private orgId: string;

  constructor(orgId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    this.orgId = orgId;
  }

  /**
   * Add a document to the knowledge base
   * Chunks large documents and generates embeddings
   */
  async addDocument(doc: KnowledgeDocument): Promise<{
    success: boolean;
    documentIds: string[];
    error?: string;
  }> {
    try {
      const chunks = chunkText(doc.content);
      const documentIds: string[] = [];

      // Insert parent document (first chunk) first
      let parentId: string | null = null;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const contentHash = hashContent(chunk);

        // Check for duplicates
        const { data: existing } = await this.supabase
          .from("knowledge_base_documents")
          .select("id")
          .eq("org_id", this.orgId)
          .eq("content_hash", contentHash)
          .single();

        if (existing) {
          documentIds.push(existing.id);
          if (i === 0) parentId = existing.id;
          continue;
        }

        // Insert document
        const insertResult = await this.supabase
          .from("knowledge_base_documents")
          .insert({
            org_id: this.orgId,
            title: i === 0 ? doc.title : `${doc.title} (Part ${i + 1})`,
            content: chunk,
            content_hash: contentHash,
            source_type: doc.sourceType,
            source_agent: doc.sourceAgent,
            source_reference_id: doc.sourceReferenceId,
            chunk_index: i,
            parent_document_id: i > 0 ? parentId : null,
            metadata: doc.metadata,
          })
          .select("id")
          .single();

        const inserted = insertResult.data as { id: string } | null;
        const insertError = insertResult.error;

        if (insertError || !inserted) {
          console.error("Failed to insert document:", insertError);
          continue;
        }

        if (i === 0) parentId = inserted.id;
        documentIds.push(inserted.id);

        // Generate and store embedding
        try {
          const embedding = await generateEmbedding(chunk);

          await this.supabase.from("knowledge_base_embeddings").insert({
            document_id: inserted.id,
            org_id: this.orgId,
            embedding: `[${embedding.join(",")}]`,
            model: EMBEDDING_MODEL,
          });

          // Mark document as embedded
          await this.supabase
            .from("knowledge_base_documents")
            .update({ is_embedded: true, embedding_model: EMBEDDING_MODEL })
            .eq("id", inserted.id);
        } catch (embeddingError) {
          console.error("Failed to generate embedding:", embeddingError);
          // Document is stored, just not embedded yet
        }
      }

      return { success: true, documentIds };
    } catch (error) {
      return {
        success: false,
        documentIds: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Search the knowledge base using semantic similarity
   */
  async search(
    query: string,
    options?: { limit?: number; threshold?: number },
  ): Promise<{ results: SearchResult[]; error?: string }> {
    try {
      // Generate query embedding
      const queryEmbedding = await generateEmbedding(query);

      // Call Supabase RPC function
      const { data, error } = await this.supabase.rpc("search_knowledge_base", {
        p_org_id: this.orgId,
        p_query_embedding: `[${queryEmbedding.join(",")}]`,
        p_match_threshold: options?.threshold ?? 0.7,
        p_match_count: options?.limit ?? 5,
      });

      if (error) {
        throw new Error(error.message);
      }

      const results: SearchResult[] = (data || []).map(
        (row: Record<string, unknown>) => ({
          documentId: row.document_id as string,
          title: row.title as string,
          content: row.content as string,
          sourceType: row.source_type as string,
          sourceAgent: row.source_agent as string | null,
          metadata: (row.metadata as Record<string, unknown>) || {},
          similarity: row.similarity as number,
        }),
      );

      return { results };
    } catch (error) {
      return {
        results: [],
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  }

  /**
   * Get context for RAG - returns formatted context string
   */
  async getContext(
    query: string,
    options?: { limit?: number; threshold?: number },
  ): Promise<string> {
    const { results, error } = await this.search(query, options);

    if (error || results.length === 0) {
      return "";
    }

    // Format results as context
    const contextParts = results.map(
      (r, i) => `[Source ${i + 1}: ${r.title}]\n${r.content}`,
    );

    return contextParts.join("\n\n---\n\n");
  }

  /**
   * Delete a document and its embedding
   */
  async deleteDocument(
    documentId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete will cascade to embeddings due to FK
      const { error } = await this.supabase
        .from("knowledge_base_documents")
        .delete()
        .eq("id", documentId)
        .eq("org_id", this.orgId);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      };
    }
  }

  /**
   * List all documents in the knowledge base
   */
  async listDocuments(options?: {
    limit?: number;
    offset?: number;
    sourceType?: string;
  }): Promise<{
    documents: Array<{
      id: string;
      title: string;
      sourceType: string;
      sourceAgent: string | null;
      isEmbedded: boolean;
      createdAt: string;
    }>;
    total: number;
  }> {
    let query = this.supabase
      .from("knowledge_base_documents")
      .select("id, title, source_type, source_agent, is_embedded, created_at", {
        count: "exact",
      })
      .eq("org_id", this.orgId)
      .is("parent_document_id", null) // Only parent documents
      .order("created_at", { ascending: false });

    if (options?.sourceType) {
      query = query.eq("source_type", options.sourceType);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data, count, error } = await query;

    if (error) {
      console.error("Failed to list documents:", error);
      return { documents: [], total: 0 };
    }

    return {
      documents: (data || []).map((d) => ({
        id: d.id,
        title: d.title,
        sourceType: d.source_type,
        sourceAgent: d.source_agent,
        isEmbedded: d.is_embedded,
        createdAt: d.created_at,
      })),
      total: count || 0,
    };
  }

  /**
   * Get knowledge base statistics
   */
  async getStats(): Promise<KnowledgeBaseStats> {
    const { data, error } = await this.supabase.rpc(
      "get_knowledge_base_stats",
      {
        p_org_id: this.orgId,
      },
    );

    if (error || !data) {
      return {
        totalDocuments: 0,
        embeddedDocuments: 0,
        totalEmbeddings: 0,
        bySource: {},
      };
    }

    return {
      totalDocuments: data.total_documents || 0,
      embeddedDocuments: data.embedded_documents || 0,
      totalEmbeddings: data.total_embeddings || 0,
      bySource: data.by_source || {},
    };
  }
}

/**
 * Factory function
 */
export function createKnowledgeBase(orgId: string): KnowledgeBase {
  return new KnowledgeBase(orgId);
}

export default KnowledgeBase;

