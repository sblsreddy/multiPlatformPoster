import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, getUserOrganizationId } from "@/lib/supabase/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const platformSchema = z.enum(["facebook", "instagram", "linkedin", "tiktok", "x"]);

const createPostSchema = z.object({
  title: z.string().min(3),
  message: z.string().min(10),
  location: z.string().min(2),
  timezone: z.string().min(2),
  scheduledAt: z.string().min(1),
  selectedPlatforms: z.array(platformSchema).min(1),
  status: z.enum(["draft", "scheduled"]).default("scheduled"),
  dispatchWebhook: z.boolean().default(false),
  mediaAssetId: z.string().uuid().nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
});

function parseScheduledAt(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("scheduledAt must be a valid date string.");
  }

  return parsed.toISOString();
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: z.infer<typeof createPostSchema>;

    try {
      payload = createPostSchema.parse(await request.json());
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid request payload." },
        { status: 400 },
      );
    }

    const organizationId = await getUserOrganizationId(user.id, user.email);
    const scheduledAt = parseScheduledAt(payload.scheduledAt);
    const supabaseAdmin = getSupabaseAdminClient();

    if (payload.mediaAssetId) {
      const mediaResponse = await supabaseAdmin
        .from("media_assets")
        .select("id")
        .eq("id", payload.mediaAssetId)
        .eq("organization_id", organizationId)
        .single();

      if (mediaResponse.error || !mediaResponse.data) {
        return NextResponse.json(
          { error: mediaResponse.error?.message || "Attached media asset was not found for this organization." },
          { status: 400 },
        );
      }
    }

    const postResponse = await supabaseAdmin
      .from("scheduled_posts")
      .insert({
        organization_id: organizationId,
        campaign_id: payload.campaignId,
        title: payload.title,
        message: payload.message,
        location: payload.location,
        timezone: payload.timezone,
        scheduled_at: scheduledAt,
        selected_platforms: payload.selectedPlatforms,
        status: payload.status,
        metadata: {
          source: "web-app",
          mediaAssetId: payload.mediaAssetId ?? null,
        },
      })
      .select("id, status")
      .single();

    if (postResponse.error || !postResponse.data) {
      return NextResponse.json(
        { error: postResponse.error?.message || "Unable to create scheduled post." },
        { status: 500 },
      );
    }

    if (payload.mediaAssetId) {
      const mediaLinkResponse = await supabaseAdmin
        .from("media_assets")
        .update({ scheduled_post_id: postResponse.data.id })
        .eq("id", payload.mediaAssetId)
        .eq("organization_id", organizationId)
        .select("id")
        .single();

      if (mediaLinkResponse.error || !mediaLinkResponse.data) {
        return NextResponse.json(
          { error: mediaLinkResponse.error?.message || "Unable to attach media asset to scheduled post." },
          { status: 500 },
        );
      }
    }

    if (payload.status === "scheduled") {
      const attemptResponse = await supabaseAdmin
        .from("publish_attempts")
        .insert({
          organization_id: organizationId,
          scheduled_post_id: postResponse.data.id,
          attempt_number: 0,
          status: "pending",
          payload: {
            source: "web-app",
            scheduledAt,
            selectedPlatforms: payload.selectedPlatforms,
            mediaAssetId: payload.mediaAssetId ?? null,
            dispatchWebhook: payload.dispatchWebhook,
            message: "Queued for Vercel Cron publishing. n8n dispatch is intentionally disabled.",
          },
        })
        .select("id")
        .single();

      if (attemptResponse.error || !attemptResponse.data) {
        return NextResponse.json(
          { error: attemptResponse.error?.message || "Unable to create pending publish attempt." },
          { status: 500 },
        );
      }

      await supabaseAdmin.from("webhook_events").insert({
        organization_id: organizationId,
        event_type: "scheduled-post-ready",
        payload: {
          scheduledPostId: postResponse.data.id,
          organizationId,
          selectedPlatforms: payload.selectedPlatforms,
          mediaAssetId: payload.mediaAssetId ?? null,
          scheduler: "vercel-cron",
        },
        signature: null,
        status: "processed",
        response_body: { accepted: true, message: "Scheduled post will be picked up by /api/cron/publish-due." },
      });

      return NextResponse.json({
        scheduledPostId: postResponse.data.id,
        status: payload.status,
        webhookAccepted: false,
        message: "Scheduled post saved for Vercel Cron publishing. n8n dispatch is disabled.",
      });
    }


    return NextResponse.json({
      scheduledPostId: postResponse.data.id,
      status: payload.status,
      webhookAccepted: false,
      message: "Draft saved successfully. Webhook dispatch remains disabled until the post is scheduled.",
    });
  } catch (error) {
    console.error("POST /api/posts failed", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected post creation failure." },
      { status: 500 },
    );
  }
}
