import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MAX_PUBLISH_ATTEMPTS, publishScheduledPost, type ScheduledPostRecord } from "@/lib/publisher/scheduled-posts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const limit = Number(process.env.CRON_PUBLISH_BATCH_SIZE ?? "10");

  const dueResponse = await supabaseAdmin
    .from("scheduled_posts")
    .select("id, organization_id, message, scheduled_at, selected_platforms, location, status, publish_attempts, metadata")
    .or(`and(status.eq.scheduled,scheduled_at.lte.${now}),and(status.eq.retrying,next_retry_at.lte.${now})`)
    .lt("publish_attempts", MAX_PUBLISH_ATTEMPTS)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (dueResponse.error) {
    return NextResponse.json({ error: dueResponse.error.message }, { status: 500 });
  }

  const posts = (dueResponse.data ?? []) as ScheduledPostRecord[];
  const results = [];

  for (const post of posts) {
    try {
      results.push(await publishScheduledPost(post));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected cron publish failure.";

      await supabaseAdmin
        .from("scheduled_posts")
        .update({ status: "failed", last_error: message, next_retry_at: null })
        .eq("id", post.id);

      await supabaseAdmin.from("webhook_events").insert({
        organization_id: post.organization_id,
        event_type: "publish-cron-error",
        payload: { scheduledPostId: post.id, message },
        status: "failed",
        response_body: { message },
      });

      results.push({ scheduledPostId: post.id, status: "failed", error: message });
    }
  }

  return NextResponse.json({ processed: posts.length, results });
}
