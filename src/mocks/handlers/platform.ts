import { ApiError } from "@/types/api";
import type { ApiEndpointMetric } from "@/types/domain/api-monitoring";
import type { Job, JobQueue, QueueStats } from "@/types/domain/job";
import type { WebhookEvent } from "@/types/domain/webhook";
import { INTEGRATION_HEALTH, SYSTEM_HEALTH } from "../data/platform-health";
import {
  API_ENDPOINT_METRICS,
  API_MONITORING_SUMMARY,
  JOBS,
  QUEUE_STATS,
  WEBHOOK_ENDPOINTS,
  WEBHOOK_EVENT_NAMES,
  WEBHOOK_EVENTS_DATA,
} from "../data/platform-ops";
import { compare, equals, queryCollection } from "../lib/collection";
import type { MockRoutes } from "../lib/router";

/** Queue pause state is mutable so the control actually does something. */
const pausedQueues = new Set<JobQueue>(
  QUEUE_STATS.filter((queue) => queue.isPaused).map((queue) => queue.queue),
);

/** Jobs re-queued from the UI, keyed by id. */
const jobOverrides = new Map<string, Partial<Job>>();

function resolveJob(job: Job): Job {
  const override = jobOverrides.get(job.id);
  return override ? { ...job, ...override } : job;
}

function resolveQueueStats(): QueueStats[] {
  return QUEUE_STATS.map((stats) => ({ ...stats, isPaused: pausedQueues.has(stats.queue) }));
}

const jobQueryConfig = {
  searchable: (job: Job) => [job.id, job.name, job.company?.name, job.project],
  filters: {
    queue: equals<Job>((job) => job.queue),
    status: equals<Job>((job) => job.status),
    companyId: equals<Job>((job) => job.company?.id ?? ""),
  },
  sorters: {
    enqueuedAt: compare.date<Job>((job) => job.enqueuedAt),
    queue: compare.text<Job>((job) => job.queue),
    status: compare.text<Job>((job) => job.status),
    durationMs: compare.number<Job>((job) => job.durationMs),
    attempts: compare.number<Job>((job) => job.attempts),
  },
  defaultSort: { field: "enqueuedAt", direction: "desc" as const },
};

const endpointQueryConfig = {
  searchable: (metric: ApiEndpointMetric) => [metric.endpoint, metric.provider],
  filters: {
    provider: equals<ApiEndpointMetric>((metric) => metric.provider),
    health: equals<ApiEndpointMetric>((metric) => metric.health),
  },
  sorters: {
    calls: compare.number<ApiEndpointMetric>((metric) => metric.calls),
    successRate: compare.number<ApiEndpointMetric>((metric) => metric.successRate),
    averageLatencyMs: compare.number<ApiEndpointMetric>((metric) => metric.averageLatencyMs),
    p95LatencyMs: compare.number<ApiEndpointMetric>((metric) => metric.p95LatencyMs),
  },
  defaultSort: { field: "calls", direction: "desc" as const },
};

const webhookQueryConfig = {
  searchable: (event: WebhookEvent) => [event.id, event.event, event.companyName, event.provider],
  filters: {
    provider: equals<WebhookEvent>((event) => event.provider),
    status: equals<WebhookEvent>((event) => event.status),
    event: equals<WebhookEvent>((event) => event.event),
  },
  sorters: {
    receivedAt: compare.date<WebhookEvent>((event) => event.receivedAt),
    provider: compare.text<WebhookEvent>((event) => event.provider),
    status: compare.text<WebhookEvent>((event) => event.status),
    processingMs: compare.number<WebhookEvent>((event) => event.processingMs),
  },
  defaultSort: { field: "receivedAt", direction: "desc" as const },
};

export const platformRoutes: MockRoutes = {
  /* Mirrors backend HealthController: public liveness + deliberate error probe. */
  "GET /health": () => ({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
    database: "connected" as const,
  }),

  "GET /health/error": () => {
    throw new ApiError({
      code: "UNKNOWN",
      status: 500,
      message: "This is a deliberate test error for verifying logging behavior",
    });
  },

  /* ------------------------------------------------------------------ */
  /* Manual Tenancy Dev Harness (GET /_manual/tenancy/*)                */
  /* ------------------------------------------------------------------ */
  "GET /_manual/tenancy/platform": () => ({
    tenantContext: {
      userId: "usr-super-admin-01",
      sessionId: "sess-platform-01",
      platformRole: "SUPER_ADMIN",
    },
  }),

  "GET /_manual/tenancy/company": ({ headers }) => {
    const companyId = headers?.["x-company-id"];
    if (!companyId) {
      throw new ApiError({
        code: "FORBIDDEN",
        status: 403,
        message: "No active membership for this company",
      });
    }
    return {
      tenantContext: {
        userId: "usr-company-admin-01",
        sessionId: "sess-company-01",
        platformRole: "USER",
        companyId,
        membershipId: `mem-${companyId}`,
        systemRole: "ADMIN",
        companyStatus: "ACTIVE",
      },
    };
  },

  "GET /_manual/tenancy/client": ({ headers }) => {
    const companyId = headers?.["x-company-id"];
    const clientId = headers?.["x-client-id"];
    if (!companyId) {
      throw new ApiError({
        code: "FORBIDDEN",
        status: 403,
        message: "No active membership for this company",
      });
    }
    if (!clientId) {
      throw new ApiError({
        code: "BAD_REQUEST",
        status: 400,
        message: "Client context required",
      });
    }
    return {
      tenantContext: {
        userId: "usr-company-admin-01",
        sessionId: "sess-client-01",
        platformRole: "USER",
        companyId,
        membershipId: `mem-${companyId}`,
        systemRole: "ADMIN",
        companyStatus: "ACTIVE",
        clientId,
      },
    };
  },

  "GET /_manual/tenancy/client-optional": ({ headers }) => {
    const companyId = headers?.["x-company-id"];
    if (!companyId) {
      throw new ApiError({
        code: "FORBIDDEN",
        status: 403,
        message: "No active membership for this company",
      });
    }
    return {
      tenantContext: {
        userId: "usr-company-admin-01",
        sessionId: "sess-optional-01",
        platformRole: "USER",
        companyId,
        membershipId: `mem-${companyId}`,
        systemRole: "ADMIN",
        companyStatus: "ACTIVE",
        clientId: headers?.["x-client-id"],
      },
    };
  },

  "GET /_manual/tenancy/campaigns-read": ({ headers }) => {
    const companyId = headers?.["x-company-id"];
    if (!companyId) {
      throw new ApiError({
        code: "FORBIDDEN",
        status: 403,
        message: "No active membership for this company",
      });
    }
    return {
      tenantContext: {
        userId: "usr-company-admin-01",
        sessionId: "sess-campaigns-read",
        platformRole: "USER",
        companyId,
        membershipId: `mem-${companyId}`,
        systemRole: "ADMIN",
        companyStatus: "ACTIVE",
      },
    };
  },

  "GET /_manual/tenancy/campaigns-write": ({ headers }) => {
    const companyId = headers?.["x-company-id"];
    if (!companyId) {
      throw new ApiError({
        code: "FORBIDDEN",
        status: 403,
        message: "No active membership for this company",
      });
    }
    return {
      tenantContext: {
        userId: "usr-company-admin-01",
        sessionId: "sess-campaigns-write",
        platformRole: "USER",
        companyId,
        membershipId: `mem-${companyId}`,
        systemRole: "ADMIN",
        companyStatus: "ACTIVE",
        clientId: headers?.["x-client-id"],
      },
    };
  },

  "GET /integrations/registry": () => ["META", "GOOGLE_BUSINESS", "LINKEDIN"],

  "POST /integrations/oauth/init": ({ headers, body }) => {
    const companyId = headers?.["x-company-id"];
    if (!companyId) {
      throw new ApiError({
        code: "BAD_REQUEST",
        status: 400,
        message: "Company context required",
      });
    }
    const payload = (body ?? {}) as { provider?: string };
    if (!payload.provider || !["META", "GOOGLE_BUSINESS", "LINKEDIN"].includes(payload.provider)) {
      throw new ApiError({
        code: "BAD_REQUEST",
        status: 400,
        message: "Invalid or unsupported provider",
      });
    }

    return {
      authUrl: `https://mock-oauth.local/authorize?provider=${payload.provider}&companyId=${companyId}&state=mock_state_${Date.now()}`,
    };
  },

  "GET /integrations/health": () => INTEGRATION_HEALTH,

  "GET /system-health": () => SYSTEM_HEALTH,

  /* Literal segments must precede `/jobs/:id` so they are matched first. */
  "GET /jobs/queues": () => resolveQueueStats(),

  "GET /jobs": ({ query }) => queryCollection(JOBS.map(resolveJob), query, jobQueryConfig),

  "GET /jobs/:id": ({ params }) => {
    const job = JOBS.map(resolveJob).find((item) => item.id === params.id);
    if (!job) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Job not found." });
    }
    return job;
  },

  "POST /jobs/:id/retry": ({ params }) => {
    const id = params.id ?? "";
    const job = JOBS.find((item) => item.id === id);
    if (!job) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Job not found." });
    }

    const next: Partial<Job> = {
      status: "queued",
      attempts: 0,
      errorMessage: null,
      finishedAt: null,
      nextRetryAt: null,
    };
    jobOverrides.set(id, next);
    return { ...job, ...next };
  },

  "POST /jobs/queues/:queue/pause": ({ params }) => {
    pausedQueues.add((params.queue ?? "") as JobQueue);
    return resolveQueueStats();
  },

  "POST /jobs/queues/:queue/resume": ({ params }) => {
    pausedQueues.delete((params.queue ?? "") as JobQueue);
    return resolveQueueStats();
  },

  "GET /api-monitoring/summary": () => API_MONITORING_SUMMARY,

  "GET /api-monitoring/endpoints": ({ query }) =>
    queryCollection(API_ENDPOINT_METRICS, query, endpointQueryConfig),

  "GET /webhooks/endpoints": () => WEBHOOK_ENDPOINTS,

  "GET /webhooks/event-names": () => WEBHOOK_EVENT_NAMES,

  "GET /webhooks/events": ({ query }) =>
    queryCollection(WEBHOOK_EVENTS_DATA, query, webhookQueryConfig),

  "GET /webhooks/events/:id": ({ params }) => {
    const event = WEBHOOK_EVENTS_DATA.find((item) => item.id === params.id);
    if (!event) {
      throw new ApiError({ code: "NOT_FOUND", status: 404, message: "Webhook event not found." });
    }
    return event;
  },
};
