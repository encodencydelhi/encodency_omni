import type { EntityRef } from "@/types/common";

export type JobLifecycleState =
  | "scheduled"
  | "waiting"
  | "ready"
  | "running"
  | "retry_waiting"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "dead_lettered";

export type QueueOperationalState = "running" | "paused" | "draining" | "unknown";

export type WorkerLiveness = "online" | "stale" | "offline" | "unknown";

export type ScheduleState = "upcoming" | "due" | "dispatched" | "cancelled" | "missed";

export type FailureClassification =
  | "transient_network"
  | "provider_rate_limit"
  | "provider_authorization"
  | "permanent_validation"
  | "dependency_unavailable"
  | "execution_timeout"
  | "resource_limit"
  | "duplicate_idempotency"
  | "unknown";

export type RetryEligibility = "retryable" | "non_retryable" | "unknown";

export type RetryRequestState = "draft" | "pending_approval" | "accepted" | "rejected" | "executed";

export interface JobAttempt {
  id: string;
  jobId: string;
  attemptNumber: number;
  workerId: string | null;
  startedAt: string;
  completedAt: string | null;
  result: "succeeded" | "failed" | "timeout" | "unknown";
  failureClassification: FailureClassification | null;
  errorMessage: string | null;
  durationMs: number | null;
}

export interface JobSchedule {
  id: string;
  jobId: string;
  scheduledAt: string;
  timezone: string;
  scheduleState: ScheduleState;
  nextEligibleExecution: string | null;
  recurrenceRule: string | null;
  relatedResourceType: string | null;
  relatedResourceId: string | null;
}

export interface JobDependency {
  jobId: string;
  dependsOnJobId: string;
  dependsOnType: "predecessor" | "parent";
  status: "waiting" | "succeeded" | "failed" | "cancelled" | "unknown";
}

export interface JobWorkflow {
  id: string;
  name: string;
  jobIds: string[];
  completionPolicy: "all_succeed" | "any_succeed";
  currentStatus: "in_progress" | "succeeded" | "failed" | "partial";
  relatedResourceType: string;
  relatedResourceId: string;
  relatedResourceName: string;
}

export interface JobRecord {
  id: string;
  type: string;
  name: string;
  queue: string;
  lifecycleState: JobLifecycleState;
  priority: "high" | "normal" | "low";
  environment: "development" | "staging" | "production";
  company: EntityRef | null;
  client: EntityRef | null;
  workflowId: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  relatedResourceType: string | null;
  relatedResourceId: string | null;
  relatedResourceName: string | null;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  failureClassification: FailureClassification | null;
  retryEligibility: RetryEligibility;
  createdAt: string;
  scheduledAt: string | null;
  enqueuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  durationMs: number | null;
  payload: Record<string, unknown>;
}

export interface QueueDefinition {
  id: string;
  name: string;
  category: string;
  purpose: string;
  operationalState: QueueOperationalState;
  jobTypes: string[];
  priorityPolicy: string;
  concurrencyReference: string;
  timeoutPolicy: string;
  retryPolicy: string;
  deadLetterPolicy: string;
  workerGroup: string;
  environment: string;
  waiting: number;
  running: number;
  delayed: number;
  failed: number;
  succeededLast24h: number;
  retryWaiting: number;
  deadLettered: number;
  oldestWaitingAt: string | null;
  registeredWorkers: number;
}

export interface WorkerRecord {
  id: string;
  group: string;
  environment: string;
  assignedQueues: string[];
  liveness: WorkerLiveness;
  lastHeartbeat: string;
  registeredAt: string;
  concurrencyCapacity: number;
  currentProcessing: number;
  currentJobIds: string[];
  recentAttempts: number;
  recentFailures: number;
}

export interface RecoveryRequest {
  id: string;
  jobId: string;
  jobType: string;
  company: EntityRef | null;
  requestedBy: string;
  requestedAt: string;
  state: RetryRequestState;
  reason: string;
  notes: string;
  proposedAction: string;
  failureClassification: FailureClassification;
  attemptsUsed: number;
  maxAttempts: number;
  idempotencyRisk: "safe" | "unknown" | "risky";
  sideEffectRisk: "safe" | "unknown" | "risky";
}

export interface QueueOperationalControl {
  id: string;
  queueId: string;
  queueName: string;
  environment: string;
  currentOperationalState: QueueOperationalState;
  proposedOperationalState: QueueOperationalState;
  waitingJobs: number;
  runningJobs: number;
  scheduledJobs: number;
  potentialWorkflowImpact: string;
  requiredAuthorization: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  state: RetryRequestState;
}

export interface JobActivity {
  id: string;
  timestamp: string;
  eventType: string;
  jobId: string | null;
  queue: string | null;
  actor: string;
  result: string;
  details: string;
  relatedReference: string | null;
}

export interface JobsKpis {
  totalJobs: number;
  waiting: number;
  scheduled: number;
  running: number;
  retryWaiting: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
  activeQueues: number;
  totalWorkers: number;
  onlineWorkers: number;
  staleWorkers: number;
  offlineWorkers: number;
}

export interface ProcessingTrendPoint {
  date: string;
  completed: number;
  failed: number;
  started: number;
  retriesScheduled: number;
}

export interface JobsOverviewData {
  kpis: JobsKpis;
  processingTrend: ProcessingTrendPoint[];
  queues: QueueDefinition[];
  failuresRequiringAttention: JobRecord[];
  upcomingScheduled: JobRecord[];
  workers: WorkerRecord[];
  recentActivity: JobActivity[];
}
