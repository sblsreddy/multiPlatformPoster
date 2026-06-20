import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { publishToSelectedPlatforms } from "@/lib/platforms/publisher";
import type { PlatformName, PlatformPublishResult, PublishMediaAsset } from "@/lib/platforms/types";

export const MAX_PUBLISH_ATTEMPTS = 3;
const BASE_RETRY_DELAY_SECONDS = 60;

export interface ScheduledPostRecord {
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

export function getMediaAssetId(metadata: Record<string, unknown> | null) {
  const mediaAssetId = metadata?.mediaAssetId;

  return typeof mediaAssetId === "string" && mediaAssetId.length > 0 ? mediaAssetId : null;
}

export function getNextRetryAt(attemptNumber: number) {
  const delaySeconds = BASE_RETRY_DELAY_SECONDS * 2 ** Math.max(attemptNumber - 1, 0);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
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

export async function loadPublishMediaAssets(
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

  return [{ id: mediaAsset.id, fileName: mediaAsset.file_name, mimeType: mediaAsset.mime_type, sizeBytes: mediaAsset.size_bytes, storagePath: mediaAsset.storage_path, data: await downloadResponse.data.arrayBuffer(), publicUrl: signedUrlResponse.data.signedUrl }];
}

function summarizeFailure(results: PlatformPublishResult[]) {
  return results.filter((result) => result.status !== "published").map((result) => `${result.platform}: ${result.errorMessage ?? result.providerMessage}`).join(" | ");
}

async function notifyPublishFailure(supabaseAdmin: ReturnType<typeof getSupabaseAdminClient>, post: ScheduledPostRecord, attemptId: string, failureSummary: string | null) {
  await supabaseAdmin.from("webhook_events").insert({ organization_id: post.organization_id, event_type: "publish-failed", payload: { scheduledPostId: post.id, attemptId, failureSummary }, status: "processed", response_body: { channel: "audit-log", message: "Failure notification recorded. Configure Slack/email/pager delivery outside this mock notifier." } });
}

export async function publishScheduledPost(post: ScheduledPostRecord) {
  const supabaseAdmin = getSupabaseAdminClient();

  if (!["scheduled", "retrying", "failed"].includes(post.status)) throw new Error(`Scheduled post cannot be published from status '${post.status}'.`);
  if (post.publish_attempts >= MAX_PUBLISH_ATTEMPTS) throw new Error(`Scheduled post exceeded the ${MAX_PUBLISH_ATTEMPTS} attempt retry limit.`);

  const mediaAssetId = getMediaAssetId(post.metadata);
  const mediaAssets = await loadPublishMediaAssets(supabaseAdmin, post.organization_id, post.id, mediaAssetId);
  const attachedMediaAssetId = mediaAssets[0]?.id ?? mediaAssetId;
  const mediaUrls = mediaAssets.flatMap((mediaAsset) => (mediaAsset.publicUrl ? [mediaAsset.publicUrl] : []));
  const attemptNumber = post.publish_attempts + 1;

  const attemptResponse = await supabaseAdmin.from("publish_attempts").insert({ organization_id: post.organization_id, scheduled_post_id: post.id, attempt_number: attemptNumber, status: "running", payload: { source: "vercel-cron-publisher", selectedPlatforms: post.selected_platforms, scheduledAt: post.scheduled_at, mediaAssetId: attachedMediaAssetId, mediaUrls } }).select("id").single();
  if (attemptResponse.error || !attemptResponse.data) throw new Error(attemptResponse.error?.message || "Unable to create publish attempt.");

  await supabaseAdmin.from("scheduled_posts").update({ status: "publishing", publish_attempts: attemptNumber, last_error: null, next_retry_at: null }).eq("id", post.id).in("status", ["scheduled", "retrying", "failed"]);

  const results = await publishToSelectedPlatforms({ id: post.id, message: post.message, scheduledAt: post.scheduled_at, selectedPlatforms: post.selected_platforms, mediaAssets, mediaUrls, location: post.location ?? undefined });
  const allPublished = results.length > 0 && results.every((result) => result.status === "published");
  const canRetry = !allPublished && attemptNumber < MAX_PUBLISH_ATTEMPTS;
  const finalStatus = allPublished ? "published" : canRetry ? "retrying" : "failed";
  const failureSummary = allPublished ? null : summarizeFailure(results);
  const nextRetryAt = canRetry ? getNextRetryAt(attemptNumber) : null;

  await supabaseAdmin.from("platform_results").insert(results.map((result) => ({ organization_id: post.organization_id, publish_attempt_id: attemptResponse.data.id, platform: result.platform, status: result.status === "published" ? "published" : canRetry ? "retrying" : "failed", provider_id: result.providerId ?? result.requestId, raw_response: { responseCode: result.responseCode, requestId: result.requestId, providerMessage: result.providerMessage, rawResponse: result.rawResponse ?? null }, error_message: result.status === "published" ? null : result.errorMessage ?? result.providerMessage })));
  await supabaseAdmin.from("publish_attempts").update({ status: allPublished ? "success" : "failed", completed_at: new Date().toISOString(), error_message: failureSummary, payload: { source: "vercel-cron-publisher", selectedPlatforms: post.selected_platforms, scheduledAt: post.scheduled_at, mediaAssetId: attachedMediaAssetId, mediaUrls, results, nextRetryAt } }).eq("id", attemptResponse.data.id);
  await supabaseAdmin.from("scheduled_posts").update({ status: finalStatus, last_error: failureSummary, next_retry_at: nextRetryAt }).eq("id", post.id);

  if (!allPublished) await notifyPublishFailure(supabaseAdmin, post, attemptResponse.data.id, failureSummary);

  return { scheduledPostId: post.id, attemptId: attemptResponse.data.id, status: finalStatus, results, nextRetryAt };
}
