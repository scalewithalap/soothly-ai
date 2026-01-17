/**
 * Knowledge Base API - Add documents
 * POST /api/superagent/knowledge-base
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isErrorResponse } from "@/lib/auth";
import { createKnowledgeBase } from "@/lib/ai/knowledge-base";

const addDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(10).max(100000),
  sourceType: z.enum(["manual", "agent_output", "import"]).optional(),
  sourceAgent: z.string().optional(),
  metadata: z.any().optional(),
});

const deleteDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;

    const body = await request.json();
    const parsed = addDocumentSchema.parse(body);

    const kb = createKnowledgeBase(authResult.orgId);
    const result = await kb.addDocument({
      title: parsed.title,
      content: parsed.content,
      sourceType: (parsed.sourceType || "manual") as
        | "manual"
        | "agent_output"
        | "import",
      sourceAgent: parsed.sourceAgent,
      metadata: parsed.metadata,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      documentIds: result.documentIds,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Knowledge base add error:", error);
    return NextResponse.json(
      { error: "Failed to add document" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;

    const kb = createKnowledgeBase(authResult.orgId);
    const { documents, total } = await kb.listDocuments({
      limit: 50,
    });

    return NextResponse.json({
      documents,
      total,
    });
  } catch (error) {
    console.error("Knowledge base list error:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;

    const body = await request.json();
    const { documentId } = deleteDocumentSchema.parse(body);

    const kb = createKnowledgeBase(authResult.orgId);
    const result = await kb.deleteDocument(documentId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Knowledge base delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
