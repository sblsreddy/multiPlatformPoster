import { NextResponse } from "next/server";
import { getAuthenticatedUser, getUserOrganizationId } from "@/lib/supabase/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { publishScheduledPost, type ScheduledPostRecord } from "@/lib/publisher/scheduled-posts";

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

    const result = await publishScheduledPost(postResponse.data as ScheduledPostRecord);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected publish failure." },
      { status: 500 },
    );
  }
}
