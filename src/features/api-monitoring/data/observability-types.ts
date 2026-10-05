export type ApiEnvironment = "development" | "staging" | "production";
export type ApiTimeRange = "15m" | "1h" | "24h" | "7d" | "30d" | "custom";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiFreshness = "fresh" | "stale" | "missing";
export type ApiServiceCategory = "Core Application API" | "Authentication API" | "Content API" | "Publishing API" | "Billing API" | "External Provider API" | "Platform Operations API";
export type TraceStatus = "complete" | "partial" | "missing";

export interface ApiService {
  id: string;
  name: string;
  category: ApiServiceCategory;
  ownerTeam: string;
  description: string;
  basePath: string;
  dependencyIds: string[];
  environments: ApiEnvironment[];
}

export interface ApiEndpoint {
  id: string;
  serviceId: string;
  method: HttpMethod;
  path: string;
  name: string;
  successTargetMs: number;
  p95TargetMs: number;
  sloTarget: number | null;
  enabled: boolean;
}

export interface ApiRequest {
  id: string;
  requestId: string;
  correlationId: string | null;
  environment: ApiEnvironment;
  endpointId: string;
  serviceId: string;
  method: HttpMethod;
  path: string;
  statusCode: number;
  durationMs: number;
  startedAt: string;
  companyId: string | null;
  companyName: string | null;
  clientName: string | null;
  scope: "platform" | "company" | "client";
  dependencyIds: string[];
  traceId: string | null;
  errorGroupId: string | null;
  relatedJobId: string | null;
  relatedWebhookId: string | null;
  sanitizedRequest: Record<string, string | number | boolean | null>;
  sanitizedResponse: Record<string, string | number | boolean | null>;
}

export interface ApiTraceSpan {
  id: string;
  traceId: string;
  parentId: string | null;
  name: string;
  serviceName: string;
  startedAt: string;
  durationMs: number;
  status: "ok" | "error";
}

export interface ApiErrorGroup {
  id: string;
  fingerprint: string;
  title: string;
  category: "validation" | "authorization" | "rate_limit" | "server_error" | "dependency" | "timeout";
  serviceId: string;
  endpointId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  statusCodes: number[];
  explanation: string;
  /** Requests in the selected window that belong to this group (the request list holds only the most recent ones). Absent in sample data. */
  occurrences?: number;
}

export interface ApiRateLimit {
  id: string;
  serviceId: string;
  endpointId: string;
  bucket: string;
  window: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  resetAt: string | null;
  source: "demo_telemetry" | "provider_header" | "configured_policy" | "observed_telemetry";
}

export interface ApiDependency {
  id: string;
  name: string;
  kind: "internal" | "external_provider" | "database" | "queue" | "webhook";
  ownerModule: "system_health" | "integrations" | "jobs" | "webhooks" | "api_monitoring";
  href: string;
  freshness: ApiFreshness;
  summary: string;
}

export interface ApiActivity {
  id: string;
  at: string;
  type: string;
  source: string;
  message: string;
  serviceId: string | null;
  endpointId: string | null;
}

export interface ApiMonitoringSource {
  id: string;
  name: string;
  freshnessThresholdMinutes: number;
  backendConnected: boolean;
  lastObservedAt: string | null;
}

export interface ApiMonitoringConfig {
  captureHeaders: boolean;
  captureQueryParams: boolean;
  captureBodyPreview: boolean;
  slowRequestThresholdMs: number;
  errorRateWarningPercent: number;
}

/** Figures the server worked out over EVERY request in the window; they stay right when more requests happened than the snapshot lists. */
export interface ApiAggregates {
  windowStart: string;
  totalRequests: number;
  success2xx: number;
  serverErrors: number;
  throttled: number;
  p95: number | null;
  endpoints: Array<{ endpointId: string; requests: number; errors5xx: number; throttled: number; p50: number | null; p95: number | null; p99: number | null; lastSeen: string | null }>;
  services: Array<{ serviceId: string; requests: number; errors5xx: number; throttled: number; p95: number | null }>;
  trend: Array<{ start: string; requests: number; errors5xx: number }>;
  latencyBands: Array<{ label: string; count: number }>;
  availability: Array<{ endpointId: string; buckets: Array<{ requests: number; errors5xx: number }> }>;
  listed: number;
}

export interface ApiMonitoringSnapshot {
  environment: ApiEnvironment;
  generatedAt: string;
  timezone: string;
  services: ApiService[];
  endpoints: ApiEndpoint[];
  requests: ApiRequest[];
  traces: ApiTraceSpan[];
  errorGroups: ApiErrorGroup[];
  rateLimits: ApiRateLimit[];
  dependencies: ApiDependency[];
  activity: ApiActivity[];
  sources: ApiMonitoringSource[];
  config: ApiMonitoringConfig;
  /** Present when the data comes from the live server. */
  aggregates?: ApiAggregates;
}
