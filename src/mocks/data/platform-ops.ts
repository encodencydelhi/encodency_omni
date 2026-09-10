import type { ApiEndpointMetric, ApiMonitoringSummary, EndpointHealth } from "@/types/domain/api-monitoring";
import { INTEGRATION_PROVIDER, type IntegrationProvider } from "@/types/domain/integration";
import { JOB_QUEUE, type Job, type JobQueue, type JobStatus, type QueueStats } from "@/types/domain/job";
import type { WebhookEndpointSummary, WebhookEvent, WebhookStatus } from "@/types/domain/webhook";
import { buildTrend, createRng, minutesAgo, type Rng } from "../lib/random";
import { COMPANIES, Clients } from "./tenants";

/* -------------------------------------------------------------------------
 * Jobs & queues
 * ---------------------------------------------------------------------- */

const JOB_NAMES: Record<JobQueue, string[]> = {
  scheduled_posts: ["publish:instagram-reel", "publish:linkedin-post", "publish:meta-carousel", "publish:gbp-update"],
  seo_crawls: ["crawl:full-site", "crawl:incremental", "crawl:sitemap-refresh", "rules:evaluate"],
  analytics_sync: ["sync:meta-insights", "sync:search-console", "sync:youtube-analytics", "sync:gbp-performance"],
  reports: ["report:monthly-pdf", "report:campaign-export", "report:seo-summary"],
  whatsapp_campaigns: ["campaign:broadcast", "campaign:template-send", "campaign:followup"],
  webhook_processing: ["webhook:meta-lead", "webhook:gbp-review", "webhook:whatsapp-status"],
  notifications: ["notify:digest-email", "notify:in-app", "notify:integration-alert"],
};

const JOB_ERRORS = [
  "Upstream API returned 429 after 3 retries",
  "Access token expired mid-run",
  "Timed out waiting for the crawler worker",
  "Media transcode failed: unsupported codec",
  "Template rejected by the messaging provider",
  "Connection reset while streaming the report",
] as const;

const QUEUE_KEYS = Object.keys(JOB_QUEUE) as JobQueue[];

function buildJobs(): Job[] {
  const jobs: Job[] = [];
  let sequence = 0;

  QUEUE_KEYS.forEach((queue, queueIndex) => {
    const rng = createRng(51000 + queueIndex * 23);
    const count = rng.int(26, 48);

    for (let index = 0; index < count; index += 1) {
      const status = rng.weighted({
        completed: 62,
        queued: 12,
        processing: 8,
        retrying: 7,
        failed: 11,
      } satisfies Record<JobStatus, number>);

      const project = rng.pick(Clients);
      const attempts = status === "failed" ? 3 : status === "retrying" ? rng.int(1, 2) : 1;
      const enqueuedMinutes = rng.int(1, 2880);
      const isFinished = status === "completed" || status === "failed";
      const durationMs = isFinished ? rng.int(320, 96_000) : status === "processing" ? rng.int(200, 40_000) : null;

      sequence += 1;

      jobs.push({
        id: `job_${String(sequence).padStart(5, "0")}`,
        queue,
        name: rng.pick(JOB_NAMES[queue]),
        status,
        company: project.company,
        project: project.name,
        attempts,
        maxAttempts: 3,
        durationMs,
        errorMessage: status === "failed" || status === "retrying" ? rng.pick(JOB_ERRORS) : null,
        payload: {
          projectId: project.id,
          companyId: project.company.id,
          priority: rng.pick(["high", "normal", "low"]),
          idempotencyKey: `idm_${sequence}_${rng.int(1000, 9999)}`,
        },
        enqueuedAt: minutesAgo(enqueuedMinutes),
        startedAt: status === "queued" ? null : minutesAgo(enqueuedMinutes - rng.int(0, 2)),
        finishedAt: isFinished ? minutesAgo(Math.max(0, enqueuedMinutes - rng.int(1, 8))) : null,
        nextRetryAt: status === "retrying" ? minutesAgo(-rng.int(1, 25)) : null,
      });
    }
  });

  return jobs.sort((a, b) => Date.parse(b.enqueuedAt) - Date.parse(a.enqueuedAt));
}

export const JOBS: readonly Job[] = buildJobs();

export function buildQueueStats(): QueueStats[] {
  return QUEUE_KEYS.map((queue, index) => {
    const rng = createRng(53000 + index * 19);
    const inQueue = JOBS.filter((job) => job.queue === queue);
    const byStatus = (status: JobStatus) => inQueue.filter((job) => job.status === status).length;

    const queued = byStatus("queued");
    const averageDurationMs = Math.round(
      inQueue.reduce((total, job) => total + (job.durationMs ?? 0), 0) / Math.max(inQueue.length, 1),
    );

    return {
      queue,
      queued,
      processing: byStatus("processing"),
      completedLast24h: byStatus("completed"),
      failedLast24h: byStatus("failed"),
      retrying: byStatus("retrying"),
      averageDurationMs,
      drainEtaSeconds: queued === 0 ? null : Math.round((queued * averageDurationMs) / 1000 / rng.int(2, 6)),
      isPaused: queue === "seo_crawls",
    } satisfies QueueStats;
  });
}

export const QUEUE_STATS: readonly QueueStats[] = buildQueueStats();

/* -------------------------------------------------------------------------
 * External API monitoring
 * ---------------------------------------------------------------------- */

const MONITORED_PROVIDERS: IntegrationProvider[] = [
  "meta",
  "instagram",
  "linkedin",
  "google_business",
  "whatsapp",
  "youtube",
  "search_console",
];

const ENDPOINTS: Partial<Record<IntegrationProvider, Array<{ path: string; method: ApiEndpointMetric["method"] }>>> = {
  meta: [
    { path: "/v21.0/{page-id}/feed", method: "POST" },
    { path: "/v21.0/{page-id}/insights", method: "GET" },
    { path: "/v21.0/{form-id}/leads", method: "GET" },
  ],
  instagram: [
    { path: "/v21.0/{ig-user-id}/media", method: "POST" },
    { path: "/v21.0/{ig-user-id}/media_publish", method: "POST" },
    { path: "/v21.0/{ig-media-id}/insights", method: "GET" },
  ],
  linkedin: [
    { path: "/rest/posts", method: "POST" },
    { path: "/rest/organizationalEntityShareStatistics", method: "GET" },
    { path: "/rest/organizationAcls", method: "GET" },
  ],
  google_business: [
    { path: "/v4/accounts/{account}/locations", method: "GET" },
    { path: "/v4/{location}/localPosts", method: "POST" },
    { path: "/v4/{location}/reviews", method: "GET" },
  ],
  whatsapp: [
    { path: "/v21.0/{phone-id}/messages", method: "POST" },
    { path: "/v21.0/{waba-id}/message_templates", method: "GET" },
  ],
  youtube: [
    { path: "/youtube/v3/videos", method: "POST" },
    { path: "/youtube/v3/reports", method: "GET" },
  ],
  search_console: [
    { path: "/webmasters/v3/sites/{site}/searchAnalytics/query", method: "POST" },
    { path: "/webmasters/v3/sites/{site}/sitemaps", method: "GET" },
  ],
};

function resolveEndpointHealth(rng: Rng, successRate: number, rateLimitPercent: number): EndpointHealth {
  if (successRate < 95) return "erroring";
  if (rateLimitPercent > 85) return "rate_limited";
  if (rng.bool(0.18)) return "slow";
  return "healthy";
}

function buildApiEndpointMetrics(): ApiEndpointMetric[] {
  const metrics: ApiEndpointMetric[] = [];

  MONITORED_PROVIDERS.forEach((provider, providerIndex) => {
    const rng = createRng(61000 + providerIndex * 31);
    const endpoints = ENDPOINTS[provider] ?? [];

    endpoints.forEach((endpoint, endpointIndex) => {
      const calls = rng.int(4_200, 186_000);
      const successRate = rng.float(91.2, 99.98, 2);
      const rateLimitUsedPercent = rng.float(12, 96, 1);
      const averageLatencyMs = rng.int(110, 1_240);

      metrics.push({
        id: `apimetric_${provider}_${endpointIndex}`,
        provider,
        endpoint: endpoint.path,
        method: endpoint.method,
        health: resolveEndpointHealth(rng, successRate, rateLimitUsedPercent),
        calls,
        successRate,
        failedCalls: Math.round(calls * (1 - successRate / 100)),
        averageLatencyMs,
        p95LatencyMs: Math.round(averageLatencyMs * rng.float(1.8, 3.4)),
        rateLimitUsedPercent,
        lastCalledAt: minutesAgo(rng.int(0, 30)),
      });
    });
  });

  return metrics;
}

export const API_ENDPOINT_METRICS: readonly ApiEndpointMetric[] = buildApiEndpointMetrics();

export function buildApiMonitoringSummary(): ApiMonitoringSummary {
  const rng = createRng(63000);
  const totalCalls = API_ENDPOINT_METRICS.reduce((total, metric) => total + metric.calls, 0);
  const failedCalls = API_ENDPOINT_METRICS.reduce((total, metric) => total + metric.failedCalls, 0);

  const providerBreakdown = MONITORED_PROVIDERS.map((provider) => {
    const rows = API_ENDPOINT_METRICS.filter((metric) => metric.provider === provider);
    const calls = rows.reduce((total, metric) => total + metric.calls, 0);
    const failed = rows.reduce((total, metric) => total + metric.failedCalls, 0);

    return {
      provider,
      calls,
      successRate: Number((((calls - failed) / Math.max(calls, 1)) * 100).toFixed(2)),
      averageLatencyMs: Math.round(
        rows.reduce((total, metric) => total + metric.averageLatencyMs, 0) / Math.max(rows.length, 1),
      ),
      rateLimitUsedPercent: Math.round(
        rows.reduce((total, metric) => total + metric.rateLimitUsedPercent, 0) / Math.max(rows.length, 1),
      ),
    };
  }).sort((a, b) => b.calls - a.calls);

  return {
    totalCalls,
    successRate: Number((((totalCalls - failedCalls) / Math.max(totalCalls, 1)) * 100).toFixed(2)),
    failedCalls,
    averageLatencyMs: Math.round(
      API_ENDPOINT_METRICS.reduce((total, metric) => total + metric.averageLatencyMs, 0) /
      Math.max(API_ENDPOINT_METRICS.length, 1),
    ),
    callsTrend: buildTrend({ rng, days: 14, start: totalCalls / 16, end: totalCalls / 14, noise: 0.12 }),
    errorTrend: buildTrend({ rng, days: 14, start: failedCalls / 12, end: failedCalls / 14, noise: 0.3 }),
    providerBreakdown,
  };
}

export const API_MONITORING_SUMMARY: ApiMonitoringSummary = buildApiMonitoringSummary();

/* -------------------------------------------------------------------------
 * Webhooks
 * ---------------------------------------------------------------------- */

const WEBHOOK_EVENTS: Partial<Record<IntegrationProvider, string[]>> = {
  meta: ["leadgen", "feed.comment", "page.mention"],
  instagram: ["comments", "mentions", "story_insights"],
  linkedin: ["organizationSocialAction", "leadNotification"],
  google_business: ["review.created", "review.updated", "question.created"],
  whatsapp: ["messages.status", "messages.received", "template.status_update"],
  youtube: ["video.published", "comment.created"],
  search_console: ["sitemap.processed"],
  website_analytics: ["form.submitted", "conversion.recorded"],
};

function buildWebhookEvents(): WebhookEvent[] {
  const events: WebhookEvent[] = [];
  const providers = Object.keys(WEBHOOK_EVENTS) as IntegrationProvider[];
  let sequence = 0;

  providers.forEach((provider, providerIndex) => {
    const rng = createRng(71000 + providerIndex * 41);
    const names = WEBHOOK_EVENTS[provider] ?? [];
    const count = rng.int(14, 26);

    for (let index = 0; index < count; index += 1) {
      const status = rng.weighted({
        processed: 74,
        pending: 6,
        retrying: 6,
        failed: 9,
        ignored: 5,
      } satisfies Record<WebhookStatus, number>);

      const company = rng.pick(COMPANIES);
      sequence += 1;

      events.push({
        id: `whk_${String(sequence).padStart(5, "0")}`,
        provider,
        event: rng.pick(names),
        status,
        signatureVerified: status !== "failed" || rng.bool(0.7),
        companyName: status === "ignored" ? null : company.name,
        processingMs: status === "pending" ? null : rng.int(18, 3_400),
        retryCount: status === "retrying" ? rng.int(1, 4) : status === "failed" ? 5 : 0,
        errorMessage:
          status === "failed"
            ? rng.pick([
              "Handler threw: tenant not found for external id",
              "Signature verification failed",
              "Downstream CRM write timed out",
            ])
            : null,
        // Payloads reaching this panel are already redacted server-side.
        payloadPreview: {
          externalId: `ext_${rng.int(100000, 999999)}`,
          objectType: provider,
          receivedFields: rng.int(4, 18),
          redacted: true,
        },
        receivedAt: minutesAgo(rng.int(1, 1_440)),
      });
    }
  });

  return events.sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
}

export const WEBHOOK_EVENTS_DATA: readonly WebhookEvent[] = buildWebhookEvents();

export function buildWebhookEndpointSummaries(): WebhookEndpointSummary[] {
  return (Object.keys(WEBHOOK_EVENTS) as IntegrationProvider[]).map((provider) => {
    const rows = WEBHOOK_EVENTS_DATA.filter((event) => event.provider === provider);
    const failed = rows.filter((event) => event.status === "failed").length;
    const latest = rows[0];

    return {
      provider,
      eventsLast24h: rows.length,
      failureRate: Number(((failed / Math.max(rows.length, 1)) * 100).toFixed(1)),
      averageProcessingMs: Math.round(
        rows.reduce((total, event) => total + (event.processingMs ?? 0), 0) / Math.max(rows.length, 1),
      ),
      lastReceivedAt: latest?.receivedAt ?? minutesAgo(600),
      isVerified: rows.every((event) => event.signatureVerified || event.status === "failed"),
    } satisfies WebhookEndpointSummary;
  });
}

export const WEBHOOK_ENDPOINTS: readonly WebhookEndpointSummary[] = buildWebhookEndpointSummaries();

/** Distinct event names, for the webhook filter dropdown. */
export const WEBHOOK_EVENT_NAMES: string[] = [
  ...new Set(Object.values(WEBHOOK_EVENTS).flat()),
].sort();

export const MONITORED_PROVIDER_KEYS: readonly IntegrationProvider[] = MONITORED_PROVIDERS.filter(
  (provider) => provider in INTEGRATION_PROVIDER,
);
