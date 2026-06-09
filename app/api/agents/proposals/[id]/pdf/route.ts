/**
 * GET /api/agents/proposals/[id]/pdf — render a proposal as a downloadable PDF.
 *
 * [id] here is the PROPOSAL id (not prospect id). The agent stores proposals
 * as structured JSON (title/executiveSummary/challenge/solution/outcomes/
 * whyUs/nextSteps — see inngest/functions/proposal.ts generate-proposal);
 * this route renders that JSON with jsPDF on demand. Rendering at download
 * time means edits to the stored JSON are always reflected and we store no
 * binary blobs.
 *
 * Phase 4a note: jsPDF was in package.json but never imported anywhere — the
 * Proposal agent's headline deliverable ("instant custom PDFs") had no PDF
 * path until this route.
 */
import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ProposalContent {
  title?: string;
  executiveSummary?: string;
  challenge?: string;
  solution?: string;
  outcomes?: string[];
  whyUs?: string[];
  nextSteps?: string;
  [key: string]: unknown;
}

const PAGE_WIDTH = 210; // A4 mm
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export const GET = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const proposalId = parts[parts.indexOf("proposals") + 1];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new AppError(ErrorCodes.AUTH_UNAUTHORIZED, "Unauthorized", 401);
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!userData?.org_id) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Organization not found", 404);
  }

  // RLS also scopes this, but keep the explicit org filter (defense in depth).
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("id, title, content, created_at, prospects(company_name)")
    .eq("id", proposalId)
    .eq("org_id", userData.org_id)
    .single();
  if (error || !proposal) {
    throw new AppError(ErrorCodes.NOT_FOUND, "Proposal not found", 404);
  }

  const content = (proposal.content ?? {}) as ProposalContent;
  const companyName =
    (proposal.prospects as { company_name?: string } | null)?.company_name ??
    "";

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const ensureRoom = (needed: number) => {
    if (y + needed > 277) {
      doc.addPage();
      y = MARGIN;
    }
  };

  const writeHeading = (text: string) => {
    ensureRoom(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(40, 35, 80);
    doc.text(text, MARGIN, y);
    y += 8;
  };

  const writeBody = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH) as string[];
    for (const line of lines) {
      ensureRoom(6);
      doc.text(line, MARGIN, y);
      y += 6;
    }
    y += 4;
  };

  const writeList = (items: string[]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    for (const item of items) {
      const lines = doc.splitTextToSize(`•  ${item}`, CONTENT_WIDTH) as string[];
      for (const line of lines) {
        ensureRoom(6);
        doc.text(line, MARGIN, y);
        y += 6;
      }
    }
    y += 4;
  };

  // Cover block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20, 16, 60);
  const titleLines = doc.splitTextToSize(
    content.title || proposal.title || "Proposal",
    CONTENT_WIDTH,
  ) as string[];
  for (const line of titleLines) {
    doc.text(line, MARGIN, y);
    y += 10;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  const dateStr = new Date(
    proposal.created_at ?? Date.now(),
  ).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(
    companyName ? `Prepared for ${companyName} — ${dateStr}` : dateStr,
    MARGIN,
    y,
  );
  y += 12;

  const sections: Array<[string, string | string[] | undefined]> = [
    ["Executive Summary", content.executiveSummary],
    ["The Challenge", content.challenge],
    ["Our Solution", content.solution],
    ["Expected Outcomes", content.outcomes],
    ["Why Us", content.whyUs],
    ["Next Steps", content.nextSteps],
  ];

  for (const [heading, value] of sections) {
    if (!value || (Array.isArray(value) && value.length === 0)) continue;
    writeHeading(heading);
    if (Array.isArray(value)) writeList(value);
    else writeBody(value);
  }

  const pdfBytes = doc.output("arraybuffer");
  const safeName = (content.title || "proposal")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .slice(0, 60);

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
