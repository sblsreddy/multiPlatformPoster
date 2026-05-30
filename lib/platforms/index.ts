import { instagramAdapter, metaAdapter } from "./meta";
import { linkedinAdapter } from "./linkedin";
import { tiktokAdapter } from "./tiktok";
import { xAdapter } from "./x";

export const platformRegistry = [
  metaAdapter,
  instagramAdapter,
  linkedinAdapter,
  tiktokAdapter,
  xAdapter,
];

export type { PlatformAdapter, PlatformPublishRequest, PlatformPublishResult } from "./types";

export { instagramAdapter, metaAdapter } from "./meta";
export { linkedinAdapter } from "./linkedin";
export { tiktokAdapter } from "./tiktok";
export { xAdapter } from "./x";
