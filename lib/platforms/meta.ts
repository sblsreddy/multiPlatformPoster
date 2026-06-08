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

interface FacebookPhotoUploadResponse extends MetaErrorResponse {
  id?: string;
}

interface FacebookPhotoFeedResponse extends MetaErrorResponse {
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

async function uploadFacebookPhotoForFeed(mediaAsset: PublishMediaAsset) {
  const pageId = getRequiredEnv("FACEBOOK_PAGE_ID");
  const pageAccessToken = getRequiredEnv("FACEBOOK_PAGE_ACCESS_TOKEN");
  const graphVersion = getMetaGraphVersion();
  const endpoint = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/photos`;
  const formData = new FormData();

  formData.set("published", "false");
  formData.set("access_token", pageAccessToken);
  formData.set("source", new Blob([mediaAsset.data], { type: mediaAsset.mimeType }), mediaAsset.fileName);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  const responseBody = await readMetaJson<FacebookPhotoUploadResponse>(response);

  return {
    response,
    responseBody,
  };
}

async function publishFacebookFeedPostWithPhoto(message: string, photoId: string) {
  const pageId = getRequiredEnv("FACEBOOK_PAGE_ID");
  const pageAccessToken = getRequiredEnv("FACEBOOK_PAGE_ACCESS_TOKEN");
  const graphVersion = getMetaGraphVersion();
  const endpoint = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/feed`;
  const body = new URLSearchParams({
    message,
    "attached_media[0]": JSON.stringify({ media_fbid: photoId }),
    access_token: pageAccessToken,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const responseBody = await readMetaJson<FacebookPhotoFeedResponse>(response);

  return {
    response,
    responseBody,
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

  if (mediaAsset.data.byteLength === 0) {
    const providerMessage = `Facebook image publishing cannot upload '${mediaAsset.fileName}' because the Supabase file is empty.`;

    return {
      platform: "facebook",
      status: "failed",
      providerMessage,
      requestId: `facebook-empty-media-${Date.now()}`,
      responseCode: 400,
      errorMessage: providerMessage,
      rawResponse: {
        mediaAssetId: mediaAsset.id,
        storagePath: mediaAsset.storagePath,
      },
    };
  }

  const uploadResult = await uploadFacebookPhotoForFeed(mediaAsset);

  if (!uploadResult.response.ok || uploadResult.responseBody.error) {
    return createFacebookFailure(
      uploadResult.responseBody,
      uploadResult.response.status,
      `Facebook photo upload returned HTTP ${uploadResult.response.status}.`,
      {
        ...uploadResult.responseBody,
        mediaAssetId: mediaAsset.id,
        storagePath: mediaAsset.storagePath,
      },
    );
  }

  if (!uploadResult.responseBody.id) {
    const providerMessage = "Facebook photo upload succeeded but did not return a photo ID to attach to the Page feed post.";

    return {
      platform: "facebook",
      status: "failed",
      providerMessage,
      requestId: `facebook-missing-photo-id-${Date.now()}`,
      responseCode: uploadResult.response.status,
      errorMessage: providerMessage,
      rawResponse: {
        ...uploadResult.responseBody,
        mediaAssetId: mediaAsset.id,
        storagePath: mediaAsset.storagePath,
      },
    };
  }

  const feedResult = await publishFacebookFeedPostWithPhoto(message, uploadResult.responseBody.id);

  if (!feedResult.response.ok || feedResult.responseBody.error) {
    return createFacebookFailure(
      feedResult.responseBody,
      feedResult.response.status,
      `Facebook feed post with attached photo returned HTTP ${feedResult.response.status}.`,
      {
        ...feedResult.responseBody,
        uploadedPhotoId: uploadResult.responseBody.id,
        mediaAssetId: mediaAsset.id,
        storagePath: mediaAsset.storagePath,
      },
    );
  }

  const providerId = feedResult.responseBody.post_id ?? feedResult.responseBody.id;

  return {
    platform: "facebook",
    status: "published",
    providerMessage: providerId
      ? `Facebook Page feed post with image published successfully as ${providerId}.`
      : "Facebook Page feed post with image published successfully.",
    requestId: providerId ?? `facebook-photo-feed-${Date.now()}`,
    responseCode: feedResult.response.status,
    providerId,
    rawResponse: {
      ...feedResult.responseBody,
      uploadedPhotoId: uploadResult.responseBody.id,
      mediaAssetId: mediaAsset.id,
      storagePath: mediaAsset.storagePath,
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
