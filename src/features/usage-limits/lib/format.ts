import { RESOURCE_BY_KEY } from "../data/catalogue";
import type { ResourceKey, UsageRow } from "../data/types";

export const number = (value: number) => value.toLocaleString("en-IN");

/** A quantity with its unit, e.g. "12,400 credits". `null` means there is no reading. */
export function withUnit(value: number | null, resource: ResourceKey): string {
  if (value === null) return "Data Unavailable";
  return `${number(value)} ${RESOURCE_BY_KEY[resource].unit}`;
}

/** A limit as words: never a bare 0 or null, which mean different things. */
export function limitText(limit: number | null, row: Pick<UsageRow, "resolved" | "resource">): string {
  switch (row.resolved.limitType) {
    case "none": return "No Plan Limit";
    case "not_entitled": return "Not Entitled";
    case "unlimited": return "Unlimited";
    default: return limit === null ? "Unlimited" : withUnit(limit, row.resource);
  }
}

export function baseText(row: UsageRow): string {
  if (!RESOURCE_BY_KEY[row.resource].planControlled) return "No Plan Limit";
  if (row.base === null) return "Unlimited";
  if (row.base === 0) return "Not Entitled";
  return number(row.base);
}

export function overrideText(row: UsageRow): string {
  if (!row.override) return "-";
  return row.override.rule === "additive" ? `+${number(row.override.amount)}` : `${number(row.override.amount)} (Absolute)`;
}

export function percentText(percent: number | null): string {
  return percent === null ? "-" : `${percent}%`;
}
