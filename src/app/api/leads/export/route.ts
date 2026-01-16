import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import {
  generateExport,
  getExportContentType,
  getExportExtension,
  LEAD_EXPORT_FIELDS,
  ExportFormat,
  ExportableData,
} from "@/lib/exports";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const exportSchema = z.object({
  format: z.enum(["csv", "excel", "json"]).default("csv"),
  filters: z
    .object({
      pipeline_stage: z.string().optional(),
      source: z.string().optional(),
    })
    .optional(),
});

// POST /api/leads/export - Export leads data
export const POST = withErrorHandler(async (request: Request) => {
  const supabase = (await createClient()) as unknown as SupabaseClient;

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

  // Validate request
  const { format, filters } = await validateBody(request, exportSchema);

  // Build query
  let query = supabase
    .from("contacts")
    .select(LEAD_EXPORT_FIELDS.join(", "))
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  if (filters?.pipeline_stage) {
    query = query.eq("pipeline_stage", filters.pipeline_stage);
  }
  if (filters?.source) {
    query = query.eq("source", filters.source);
  }

  const { data: leads, error } = await query;

  if (error) {
    console.error("Failed to fetch leads for export:", error);
    throw new AppError(ErrorCodes.DATABASE_ERROR, "Failed to fetch leads", 500);
  }

  if (!leads || leads.length === 0) {
    throw new AppError(ErrorCodes.NOT_FOUND, "No leads found to export", 404);
  }

  // Generate export
  const exportData = generateExport(
    leads as unknown as ExportableData[],
    format as ExportFormat,
    {
      fields: LEAD_EXPORT_FIELDS,
      sheetName: "Leads",
    }
  );

  const contentType = getExportContentType(format as ExportFormat);
  const extension = getExportExtension(format as ExportFormat);
  const filename = `leads_export_${Date.now()}.${extension}`;

  // Return file response
  return new NextResponse(exportData as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// GET /api/leads/export - Get export options
export const GET = withErrorHandler(async () => {
  return apiSuccess({
    formats: ["csv", "excel", "json"],
    fields: LEAD_EXPORT_FIELDS,
  });
});
