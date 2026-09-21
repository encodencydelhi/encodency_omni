import { relativeTime } from "@/features/companies/data/clock";
import { titleCase } from "@/features/global-settings/data/text";
import { STRATEGY } from "../data/config";
import type { ConfigDiff, EnvironmentConfig, FlagStats } from "../data/types";

/** Relative time in Title Case against the demo clock, e.g. "4 Days Ago". */
export const ago = (iso: string) => titleCase(relativeTime(iso));

/** "Percentage 25%", "3 Companies", "All Eligible": the rollout in a few words. */
export function rolloutText(config: Pick<EnvironmentConfig | ConfigDiff, "strategy" | "percentage" | "selectedCompanyIds">): string {
  switch (config.strategy) {
    case "percentage": return `${config.percentage}% Of Eligible`;
    case "selected": return `${config.selectedCompanyIds.length} ${config.selectedCompanyIds.length === 1 ? "Company" : "Companies"}`;
    default: return STRATEGY[config.strategy].short;
  }
}

/** The evaluated count, shown next to what it was evaluated from - never the bare percentage. */
export function reachText(stats: FlagStats): string {
  return `${stats.effective} Of ${stats.totalCompanies}`;
}

export const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;
