/**
 * Knowledge Base Search API
 * POST /api/superagent/knowledge-base/search
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createKnowledgeBase } from "@/lib/ai/knowledge-base";

const searchSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().min(1).max(20).default(5),
  threshold: z.number().min(0).max(1).default(0.7),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;

    const body = await request.json();
    const { query, limit, threshold } = searchSchema.parse(body);

    const kb = createKnowledgeBase(authResult.orgId);
    const { results, error } = await kb.search(query, { limit, threshold });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Knowledge base search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
