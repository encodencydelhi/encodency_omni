import { ROUTES } from "@/config/routes";
import type { ApiEndpoint, ApiEnvironment, ApiMonitoringSnapshot, ApiRequest, ApiService, ApiTraceSpan } from "./observability-types";

const base = new Date("2026-09-21T07:30:00.000Z");
const iso = (minutes: number) => new Date(base.getTime() + minutes * 60_000).toISOString();

export const services: ApiService[] = [
  { id: "api-core", name: "Core Application API", category: "Core Application API", ownerTeam: "Platform Engineering", description: "Super Admin and tenant dashboard request surface.", basePath: "/api", dependencyIds: ["dep-db", "dep-cache"], environments: ["development", "staging", "production"] },
  { id: "api-auth", name: "Authentication API", category: "Authentication API", ownerTeam: "Platform Engineering", description: "Login, MFA, session refresh and access checks.", basePath: "/api/auth", dependencyIds: ["dep-db"], environments: ["development", "staging", "production"] },
  { id: "api-content", name: "Content & Campaign API", category: "Content API", ownerTeam: "Content Studio", description: "Content drafts, calendars and campaign read/write requests.", basePath: "/api/content", dependencyIds: ["dep-storage", "dep-jobs"], environments: ["staging", "production"] },
  { id: "api-publishing", name: "Publishing API", category: "Publishing API", ownerTeam: "Integrations", description: "Synchronous publish orchestration and provider submission records.", basePath: "/api/publishing", dependencyIds: ["dep-jobs", "dep-meta"], environments: ["staging", "production"] },
  { id: "api-billing", name: "Billing API", category: "Billing API", ownerTeam: "Finance Operations", description: "Billing account, invoice and payment read models.", basePath: "/api/billing", dependencyIds: ["dep-db"], environments: ["staging", "production"] },
  { id: "api-provider-meta", name: "Meta Provider API", category: "External Provider API", ownerTeam: "Integrations", description: "Observed outbound Meta Graph API requests summarized without OAuth controls.", basePath: "graph.facebook.com", dependencyIds: ["dep-meta"], environments: ["production"] },
];

export const endpoints: ApiEndpoint[] = [
  { id: "ep-core-companies", serviceId: "api-core", method: "GET", path: "/api/companies", name: "Company directory", successTargetMs: 300, p95TargetMs: 650, sloTarget: 99.5, enabled: true },
  { id: "ep-core-client", serviceId: "api-core", method: "GET", path: "/api/clients/{clientId}", name: "Client detail", successTargetMs: 300, p95TargetMs: 700, sloTarget: 99.3, enabled: true },
  { id: "ep-auth-login", serviceId: "api-auth", method: "POST", path: "/api/auth/login", name: "Staff login", successTargetMs: 250, p95TargetMs: 500, sloTarget: 99.9, enabled: true },
  { id: "ep-content-draft", serviceId: "api-content", method: "POST", path: "/api/content/drafts", name: "Create content draft", successTargetMs: 600, p95TargetMs: 1200, sloTarget: 99, enabled: true },
  { id: "ep-publish-submit", serviceId: "api-publishing", method: "POST", path: "/api/publishing/submit", name: "Submit publish request", successTargetMs: 900, p95TargetMs: 1600, sloTarget: 98.8, enabled: true },
  { id: "ep-billing-invoices", serviceId: "api-billing", method: "GET", path: "/api/billing/invoices", name: "Invoice directory", successTargetMs: 350, p95TargetMs: 800, sloTarget: null, enabled: true },
  { id: "ep-meta-feed", serviceId: "api-provider-meta", method: "POST", path: "/v21.0/{page-id}/feed", name: "Meta feed publish", successTargetMs: 1100, p95TargetMs: 2200, sloTarget: 98, enabled: true },
  { id: "ep-meta-insights", serviceId: "api-provider-meta", method: "GET", path: "/v21.0/{page-id}/insights", name: "Meta insights", successTargetMs: 900, p95TargetMs: 2000, sloTarget: null, enabled: true },
  { id: "ep-unused", serviceId: "api-content", method: "PATCH", path: "/api/content/templates/{id}", name: "Template update", successTargetMs: 500, p95TargetMs: 1000, sloTarget: null, enabled: true },
];

const companies = [
  ["cmp_namo-gange-trust", "Namo Gange Trust", "Namo Gange Wellness"],
  ["cmp_blue-harbour-logistics", "Blue Harbour Logistics", "Harbour Freight"],
  ["cmp_meridian-digital", "Meridian Digital", "Meridian Studio"],
] as const;

const statusCycle = [200, 200, 200, 201, 204, 400, 401, 404, 429, 500, 503] as const;

function makeRequest(index: number, endpoint: ApiEndpoint, environment: ApiEnvironment, minutesAgo: number): ApiRequest {
  const statusCode = statusCycle[(index + endpoint.id.length) % statusCycle.length] ?? 200;
  const company = companies[index % companies.length] ?? companies[0]!;
  const isProvider = endpoint.serviceId.includes("provider");
  const durationMs = endpoint.successTargetMs + ((index * 73) % 1800) + (statusCode >= 500 ? 900 : 0);
  const errorGroupId = statusCode === 429 ? "err-rate-meta" : statusCode >= 500 ? (statusCode === 503 ? "err-provider-unavailable" : "err-core-500") : statusCode === 400 ? "err-validation" : null;
  const traceId = index % 5 === 0 ? null : `trace_${environment}_${index}`;
  return {
    id: `req-${environment}-${String(index).padStart(4, "0")}`,
    requestId: `req_${environment}_${100000 + index}`,
    correlationId: index % 4 === 0 ? `corr_publish_${index}` : null,
    environment,
    endpointId: endpoint.id,
    serviceId: endpoint.serviceId,
    method: endpoint.method,
    path: endpoint.path,
    statusCode,
    durationMs,
    startedAt: iso(-minutesAgo),
    companyId: index % 6 === 0 ? null : company[0],
    companyName: index % 6 === 0 ? null : company[1],
    clientName: index % 6 === 0 ? null : company[2],
    scope: index % 6 === 0 ? "platform" : "client",
    dependencyIds: isProvider ? ["dep-meta"] : endpoint.serviceId === "api-publishing" ? ["dep-jobs", "dep-meta"] : endpoint.serviceId === "api-content" ? ["dep-storage"] : ["dep-db"],
    traceId,
    errorGroupId,
    relatedJobId: endpoint.serviceId === "api-publishing" && index % 3 === 0 ? "job_00042" : null,
    relatedWebhookId: index % 13 === 0 ? "whk_00012" : null,
    sanitizedRequest: { bodyPreview: statusCode === 400 ? "validation fields only" : "redacted", token: "[redacted]", cookie: "[redacted]", bytes: 840 + index },
    sanitizedResponse: { statusCode, bodyPreview: statusCode >= 500 ? "error envelope only" : "summary only", bytes: 540 + index },
  };
}

function buildRequests(environment: ApiEnvironment): ApiRequest[] {
  const envEndpoints = endpoints.filter((endpoint) => services.find((service) => service.id === endpoint.serviceId)?.environments.includes(environment));
  return Array.from({ length: environment === "development" ? 42 : environment === "staging" ? 74 : 128 }, (_, index) => makeRequest(index + 1, envEndpoints[index % envEndpoints.length]!, environment, 2 + index * (environment === "production" ? 11 : 19)));
}

function buildTraces(requests: ApiRequest[]): ApiTraceSpan[] {
  return requests.flatMap((request) => request.traceId ? [
    { id: `${request.traceId}-root`, traceId: request.traceId, parentId: null, name: `${request.method} ${request.path}`, serviceName: request.serviceId, startedAt: request.startedAt, durationMs: request.durationMs, status: request.statusCode >= 500 ? "error" : "ok" },
    { id: `${request.traceId}-auth`, traceId: request.traceId, parentId: `${request.traceId}-root`, name: "Authorize request", serviceName: "api-auth", startedAt: iso(-10), durationMs: Math.min(90, request.durationMs), status: request.statusCode === 401 ? "error" : "ok" },
    { id: `${request.traceId}-dep`, traceId: request.traceId, parentId: `${request.traceId}-root`, name: "Dependency call", serviceName: request.dependencyIds[0] ?? "internal", startedAt: iso(-9), durationMs: Math.max(40, Math.round(request.durationMs * 0.42)), status: request.statusCode >= 500 ? "error" : "ok" },
  ] : []);
}

export function buildApiMonitoringSnapshot(environment: ApiEnvironment): ApiMonitoringSnapshot {
  const requests = buildRequests(environment);
  return {
    environment,
    generatedAt: base.toISOString(),
    timezone: "Asia/Calcutta",
    services: services.filter((service) => service.environments.includes(environment)),
    endpoints: endpoints.filter((endpoint) => services.find((service) => service.id === endpoint.serviceId)?.environments.includes(environment)),
    requests,
    traces: buildTraces(requests),
    errorGroups: [
      { id: "err-validation", fingerprint: "400:validation", title: "Validation rejected malformed request", category: "validation", serviceId: "api-content", endpointId: "ep-content-draft", firstSeenAt: iso(-720), lastSeenAt: iso(-44), statusCodes: [400], explanation: "Client submitted invalid fields. This is not classified as platform infrastructure failure." },
      { id: "err-rate-meta", fingerprint: "429:meta-rate", title: "Provider rate limit reached", category: "rate_limit", serviceId: "api-provider-meta", endpointId: "ep-meta-feed", firstSeenAt: iso(-310), lastSeenAt: iso(-16), statusCodes: [429], explanation: "Meta returned throttling. Remaining provider capacity is unavailable unless response headers include it." },
      { id: "err-core-500", fingerprint: "500:core", title: "Internal API error envelope", category: "server_error", serviceId: "api-core", endpointId: "ep-core-client", firstSeenAt: iso(-260), lastSeenAt: iso(-31), statusCodes: [500], explanation: "Server-side demo error records grouped by sanitized stack fingerprint." },
      { id: "err-provider-unavailable", fingerprint: "503:provider", title: "Provider dependency unavailable", category: "dependency", serviceId: "api-provider-meta", endpointId: "ep-meta-insights", firstSeenAt: iso(-180), lastSeenAt: iso(-22), statusCodes: [503], explanation: "External provider unavailable response. OAuth and account management remain in Integrations." },
    ],
    rateLimits: [
      { id: "rl-core", serviceId: "api-core", endpointId: "ep-core-companies", bucket: "platform-read", window: "1 minute", limit: 6000, used: 1840, remaining: 4160, resetAt: iso(1), source: "configured_policy" },
      { id: "rl-meta", serviceId: "api-provider-meta", endpointId: "ep-meta-feed", bucket: "meta-page-publish", window: "provider rolling window", limit: null, used: 429, remaining: null, resetAt: null, source: "provider_header" },
      { id: "rl-auth", serviceId: "api-auth", endpointId: "ep-auth-login", bucket: "auth-login", window: "5 minutes", limit: 120, used: 46, remaining: 74, resetAt: iso(3), source: "configured_policy" },
    ],
    dependencies: [
      { id: "dep-db", name: "Primary Database", kind: "database", ownerModule: "system_health", href: ROUTES.superAdmin.systemHealth, freshness: "fresh", summary: "Database health belongs to System Health; API Monitoring records request impact only." },
      { id: "dep-jobs", name: "Background Queue", kind: "queue", ownerModule: "jobs", href: ROUTES.superAdmin.jobs, freshness: "fresh", summary: "Related jobs can be opened in Jobs & Queues; replay is not offered here." },
      { id: "dep-meta", name: "Meta Provider", kind: "external_provider", ownerModule: "integrations", href: ROUTES.superAdmin.integrations, freshness: "stale", summary: "Provider authorization and account state remain owned by Integrations." },
      { id: "dep-storage", name: "Media Storage", kind: "internal", ownerModule: "system_health", href: ROUTES.superAdmin.systemHealth, freshness: "fresh", summary: "Storage dependency surfaced for diagnostics only." },
    ],
    activity: [
      { id: "act-api-1", at: iso(-16), type: "Rate limit observed", source: "Demo API Telemetry", message: "HTTP 429 records grouped for Meta feed publish.", serviceId: "api-provider-meta", endpointId: "ep-meta-feed" },
      { id: "act-api-2", at: iso(-22), type: "Dependency error grouped", source: "Demo API Telemetry", message: "HTTP 503 provider unavailable errors grouped.", serviceId: "api-provider-meta", endpointId: "ep-meta-insights" },
      { id: "act-api-3", at: iso(-31), type: "Server error observed", source: "Demo API Telemetry", message: "HTTP 500 core API records captured with sanitized metadata.", serviceId: "api-core", endpointId: "ep-core-client" },
      { id: "act-api-4", at: iso(-80), type: "Configuration draft saved", source: "Frontend Demo State", message: "Monitoring thresholds changed locally only.", serviceId: null, endpointId: null },
    ],
    sources: [
      { id: "src-demo-api", name: "Shared Demo API Telemetry", freshnessThresholdMinutes: 15, backendConnected: false, lastObservedAt: iso(-2) },
      { id: "src-trace-demo", name: "Demo Trace Fixtures", freshnessThresholdMinutes: 30, backendConnected: false, lastObservedAt: iso(-11) },
      { id: "src-provider-limits", name: "Provider Rate Limit Headers", freshnessThresholdMinutes: 20, backendConnected: false, lastObservedAt: iso(-16) },
    ],
    config: { captureHeaders: false, captureQueryParams: true, captureBodyPreview: true, slowRequestThresholdMs: 1200, errorRateWarningPercent: 2.5 },
  };
}
