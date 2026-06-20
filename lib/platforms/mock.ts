import { createMockPublishResult, type PlatformAdapter } from "./types";

export const mockPublisherAdapter: PlatformAdapter = {
  platform: "facebook",
  async publish(request) {
    return createMockPublishResult(
      request.platform,
      "published",
      `Mock publisher accepted ${request.platform} post scheduled for ${request.scheduledFor}.`,
    );
  },
};
