"use client";

import { PLAN_CATALOGUE, STAFF } from "@/features/companies/data/mock/dataset";
import { allBundles, writeBundle } from "@/features/companies/data/mock/store";
import { nowIso, platformNow } from "@/features/companies/data/clock";
import { computeSummary, computeUsage, type DerivationContext } from "@/features/companies/data/selectors";
import type { CompanyBundle, CompanyUsageOverride, UsageResource } from "@/features/companies/data/types";

export interface UsageCompanySnapshot {
  bundle: CompanyBundle;
  summary: ReturnType<typeof computeSummary>;
  usage: ReturnType<typeof computeUsage>;
}

export interface OverrideDraft {
  resource: UsageResource;
  overrideLimit: number;
  days: number;
  reason: string;
}

const DAY_MS = 86_400_000;
const ACTOR = { id: "stf_001", name: "Ananya Rao" };

function context(): DerivationContext {
  return { now: platformNow(), plans: PLAN_CATALOGUE, staff: STAFF };
}

export const usageLimitsRepository = {
  mode: "mock" as const,

  listCompanyUsage(): UsageCompanySnapshot[] {
    const ctx = context();
    return allBundles().map((bundle) => ({ bundle, summary: computeSummary(ctx, bundle), usage: computeUsage(ctx, bundle) }));
  },

  createOverride(companyId: string, input: OverrideDraft): boolean {
    const bundle = allBundles().find((item) => item.company.id === companyId);
    if (!bundle) return false;
    const override: CompanyUsageOverride = {
      id: `ovr_usage_${Date.now().toString(36)}`,
      companyId,
      resource: input.resource,
      baseLimit: null,
      overrideLimit: input.overrideLimit,
      reason: input.reason,
      startsAt: nowIso(),
      expiresAt: new Date(Date.now() + input.days * DAY_MS).toISOString(),
      approvedBy: ACTOR.name,
      createdAt: nowIso(),
    };
    writeBundle({ ...bundle, overrides: [override, ...bundle.overrides] });
    return true;
  },

  revokeOverride(companyId: string, overrideId: string): boolean {
    const bundle = allBundles().find((item) => item.company.id === companyId);
    if (!bundle) return false;
    writeBundle({ ...bundle, overrides: bundle.overrides.filter((override) => override.id !== overrideId) });
    return true;
  },
};
