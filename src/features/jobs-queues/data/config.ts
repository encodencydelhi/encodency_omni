import { isMockMode } from "@/config/env";
import type {
  JobLifecycleState,
  QueueOperationalState,
  WorkerLiveness,
  ScheduleState,
  FailureClassification,
  RetryRequestState,
  RetryEligibility,
} from "./types";

export const JOB_LIFECYCLE_META: Record<
  JobLifecycleState,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  scheduled: { label: "Scheduled", tone: "info", description: "Job is scheduled for future execution." },
  waiting: { label: "Waiting", tone: "neutral", description: "Job is waiting in queue for a worker." },
  ready: { label: "Ready", tone: "info", description: "Job is ready to be picked up by a worker." },
  running: { label: "Running", tone: "info", description: "Job is actively being processed." },
  retry_waiting: { label: "Retry Waiting", tone: "warning", description: "Job is waiting before its next retry attempt." },
  succeeded: { label: "Succeeded", tone: "success", description: "Job completed successfully." },
  failed: { label: "Failed", tone: "danger", description: "Job has permanently failed after exhausting attempts." },
  cancelled: { label: "Cancelled", tone: "neutral", description: "Job was cancelled by an administrator." },
  dead_lettered: { label: "Dead Lettered", tone: "danger", description: "Job moved to dead-letter queue after exhausting retries." },
};

export const QUEUE_STATE_META: Record<
  QueueOperationalState,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }
> = {
  running: { label: "Running", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  draining: { label: "Draining", tone: "info" },
  unknown: { label: "Unknown", tone: "neutral" },
};

export const WORKER_LIVENESS_META: Record<
  WorkerLiveness,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  online: { label: "Online", tone: "success", description: "Worker heartbeat is fresh." },
  stale: { label: "Stale", tone: "warning", description: "Worker heartbeat is older than expected interval." },
  offline: { label: "Offline", tone: "danger", description: "No heartbeat received within threshold." },
  unknown: { label: "Unknown", tone: "neutral", description: "Worker liveness cannot be determined." },
};

export const SCHEDULE_STATE_META: Record<
  ScheduleState,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }
> = {
  upcoming: { label: "Upcoming", tone: "info" },
  due: { label: "Due", tone: "warning" },
  dispatched: { label: "Dispatched", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  missed: { label: "Missed", tone: "danger" },
};

export const FAILURE_CLASSIFICATION_META: Record<
  FailureClassification,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  transient_network: { label: "Network Error", tone: "warning", description: "Temporary network connectivity issue." },
  provider_rate_limit: { label: "Rate Limited", tone: "warning", description: "Provider rate limit was exceeded." },
  provider_authorization: { label: "Auth Required", tone: "danger", description: "Provider authorization token is invalid or expired." },
  permanent_validation: { label: "Validation Error", tone: "danger", description: "Invalid payload or configuration. Non-retryable." },
  dependency_unavailable: { label: "Dependency Down", tone: "warning", description: "Required dependency service is unavailable." },
  execution_timeout: { label: "Timeout", tone: "warning", description: "Job execution exceeded the time limit." },
  resource_limit: { label: "Resource Limit", tone: "danger", description: "System resource limit reached." },
  duplicate_idempotency: { label: "Duplicate", tone: "neutral", description: "Idempotency conflict detected." },
  unknown: { label: "Unknown", tone: "neutral", description: "Failure cause could not be determined." },
};

export const RETRY_REQUEST_STATE_META: Record<
  RetryRequestState,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_approval: { label: "Pending Approval", tone: "warning" },
  accepted: { label: "Accepted", tone: "info" },
  rejected: { label: "Rejected", tone: "danger" },
  executed: { label: "Executed", tone: "success" },
};

export const RETRY_ELIGIBILITY_META: Record<
  RetryEligibility,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  retryable: { label: "Retryable", tone: "success", description: "Job is eligible for retry based on policy." },
  non_retryable: { label: "Non-Retryable", tone: "danger", description: "Job failure is permanent and cannot be retried." },
  unknown: { label: "Unknown", tone: "neutral", description: "Retry eligibility cannot be determined." },
};

export const MOCK_ENVIRONMENT = "development" as const;
/** Single mock flag for this feature, same pattern as `COMPANIES_MOCK_MODE`. */
export const JOBS_MOCK_MODE = isMockMode;
export const JOBS_DATA_SOURCE = isMockMode
  ? "Demo Job Data"
  : "Live Redis queue stats · demo job records";
/** No worker-liveness API exists in either mode. */
export const JOBS_WORKER_STATUS = "Worker Backend Not Connected";

export const TIME_PERIOD_OPTIONS = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
] as const;

export const JOB_PRIORITY_META: Record<string, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  high: { label: "High", tone: "danger" },
  normal: { label: "Normal", tone: "neutral" },
  low: { label: "Low", tone: "info" },
};
