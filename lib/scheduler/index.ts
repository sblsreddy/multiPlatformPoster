export type ScheduledPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "retrying";

export interface SchedulerEntry {
  id: string;
  scheduledAt: string;
  timezone: string;
  status: ScheduledPostStatus;
  selectedPlatforms: string[];
}

export interface SchedulerClient {
  enqueue(entry: SchedulerEntry): Promise<{ accepted: boolean; message: string }>;
  retry(entry: SchedulerEntry): Promise<{ accepted: boolean; message: string }>;
}

export const mockScheduler: SchedulerClient = {
  async enqueue(entry) {
    return {
      accepted: true,
      message: `Mock scheduler queued ${entry.id} for ${entry.scheduledAt} (${entry.timezone}).`,
    };
  },
  async retry(entry) {
    return {
      accepted: true,
      message: `Mock scheduler retry requested for ${entry.id}.`,
    };
  },
};
