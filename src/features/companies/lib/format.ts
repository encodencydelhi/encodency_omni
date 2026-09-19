import { formatCompactNumber, formatCurrency, formatNumber } from "@/lib/utils/format";
import { USAGE_RESOURCE_BY_KEY } from "../data/config";
import type { UsageResource } from "../data/types";

/** "Unlimited" for plan-controlled resources with no cap; "n/a" where the plan sets no limit at all. */
export function formatLimit(limit: number | null, resource: UsageResource): string {
  if (limit !== null) return formatCompactNumber(limit);
  return USAGE_RESOURCE_BY_KEY[resource].metric === null ? "n/a" : "Unlimited";
}

export function formatUsed(value: number, resource: UsageResource): string {
  return USAGE_RESOURCE_BY_KEY[resource].key === "storage" ? `${formatNumber(Number(value.toFixed(1)))}` : formatCompactNumber(value);
}

export function formatPercent1(value: number | null): string {
  return value === null ? "-" : `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

export function formatMrr(minor: number, currency: string, compact = false): string {
  return minor === 0 ? "-" : formatCurrency(minor, currency, { compact });
}

export function formatIsoDate(iso: string): string {
  return iso.slice(0, 10);
}

export function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
