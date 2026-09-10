import type { StatusRegistry, TrendPoint } from "@/types/common";
import type { IntegrationProvider } from "./integration";

export const ENDPOINT_HEALTH = {
  healthy: { label: "Healthy", tone: "success" },
  slow: { label: "Slow", tone: "warning", description: "p95 latency above target" },
  erroring: { label: "Erroring", tone: "danger" },
  rate_limited: { label: "Rate Limited", tone: "warning" },
} as const satisfies StatusRegistry<string>;

export type EndpointHealth = keyof typeof ENDPOINT_HEALTH;

export interface ApiEndpointMetric {
  id: string;
  provider: IntegrationProvider;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  health: EndpointHealth;
  calls: number;
  successRate: number;
  failedCalls: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  rateLimitUsedPercent: number;
  lastCalledAt: string;
}

export interface ApiMonitoringSummary {
  totalCalls: number;
  successRate: number;
  failedCalls: number;
  averageLatencyMs: number;
  callsTrend: TrendPoint[];
  errorTrend: TrendPoint[];
  providerBreakdown: Array<{
    provider: IntegrationProvider;
    calls: number;
    successRate: number;
    averageLatencyMs: number;
    rateLimitUsedPercent: number;
  }>;
}

export interface ApiMonitoringFilters {
  provider: IntegrationProvider;
  health: EndpointHealth;
}

export type ApiEndpointSortField = "calls" | "successRate" | "averageLatencyMs" | "p95LatencyMs";
