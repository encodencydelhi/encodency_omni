import { apiClient } from "@/lib/api/client";
import type { SystemHealthSnapshot } from "@/types/domain/system-health";

export const systemHealthService = {
  getSnapshot(signal?: AbortSignal): Promise<SystemHealthSnapshot> {
    return apiClient.request<SystemHealthSnapshot>({
      method: "GET",
      path: "/system-health",
      signal,
    });
  },
};
