import { NextResponse } from "next/server";
import { getAuthenticatedUser, getUserOrganizationId } from "@/lib/supabase/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { publishToSelectedPlatforms } from "@/lib/platforms/publisher";
import type { PlatformName, PlatformPublishResult, PublishMediaAsset } from "@/lib/platforms/types";

interface ScheduledPostRecord {
  id: string;
  organization_id: string;
  message: string;
  scheduled_at: string;
  selected_platforms: PlatformName[];
  location: string | null;
  status: string;
  publish_attempts: number;
  metadata: Record<string, unknown> | null;
}

interface MediaAssetRecord {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
}

function getMediaAssetId(metadata: Record<string, unknown> | null) {
  const mediaAssetId = metadata?.mediaAssetId;

  return typeof mediaAssetId === "string" && mediaAssetId.length > 0 ? mediaAssetId : null;
}

async function findPublishMediaAsset(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  organizationId: string,
  scheduledPostId: string,
  mediaAssetId: string | null,
): Promise<MediaAssetRecord | null> {
  const baseQuery = () =>
    supabaseAdmin
      .from("media_assets")
      .select("id, file_name, storage_path, mime_type, size_bytes")
      .eq("organization_id", organizationId);

  if (mediaAssetId) {
    const mediaResponse = await baseQuery().eq("id", mediaAssetId).maybeSingle();

    if (mediaResponse.error) {
      throw new Error(mediaResponse.error.message || "Attached media asset was not found.");
    }

    if (mediaResponse.data) {
      return mediaResponse.data as MediaAssetRecord;
    }
  }

  const linkedMediaResponse = await baseQuery()
    .eq("scheduled_post_id", scheduledPostId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkedMediaResponse.error) {
    throw new Error(linkedMediaResponse.error.message || "Unable to load linked media asset.");
  }

  return linkedMediaResponse.data ? (linkedMediaResponse.data as MediaAssetRecord) : null;
}

async function loadPublishMediaAssets(
  supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>,
  organizationId: string,
  scheduledPostId: string,
  mediaAssetId: string | null,
): Promise<PublishMediaAsset[]> {
  const mediaAsset = await findPublishMediaAsset(supabaseAdmin, organizationId, scheduledPostId, mediaAssetId);

  if (!mediaAsset) {
    return [];
  }

  const mediaBucket = supabaseAdmin.storage.from("media");
  const [downloadResponse, signedUrlResponse] = await Promise.all([
    mediaBucket.download(mediaAsset.storage_path),
    mediaBucket.createSignedUrl(mediaAsset.storage_path, 60 * 60),
  ]);

  if (downloadResponse.error || !downloadResponse.data) {
    throw new Error(downloadResponse.error?.message || "Unable to download attached media from Supabase Storage.");
  }

  if (signedUrlResponse.error) {
    throw new Error(signedUrlResponse.error.message || "Unable to create a Supabase media URL for publishing.");
  }

  return [
    {
      id: mediaAsset.id,
      fileName: mediaAsset.file_name,
      mimeType: mediaAsset.mime_type,
      sizeBytes: mediaAsset.size_bytes,
      storagePath: mediaAsset.storage_path,
      data: await downloadResponse.data.arrayBuffer(),
      publicUrl: signedUrlResponse.data.signedUrl,
    },
  ];
}

function summarizeFailure(results: PlatformPublishResult[]) {
  return results
    .filter((result) => result.status !== "published")
    .map((result) => `${result.platform}: ${result.errorMessage ?? result.providerMessage}`)
    .join(" | ");
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const organizationId = await getUserOrganizationId(user.id, user.email);
    const supabaseAdmin = getSupabaseAdminClient();

    const postResponse = await supabaseAdmin
      .from("scheduled_posts")
      .select("id, organization_id, message, scheduled_at, selected_platforms, location, status, publish_attempts, metadata")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (postResponse.error || !postResponse.data) {
      return NextResponse.json(
        { error: postResponse.error?.message || "Scheduled post was not found." },
        { status: 404 },
      );
    }

    const post = postResponse.data as ScheduledPostRecord;

    if (!["scheduled", "retrying", "failed"].includes(post.status)) {
      return NextResponse.json(
        { error: `Scheduled post cannot be published from status '${post.status}'.` },
        { status: 409 },
      );
    }

    const mediaAssetId = getMediaAssetId(post.metadata);
    const mediaAssets = await loadPublishMediaAssets(supabaseAdmin, organizationId, post.id, mediaAssetId);
    const attachedMediaAssetId = mediaAssets[0]?.id ?? mediaAssetId;
    const mediaUrls = mediaAssets.flatMap((mediaAsset) => mediaAsset.publicUrl ? [mediaAsset.publicUrl] : []);

    const attemptNumber = post.publish_attempts + 1;
    const attemptResponse = await supabaseAdmin
      .from("publish_attempts")
      .insert({
        organization_id: organizationId,
        scheduled_post_id: post.id,
        attempt_number: attemptNumber,
        status: "running",
        payload: {
          source: "server-publisher",
          selectedPlatforms: post.selected_platforms,
          scheduledAt: post.scheduled_at,
          mediaAssetId: attachedMediaAssetId,
          mediaUrls,
        },
      })
      .select("id")
      .single();

    if (attemptResponse.error || !attemptResponse.data) {
      return NextResponse.json(
        { error: attemptResponse.error?.message || "Unable to create publish attempt." },
        { status: 500 },
      );
    }

    await supabaseAdmin
      .from("scheduled_posts")
      .update({ status: "publishing", publish_attempts: attemptNumber, last_error: null })
      .eq("id", post.id);

    const results = await publishToSelectedPlatforms({
      id: post.id,
      message: post.message,
      scheduledAt: post.scheduled_at,
      selectedPlatforms: post.selected_platforms,
      mediaAssets,
      mediaUrls,
      location: post.location ?? undefined,
    });

    const allPublished = results.length > 0 && results.every((result) => result.status === "published");
    const finalStatus = allPublished ? "published" : "failed";
    const failureSummary = allPublished ? null : summarizeFailure(results);

    await supabaseAdmin.from("platform_results").insert(
      results.map((result) => ({
        organization_id: organizationId,
        publish_attempt_id: attemptResponse.data.id,
        platform: result.platform,
        status: result.status,
        provider_id: result.providerId ?? result.requestId,
        raw_response: {
          responseCode: result.responseCode,
          requestId: result.requestId,
          providerMessage: result.providerMessage,
          rawResponse: result.rawResponse ?? null,
        },
        error_message: result.status === "published" ? null : result.errorMessage ?? result.providerMessage,
      })),
    );

    await supabaseAdmin
      .from("publish_attempts")
      .update({
        status: allPublished ? "success" : "failed",
        completed_at: new Date().toISOString(),
        error_message: failureSummary,
        payload: {
          source: "server-publisher",
          selectedPlatforms: post.selected_platforms,
          scheduledAt: post.scheduled_at,
          mediaAssetId: attachedMediaAssetId,
          mediaUrls,
          results,
        },
      })
      .eq("id", attemptResponse.data.id);

    await supabaseAdmin
      .from("scheduled_posts")
      .update({
        status: finalStatus,
        last_error: failureSummary,
      })
      .eq("id", post.id);

    return NextResponse.json({
      scheduledPostId: post.id,
      status: finalStatus,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected publish failure." },
      { status: 500 },
    );
  }
}
