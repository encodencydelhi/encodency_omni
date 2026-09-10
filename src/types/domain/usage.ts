import type { EntityRef, StatusRegistry, TrendPoint } from "@/types/common";
import type { QuotaMetric } from "./plan";

export const USAGE_STATUS = {
  healthy: { label: "Healthy", tone: "success", description: "Below 75% of the quota" },
  approaching: { label: "Approaching Limit", tone: "warning", description: "75-95% consumed" },
  critical: { label: "Critical", tone: "danger", description: "Above 95% consumed" },
  exceeded: { label: "Exceeded", tone: "danger", description: "Quota consumed, overage billing active" },
  unmetered: { label: "Unmetered", tone: "neutral" },
} as const satisfies StatusRegistry<string>;

export type UsageStatus = keyof typeof USAGE_STATUS;

export interface UsageRecord {
  metric: QuotaMetric;
  used: number;
  limit: number | null;
  percentUsed: number;
  status: UsageStatus;
  trend: TrendPoint[];
}

export interface PlatformUsageSummary {
  periodStart: string;
  periodEnd: string;
  records: UsageRecord[];
  topConsumers: Array<{
    company: EntityRef;
    metric: QuotaMetric;
    used: number;
    limit: number | null;
    percentUsed: number;
    status: UsageStatus;
  }>;
}

export function resolveUsageStatus(used: number, limit: number | null): UsageStatus {
  if (limit === null) return "unmetered";
  const percent = limit === 0 ? 0 : (used / limit) * 100;
  if (percent >= 100) return "exceeded";
  if (percent >= 95) return "critical";
  if (percent >= 75) return "approaching";
  return "healthy";
}
