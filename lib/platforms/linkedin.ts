import { createMockPublishResult, type PlatformAdapter } from "./types";

export const linkedinAdapter: PlatformAdapter = {
  platform: "linkedin",
  async publish(request) {
    return createMockPublishResult("linkedin", "published", `Mock publish queued for ${request.platform} using LinkedIn adapter.`);
  },
};
