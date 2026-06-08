export type PlatformName = "facebook" | "instagram" | "linkedin" | "tiktok" | "x";

export type PublishStatus = "published" | "failed" | "retrying";

export interface PublishMediaAsset {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  data: ArrayBuffer;
}

export interface PlatformPublishRequest {
  platform: PlatformName;
  message: string;
  scheduledFor: string;
  mediaUrls?: string[];
  mediaAssets?: PublishMediaAsset[];
  location?: string;
}

export interface PlatformPublishResult {
  platform: PlatformName;
  status: PublishStatus;
  providerMessage: string;
  requestId: string;
  responseCode: number;
  providerId?: string;
  rawResponse?: unknown;
  errorMessage?: string;
}

export interface PlatformAdapter {
  platform: PlatformName;
  publish(request: PlatformPublishRequest): Promise<PlatformPublishResult>;
}

export function createMockPublishResult(
  platform: PlatformName,
  status: PublishStatus = "published",
  providerMessage = "Mock publish completed. Replace with official provider API in Phase 3.",
): PlatformPublishResult {
  return {
    platform,
    status,
    providerMessage,
    requestId: `mock-${platform}-${Date.now()}`,
    responseCode: status === "published" ? 200 : 500,
  };
}
