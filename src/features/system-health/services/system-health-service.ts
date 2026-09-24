import { apiClient } from "@/lib/api/client";
import type { HealthCheckResponse, SystemHealthSnapshot } from "@/types/domain/system-health";

export const systemHealthService = {
  getSnapshot(signal?: AbortSignal): Promise<SystemHealthSnapshot> {
    return apiClient.request<SystemHealthSnapshot>({
      method: "GET",
      path: "/system-health",
      signal,
    });
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
