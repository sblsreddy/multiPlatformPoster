import { createMockPublishResult, type PlatformAdapter, type PlatformPublishResult, type PublishMediaAsset } from "./types";

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

interface FacebookPhotoResponse extends MetaErrorResponse {
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

function formatMetaError(response: MetaErrorResponse, fallback: string) {
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

async function readMetaJson<T extends MetaErrorResponse>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {
      error: {
        message: `Facebook Graph API returned HTTP ${response.status} with a non-JSON response.`,
      },
    } as T;
  }
}

function createFacebookFailure(
  responseBody: MetaErrorResponse,
  responseCode: number,
  fallback: string,
  rawResponse?: unknown,
): PlatformPublishResult {
  const providerMessage = formatMetaError(responseBody, fallback);

  return {
    platform: "facebook",
    status: "failed",
    providerMessage,
    requestId: responseBody.error?.fbtrace_id ?? `facebook-${Date.now()}`,
    responseCode,
    rawResponse: rawResponse ?? responseBody,
    errorMessage: providerMessage,
  };
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
  const responseBody = await readMetaJson<FacebookFeedResponse>(response);

  if (!response.ok || responseBody.error) {
    return createFacebookFailure(responseBody, response.status, `Facebook Graph API returned HTTP ${response.status}.`);
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

async function publishFacebookPhotoPost(message: string, mediaAsset: PublishMediaAsset): Promise<PlatformPublishResult> {
  if (!mediaAsset.mimeType.startsWith("image/")) {
    const providerMessage = `Facebook image publishing only supports image assets. '${mediaAsset.fileName}' is ${mediaAsset.mimeType}.`;

    return {
      platform: "facebook",
      status: "failed",
      providerMessage,
      requestId: `facebook-invalid-media-${Date.now()}`,
      responseCode: 400,
      errorMessage: providerMessage,
      rawResponse: {
        mediaAssetId: mediaAsset.id,
        mimeType: mediaAsset.mimeType,
      },
    };
  }

  const pageId = getRequiredEnv("FACEBOOK_PAGE_ID");
  const pageAccessToken = getRequiredEnv("FACEBOOK_PAGE_ACCESS_TOKEN");
  const graphVersion = getMetaGraphVersion();
  const endpoint = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/photos`;
  const formData = new FormData();

  formData.set("message", message);
  formData.set("published", "true");
  formData.set("access_token", pageAccessToken);
  formData.set("source", new Blob([mediaAsset.data], { type: mediaAsset.mimeType }), mediaAsset.fileName);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  const responseBody = await readMetaJson<FacebookPhotoResponse>(response);

  if (!response.ok || responseBody.error) {
    return createFacebookFailure(responseBody, response.status, `Facebook photo upload returned HTTP ${response.status}.`, {
      ...responseBody,
      mediaAssetId: mediaAsset.id,
    });
  }

  const providerId = responseBody.post_id ?? responseBody.id;

  return {
    platform: "facebook",
    status: "published",
    providerMessage: providerId
      ? `Facebook Page photo post published successfully as ${providerId}.`
      : "Facebook Page photo post published successfully.",
    requestId: providerId ?? `facebook-photo-${Date.now()}`,
    responseCode: response.status,
    providerId,
    rawResponse: {
      ...responseBody,
      mediaAssetId: mediaAsset.id,
    },
  };
}

export const metaAdapter: PlatformAdapter = {
  platform: "facebook",
  async publish(request) {
    const mediaAsset = request.mediaAssets?.[0];

    if (mediaAsset) {
      return publishFacebookPhotoPost(request.message, mediaAsset);
    }

    return publishFacebookFeedPost(request.message);
  },
};

export const instagramAdapter: PlatformAdapter = {
  platform: "instagram",
  async publish(request) {
    return createMockPublishResult("instagram", "published", `Mock publish queued for ${request.platform} using Meta adapter.`);
  },
};
