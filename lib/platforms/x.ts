import { createMockPublishResult, type PlatformAdapter } from "./types";

export const xAdapter: PlatformAdapter = {
  platform: "x",
  async publish(request) {
    return createMockPublishResult("x", "published", `Mock publish queued for ${request.platform} using X adapter.`);
  },
};
