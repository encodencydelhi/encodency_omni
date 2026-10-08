import { apiClient } from "@/lib/api/client";

/** Wire shapes of `/super-admin/jobs/*` (backend: super-admin-jobs-ops.service.ts). */
export type WireJobState = "waiting" | "active" | "delayed" | "completed" | "failed" | "paused" | "waiting-children" | "prioritized" | "unknown";
export type WireFailure = "transient_network" | "provider_rate_limit" | "provider_authorization" | "permanent_validation" | "dependency_unavailable" | "execution_timeout" | "resource_limit" | "duplicate_idempotency" | "unknown";

export interface WireQueueOverview {
  queue: string;
  reachable: boolean;
  error?: string;
  paused?: boolean;
  counts?: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  workers?: number;
  oldestWaitingAt?: string | null;
  jobNames?: string[];
  maxAttempts?: number | null;
  exhaustedRecently?: number;
  retryWaiting?: number;
}

export interface WireJobSummary {
  key: string;
  id: string;
  queue: string;
  name: string;
  state: WireJobState;
  priority: number;
  attemptsMade: number;
  maxAttempts: number;
  createdAt: string | null;
  processedAt: string | null;
  finishedAt: string | null;
  runAt: string | null;
  failedReason: string | null;
  failure: WireFailure | null;
  companyId: string | null;
  companyName: string | null;
  clientId: string | null;
  clientName: string | null;
  retryable: boolean;
  cancellable: boolean;
}

export interface WireJobAttempt {
  attemptNumber: number;
  result: "failed" | "succeeded" | "unknown";
  errorMessage: string | null;
  failure: WireFailure | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface WireJobDetail extends WireJobSummary {
  attempts: WireJobAttempt[];
  payload: Record<string, unknown> | null;
  returnValue: string | number | boolean | null;
}

export interface WireSchedule {
  id: string;
  queue: string;
  name: string;
  kind: "repeat" | "delayed";
  runAt: string | null;
  recurrence: string | null;
  timezone: string | null;
  jobKey: string | null;
  companyId: string | null;
  companyName: string | null;
  clientId: string | null;
  clientName: string | null;
  attemptsMade: number;
}

export interface WireWorker {
  id: string;
  queue: string;
  address: string | null;
  name: string | null;
  connectedSeconds: number;
  idleSeconds: number;
}

export interface WireActivity {
  id: string;
  at: string;
  action: string;
  queue: string | null;
  jobKey: string | null;
  jobName: string | null;
  reason: string | null;
  actor: string;
  outcome: "SUCCESS" | "FAILURE";
}

export interface WireTrendDay {
  date: string;
  completed: number;
  failed: number;
  started: number;
}

export interface ListJobsParams {
  queue?: string;
  state?: string;
  search?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}

const BASE = "/super-admin/jobs";

export const jobsOpsApi = {
  queues: () => apiClient.request<{ queues: WireQueueOverview[] }>({ method: "GET", path: `${BASE}/queues` }),
  list: (params: ListJobsParams = {}) =>
    apiClient.request<{ items: WireJobSummary[]; total: number; page: number; limit: number; unreachableQueues: number }>({
      method: "GET",
      path: `${BASE}/list`,
      query: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "")) as Record<string, string | number>,
    }),
  job: (key: string) => apiClient.request<WireJobDetail>({ method: "GET", path: `${BASE}/item/${encodeURIComponent(key)}` }),
  schedules: () => apiClient.request<{ items: WireSchedule[] }>({ method: "GET", path: `${BASE}/schedules` }),
  workers: () => apiClient.request<{ items: WireWorker[] }>({ method: "GET", path: `${BASE}/workers` }),
  trend: (days = 14) => apiClient.request<{ items: WireTrendDay[] }>({ method: "GET", path: `${BASE}/trend`, query: { days } }),
  activity: () => apiClient.request<{ items: WireActivity[] }>({ method: "GET", path: `${BASE}/activity` }),
  retry: (key: string, reason: string) =>
    apiClient.request<WireJobDetail>({ method: "POST", path: `${BASE}/item/${encodeURIComponent(key)}/retry`, body: { reason } }),
  cancel: (key: string, reason: string) =>
    apiClient.request<{ key: string; cancelled: true }>({ method: "POST", path: `${BASE}/item/${encodeURIComponent(key)}/cancel`, body: { reason } }),
  setPaused: (queue: string, paused: boolean, reason: string) =>
    apiClient.request<{ queue: string; paused: boolean }>({ method: "POST", path: `${BASE}/queues/${encodeURIComponent(queue)}/${paused ? "pause" : "resume"}`, body: { reason } }),
};
