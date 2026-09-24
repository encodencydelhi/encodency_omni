import type {
  JobRecord,
  JobAttempt,
  JobSchedule,
  JobWorkflow,
  JobDependency,
  QueueDefinition,
  QueueStats,
  WorkerRecord,
  RecoveryRequest,
  QueueOperationalControl,
  JobActivity,
  JobsOverviewData,
  ProcessingTrendPoint,
  RetryRequestState,
} from "../types";
import {
  JOBS_DATA,
  ATTEMPTS_DATA,
  SCHEDULES_DATA,
  WORKFLOWS_DATA,
  DEPENDENCIES_DATA,
  QUEUES_DATA,
  WORKERS_DATA,
  RECOVERY_REQUESTS_DATA,
  ACTIVITY_DATA,
  PROCESSING_TREND,
  getOverviewData,
} from "./dataset";

export interface JobsDataset {
  jobs: JobRecord[];
  attempts: JobAttempt[];
  schedules: JobSchedule[];
  workflows: JobWorkflow[];
  dependencies: JobDependency[];
  queues: QueueDefinition[];
  workers: WorkerRecord[];
  recoveryRequests: RecoveryRequest[];
  queueOperationalControls: QueueOperationalControl[];
  activity: JobActivity[];
  processingTrend: ProcessingTrendPoint[];
}

const STORAGE_KEY = "encodency_jobs_queues_v1";

let cachedDataset: JobsDataset | null = null;

function loadDataset(): JobsDataset {
  if (cachedDataset) return cachedDataset;
  if (typeof window === "undefined") {
    cachedDataset = buildInitial();
    return cachedDataset;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      cachedDataset = JSON.parse(raw) as JobsDataset;
      return cachedDataset;
    }
  } catch { /* fall through */ }
  cachedDataset = buildInitial();
  persistDataset(cachedDataset);
  return cachedDataset;
}

function persistDataset(ds: JobsDataset) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ds));
  } catch { /* storage full */ }
}

function buildInitial(): JobsDataset {
  return {
    jobs: [...JOBS_DATA],
    attempts: [...ATTEMPTS_DATA],
    schedules: [...SCHEDULES_DATA],
    workflows: [...WORKFLOWS_DATA],
    dependencies: [...DEPENDENCIES_DATA],
    queues: [...QUEUES_DATA],
    workers: [...WORKERS_DATA],
    recoveryRequests: [...RECOVERY_REQUESTS_DATA],
    queueOperationalControls: [],
    activity: [...ACTIVITY_DATA],
    processingTrend: [...PROCESSING_TREND],
  };
}

function ds(): JobsDataset { return loadDataset(); }

export function getJobs(): Promise<JobRecord[]> {
  return Promise.resolve([...ds().jobs]);
}

export function getJobById(id: string): Promise<JobRecord | null> {
  return Promise.resolve(ds().jobs.find((j) => j.id === id) ?? null);
}

export function getAttempts(jobId: string): Promise<JobAttempt[]> {
  return Promise.resolve(ds().attempts.filter((a) => a.jobId === jobId));
}

export function getAllAttempts(): Promise<JobAttempt[]> {
  return Promise.resolve([...ds().attempts]);
}

export function getSchedules(): Promise<JobSchedule[]> {
  return Promise.resolve([...ds().schedules]);
}

export function getScheduleById(id: string): Promise<JobSchedule | null> {
  return Promise.resolve(ds().schedules.find((s) => s.id === id) ?? null);
}

export function getWorkflows(): Promise<JobWorkflow[]> {
  return Promise.resolve([...ds().workflows]);
}

export function getWorkflowById(id: string): Promise<JobWorkflow | null> {
  return Promise.resolve(ds().workflows.find((w) => w.id === id) ?? null);
}

export function getDependencies(jobId: string): Promise<JobDependency[]> {
  return Promise.resolve(ds().dependencies.filter((d) => d.jobId === jobId));
}

export function getQueues(): Promise<QueueDefinition[]> {
  return Promise.resolve([...ds().queues]);
}

export function getQueueById(id: string): Promise<QueueDefinition | null> {
  return Promise.resolve(ds().queues.find((q) => q.id === id) ?? null);
}

/** Derive the stats-API shape from the demo queues so fallback consumers see the same counts. */
export function getQueueStats(): Promise<QueueStats[]> {
  const d = ds();
  return Promise.resolve(
    d.queues.map((q) => ({
      queue: q.id,
      reachable: q.operationalState !== "unknown",
      counts: {
        waiting: q.waiting,
        active: q.running,
        completed: q.succeededLast24h,
        failed: q.failed,
        delayed: q.delayed,
      },
      recentFailed: d.jobs
        .filter((j) => j.queue === q.id && (j.lifecycleState === "failed" || j.lifecycleState === "dead_lettered"))
        .slice(0, 10)
        .map((j) => ({ id: j.id, name: j.type, attemptsMade: j.attempts, failedReason: j.errorMessage })),
    }))
  );
}

export function getWorkers(): Promise<WorkerRecord[]> {
  return Promise.resolve([...ds().workers]);
}

export function getWorkerById(id: string): Promise<WorkerRecord | null> {
  return Promise.resolve(ds().workers.find((w) => w.id === id) ?? null);
}

export function getRecoveryRequests(): Promise<RecoveryRequest[]> {
  return Promise.resolve([...ds().recoveryRequests]);
}

export function getQueueOperationalControls(): Promise<QueueOperationalControl[]> {
  return Promise.resolve([...ds().queueOperationalControls]);
}

export function getActivity(): Promise<JobActivity[]> {
  return Promise.resolve([...ds().activity]);
}

export function getProcessingTrend(): Promise<ProcessingTrendPoint[]> {
  return Promise.resolve([...ds().processingTrend]);
}

export function getOverview(): Promise<JobsOverviewData> {
  return Promise.resolve(getOverviewData());
}

export function requestJobRetry(jobId: string): Promise<RecoveryRequest | null> {
  const d = ds();
  const job = d.jobs.find((j) => j.id === jobId);
  if (!job) return Promise.resolve(null);

  const req: RecoveryRequest = {
    id: `rec_${String(d.recoveryRequests.length + 1).padStart(4, "0")}`,
    jobId: job.id,
    jobType: job.type,
    company: job.company,
    requestedBy: "admin@encodency.com",
    requestedAt: new Date().toISOString(),
    state: "draft",
    reason: `Manual retry requested for ${job.type}`,
    notes: "",
    proposedAction: "Retry execution",
    failureClassification: job.failureClassification ?? "unknown",
    attemptsUsed: job.attempts,
    maxAttempts: job.maxAttempts,
    idempotencyRisk: job.retryEligibility === "retryable" ? "safe" : "unknown",
    sideEffectRisk: job.type.startsWith("publish:") ? "risky" : "safe",
  };

  d.recoveryRequests.unshift(req);
  d.activity.unshift({
    id: `act_retry_${Date.now()}`,
    timestamp: req.requestedAt,
    eventType: "Manual Retry Requested",
    jobId: job.id,
    queue: job.queue,
    actor: req.requestedBy,
    result: "draft",
    details: `Demo retry request drafted for ${job.id}. No worker execution occurred.`,
    relatedReference: req.id,
  });
  persistDataset(d);
  return Promise.resolve(req);
}

export function updateRecoveryRequestState(
  requestId: string,
  state: RetryRequestState,
  notes?: string
): Promise<RecoveryRequest | null> {
  const d = ds();
  const req = d.recoveryRequests.find((r) => r.id === requestId);
  if (!req) return Promise.resolve(null);
  req.state = state;
  if (notes !== undefined) req.notes = notes;
  persistDataset(d);
  return Promise.resolve(req);
}

export function cancelJob(jobId: string): Promise<JobRecord | null> {
  const d = ds();
  const job = d.jobs.find((j) => j.id === jobId);
  if (!job) return Promise.resolve(null);
  if (job.lifecycleState === "succeeded" || job.lifecycleState === "cancelled") return Promise.resolve(null);
  d.activity.unshift({
    id: `act_cancel_${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: "Administrative Cancellation Requested",
    jobId: job.id,
    queue: job.queue,
    actor: "admin@encodency.com",
    result: "pending_review",
    details: `Demo cancellation request recorded for ${job.id}. Job lifecycle was not changed by the frontend.`,
    relatedReference: job.id,
  });
  persistDataset(d);
  return Promise.resolve(job);
}

export function pauseQueue(queueId: string): Promise<QueueDefinition | null> {
  const d = ds();
  const q = d.queues.find((qq) => qq.id === queueId);
  if (!q) return Promise.resolve(null);
  d.queueOperationalControls.unshift(buildQueueControl(q, "paused", "Queue pause requested from demo operations review."));
  persistDataset(d);
  return Promise.resolve(q);
}

export function resumeQueue(queueId: string): Promise<QueueDefinition | null> {
  const d = ds();
  const q = d.queues.find((qq) => qq.id === queueId);
  if (!q) return Promise.resolve(null);
  d.queueOperationalControls.unshift(buildQueueControl(q, "running", "Queue resume requested from demo operations review."));
  persistDataset(d);
  return Promise.resolve(q);
}

function buildQueueControl(
  queue: QueueDefinition,
  proposedOperationalState: QueueOperationalControl["proposedOperationalState"],
  reason: string
): QueueOperationalControl {
  const requestedAt = new Date().toISOString();
  return {
    id: `qctrl_${Date.now()}`,
    queueId: queue.id,
    queueName: queue.name,
    environment: queue.environment,
    currentOperationalState: queue.operationalState,
    proposedOperationalState,
    waitingJobs: queue.waiting,
    runningJobs: queue.running,
    scheduledJobs: queue.delayed,
    potentialWorkflowImpact: "Demo request only. Backend workers, leases and queue enforcement are not connected.",
    requiredAuthorization: "Super Admin operations approval",
    reason,
    requestedBy: "admin@encodency.com",
    requestedAt,
    state: "draft",
  };
}

export function resetDemo(): Promise<void> {
  cachedDataset = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  loadDataset();
  return Promise.resolve();
}
