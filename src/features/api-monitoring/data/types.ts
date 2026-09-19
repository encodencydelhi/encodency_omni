/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Domain Types and Contracts
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type EndpointStatus = "healthy" | "degraded" | "failing" | "inactive";

export type RateLimitState = "normal" | "approaching" | "throttled" | "exceeded";

export type ErrorCategory =
  | "authentication"
  | "authorization"
  | "rate_limit"
  | "validation"
  | "not_found"
  | "server_error"
  | "timeout"
  | "network"
  | "provider_error";

export type LogSeverity = "info" | "warning" | "error" | "critical";

export type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  displayName: string;
  provider: string;
  category: string;
  status: EndpointStatus;
  totalRequests24h: number;
  successRate: number;
  avgResponseMs: number;
  p95ResponseMs: number;
  p99ResponseMs: number;
  errorCount24h: number;
  rateLimitState: RateLimitState;
  rateLimitMax: number;
  rateLimitRemaining: number;
  rateLimitResetsAt: string;
  lastCalledAt: string;
  lastErrorAt: string | null;
  lastError: string | null;
}

export interface ApiErrorLog {
  id: string;
  timestamp: string;
  endpointId: string;
  method: HttpMethod;
  path: string;
  provider: string;
  statusCode: number;
  category: ErrorCategory;
  message: string;
  requestBody: string | null;
  responseBody: string | null;
  durationMs: number;
  severity: LogSeverity;
}

export interface ApiRequestLog {
  id: string;
  timestamp: string;
  endpointId: string;
  method: HttpMethod;
  path: string;
  provider: string;
  statusCode: number;
  durationMs: number;
  requestSize: number;
  responseSize: number;
  severity: LogSeverity;
}

export interface ProviderApiHealth {
  provider: string;
  providerName: string;
  status: EndpointStatus;
  totalRequests24h: number;
  successRate: number;
  avgResponseMs: number;
  errorCount24h: number;
  rateLimitState: RateLimitState;
  endpointCount: number;
}

export interface ApiMonitoringKpis {
  totalRequests24h: number;
  successRate: number;
  avgResponseMs: number;
  errorRate: number;
  rateLimitedRequests: number;
  activeEndpoints: number;
  totalEndpoints: number;
  p95ResponseMs: number;
}

export interface ErrorBreakdown {
  category: ErrorCategory;
  count: number;
  percentage: number;
  topMessage: string;
}

export interface RequestTrendPoint {
  timestamp: string;
  requests: number;
  errors: number;
  avgMs: number;
}

export interface ApiMonitoringActivity {
  id: string;
  timestamp: string;
  type:
    | "endpoint_enabled"
    | "endpoint_disabled"
    | "rate_limit_changed"
    | "error_spike_detected"
    | "error_spike_resolved"
    | "threshold_alert"
    | "configuration_updated"
    | "provider_health_changed";
  provider: string;
  endpoint: string | null;
  message: string;
  severity: LogSeverity;
  actor: string;
}
