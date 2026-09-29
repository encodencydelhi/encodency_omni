import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { HealthCheckResponse, ServiceComponent, SystemHealthSnapshot } from "@/types/domain/system-health";

function canFallBack(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return true;
  return error.status === 0 || error.status === 404 || error.status >= 500;
}

/** Builds a snapshot out of the real `GET /health` probe when `/system-health` is unavailable. */
function snapshotFromHealth(health: HealthCheckResponse): SystemHealthSnapshot {
  const now = new Date().toISOString();
  const databaseUp = health.database === "connected";
  const apiUp = health.status === "ok";

  const component = (id: string, name: string, group: ServiceComponent["group"], up: boolean, description: string): ServiceComponent => ({
    id,
    name,
    group,
    status: up ? "operational" : "outage",
    description,
    uptimePercent: up ? 100 : 0,
    latencyMs: null,
    lastIncidentAt: null,
    history: [],
  });

  return {
    overallStatus: apiUp && databaseUp ? "operational" : "outage",
    capturedAt: health.timestamp ?? now,
    components: [
      component("api", "Public API", "core", apiUp, "NestJS HTTP API reachable."),
      component("database", "PostgreSQL", "data", databaseUp, databaseUp ? "Primary database connected." : "Database connection failed."),
    ],
    metrics: {
      apiRequestsPerMinute: 0,
      averageResponseMs: 0,
      p95ResponseMs: 0,
      errorRatePercent: 0,
      queueDepth: 0,
      activeWorkers: 0,
      databaseConnections: databaseUp ? 1 : 0,
      cacheHitRatePercent: 0,
    },
    responseTimeTrend: [],
    incidents: [],
  };
}

export const systemHealthService = {
  /**
   * `GET /system-health` is not implemented by the backend yet. When it is
   * missing we derive the snapshot from the real `GET /health` probe so the
   * status pill reflects live API + database state instead of hanging.
   */
  async getSnapshot(signal?: AbortSignal): Promise<SystemHealthSnapshot> {
    try {
      return await apiClient.request<SystemHealthSnapshot>({
        method: "GET",
        path: "/system-health",
        signal,
      });
    } catch (error) {
      if (!canFallBack(error)) throw error;
      const health = await systemHealthService.check(signal);
      return snapshotFromHealth(health);
    }
  },

  /** `GET /health` — public liveness probe (API status + database reachability). */
  check(signal?: AbortSignal): Promise<HealthCheckResponse> {
    return apiClient.request<HealthCheckResponse>({
      method: "GET",
      path: "/health",
      signal,
      skipSessionExpiry: true,
    });
  },

  /**
   * `GET /health/error` — deliberate 500 for verifying backend logging.
   * Always rejects when the endpoint behaves; callers surface the ApiError.
   */
  triggerError(signal?: AbortSignal): Promise<never> {
    return apiClient.request<never>({
      method: "GET",
      path: "/health/error",
      signal,
      skipSessionExpiry: true,
    });
  },
};
