import { NextResponse } from "next/server";
import { z } from "zod";
import { triggerScheduledWebhook } from "@/lib/n8n/client";
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
  dispatchWebhook: z.boolean().default(true),
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

    if (payload.status === "scheduled" && payload.dispatchWebhook) {
      const attemptResponse = await supabaseAdmin
        .from("publish_attempts")
        .insert({
          organization_id: organizationId,
          scheduled_post_id: postResponse.data.id,
          attempt_number: 1,
          status: "pending",
          payload: {
            source: "web-app",
            scheduledAt,
            selectedPlatforms: payload.selectedPlatforms,
            mediaAssetId: payload.mediaAssetId ?? null,
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

      const webhookResponse = await triggerScheduledWebhook({
        scheduledPostId: postResponse.data.id,
        campaignId: payload.campaignId ?? undefined,
        organizationId,
        trigger: "scheduled-post-ready",
      });

      const webhookStatus = webhookResponse.accepted ? "processed" : "failed";

      await supabaseAdmin.from("webhook_events").insert({
        organization_id: organizationId,
        event_type: "scheduled-post-ready",
        payload: {
          scheduledPostId: postResponse.data.id,
          organizationId,
          selectedPlatforms: payload.selectedPlatforms,
        },
        signature: process.env.N8N_WEBHOOK_SECRET ?? null,
        status: webhookStatus,
        response_body: webhookResponse,
      });

      if (!webhookResponse.accepted) {
        await supabaseAdmin
          .from("scheduled_posts")
          .update({
            last_error: webhookResponse.message,
          })
          .eq("id", postResponse.data.id);

        await supabaseAdmin
          .from("publish_attempts")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: webhookResponse.message,
          })
          .eq("id", attemptResponse.data.id);

        return NextResponse.json({
          scheduledPostId: postResponse.data.id,
          status: payload.status,
          webhookAccepted: false,
          message: `Scheduled post saved, but webhook dispatch failed: ${webhookResponse.message}`,
        });
      }

      await supabaseAdmin
        .from("publish_attempts")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
        })
        .eq("id", attemptResponse.data.id);

      return NextResponse.json({
        scheduledPostId: postResponse.data.id,
        status: payload.status,
        webhookAccepted: true,
        message: "Scheduled post saved and webhook dispatched.",
      });
    }

    if (payload.status === "scheduled") {
      return NextResponse.json({
        scheduledPostId: postResponse.data.id,
        status: payload.status,
        webhookAccepted: false,
        message: "Scheduled post saved. Webhook dispatch was skipped for direct publishing.",
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
