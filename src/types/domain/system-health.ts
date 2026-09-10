import type { StatusRegistry, TrendPoint } from "@/types/common";

export const SERVICE_STATUS = {
  operational: { label: "Operational", tone: "success" },
  degraded: { label: "Degraded", tone: "warning" },
  partial_outage: { label: "Partial Outage", tone: "warning" },
  outage: { label: "Outage", tone: "danger" },
  maintenance: { label: "Maintenance", tone: "info" },
} as const satisfies StatusRegistry<string>;

export type ServiceStatus = keyof typeof SERVICE_STATUS;

export interface ServiceComponent {
  id: string;
  name: string;
  group: "core" | "data" | "workers" | "edge";
  status: ServiceStatus;
  description: string;
  uptimePercent: number;
  latencyMs: number | null;
  lastIncidentAt: string | null;
  history: TrendPoint[];
}

export interface SystemHealthSnapshot {
  overallStatus: ServiceStatus;
  capturedAt: string;
  components: ServiceComponent[];
  metrics: {
    apiRequestsPerMinute: number;
    averageResponseMs: number;
    p95ResponseMs: number;
    errorRatePercent: number;
    queueDepth: number;
    activeWorkers: number;
    databaseConnections: number;
    cacheHitRatePercent: number;
  };
  responseTimeTrend: TrendPoint[];
  incidents: SystemIncident[];
}

export interface SystemIncident {
  id: string;
  title: string;
  severity: "minor" | "major" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  component: string;
  startedAt: string;
  resolvedAt: string | null;
}
