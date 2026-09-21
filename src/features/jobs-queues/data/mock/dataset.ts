import type {
  JobRecord,
  JobAttempt,
  JobSchedule,
  JobWorkflow,
  JobDependency,
  QueueDefinition,
  WorkerRecord,
  RecoveryRequest,
  JobActivity,
  JobsOverviewData,
  ProcessingTrendPoint,
  FailureClassification,
  JobLifecycleState,
  RetryEligibility,
} from "../types";
import { COMPANIES, Clients } from "@/mocks/data/tenants";
import { createRng, minutesAgo, buildTrend } from "@/mocks/lib/random";

const rng = createRng(95000);

const JOB_TYPES = [
  "publish:instagram-reel",
  "publish:linkedin-post",
  "publish:meta-carousel",
  "publish:gbp-update",
  "publish:youtube-video",
  "crawl:full-site",
  "crawl:incremental",
  "crawl:sitemap-refresh",
  "sync:meta-insights",
  "sync:search-console",
  "sync:youtube-analytics",
  "sync:gbp-performance",
  "report:monthly-pdf",
  "report:campaign-export",
  "report:seo-summary",
  "campaign:broadcast",
  "campaign:template-send",
  "campaign:followup",
  "webhook:meta-lead",
  "webhook:gbp-review",
  "webhook:whatsapp-status",
  "notify:digest-email",
  "notify:in-app",
  "notify:integration-alert",
  "seo:audit-run",
  "media:transcode",
  "ai:content-generate",
] as const;

const QUEUE_MAP: Record<string, string> = {
  "publish:instagram-reel": "scheduled_posts",
  "publish:linkedin-post": "scheduled_posts",
  "publish:meta-carousel": "scheduled_posts",
  "publish:gbp-update": "scheduled_posts",
  "publish:youtube-video": "scheduled_posts",
  "crawl:full-site": "seo_crawls",
  "crawl:incremental": "seo_crawls",
  "crawl:sitemap-refresh": "seo_crawls",
  "sync:meta-insights": "analytics_sync",
  "sync:search-console": "analytics_sync",
  "sync:youtube-analytics": "analytics_sync",
  "sync:gbp-performance": "analytics_sync",
  "report:monthly-pdf": "reports",
  "report:campaign-export": "reports",
  "report:seo-summary": "reports",
  "campaign:broadcast": "whatsapp_campaigns",
  "campaign:template-send": "whatsapp_campaigns",
  "campaign:followup": "whatsapp_campaigns",
  "webhook:meta-lead": "webhook_processing",
  "webhook:gbp-review": "webhook_processing",
  "webhook:whatsapp-status": "webhook_processing",
  "notify:digest-email": "notifications",
  "notify:in-app": "notifications",
  "notify:integration-alert": "notifications",
  "seo:audit-run": "seo_crawls",
  "media:transcode": "reports",
  "ai:content-generate": "scheduled_posts",
};

const QUEUE_NAMES: Record<string, string> = {
  scheduled_posts: "Scheduled Posts",
  seo_crawls: "SEO Crawls",
  analytics_sync: "Analytics Sync",
  reports: "Reports",
  whatsapp_campaigns: "WhatsApp Campaigns",
  webhook_processing: "Webhook Processing",
  notifications: "Notifications",
};

const QUEUE_CATEGORIES: Record<string, string> = {
  scheduled_posts: "Publishing",
  seo_crawls: "SEO",
  analytics_sync: "Analytics",
  reports: "Reporting",
  whatsapp_campaigns: "Messaging",
  webhook_processing: "Integration",
  notifications: "Communication",
};

const FAILURE_REASONS: Array<{ classification: FailureClassification; message: string }> = [
  { classification: "transient_network", message: "Connection reset while streaming response" },
  { classification: "provider_rate_limit", message: "Upstream API returned 429 after 3 retries" },
  { classification: "provider_authorization", message: "Access token expired mid-run" },
  { classification: "execution_timeout", message: "Timed out waiting for the worker response" },
  { classification: "permanent_validation", message: "Media transcode failed: unsupported codec" },
  { classification: "dependency_unavailable", message: "Analytics service returned 503" },
  { classification: "resource_limit", message: "File size exceeds provider maximum" },
  { classification: "unknown", message: "Unexpected error in processing pipeline" },
];

const RELATED_RESOURCES = [
  { type: "post", names: ["Instagram Reel Q3", "LinkedIn Campaign Launch", "Meta Carousel Summer", "YouTube Product Demo"] },
  { type: "audit", names: ["SEO Audit - Homepage", "Crawl Report - Blog", "Sitemap Refresh - Main"] },
  { type: "report", names: ["Monthly Performance Report", "Campaign Summary PDF", "SEO Overview Q3"] },
  { type: "campaign", names: ["Diwali Broadcast", "Festival Follow-up", "Template Campaign #42"] },
  { type: "notification", names: ["Digest Email Batch", "In-App Alert Wave", "Integration Alert"] },
];

const WORKER_IDS = [
  "worker_publish_01", "worker_publish_02", "worker_publish_03",
  "worker_seo_01", "worker_seo_02",
  "worker_analytics_01", "worker_analytics_02",
  "worker_reports_01",
  "worker_campaign_01", "worker_campaign_02",
  "worker_webhook_01", "worker_webhook_02",
  "worker_notify_01",
];

function pickFailureReason(attempts: number, rng: ReturnType<typeof createRng>) {
  if (attempts >= 3) return FAILURE_REASONS[Math.floor(rng.float(0, FAILURE_REASONS.length))];
  return FAILURE_REASONS[Math.floor(rng.float(0, 4))];
}

function classifyFailure(classification: FailureClassification): RetryEligibility {
  switch (classification) {
    case "provider_authorization":
    case "permanent_validation":
    case "resource_limit":
      return "non_retryable";
    case "transient_network":
    case "provider_rate_limit":
    case "execution_timeout":
    case "dependency_unavailable":
      return "retryable";
    default:
      return "unknown";
  }
}

function buildJobs(): JobRecord[] {
  const jobs: JobRecord[] = [];
  let seq = 0;
  const companies = COMPANIES.slice(0, 5);

  for (const jobType of JOB_TYPES) {
    const queue = QUEUE_MAP[jobType] || "notifications";
    const count = rng.int(8, 18);

    for (let i = 0; i < count; i++) {
      seq++;
      const company = rng.pick(companies);
      const clientPool = Clients.filter((c) => c.company.id === company.id);
      const client = clientPool.length > 0 ? rng.pick(clientPool) : null;
      const priority = rng.pick(["high", "normal", "low"]) as "high" | "normal" | "low";
      const state = rng.weighted<JobLifecycleState>({
        scheduled: 8,
        waiting: 10,
        ready: 5,
        running: 8,
        retry_waiting: 7,
        succeeded: 35,
        failed: 12,
        cancelled: 3,
        dead_lettered: 12,
      });

      const attempts = state === "failed" || state === "dead_lettered"
        ? 3
        : state === "retry_waiting"
        ? rng.int(1, 2)
        : state === "running"
        ? rng.int(1, 2)
        : 1;

      const createdMinutesAgo = rng.int(5, 4320);
      const createdAt = minutesAgo(createdMinutesAgo);
      const isTerminal = state === "succeeded" || state === "failed" || state === "dead_lettered" || state === "cancelled";
      const hasStarted = state === "running" || state === "retry_waiting" || isTerminal;

      const failure = (state === "failed" || state === "retry_waiting" || state === "dead_lettered")
        ? pickFailureReason(attempts, rng)
        : null;

      const resIdx = Math.floor(rng.float(0, RELATED_RESOURCES.length));
      const resType = RELATED_RESOURCES[resIdx].type;
      const resName = rng.pick(RELATED_RESOURCES[resIdx].names);

      const durationMs = isTerminal
        ? rng.int(800, 120_000)
        : state === "running"
        ? rng.int(200, 45_000)
        : null;

      const failureClass = failure?.classification ?? null;
      const retryElig = failureClass ? classifyFailure(failureClass) : "retryable";

      const scheduledAt = state === "scheduled" ? minutesAgo(-rng.int(10, 2880)) : null;
      const enqueuedAt = state !== "scheduled" ? minutesAgo(Math.max(1, createdMinutesAgo - rng.int(0, 5))) : null;
      const startedAt = hasStarted ? minutesAgo(Math.max(0, createdMinutesAgo - rng.int(2, 10))) : null;
      const completedAt = isTerminal && state !== "cancelled" ? minutesAgo(Math.max(0, createdMinutesAgo - rng.int(5, 30))) : null;
      const nextRetryAt = state === "retry_waiting" ? minutesAgo(-rng.int(5, 60)) : null;

      const workerId = hasStarted ? rng.pick(WORKER_IDS) : null;

      jobs.push({
        id: `job_${String(seq).padStart(5, "0")}`,
        type: jobType,
        name: jobType,
        queue,
        lifecycleState: state,
        priority,
        environment: "development",
        company,
        client: client ? { id: client.id, name: client.name } : null,
        workflowId: seq % 5 === 0 ? `wf_${String(Math.floor(seq / 5)).padStart(4, "0")}` : null,
        correlationId: `corr_${seq}_${rng.int(1000, 9999)}`,
        idempotencyKey: `idm_${seq}_${rng.int(10000, 99999)}`,
        relatedResourceType: resType,
        relatedResourceId: `res_${seq}`,
        relatedResourceName: resName,
        attempts,
        maxAttempts: 3,
        errorMessage: failure?.message ?? null,
        failureClassification: failureClass,
        retryEligibility: retryElig,
        createdAt,
        scheduledAt,
        enqueuedAt,
        startedAt,
        completedAt,
        lastAttemptAt: hasStarted ? minutesAgo(Math.max(0, createdMinutesAgo - rng.int(1, 5))) : null,
        nextRetryAt,
        durationMs,
        payload: {
          companyId: company.id,
          clientId: client?.id ?? null,
          priority,
          idempotencyKey: `idm_${seq}_${rng.int(10000, 99999)}`,
        },
      });
    }
  }

  return jobs.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function buildAttempts(jobs: JobRecord[]): JobAttempt[] {
  const attempts: JobAttempt[] = [];
  let seq = 0;

  for (const job of jobs) {
    for (let i = 1; i <= job.attempts; i++) {
      seq++;
      const isLast = i === job.attempts;
      const isTerminal = job.lifecycleState === "succeeded" || job.lifecycleState === "failed" || job.lifecycleState === "dead_lettered";
      const result = isLast && isTerminal
        ? job.lifecycleState === "succeeded"
          ? "succeeded"
          : "failed"
        : isLast && job.lifecycleState === "running"
        ? "unknown"
        : "failed";

      const failClass = result === "failed" ? (job.failureClassification ?? "unknown") : null;
      const durationMs = result === "succeeded"
        ? rng.int(1200, 96_000)
        : result === "failed"
        ? rng.int(200, 45_000)
        : null;

      const createdMs = Date.parse(job.createdAt);
      const attemptStartOffset = (i - 1) * rng.int(300, 900);
      const startedAt = new Date(createdMs + attemptStartOffset).toISOString();
      const completedAt = result !== "unknown"
        ? new Date(createdMs + attemptStartOffset + (durationMs ?? 1000)).toISOString()
        : null;

      attempts.push({
        id: `att_${String(seq).padStart(6, "0")}`,
        jobId: job.id,
        attemptNumber: i,
        workerId: rng.pick(WORKER_IDS),
        startedAt,
        completedAt,
        result: result as JobAttempt["result"],
        failureClassification: failClass as FailureClassification | null,
        errorMessage: result === "failed" ? job.errorMessage : null,
        durationMs,
      });
    }
  }

  return attempts;
}

function buildSchedules(jobs: JobRecord[]): JobSchedule[] {
  return jobs
    .filter((j) => j.lifecycleState === "scheduled" || j.scheduledAt)
    .slice(0, 40)
    .map((j, i) => {
      const state = j.lifecycleState === "scheduled" ? "upcoming" as const : "dispatched" as const;
      return {
        id: `sch_${String(i + 1).padStart(4, "0")}`,
        jobId: j.id,
        scheduledAt: j.scheduledAt ?? j.createdAt,
        timezone: "Asia/Kolkata",
        scheduleState: state,
        nextEligibleExecution: j.nextRetryAt,
        recurrenceRule: i % 7 === 0 ? "0 */6 * * *" : null,
        relatedResourceType: j.relatedResourceType,
        relatedResourceId: j.relatedResourceId,
        relatedResourceName: j.relatedResourceName,
      };
    });
}

function buildWorkflows(jobs: JobRecord[]): JobWorkflow[] {
  const workflowJobs = jobs.filter((j) => j.workflowId);
  const grouped = new Map<string, JobRecord[]>();
  for (const j of workflowJobs) {
    if (!j.workflowId) continue;
    if (!grouped.has(j.workflowId)) grouped.set(j.workflowId, []);
    grouped.get(j.workflowId)!.push(j);
  }

  const workflows: JobWorkflow[] = [];
  let seq = 0;
  for (const [wfId, wfJobs] of grouped) {
    seq++;
    const allSucceeded = wfJobs.every((j) => j.lifecycleState === "succeeded");
    const anyFailed = wfJobs.some((j) => j.lifecycleState === "failed" || j.lifecycleState === "dead_lettered");
    const status = allSucceeded ? "succeeded" : anyFailed ? "failed" : "in_progress";

    workflows.push({
      id: wfId,
      name: `Workflow #${seq}`,
      jobIds: wfJobs.map((j) => j.id),
      completionPolicy: "all_succeed",
      currentStatus: status,
      relatedResourceType: wfJobs[0]?.relatedResourceType ?? "post",
      relatedResourceId: wfJobs[0]?.relatedResourceId ?? `res_${seq}`,
      relatedResourceName: wfJobs[0]?.relatedResourceName ?? `Campaign ${seq}`,
    });
  }

  return workflows;
}

function buildDependencies(jobs: JobRecord[], workflows: JobWorkflow[]): JobDependency[] {
  const deps: JobDependency[] = [];
  let seq = 0;
  for (const wf of workflows) {
    for (let i = 1; i < wf.jobIds.length; i++) {
      seq++;
      const depStatus = (() => {
        const depJob = jobs.find((j) => j.id === wf.jobIds[i - 1]);
        if (!depJob) return "unknown" as const;
        switch (depJob.lifecycleState) {
          case "succeeded": return "succeeded" as const;
          case "failed":
          case "dead_lettered": return "failed" as const;
          case "cancelled": return "cancelled" as const;
          default: return "waiting" as const;
        }
      })();
      deps.push({
        jobId: wf.jobIds[i],
        dependsOnJobId: wf.jobIds[i - 1],
        dependsOnType: "predecessor",
        status: depStatus,
      });
    }
  }
  return deps;
}

function buildQueues(jobs: JobRecord[]): QueueDefinition[] {
  const queueIds = [...new Set(jobs.map((j) => j.queue))];
  return queueIds.map((qId, i) => {
    const qJobs = jobs.filter((j) => j.queue === qId);
    const byState = (s: JobLifecycleState) => qJobs.filter((j) => j.lifecycleState === s).length;
    const waitingJobs = qJobs.filter((j) => j.lifecycleState === "waiting" || j.lifecycleState === "ready");
    const oldestWaiting = waitingJobs.length > 0
      ? waitingJobs.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0].createdAt
      : null;

    const workerCount = rng.int(1, 4);

    return {
      id: qId,
      name: QUEUE_NAMES[qId] ?? qId,
      category: QUEUE_CATEGORIES[qId] ?? "General",
      purpose: `Processes ${QUEUE_NAMES[qId]?.toLowerCase() ?? qId} across the platform`,
      operationalState: qId === "seo_crawls" ? "paused" : "running",
      jobTypes: [...new Set(qJobs.map((j) => j.type))].slice(0, 4),
      priorityPolicy: "FIFO with priority override",
      concurrencyReference: `${workerCount} workers`,
      timeoutPolicy: "5 minutes default",
      retryPolicy: "Exponential backoff, max 3 attempts",
      deadLetterPolicy: "After 3 failed attempts",
      workerGroup: `group_${qId}`,
      environment: "development",
      waiting: byState("waiting") + byState("ready"),
      running: byState("running"),
      delayed: byState("scheduled"),
      failed: byState("failed"),
      succeededLast24h: byState("succeeded"),
      retryWaiting: byState("retry_waiting"),
      deadLettered: byState("dead_lettered"),
      oldestWaitingAt: oldestWaiting,
      registeredWorkers: workerCount,
    };
  });
}

function buildWorkers(jobs: JobRecord[]): WorkerRecord[] {
  const runningJobs = jobs.filter((j) => j.lifecycleState === "running");
  return WORKER_IDS.map((wId, i) => {
    const wRunning = runningJobs.filter((j) => {
      const attempts = buildAttempts([j]);
      return attempts.some((a) => a.workerId === wId);
    });

    const heartbeatMinutes = rng.pick([0, 1, 2, 3, 5, 15, 45, 120, 480]);
    const liveness = heartbeatMinutes <= 2 ? "online" as const
      : heartbeatMinutes <= 10 ? "stale" as const
      : "offline" as const;

    const qIndex = i % 7;
    const queues = [
      "scheduled_posts", "seo_crawls", "analytics_sync", "reports",
      "whatsapp_campaigns", "webhook_processing", "notifications",
    ];

    return {
      id: wId,
      group: `group_${queues[qIndex]}`,
      environment: "development",
      assignedQueues: [queues[qIndex]],
      liveness,
      lastHeartbeat: minutesAgo(heartbeatMinutes),
      registeredAt: minutesAgo(rng.int(1000, 4000)),
      concurrencyCapacity: rng.int(1, 4),
      currentProcessing: wRunning.length,
      currentJobIds: wRunning.slice(0, 2).map((j) => j.id),
      recentAttempts: rng.int(10, 120),
      recentFailures: rng.int(0, 15),
    };
  });
}

function buildRecoveryRequests(jobs: JobRecord[]): RecoveryRequest[] {
  const failedJobs = jobs.filter(
    (j) => j.lifecycleState === "failed" || j.lifecycleState === "dead_lettered"
  ).slice(0, 12);

  return failedJobs.map((j, i) => {
    const states = ["draft", "pending_approval", "accepted", "rejected"] as const;
    return {
      id: `rec_${String(i + 1).padStart(4, "0")}`,
      jobId: j.id,
      jobType: j.type,
      company: j.company,
      requestedBy: rng.pick(["admin@encodency.com", "ops@encodency.com", "support@encodency.com"]),
      requestedAt: minutesAgo(rng.int(5, 200)),
      state: rng.pick(states),
      reason: `Manual recovery requested for ${j.type}`,
      notes: "",
      proposedAction: j.retryEligibility === "retryable" ? "Retry execution" : "Investigate and reprocess",
      failureClassification: j.failureClassification ?? "unknown",
      attemptsUsed: j.attempts,
      maxAttempts: j.maxAttempts,
      idempotencyRisk: j.retryEligibility === "retryable" ? "safe" : "unknown",
      sideEffectRisk: j.type.startsWith("publish:") ? "risky" : "safe",
    };
  });
}

function buildActivity(jobs: JobRecord[]): JobActivity[] {
  const events: JobActivity[] = [];
  const eventTypes = [
    "job_created", "job_enqueued", "job_started", "attempt_started",
    "attempt_failed", "retry_scheduled", "job_succeeded", "job_failed",
    "job_dead_lettered", "queue_paused", "queue_resumed", "worker_registered",
    "cancellation_requested", "recovery_requested",
  ];

  for (let i = 0; i < 60; i++) {
    const job = rng.pick(jobs);
    const eventType = rng.pick(eventTypes);
    events.push({
      id: `act_${String(i + 1).padStart(4, "0")}`,
      timestamp: minutesAgo(rng.int(1, 2880)),
      eventType,
      jobId: job.id,
      queue: job.queue,
      actor: rng.pick(["system", "admin@encodency.com", "worker_system"]),
      result: eventType.includes("failed") ? "failure" : eventType.includes("succeeded") ? "success" : "info",
      details: `${eventType.replace(/_/g, " ")} for ${job.type}`,
      relatedReference: job.correlationId,
    });
  }

  return events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}

function buildTrendData(): ProcessingTrendPoint[] {
  const points: ProcessingTrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    points.push({
      date: date.toISOString().split("T")[0],
      completed: rng.int(40, 120),
      failed: rng.int(2, 18),
      started: rng.int(50, 140),
      retriesScheduled: rng.int(3, 15),
    });
  }
  return points;
}

const allJobs = buildJobs();
const allAttempts = buildAttempts(allJobs);
const allSchedules = buildSchedules(allJobs);
const allWorkflows = buildWorkflows(allJobs);
const allDependencies = buildDependencies(allJobs, allWorkflows);
const allQueues = buildQueues(allJobs);
const allWorkers = buildWorkers(allJobs);
const allRecoveryRequests = buildRecoveryRequests(allJobs);
const allActivity = buildActivity(allJobs);
const trendData = buildTrendData();

function computeKpis(jobs: JobRecord[], workers: WorkerRecord[]) {
  const byState = (s: JobLifecycleState) => jobs.filter((j) => j.lifecycleState === s).length;
  return {
    totalJobs: jobs.length,
    waiting: byState("waiting"),
    scheduled: byState("scheduled"),
    running: byState("running"),
    retryWaiting: byState("retry_waiting"),
    succeeded: byState("succeeded"),
    failed: byState("failed"),
    deadLettered: byState("dead_lettered"),
    activeQueues: allQueues.filter((q) => q.operationalState === "running").length,
    totalWorkers: workers.length,
    onlineWorkers: workers.filter((w) => w.liveness === "online").length,
    staleWorkers: workers.filter((w) => w.liveness === "stale").length,
    offlineWorkers: workers.filter((w) => w.liveness === "offline").length,
  };
}

export const JOBS_DATA: readonly JobRecord[] = allJobs;
export const ATTEMPTS_DATA: readonly JobAttempt[] = allAttempts;
export const SCHEDULES_DATA: readonly JobSchedule[] = allSchedules;
export const WORKFLOWS_DATA: readonly JobWorkflow[] = allWorkflows;
export const DEPENDENCIES_DATA: readonly JobDependency[] = allDependencies;
export const QUEUES_DATA: readonly QueueDefinition[] = allQueues;
export const WORKERS_DATA: readonly WorkerRecord[] = allWorkers;
export const RECOVERY_REQUESTS_DATA: readonly RecoveryRequest[] = allRecoveryRequests;
export const ACTIVITY_DATA: readonly JobActivity[] = allActivity;
export const PROCESSING_TREND: readonly ProcessingTrendPoint[] = trendData;

export function getOverviewData(): JobsOverviewData {
  return {
    kpis: computeKpis([...JOBS_DATA], [...WORKERS_DATA]),
    processingTrend: [...PROCESSING_TREND],
    queues: [...QUEUES_DATA],
    failuresRequiringAttention: JOBS_DATA.filter(
      (j) => (j.lifecycleState === "failed" || j.lifecycleState === "dead_lettered") && j.retryEligibility === "retryable"
    ).slice(0, 6),
    upcomingScheduled: JOBS_DATA.filter((j) => j.lifecycleState === "scheduled").slice(0, 6),
    workers: [...WORKERS_DATA],
    recentActivity: ACTIVITY_DATA.slice(0, 10),
  };
}
