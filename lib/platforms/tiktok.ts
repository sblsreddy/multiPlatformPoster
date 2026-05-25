import { createMockPublishResult, type PlatformAdapter } from "./types";

export const tiktokAdapter: PlatformAdapter = {
  platform: "tiktok",
  async publish(request) {
    return createMockPublishResult("tiktok", "published", `Mock publish queued for ${request.platform} using TikTok adapter.`);
  },
};
