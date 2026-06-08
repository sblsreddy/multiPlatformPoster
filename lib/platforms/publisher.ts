import { platformRegistry } from "./index";
import type { PlatformName, PlatformPublishRequest, PlatformPublishResult, PublishMediaAsset } from "./types";

const adaptersByPlatform = new Map(platformRegistry.map((adapter) => [adapter.platform, adapter]));

export interface PublishScheduledPostInput {
  id: string;
  message: string;
  scheduledAt: string;
  selectedPlatforms: PlatformName[];
  mediaUrls?: string[];
  mediaAssets?: PublishMediaAsset[];
  location?: string;
}

export async function publishToSelectedPlatforms(input: PublishScheduledPostInput): Promise<PlatformPublishResult[]> {
  const results: PlatformPublishResult[] = [];

  for (const platform of input.selectedPlatforms) {
    const adapter = adaptersByPlatform.get(platform);

    if (!adapter) {
      results.push({
        platform,
        status: "failed",
        providerMessage: `No adapter is registered for ${platform}.`,
        requestId: `missing-adapter-${platform}-${Date.now()}`,
        responseCode: 500,
        errorMessage: `No adapter is registered for ${platform}.`,
      });
      continue;
    }

    const request: PlatformPublishRequest = {
      platform,
      message: input.message,
      scheduledFor: input.scheduledAt,
      mediaUrls: input.mediaUrls,
      mediaAssets: input.mediaAssets,
      location: input.location,
    };

    try {
      results.push(await adapter.publish(request));
    } catch (error) {
      const providerMessage = error instanceof Error ? error.message : `Unexpected ${platform} publish failure.`;

      results.push({
        platform,
        status: "failed",
        providerMessage,
        requestId: `exception-${platform}-${Date.now()}`,
        responseCode: 500,
        errorMessage: providerMessage,
      });
    }
  }

  return results;
}
