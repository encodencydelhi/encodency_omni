import type { EntityRef, StatusRegistry } from "@/types/common";

export const JOB_QUEUE = {
  scheduled_posts: { label: "Scheduled Posts", tone: "neutral" },
  seo_crawls: { label: "SEO Crawls", tone: "neutral" },
  analytics_sync: { label: "Analytics Sync", tone: "neutral" },
  reports: { label: "Reports", tone: "neutral" },
  whatsapp_campaigns: { label: "WhatsApp Campaigns", tone: "neutral" },
  webhook_processing: { label: "Webhook Processing", tone: "neutral" },
  notifications: { label: "Notifications", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type JobQueue = keyof typeof JOB_QUEUE;

export const JOB_STATUS = {
  queued: { label: "Queued", tone: "neutral" },
  processing: { label: "Processing", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  retrying: { label: "Retrying", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
} as const satisfies StatusRegistry<string>;

export type JobStatus = keyof typeof JOB_STATUS;

export interface Job {
  id: string;
  queue: JobQueue;
  name: string;
  status: JobStatus;
  company: EntityRef | null;
  project: string | null;
  attempts: number;
  maxAttempts: number;
  durationMs: number | null;
  errorMessage: string | null;
  payload: Record<string, string | number | boolean>;
  enqueuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  nextRetryAt: string | null;
}

export interface JobFilters {
  queue: JobQueue;
  status: JobStatus;
  companyId: string;
}

export type JobSortField = "enqueuedAt" | "queue" | "status" | "durationMs" | "attempts";

export interface QueueStats {
  queue: JobQueue;
  queued: number;
  processing: number;
  completedLast24h: number;
  failedLast24h: number;
  retrying: number;
  averageDurationMs: number;
  drainEtaSeconds: number | null;
  isPaused: boolean;
}
