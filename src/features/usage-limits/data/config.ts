/**
 * Static configuration for Usage & Limits: routes, tabs and status vocabulary.
 * The canonical route is the existing sidebar destination; every tab is a real
 * nested route under it, so refresh, Back and deep links land where they were.
 */
import { ROUTES } from "@/config/routes";
import { COMPANIES_MOCK_MODE } from "@/features/companies/data/config";
import type { Tone } from "@/types/common";
import type { AlertSeverity, AlertStatus, AlertType, OverrideStatus, Period, ProcessingStatus, ResourceKey, SourceStatus, UtilizationState } from "./types";

/** The app-wide mock switch Companies and Plans already share: one dataset, one flag. */
export const USAGE_MOCK_MODE = COMPANIES_MOCK_MODE;

export const SESSION_STORAGE_KEYS = { state: "omni.usage-limits.demo-state.v1" } as const;

const ROOT = ROUTES.superAdmin.usage;

export const usageRoutes = {
  root: ROOT,
  companies: `${ROOT}/companies`,
  resources: `${ROOT}/resources`,
  resource: (key: string) => `${ROOT}/resources/${key}`,
  alerts: `${ROOT}/alerts`,
  overrides: `${ROOT}/overrides`,
  metering: `${ROOT}/metering`,
  /** The existing company-scoped usage workspace, optionally at a resource. */
  companyUsage: (companyId: string, resource?: ResourceKey) => `${ROUTES.superAdmin.company(companyId)}/usage${resource ? `?metric=${resource}` : ""}`,
  subscription: (subscriptionId: string) => `${ROUTES.superAdmin.subscriptions}/${subscriptionId}`,
  company: (companyId: string) => ROUTES.superAdmin.company(companyId),
} as const;

export const MODULE_TABS = [
  { key: "overview", label: "Overview", href: usageRoutes.root },
  { key: "companies", label: "Company Usage", href: usageRoutes.companies },
  { key: "resources", label: "Resources & Limits", href: usageRoutes.resources },
  { key: "alerts", label: "Alerts & Overages", href: usageRoutes.alerts },
  { key: "overrides", label: "Overrides", href: usageRoutes.overrides },
  { key: "metering", label: "Metering & Activity", href: usageRoutes.metering },
] as const;

export type ModuleTab = (typeof MODULE_TABS)[number]["key"];

export function activeModuleTab(pathname: string): ModuleTab {
  const found = MODULE_TABS.filter((tab) => tab.key !== "overview").find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`));
  return found?.key ?? "overview";
}

export const PERIODS: ReadonlyArray<{ value: Period; label: string; days: number }> = [
  { value: "7d", label: "7D", days: 7 },
  { value: "30d", label: "30D", days: 30 },
  { value: "90d", label: "90D", days: 90 },
];

export const UTILIZATION_STATE: Record<UtilizationState, { label: string; tone: Tone; description: string }> = {
  within: { label: "Within Limit", tone: "success", description: "Below the warning threshold." },
  near: { label: "Near Limit", tone: "warning", description: "At or above the warning threshold, below the limit." },
  at_limit: { label: "At Limit", tone: "warning", description: "Exactly at the effective limit." },
  exceeded: { label: "Exceeded", tone: "danger", description: "Above the effective limit." },
  unlimited: { label: "Unlimited", tone: "info", description: "No numeric limit applies, so no percentage is shown." },
  not_entitled: { label: "Not Entitled", tone: "neutral", description: "The plan does not include this resource." },
  unknown: { label: "Unknown Data", tone: "info", description: "The reading is missing. It is not treated as healthy or as zero." },
  monitored: { label: "Monitored Only", tone: "neutral", description: "Not controlled by the plan; shown for capacity planning." },
};

export const ALERT_TYPE: Record<AlertType, { label: string; description: string }> = {
  threshold: { label: "Threshold Warning", description: "Usage reached the warning threshold." },
  at_limit: { label: "At Limit", description: "Usage is exactly at the effective limit." },
  exceeded: { label: "Limit Exceeded", description: "Usage is above the effective limit. This is not automatically billable." },
  override_expiring: { label: "Override Expiring", description: "An override ends soon and usage would then be above the limit." },
  metering: { label: "Metering Issue", description: "The reading is delayed or missing." },
};

export const ALERT_SEVERITY: Record<AlertSeverity, { label: string; tone: Tone; rank: number }> = {
  critical: { label: "Critical", tone: "danger", rank: 2 },
  warning: { label: "Warning", tone: "warning", rank: 1 },
};

export const ALERT_STATUS: Record<AlertStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  acknowledged: { label: "Acknowledged", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
};

export const OVERRIDE_STATUS: Record<OverrideStatus, { label: string; tone: Tone }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  active: { label: "Active", tone: "success" },
  expired: { label: "Expired", tone: "neutral" },
  revoked: { label: "Revoked", tone: "danger" },
};

export const PROCESSING_STATUS: Record<ProcessingStatus, { label: string; tone: Tone }> = {
  processed: { label: "Processed", tone: "success" },
  delayed: { label: "Delayed", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  duplicate: { label: "Duplicate Ignored", tone: "neutral" },
};

export const SOURCE_STATUS: Record<SourceStatus, { label: string; tone: Tone }> = {
  healthy: { label: "Healthy", tone: "success" },
  delayed: { label: "Delayed", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

/** Days before expiry at which an override is flagged. */
export const OVERRIDE_EXPIRY_WARNING_DAYS = 14;

export const COMPANY_QUICK = [
  { value: "near", label: "Near Limit" },
  { value: "at_limit", label: "At Limit" },
  { value: "exceeded", label: "Exceeded" },
  { value: "overrides", label: "Overrides Active" },
  { value: "missing", label: "Missing Data" },
] as const;

export const COMPANY_SORTS = [
  { value: "utilization", label: "Highest Utilization" },
  { value: "consumption", label: "Highest Consumption" },
  { value: "remaining", label: "Lowest Remaining" },
  { value: "updated", label: "Recently Updated" },
  { value: "name", label: "Company Name" },
] as const;

export const ALERT_QUICK = [
  { value: "open", label: "Open" },
  { value: "critical", label: "Critical" },
  { value: "exceeded", label: "Exceeded" },
  { value: "expiring", label: "Expiring Overrides" },
  { value: "metering", label: "Metering Issues" },
] as const;

export const ALERT_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "severity", label: "Highest Severity" },
  { value: "utilization", label: "Highest Utilization" },
  { value: "company", label: "Company Name" },
] as const;

export const OVERRIDE_SORTS = [
  { value: "expiring", label: "Expiring Soon" },
  { value: "newest", label: "Newest" },
  { value: "allowance", label: "Highest Effective Allowance" },
  { value: "company", label: "Company Name" },
] as const;

export const EVENT_RANGES = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
] as const;
