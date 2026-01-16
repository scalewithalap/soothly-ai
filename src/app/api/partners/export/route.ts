import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import {
  generateExport,
  getExportContentType,
  getExportExtension,
  PARTNER_EXPORT_FIELDS,
  ExportFormat,
  ExportableData,
} from "@/lib/exports";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const exportSchema = z.object({
  format: z.enum(["csv", "excel", "json"]).default("csv"),
  filters: z
    .object({
      partner_type: z.string().optional(),
      status: z.string().optional(),
    })
    .optional(),
});

// POST /api/partners/export - Export partners data
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
    .from("partners")
    .select(PARTNER_EXPORT_FIELDS.join(", "))
    .eq("org_id", userData.org_id)
    .order("created_at", { ascending: false });

  if (filters?.partner_type) {
    query = query.eq("partner_type", filters.partner_type);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data: partners, error } = await query;

  if (error) {
    console.error("Failed to fetch partners for export:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch partners",
      500
    );
  }

  if (!partners || partners.length === 0) {
    throw new AppError(
      ErrorCodes.NOT_FOUND,
      "No partners found to export",
      404
    );
  }

  // Generate export
  const exportData = generateExport(
    partners as unknown as ExportableData[],
    format as ExportFormat,
    {
      fields: PARTNER_EXPORT_FIELDS,
      sheetName: "Partners",
    }
  );

  const contentType = getExportContentType(format as ExportFormat);
  const extension = getExportExtension(format as ExportFormat);
  const filename = `partners_export_${Date.now()}.${extension}`;

  // Return file response
  return new NextResponse(exportData as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// GET /api/partners/export - Get export options
export const GET = withErrorHandler(async () => {
  return apiSuccess({
    formats: ["csv", "excel", "json"],
    fields: PARTNER_EXPORT_FIELDS,
  });
});
