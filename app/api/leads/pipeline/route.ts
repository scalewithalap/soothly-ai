import { createClient } from "@/lib/supabase/server";
import { apiSuccess, withErrorHandler, validateBody } from "@/lib/validation";
import { AppError, ErrorCodes } from "@/lib/errors";
import {
  pipelineStages,
  updatePipelineStageSchema,
} from "@/lib/validation/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

// GET: Fetch leads grouped by pipeline stage
export const GET = withErrorHandler(async () => {
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

  // Fetch all contacts with their pipeline stage
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, company, title, pipeline_stage, created_at, updated_at"
    )
    .eq("org_id", userData.org_id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch contacts:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to fetch contacts",
      500
    );
  }

  // Group by stage
  const pipeline: Record<string, typeof contacts> = {};
  pipelineStages.forEach((stage) => {
    pipeline[stage] =
      contacts?.filter((c) => (c.pipeline_stage || "new") === stage) || [];
  });

  // Calculate stage counts
  const counts: Record<string, number> = {};
  pipelineStages.forEach((stage) => {
    counts[stage] = pipeline[stage].length;
  });

  return apiSuccess({
    pipeline,
    counts,
    total: contacts?.length || 0,
  });
});

// PATCH: Move lead to a new stage
export const PATCH = withErrorHandler(async (request: Request) => {
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

  // Validate request body
  const { contactId, stage } = await validateBody(
    request,
    updatePipelineStageSchema
  );

  const { data: updated, error } = await supabase
    .from("contacts")
    .update({
      pipeline_stage: stage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("org_id", userData.org_id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update contact:", error);
    throw new AppError(
      ErrorCodes.DATABASE_ERROR,
      "Failed to update lead stage",
      500
    );
  }

  return apiSuccess({ contact: updated });
});

