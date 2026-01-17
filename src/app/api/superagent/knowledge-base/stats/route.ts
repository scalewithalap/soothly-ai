/**
 * Knowledge Base Stats API
 * GET /api/superagent/knowledge-base/stats
 */

import { NextResponse } from "next/server";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createKnowledgeBase } from "@/lib/ai/knowledge-base";

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;

    const kb = createKnowledgeBase(authResult.orgId);
    const stats = await kb.getStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Knowledge base stats error:", error);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
