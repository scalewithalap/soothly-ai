import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// Maximum file size (50MB)
const MAX_FILE_SIZE = 52428800;

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "auth/unauthorized" }, { status: 401 });
    }

    // Get user's org
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.org_id) {
      return NextResponse.json(
        { error: "auth/no_organization" },
        { status: 403 },
      );
    }

    const orgId = userData.org_id;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "validation/no_file" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "validation/invalid_file_type",
          allowed: ALLOWED_MIME_TYPES,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "validation/file_too_large",
          maxSize: MAX_FILE_SIZE,
        },
        { status: 400 },
      );
    }

    // Generate unique file path
    const fileExtension = file.name.split(".").pop() || "bin";
    const uniqueId = crypto.randomUUID();
    const storagePath = `${orgId}/${uniqueId}.${fileExtension}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "storage/upload_failed", details: uploadError.message },
        { status: 500 },
      );
    }

    // Generate signed URL for agent access (1 hour expiry)
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage.from("uploads").createSignedUrl(storagePath, 3600);

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      return NextResponse.json(
        { error: "storage/signed_url_failed" },
        { status: 500 },
      );
    }

    // Register asset in org_assets table
    const { data: asset, error: assetError } = await supabase
      .from("org_assets")
      .insert({
        org_id: orgId,
        name: file.name,
        asset_type: "upload",
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (assetError) {
      console.error("Asset registration error:", assetError);
      // File is uploaded but not registered - non-fatal
    }

    return NextResponse.json({
      success: true,
      file: {
        id: asset?.id || uniqueId,
        name: file.name,
        type: file.type,
        size: file.size,
        url: signedUrlData.signedUrl,
        storagePath,
      },
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "internal/server_error" },
      { status: 500 },
    );
  }
}
