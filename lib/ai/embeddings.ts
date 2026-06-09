/**
 * Shared Embedding Service — single source of truth for ALL vector embeddings.
 *
 * Why this exists (ADR-006): KnowledgeBase + VectorStore embedded via OpenAI
 * text-embedding-3-small (1536-dim) while SemanticCache embedded via Gemini
 * (768-dim). Vectors written by one path could never match vectors queried by
 * another, and pgvector columns need ONE fixed dimension. Everything now goes
 * through this module.
 *
 * Provider: Gemini text-embedding-004 (768 dims) — keeps the platform's
 * "Gemini by default" posture and requires only GOOGLE_AI_API_KEY.
 * Migration 0004 types all embedding columns as vector(768).
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export const EMBEDDING_MODEL = "text-embedding-004";
export const EMBEDDING_DIMENSIONS = 768;

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY not configured (required for embeddings)");
    }
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

/** Generate a 768-dim embedding for one text. Throws on failure. */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getClient().getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text.slice(0, 30000));
  const values = result.embedding?.values;
  if (!values?.length) {
    throw new Error("Embedding generation returned empty vector");
  }
  return values;
}

/** Like generateEmbedding but returns null instead of throwing (cache paths). */
export async function tryGenerateEmbedding(
  text: string,
): Promise<number[] | null> {
  try {
    return await generateEmbedding(text);
  } catch (error) {
    console.error("Embedding generation failed:", error);
    return null;
  }
}

/** Batch embeddings (sequential — Gemini SDK has no batch endpoint here). */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (const t of texts) {
    out.push(await generateEmbedding(t));
  }
  return out;
}

/** Format for pgvector text input: '[0.1,0.2,...]' */
export function formatVectorForDB(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
