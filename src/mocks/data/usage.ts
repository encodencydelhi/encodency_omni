import { QUOTA_METRICS, type QuotaMetric } from "@/types/domain/plan";
import { resolveUsageStatus, type PlatformUsageSummary, type UsageRecord } from "@/types/domain/usage";
import { buildTrend, createRng, daysAgo } from "../lib/random";
import { getPlanLimits } from "./plans";
import { COMPANIES } from "./tenants";

const METRIC_KEYS = Object.keys(QUOTA_METRICS) as QuotaMetric[];

/**
 * Per-company consumption for the current billing period.
 *
 * Each company draws from its own seeded sequence so a tenant shows the same
 * numbers on the usage page and on its detail page.
 */
function buildCompanyUsage(): Map<string, UsageRecord[]> {
  const byCompany = new Map<string, UsageRecord[]>();

  COMPANIES.forEach((company, companyIndex) => {
    const rng = createRng(121000 + companyIndex * 43);
    const limits = getPlanLimits(company.planTier);

    const records = METRIC_KEYS.map((metric) => {
      const limit = limits[metric];

      // Anchor consumption to the headline percentage already on the company
      // record, then vary each dimension around it.
      const targetPercent = Math.max(
        0,
        company.usagePercent * rng.float(0.35, 1.35) * (company.status === "churned" ? 0 : 1),
      );

      const used =
        limit === null
          ? Math.round(rng.int(1_000, 480_000))
          : Math.round(limit * (targetPercent / 100));

      const percentUsed = limit === null ? 0 : Number(((used / Math.max(limit, 1)) * 100).toFixed(1));

      return {
        metric,
        used,
        limit,
        percentUsed,
        status: resolveUsageStatus(used, limit),
        trend: buildTrend({ rng, days: 30, start: used * 0.05, end: used, noise: 0.08 }),
      } satisfies UsageRecord;
    });

    byCompany.set(company.id, records);
  });

  return byCompany;
}

const COMPANY_USAGE = buildCompanyUsage();

export function getCompanyUsage(companyId: string): UsageRecord[] {
  return COMPANY_USAGE.get(companyId) ?? [];
}

/** Platform-wide totals, aggregated from the same per-company records. */
function buildPlatformUsage(): PlatformUsageSummary {
  const rng = createRng(123000);

  const records = METRIC_KEYS.map((metric) => {
    let used = 0;
    let limit: number | null = 0;

    for (const company of COMPANIES) {
      const record = COMPANY_USAGE.get(company.id)?.find((item) => item.metric === metric);
      if (!record) continue;
      used += record.used;
      // A single unmetered tenant makes the platform aggregate unmetered.
      limit = record.limit === null || limit === null ? null : limit + record.limit;
    }

    const percentUsed = limit === null ? 0 : Number(((used / Math.max(limit, 1)) * 100).toFixed(1));

    return {
      metric,
      used,
      limit,
      percentUsed,
      status: resolveUsageStatus(used, limit),
      trend: buildTrend({ rng, days: 30, start: used * 0.6, end: used, noise: 0.05 }),
    } satisfies UsageRecord;
  });

  const topConsumers = COMPANIES.flatMap((company) =>
    (COMPANY_USAGE.get(company.id) ?? [])
      .filter((record) => record.limit !== null && record.percentUsed >= 70)
      .map((record) => ({
        company: { id: company.id, name: company.name },
        metric: record.metric,
        used: record.used,
        limit: record.limit,
        percentUsed: record.percentUsed,
        status: record.status,
      })),
  )
    .sort((a, b) => b.percentUsed - a.percentUsed)
    .slice(0, 12);

  return {
    periodStart: daysAgo(9),
    periodEnd: daysAgo(-21),
    records,
    topConsumers,
  };
}

export const PLATFORM_USAGE: PlatformUsageSummary = buildPlatformUsage();
