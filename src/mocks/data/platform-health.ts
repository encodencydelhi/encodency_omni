import {
  INTEGRATION_PROVIDER,
  type IntegrationError,
  type IntegrationHealth,
  type IntegrationProvider,
  type IntegrationStatus,
} from "@/types/domain/integration";
import type {
  ServiceComponent,
  ServiceStatus,
  SystemHealthSnapshot,
  SystemIncident,
} from "@/types/domain/system-health";
import { buildTrend, createRng, dayKey, daysAgo, minutesAgo } from "../lib/random";
import { ALL_COMPANY_INTEGRATIONS, COMPANIES } from "./tenants";

const PROVIDER_ERRORS: Record<IntegrationProvider, Array<{ code: string; message: string }>> = {
  meta: [
    { code: "OAUTH_190", message: "Access token has expired or been invalidated" },
    { code: "RATE_LIMIT_4", message: "Application request limit reached" },
  ],
  instagram: [
    { code: "MEDIA_9007", message: "Media publish failed: unsupported aspect ratio" },
    { code: "PERM_10", message: "instagram_content_publish permission not granted" },
  ],
  linkedin: [
    { code: "TOKEN_401", message: "Refresh token revoked by the page administrator" },
    { code: "ACL_403", message: "Member is no longer an administrator of this page" },
  ],
  google_business: [
    { code: "QUOTA_429", message: "Daily quota exceeded for location updates" },
    { code: "LOC_404", message: "Location no longer verified" },
  ],
  whatsapp: [
    { code: "TPL_132000", message: "Template parameter count mismatch" },
    { code: "SESSION_131047", message: "Re-engagement outside the 24 hour window" },
  ],
  youtube: [
    { code: "UPLOAD_400", message: "Video processing failed during transcode" },
    { code: "QUOTA_403", message: "Daily upload quota exhausted" },
  ],
  search_console: [
    { code: "SITE_403", message: "Property ownership verification lost" },
    { code: "SYNC_500", message: "Search analytics export timed out" },
  ],
  website_analytics: [
    { code: "TAG_MISSING", message: "Tracker script not detected on the homepage" },
    { code: "INGEST_LAG", message: "Event ingestion delayed beyond the 15 minute target" },
  ],
};

/** Rolls provider health up from the per-company connections already generated. */
function buildIntegrationHealth(): IntegrationHealth[] {
  const providers = Object.keys(INTEGRATION_PROVIDER) as IntegrationProvider[];

  return providers.map((provider, index) => {
    const rng = createRng(21000 + index * 17);
    const connections = ALL_COMPANY_INTEGRATIONS.filter((item) => item.provider === provider);

    const healthy = connections.filter((item) => item.status === "healthy").length;
    const failed = connections.filter((item) => item.status === "disconnected").length;
    const expiring = connections.filter((item) => item.status === "token_expiring").length;
    const degraded = connections.filter((item) => item.status === "degraded").length;
    const permission = connections.filter((item) => item.status === "permission_issue").length;

    const total = Math.max(connections.length, 1);
    const failureRate = (failed / total) * 100;

    const status: IntegrationStatus =
      failureRate > 25
        ? "disconnected"
        : degraded > 0 && degraded >= expiring
          ? "degraded"
          : expiring > 0
            ? "token_expiring"
            : permission > 0
              ? "permission_issue"
              : "healthy";

    const affectedCompanies = new Set(
      connections
        .filter((item) => item.status !== "healthy")
        .map((item) => item.id.split("_")[1] ?? ""),
    ).size;

    const catalogue = PROVIDER_ERRORS[provider];
    const recentErrors: IntegrationError[] = catalogue.map((entry, errorIndex) => ({
      id: `interr_${provider}_${errorIndex}`,
      code: entry.code,
      message: entry.message,
      companyName: rng.pick(COMPANIES).name,
      occurredAt: minutesAgo(rng.int(4, 900)),
      occurrences: rng.int(1, 46),
    }));

    return {
      provider,
      status,
      connectedAccounts: connections.length,
      healthyAccounts: healthy,
      failedAccounts: failed,
      affectedCompanies,
      lastSyncAt: minutesAgo(rng.int(1, 55)),
      errorRate: Number(failureRate.toFixed(1)),
      recentErrors: status === "healthy" ? recentErrors.slice(0, 1) : recentErrors,
    };
  });
}

export const INTEGRATION_HEALTH: readonly IntegrationHealth[] = buildIntegrationHealth();

interface ComponentSeed {
  id: string;
  name: string;
  group: ServiceComponent["group"];
  description: string;
  status: ServiceStatus;
  latencyMs: number | null;
  uptime: number;
}

const COMPONENT_SEEDS: ComponentSeed[] = [
  { id: "svc_api", name: "Public API", group: "core", description: "REST gateway serving the dashboard and integrations", status: "operational", latencyMs: 142, uptime: 99.98 },
  { id: "svc_auth", name: "Authentication", group: "core", description: "Session issuing, refresh rotation and SSO", status: "operational", latencyMs: 88, uptime: 99.99 },
  { id: "svc_db", name: "PostgreSQL Primary", group: "data", description: "Primary transactional database", status: "operational", latencyMs: 11, uptime: 99.99 },
  { id: "svc_replica", name: "PostgreSQL Replica", group: "data", description: "Read replica serving analytics queries", status: "degraded", latencyMs: 64, uptime: 99.42 },
  { id: "svc_redis", name: "Redis", group: "data", description: "Cache and BullMQ backing store", status: "operational", latencyMs: 3, uptime: 99.97 },
  { id: "svc_queue", name: "Job Queue", group: "workers", description: "BullMQ dispatcher across all queues", status: "operational", latencyMs: null, uptime: 99.95 },
  { id: "svc_workers", name: "Channel Workers", group: "workers", description: "Meta, LinkedIn, Google and WhatsApp publishers", status: "operational", latencyMs: null, uptime: 99.91 },
  { id: "svc_analytics", name: "Analytics Sync", group: "workers", description: "Scheduled metric pulls from connected platforms", status: "degraded", latencyMs: null, uptime: 98.76 },
  { id: "svc_crawler", name: "SEO Crawler", group: "workers", description: "Site audit crawler and rules engine", status: "partial_outage", latencyMs: null, uptime: 96.4 },
  { id: "svc_webhooks", name: "Webhook Receiver", group: "edge", description: "Inbound event ingestion and signature verification", status: "operational", latencyMs: 46, uptime: 99.96 },
  { id: "svc_storage", name: "Object Storage", group: "edge", description: "Media library and generated report artefacts", status: "operational", latencyMs: 120, uptime: 99.99 },
  { id: "svc_cdn", name: "CDN", group: "edge", description: "Static asset and media delivery", status: "operational", latencyMs: 24, uptime: 100 },
];

const STATUS_SEVERITY: ServiceStatus[] = ["outage", "partial_outage", "degraded", "maintenance", "operational"];

function buildComponents(): ServiceComponent[] {
  return COMPONENT_SEEDS.map((seed, index) => {
    const rng = createRng(31000 + index * 11);
    return {
      ...seed,
      uptimePercent: seed.uptime,
      lastIncidentAt: seed.status === "operational" ? (rng.bool(0.5) ? daysAgo(rng.int(9, 60)) : null) : daysAgo(rng.float(0, 2, 2)),
      history: Array.from({ length: 30 }, (_, dayIndex) => ({
        date: dayKey(29 - dayIndex),
        value: rng.bool(0.9) ? 100 : Number(rng.float(seed.uptime - 4, 100, 2).toFixed(2)),
      })),
    } satisfies ServiceComponent;
  });
}

const INCIDENTS: SystemIncident[] = [
  {
    id: "inc_2026_014",
    title: "SEO crawler workers backing up on large sites",
    severity: "major",
    status: "identified",
    component: "SEO Crawler",
    startedAt: minutesAgo(196),
    resolvedAt: null,
  },
  {
    id: "inc_2026_013",
    title: "Analytics sync lag for Meta insights",
    severity: "minor",
    status: "monitoring",
    component: "Analytics Sync",
    startedAt: minutesAgo(430),
    resolvedAt: null,
  },
  {
    id: "inc_2026_012",
    title: "Elevated read latency on the analytics replica",
    severity: "minor",
    status: "resolved",
    component: "PostgreSQL Replica",
    startedAt: daysAgo(2.4),
    resolvedAt: daysAgo(2.2),
  },
];

function buildSystemHealth(): SystemHealthSnapshot {
  const rng = createRng(41000);
  const components = buildComponents();

  const overallStatus =
    STATUS_SEVERITY.find((status) => components.some((component) => component.status === status)) ??
    "operational";

  return {
    overallStatus,
    capturedAt: minutesAgo(1),
    components,
    metrics: {
      apiRequestsPerMinute: 8_420,
      averageResponseMs: 142,
      p95ResponseMs: 486,
      errorRatePercent: 0.42,
      queueDepth: 1_284,
      activeWorkers: 34,
      databaseConnections: 118,
      cacheHitRatePercent: 96.3,
    },
    responseTimeTrend: buildTrend({ rng, days: 30, start: 168, end: 142, noise: 0.14 }),
    incidents: INCIDENTS,
  };
}

export const SYSTEM_HEALTH: SystemHealthSnapshot = buildSystemHealth();
