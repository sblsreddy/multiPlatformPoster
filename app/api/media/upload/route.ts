import { NextResponse } from "next/server";
import { getAuthenticatedUser, getUserOrganizationId } from "@/lib/supabase/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  const organizationId = await getUserOrganizationId(user.id, user.email);
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${organizationId}/${Date.now()}-${safeFileName}`;
  const supabaseAdmin = getSupabaseAdminClient();

  try {
    try {
      await supabaseAdmin.storage.createBucket("media", {
        public: false,
        fileSizeLimit: 524288000,
      });
    } catch (bucketError) {
      const message = bucketError instanceof Error ? bucketError.message : String(bucketError);

      if (!message.toLowerCase().includes("already exists")) {
        throw bucketError;
      }
    }

    const uploadResponse = await supabaseAdmin.storage.from("media").upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadResponse.error) {
      return NextResponse.json(
        { error: uploadResponse.error.message || "Upload failed." },
        { status: 500 },
      );
    }

    const mediaAssetResponse = await supabaseAdmin
      .from("media_assets")
      .insert({
        organization_id: organizationId,
        file_name: file.name,
        storage_path: storagePath,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        status: "uploaded",
      })
      .select("id, storage_path, mime_type, file_name, size_bytes")
      .single();

    if (mediaAssetResponse.error || !mediaAssetResponse.data) {
      return NextResponse.json(
        { error: mediaAssetResponse.error?.message || "Unable to save media metadata." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      assetId: mediaAssetResponse.data.id,
      storagePath: mediaAssetResponse.data.storage_path,
      fileName: mediaAssetResponse.data.file_name,
      mimeType: mediaAssetResponse.data.mime_type,
      sizeBytes: mediaAssetResponse.data.size_bytes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected upload failure." },
      { status: 500 },
    );
  }
}
