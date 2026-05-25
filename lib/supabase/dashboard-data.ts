import { createSupabaseServerClient } from "./server";

export type DashboardMetrics = {
  totalPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  publishingPosts: number;
  publishedPosts: number;
  failedPosts: number;
  activeCampaigns: number;
  uniquePlatforms: number;
};

export type DashboardPost = {
  id: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  timezone: string | null;
  location: string | null;
  selectedPlatforms: string[];
  lastError: string | null;
  publishAttempts: number;
  campaignId: string | null;
  campaignName: string | null;
};

export type DashboardAttempt = {
  id: string;
  scheduledPostId: string;
  scheduledPostTitle: string;
  status: string;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type DashboardCampaign = {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  nextPostCount: number;
};

export type DashboardAuditLog = {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export type DashboardData = {
  configured: boolean;
  authenticated: boolean;
  organizationId: string | null;
  metrics: DashboardMetrics;
  campaigns: DashboardCampaign[];
  posts: DashboardPost[];
  recentAttempts: DashboardAttempt[];
  failedPosts: DashboardPost[];
  auditLogs: DashboardAuditLog[];
};

const emptyMetrics: DashboardMetrics = {
  totalPosts: 0,
  draftPosts: 0,
  scheduledPosts: 0,
  publishingPosts: 0,
  publishedPosts: 0,
  failedPosts: 0,
  activeCampaigns: 0,
  uniquePlatforms: 0,
};

const fallbackData: DashboardData = {
  configured: false,
  authenticated: false,
  organizationId: null,
  metrics: emptyMetrics,
  campaigns: [],
  posts: [],
  recentAttempts: [],
  failedPosts: [],
  auditLogs: [],
};

function isConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function getArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => getString(entry));
}

function getMetadata(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

async function getOrganizationId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const userResponse = await supabase.auth.getUser();

  if (userResponse.error || !userResponse.data.user) {
    return null;
  }

  const profileResponse = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userResponse.data.user.id)
    .maybeSingle();

  if (profileResponse.data?.organization_id) {
    return getString(profileResponse.data.organization_id);
  }

  const membershipResponse = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userResponse.data.user.id)
    .maybeSingle();

  return getString(membershipResponse.data?.organization_id);
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!isConfigured()) {
    return fallbackData;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const organizationId = await getOrganizationId(supabase);

    if (!organizationId) {
      return { ...fallbackData, configured: true, authenticated: false };
    }

    const [campaignsResponse, postsResponse, attemptsResponse, auditLogsResponse] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, name, status, objective, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("scheduled_posts")
        .select(
          "id, title, status, scheduled_at, timezone, location, selected_platforms, last_error, publish_attempts, campaign_id",
        )
        .eq("organization_id", organizationId)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("publish_attempts")
        .select("id, scheduled_post_id, status, error_message, started_at, completed_at")
        .eq("organization_id", organizationId)
        .order("started_at", { ascending: false })
        .limit(25),
      supabase
        .from("audit_logs")
        .select("id, action, resource_type, metadata, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (campaignsResponse.error || postsResponse.error || attemptsResponse.error || auditLogsResponse.error) {
      return { ...fallbackData, configured: true, authenticated: true, organizationId };
    }

    const campaigns = (campaignsResponse.data ?? []).map((campaign) => {
      const campaignId = getString(campaign.id);
      const nextPostCount = (postsResponse.data ?? []).filter((post) => getString(post.campaign_id) === campaignId).length;

      return {
        id: campaignId,
        name: getString(campaign.name),
        status: getString(campaign.status),
        objective: getNullableString(campaign.objective),
        nextPostCount,
      } as DashboardCampaign;
    });

    const posts = (postsResponse.data ?? []).map((post) => ({
      id: getString(post.id),
      title: getString(post.title),
      status: getString(post.status),
      scheduledAt: formatDate(post.scheduled_at),
      timezone: getNullableString(post.timezone),
      location: getNullableString(post.location),
      selectedPlatforms: getArray(post.selected_platforms),
      lastError: getNullableString(post.last_error),
      publishAttempts: getNumber(post.publish_attempts),
      campaignId: getNullableString(post.campaign_id),
      campaignName: null,
    }) as DashboardPost);

    const attempts = (attemptsResponse.data ?? []).map((attempt) => {
      const scheduledPost = posts.find((post) => post.id === getString(attempt.scheduled_post_id));

      return {
        id: getString(attempt.id),
        scheduledPostId: getString(attempt.scheduled_post_id),
        scheduledPostTitle: scheduledPost?.title ?? "Unknown post",
        status: getString(attempt.status),
        errorMessage: getNullableString(attempt.error_message),
        startedAt: formatDate(attempt.started_at),
        completedAt: formatDate(attempt.completed_at),
      } as DashboardAttempt;
    });

    const auditLogs = (auditLogsResponse.data ?? []).map((log) => ({
      id: getString(log.id),
      action: getString(log.action),
      resourceType: getString(log.resource_type),
      createdAt: formatDate(log.created_at) ?? getString(log.created_at),
      metadata: getMetadata(log.metadata),
    }) as DashboardAuditLog);

    const uniquePlatforms = Array.from(new Set(posts.flatMap((post) => post.selectedPlatforms)));

    const metrics: DashboardMetrics = {
      totalPosts: posts.length,
      draftPosts: posts.filter((post) => post.status === "draft").length,
      scheduledPosts: posts.filter((post) => post.status === "scheduled").length,
      publishingPosts: posts.filter((post) => post.status === "publishing").length,
      publishedPosts: posts.filter((post) => post.status === "published").length,
      failedPosts: posts.filter((post) => post.status === "failed" || Boolean(post.lastError)).length,
      activeCampaigns: campaigns.filter((campaign) => campaign.status !== "archived").length,
      uniquePlatforms: uniquePlatforms.length,
    };

    return {
      configured: true,
      authenticated: true,
      organizationId,
      metrics,
      campaigns,
      posts,
      recentAttempts: attempts.slice(0, 8),
      failedPosts: posts.filter((post) => post.status === "failed" || Boolean(post.lastError)).slice(0, 6),
      auditLogs,
    };
  } catch {
    return fallbackData;
  }
}
