/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Module Constants, Badge Metadata and Configuration
 */

import type {
  EndpointStatus,
  ErrorCategory,
  RateLimitState,
  LogSeverity,
  TimeRange,
} from "./types";

export const MOCK_REFERENCE_TIME = new Date("2026-09-19T12:00:00Z").getTime();

export const SESSION_STORAGE_KEYS = {
  apiMonitoringStore: "encodency_api_monitoring_workspace_v1",
};

export const ENDPOINT_STATUS_META: Record<
  EndpointStatus,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  healthy: {
    label: "Healthy",
    tone: "success",
    description: "Endpoint is responding normally with expected success rates.",
  },
  degraded: {
    label: "Degraded",
    tone: "warning",
    description: "Endpoint is experiencing elevated error rates or latency.",
  },
  failing: {
    label: "Failing",
    tone: "danger",
    description: "Endpoint is returning errors for most requests.",
  },
  inactive: {
    label: "Inactive",
    tone: "neutral",
    description: "Endpoint has not received requests in the monitoring window.",
  },
};

export const RATE_LIMIT_STATE_META: Record<
  RateLimitState,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  normal: {
    label: "Normal",
    tone: "success",
    description: "Rate limit usage is within normal parameters.",
  },
  approaching: {
    label: "Approaching Limit",
    tone: "warning",
    description: "Rate limit usage is above 70% of the configured maximum.",
  },
  throttled: {
    label: "Throttled",
    tone: "danger",
    description: "Requests are being throttled due to rate limit constraints.",
  },
  exceeded: {
    label: "Exceeded",
    tone: "danger",
    description: "Rate limit has been exceeded. Requests may be rejected.",
  },
};

export const ERROR_CATEGORY_META: Record<
  ErrorCategory,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  authentication: {
    label: "Authentication",
    tone: "danger",
    description: "Requests failed due to invalid or missing authentication credentials.",
  },
  authorization: {
    label: "Authorization",
    tone: "danger",
    description: "Requests failed due to insufficient permissions or expired tokens.",
  },
  rate_limit: {
    label: "Rate Limited",
    tone: "warning",
    description: "Requests were rejected due to rate limiting.",
  },
  validation: {
    label: "Validation",
    tone: "warning",
    description: "Requests failed due to invalid parameters or request body.",
  },
  not_found: {
    label: "Not Found",
    tone: "neutral",
    description: "Requested resource was not found.",
  },
  server_error: {
    label: "Server Error",
    tone: "danger",
    description: "Internal server errors occurred during request processing.",
  },
  timeout: {
    label: "Timeout",
    tone: "warning",
    description: "Requests timed out before receiving a response.",
  },
  network: {
    label: "Network",
    tone: "danger",
    description: "Network connectivity issues prevented request completion.",
  },
  provider_error: {
    label: "Provider Error",
    tone: "danger",
    description: "External provider returned an error response.",
  },
};

export const LOG_SEVERITY_META: Record<
  LogSeverity,
  { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; description: string }
> = {
  info: {
    label: "Info",
    tone: "info",
    description: "Informational log entry.",
  },
  warning: {
    label: "Warning",
    tone: "warning",
    description: "Warning log entry indicating potential issues.",
  },
  error: {
    label: "Error",
    tone: "danger",
    description: "Error log entry indicating failed operations.",
  },
  critical: {
    label: "Critical",
    tone: "danger",
    description: "Critical log entry indicating severe failures.",
  },
};

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "Last 1 Hour" },
  { value: "6h", label: "Last 6 Hours" },
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

export const PROVIDER_CATEGORIES = [
  "Social",
  "Local",
  "Messaging",
  "Video",
  "SEO",
  "Analytics",
  "Media",
  "Internal",
] as const;

export const ENDPOINT_CATEGORIES = [
  "Publishing",
  "Analytics",
  "Engagement",
  "Sync",
  "Webhooks",
  "Auth",
  "Media",
  "Search",
] as const;
