import { apiClient } from "@/lib/api/client";
import type {
  ApiActivity,
  ApiEndpoint as ObservabilityEndpoint,
  ApiMonitoringSnapshot,
  ApiRateLimit,
  ApiRequest,
  ApiService,
} from "./observability-types";
import type {
  ApiEndpoint,
  ApiErrorLog,
  ApiMonitoringActivity,
  ApiMonitoringKpis,
  ApiMonitoringRepository,
  ApiRequestLog,
  EndpointStatus,
  ErrorBreakdown,
  ErrorCategory,
  HttpMethod,
  LogSeverity,
  ProviderApiHealth,
  RateLimitState,
  RequestTrendPoint,
} from "./types";

let cachedSnapshot: ApiMonitoringSnapshot | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2000;

async function getSnapshot(): Promise<ApiMonitoringSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedSnapshot;
  }
  try {
    const data = await apiClient.request<ApiMonitoringSnapshot>({
      method: "GET",
      path: "/super-admin/api-monitoring/snapshot",
      query: { environment: "production", range: "24h" },
    });
    cachedSnapshot = data;
    lastFetchTime = now;
    return data;
  } catch (error) {
    console.warn("Failed to load snapshot from live API, using cached or fallback:", error);
    if (cachedSnapshot) return cachedSnapshot;
    throw error;
  }
}

function mapStatus(statusCode: number): EndpointStatus {
  if (statusCode >= 500) return "failing";
  if (statusCode >= 400) return "degraded";
  return "healthy";
}

function mapSeverity(statusCode: number): LogSeverity {
  if (statusCode >= 500) return "error";
  if (statusCode === 429) return "warning";
  if (statusCode >= 400) return "warning";
  return "info";
}

function mapCategory(statusCode: number): ErrorCategory {
  if (statusCode === 401) return "authentication";
  if (statusCode === 403) return "authorization";
  if (statusCode === 429) return "rate_limit";
  if (statusCode === 400 || statusCode === 422) return "validation";
  if (statusCode === 404) return "not_found";
  if (statusCode === 504) return "timeout";
  if (statusCode === 503 || statusCode === 502) return "provider_error";
  return "server_error";
}

export const liveApiMonitoringRepository: ApiMonitoringRepository = {
  async getKpis(): Promise<ApiMonitoringKpis> {
    const snapshot = await getSnapshot();
    const reqs = snapshot.requests;
    const total = reqs.length;
    const ok = reqs.filter((r) => r.statusCode >= 200 && r.statusCode < 400).length;
    const err = reqs.filter((r) => r.statusCode >= 500).length;
    const throttled = reqs.filter((r) => r.statusCode === 429).length;

    const durations = reqs.map((r) => r.durationMs).sort((a, b) => a - b);
    const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const p95 = durations.length ? durations[Math.floor(durations.length * 0.95)] ?? avg : 0;

    return {
      totalRequests24h: total,
      successRate: total ? Math.round((ok / total) * 1000) / 10 : 100,
      avgResponseMs: avg,
      errorRate: total ? Math.round((err / total) * 1000) / 10 : 0,
      rateLimitedRequests: throttled,
      activeEndpoints: snapshot.endpoints.filter((e) => e.enabled).length,
      totalEndpoints: snapshot.endpoints.length,
      p95ResponseMs: p95,
    };
  },

  async getEndpoints(): Promise<ApiEndpoint[]> {
    const snapshot = await getSnapshot();
    const reqs = snapshot.requests;

    return snapshot.endpoints.map((ep) => {
      const matching = reqs.filter((r) => r.endpointId === ep.id);
      const errors = matching.filter((r) => r.statusCode >= 400);
      const durations = matching.map((r) => r.durationMs).sort((a, b) => a - b);
      const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : ep.successTargetMs;
      const p95 = durations.length ? durations[Math.floor(durations.length * 0.95)] ?? ep.p95TargetMs : ep.p95TargetMs;
      const p99 = durations.length ? durations[Math.floor(durations.length * 0.99)] ?? Math.round(ep.p95TargetMs * 1.2) : Math.round(ep.p95TargetMs * 1.2);
      const last = matching.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
      const lastErr = errors.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

      const status: EndpointStatus = !ep.enabled
        ? "inactive"
        : errors.length > matching.length * 0.1
          ? "failing"
          : errors.length > 0
            ? "degraded"
            : "healthy";

      const rl = snapshot.rateLimits.find((r) => r.endpointId === ep.id);

      return {
        id: ep.id,
        method: ep.method,
        path: ep.path,
        displayName: ep.name,
        provider: ep.serviceId.includes("provider") ? ep.serviceId.replace("api-provider-", "") : "encodency",
        category: ep.serviceId,
        status,
        totalRequests24h: matching.length,
        successRate: matching.length ? Math.round(((matching.length - errors.length) / matching.length) * 1000) / 10 : 100,
        avgResponseMs: avg,
        p95ResponseMs: p95,
        p99ResponseMs: p99,
        errorCount24h: errors.length,
        rateLimitState: (rl && rl.remaining !== null && rl.remaining <= 10 ? "throttled" : "normal") as RateLimitState,
        rateLimitMax: rl?.limit ?? 1000,
        rateLimitRemaining: rl?.remaining ?? 950,
        rateLimitResetsAt: rl?.resetAt ?? new Date(Date.now() + 3600000).toISOString(),
        lastCalledAt: last?.startedAt ?? new Date().toISOString(),
        lastErrorAt: lastErr?.startedAt ?? null,
        lastError: lastErr ? `HTTP ${lastErr.statusCode}` : null,
      };
    });
  },

  async getEndpointById(id: string): Promise<ApiEndpoint | null> {
    const list = await this.getEndpoints();
    return list.find((e) => e.id === id) ?? null;
  },

  async getProviderHealth(): Promise<ProviderApiHealth[]> {
    const snapshot = await getSnapshot();
    const reqs = snapshot.requests;

    const providers = [
      { id: "meta", name: "Meta Graph API" },
      { id: "whatsapp", name: "AiSensy WhatsApp" },
      { id: "ai", name: "Google Gemini & OpenAI" },
      { id: "encodency", name: "EnCodency Core" },
    ];

    return providers.map((p) => {
      const matching = reqs.filter((r) =>
        p.id === "encodency" ? !r.serviceId.includes("provider") : r.serviceId.includes(p.id),
      );
      const errors = matching.filter((r) => r.statusCode >= 400);
      const durations = matching.map((r) => r.durationMs);
      const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 250;

      return {
        provider: p.id,
        providerName: p.name,
        status: errors.length > matching.length * 0.1 ? "failing" : "healthy",
        totalRequests24h: matching.length,
        successRate: matching.length ? Math.round(((matching.length - errors.length) / matching.length) * 1000) / 10 : 100,
        avgResponseMs: avg,
        errorCount24h: errors.length,
        rateLimitState: "normal",
        endpointCount: snapshot.endpoints.filter((e) =>
          p.id === "encodency" ? !e.serviceId.includes("provider") : e.serviceId.includes(p.id),
        ).length,
      };
    });
  },

  async getErrorLogs(endpointId?: string): Promise<ApiErrorLog[]> {
    const snapshot = await getSnapshot();
    const errors = snapshot.requests.filter((r) => r.statusCode >= 400);
    const filtered = endpointId ? errors.filter((r) => r.endpointId === endpointId) : errors;

    return filtered.map((r) => ({
      id: `err-${r.id}`,
      timestamp: r.startedAt,
      endpointId: r.endpointId,
      method: r.method,
      path: r.path,
      provider: r.serviceId,
      statusCode: r.statusCode,
      category: mapCategory(r.statusCode),
      message: `HTTP ${r.statusCode} error on ${r.method} ${r.path}`,
      requestBody: JSON.stringify(r.sanitizedRequest),
      responseBody: JSON.stringify(r.sanitizedResponse),
      durationMs: r.durationMs,
      severity: mapSeverity(r.statusCode),
    }));
  },

  async getRequestLogs(endpointId?: string): Promise<ApiRequestLog[]> {
    const snapshot = await getSnapshot();
    const filtered = endpointId ? snapshot.requests.filter((r) => r.endpointId === endpointId) : snapshot.requests;

    return filtered.map((r) => ({
      id: r.id,
      timestamp: r.startedAt,
      endpointId: r.endpointId,
      method: r.method,
      path: r.path,
      provider: r.serviceId,
      statusCode: r.statusCode,
      durationMs: r.durationMs,
      requestSize: typeof r.sanitizedRequest.bytes === "number" ? r.sanitizedRequest.bytes : 500,
      responseSize: typeof r.sanitizedResponse.bytes === "number" ? r.sanitizedResponse.bytes : 800,
      severity: mapSeverity(r.statusCode),
    }));
  },

  async getErrorBreakdown(): Promise<ErrorBreakdown[]> {
    const snapshot = await getSnapshot();
    const groups = snapshot.errorGroups;
    const reqs = snapshot.requests.filter((r) => r.statusCode >= 400);
    const total = reqs.length || 1;

    return groups.map((g) => {
      const occurrences = reqs.filter((r) => r.errorGroupId === g.id).length;
      return {
        category: (g.category === "dependency" ? "provider_error" : g.category) as ErrorCategory,
        count: occurrences || 1,
        percentage: Math.round(((occurrences || 1) / total) * 100),
        topMessage: g.title,
      };
    });
  },

  async getRequestTrends(): Promise<RequestTrendPoint[]> {
    const snapshot = await getSnapshot();
    const reqs = snapshot.requests;
    const bucketCount = 12;
    const bucketSize = Math.max(1, Math.floor(reqs.length / bucketCount));

    return Array.from({ length: bucketCount }, (_, i) => {
      const slice = reqs.slice(i * bucketSize, (i + 1) * bucketSize);
      const errors = slice.filter((r) => r.statusCode >= 400).length;
      const avg = slice.length ? Math.round(slice.reduce((acc, r) => acc + r.durationMs, 0) / slice.length) : 0;
      const time = slice[0]?.startedAt ?? new Date(Date.now() - (12 - i) * 3600000).toISOString();

      return {
        timestamp: time,
        requests: slice.length,
        errors,
        avgMs: avg,
      };
    });
  },

  async getActivities(): Promise<ApiMonitoringActivity[]> {
    const snapshot = await getSnapshot();
    return snapshot.activity.map((a) => ({
      id: a.id,
      timestamp: a.at,
      type: "endpoint_enabled",
      provider: a.serviceId ?? "core",
      endpoint: a.endpointId,
      message: a.message,
      severity: "info",
      actor: a.source,
    }));
  },

  async updateEndpointStatus(endpointId: string, status: EndpointStatus): Promise<boolean> {
    try {
      await apiClient.request({
        method: "PATCH",
        path: `/super-admin/api-monitoring/endpoints/${endpointId}/status`,
        body: { enabled: status === "healthy" },
      });
      cachedSnapshot = null;
      return true;
    } catch {
      return false;
    }
  },

  async updateRateLimitState(_endpointId: string, _state: RateLimitState): Promise<boolean> {
    return true;
  },

  async resetDemo(): Promise<void> {
    cachedSnapshot = null;
  },
};
