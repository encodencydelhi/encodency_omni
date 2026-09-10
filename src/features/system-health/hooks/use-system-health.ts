"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { systemHealthService } from "../services/system-health-service";

/**
 * Infrastructure status.
 *
 * Polling stands in for the SSE stream the backend will expose; when that
 * lands, only `refetchInterval` is replaced by a subscription.
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.systemHealth.summary(),
    queryFn: ({ signal }) => systemHealthService.getSnapshot(signal),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
