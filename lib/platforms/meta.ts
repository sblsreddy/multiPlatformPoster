import { createMockPublishResult, type PlatformAdapter } from "./types";

export const metaAdapter: PlatformAdapter = {
  platform: "facebook",
  async publish(request) {
    return createMockPublishResult("facebook", "published", `Mock publish queued for ${request.platform} using Meta adapter.`);
  },
};

export const instagramAdapter: PlatformAdapter = {
  platform: "instagram",
  async publish(request) {
    return createMockPublishResult("instagram", "published", `Mock publish queued for ${request.platform} using Meta adapter.`);
  },
};
