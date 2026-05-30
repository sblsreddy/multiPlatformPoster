import { createMockPublishResult, type PlatformAdapter, type PlatformPublishResult } from "./types";

interface MetaErrorResponse {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface FacebookFeedResponse extends MetaErrorResponse {
  id?: string;
  post_id?: string;
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}. Add it to the server environment before publishing to Facebook.`);
  }

  return value;
}

function getMetaGraphVersion() {
  return process.env.META_GRAPH_API_VERSION || "v24.0";
}

function formatMetaError(response: FacebookFeedResponse, fallback: string) {
  if (!response.error) {
    return fallback;
  }

  const details = [
    response.error.message,
    response.error.type ? `type=${response.error.type}` : null,
    response.error.code ? `code=${response.error.code}` : null,
    response.error.error_subcode ? `subcode=${response.error.error_subcode}` : null,
    response.error.fbtrace_id ? `trace=${response.error.fbtrace_id}` : null,
  ].filter(Boolean);

  return details.join("; ") || fallback;
}

async function publishFacebookFeedPost(message: string): Promise<PlatformPublishResult> {
  const pageId = getRequiredEnv("FACEBOOK_PAGE_ID");
  const pageAccessToken = getRequiredEnv("FACEBOOK_PAGE_ACCESS_TOKEN");
  const graphVersion = getMetaGraphVersion();
  const endpoint = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/feed`;
  const body = new URLSearchParams({
    message,
    access_token: pageAccessToken,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const responseBody = (await response.json()) as FacebookFeedResponse;

  if (!response.ok || responseBody.error) {
    const providerMessage = formatMetaError(responseBody, `Facebook Graph API returned HTTP ${response.status}.`);

    return {
      platform: "facebook",
      status: "failed",
      providerMessage,
      requestId: responseBody.error?.fbtrace_id ?? `facebook-${Date.now()}`,
      responseCode: response.status,
      rawResponse: responseBody,
      errorMessage: providerMessage,
    };
  }

  const providerId = responseBody.id ?? responseBody.post_id;

  return {
    platform: "facebook",
    status: "published",
    providerMessage: providerId
      ? `Facebook Page post published successfully as ${providerId}.`
      : "Facebook Page post published successfully.",
    requestId: providerId ?? `facebook-${Date.now()}`,
    responseCode: response.status,
    providerId,
    rawResponse: responseBody,
  };
}

export const metaAdapter: PlatformAdapter = {
  platform: "facebook",
  async publish(request) {
    return publishFacebookFeedPost(request.message);
  },
};

export const instagramAdapter: PlatformAdapter = {
  platform: "instagram",
  async publish(request) {
    return createMockPublishResult("instagram", "published", `Mock publish queued for ${request.platform} using Meta adapter.`);
  },
};
