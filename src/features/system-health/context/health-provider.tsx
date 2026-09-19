"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { DashboardSnapshot } from "@/types/domain/dashboard";

/** Global system health state extracted for use in the shell (e.g. footer). */
interface HealthState {
  globalStatus: "operational" | "degraded" | "outage" | "maintenance";
  entries: DashboardSnapshot["platformHealth"];
  isLoading: boolean;
}

const HealthContext = createContext<HealthState | undefined>(undefined);

/**
 * Provides live platform health data.
 * In a real app this would poll an endpoint or subscribe to a websocket,
 * but for this mock we provide static but realistic data.
 */
export function HealthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HealthState>({
    globalStatus: "operational",
    entries: [],
    isLoading: true,
  });

  useEffect(() => {
    // Mock fetching health
    const timer = setTimeout(() => {
      setState({
        globalStatus: "operational",
        entries: [
          { id: "svc_api", label: "Core API", status: "operational" },
          { id: "svc_db", label: "Primary Database", status: "operational" },
          { id: "svc_redis", label: "Cache Layer", status: "operational" },
          { id: "svc_workers", label: "Background Workers", status: "operational" },
          { id: "svc_crawler", label: "Data Pipeline", status: "operational" },
        ],
        isLoading: false,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <HealthContext.Provider value={state}>
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error("useHealth must be used within a HealthProvider");
  }
  return context;
}
