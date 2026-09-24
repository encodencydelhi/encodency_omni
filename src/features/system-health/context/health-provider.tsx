"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/types/api";
import { queryKeys } from "@/lib/query/keys";
import { systemHealthService } from "../services/system-health-service";
import { toApiHealthView, toHealthState, type HealthState } from "./health-mapping";

const HealthContext = createContext<HealthState | undefined>(undefined);

/**
 * Live platform health from `GET /health` (poll every 30s).
 * Unreachable backend → outage (honest), never a silent mock swap for this probe.
 */
export function HealthProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: queryKeys.systemHealth.summary("api-probe"),
    queryFn: async ({ signal }) => {
      try {
        const body = await systemHealthService.check(signal);
        return { ok: true as const, body };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        return { ok: false as const, error };
      }
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: (failureCount, error) => {
      if (ApiError.isApiError(error) && error.status >= 400 && error.status < 500) return false;
      return failureCount < 1;
    },
  });

  const state = query.isPending
    ? toHealthState("checking")
    : toHealthState(toApiHealthView(query.data ?? { ok: false, error: new Error("no data") }));

  return <HealthContext.Provider value={state}>{children}</HealthContext.Provider>;
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error("useHealth must be used within a HealthProvider");
  }
  return context;
}
