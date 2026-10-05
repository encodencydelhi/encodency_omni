/**
 * Static configuration for Plans & Subscriptions: registries, thresholds,
 * navigation and route helpers. No data lives here.
 */
import { ROUTES } from "@/config/routes";
import { COMPANIES_MOCK_MODE } from "@/features/companies/data/config";
import type { StatusRegistry } from "@/types/common";
import type {
  AttentionKind,
  FailedPaymentHandling,
  LimitKind,
  OverLimitPolicy,
  OverLimitResource,
  PlanStatus,
  RolloutPolicy,
  ScheduledChangeKind,
  ScheduledChangeStatus,
  TrendMetric,
  TrendPeriod,
  VersionStatus,
} from "./types";

export const PLANS_MOCK_MODE = COMPANIES_MOCK_MODE;

export const SESSION_STORAGE_KEYS = {
  planState: "omni.plans.demo-state.v1",
  createDraft: "omni.plans.create-draft.v1",
} as const;

/* ------------------------------------------------------------------ */
/* Status registries                                                   */
/* ------------------------------------------------------------------ */

export const PLAN_STATUS = {
  draft: { label: "Draft", tone: "neutral", description: "Not yet published; no company can subscribe" },
  published: { label: "Published", tone: "success", description: "Live and available according to its availability rules" },
  hidden: { label: "Hidden From New Purchase", tone: "warning", description: "Existing subscribers keep it; it cannot be newly purchased" },
  retired: { label: "Retired", tone: "danger", description: "Closed to everyone; existing subscriptions keep referencing it" },
} as const satisfies StatusRegistry<PlanStatus>;

export const VERSION_STATUS = {
  draft: { label: "Draft", tone: "neutral" },
  published: { label: "Current", tone: "success" },
  superseded: { label: "Superseded", tone: "neutral" },
} as const satisfies StatusRegistry<VersionStatus>;

export const LIMIT_KIND = {
  none: { label: "Not Available", tone: "neutral", description: "The resource is not part of this plan" },
  fixed: { label: "Fixed Limit", tone: "info", description: "A Specific Numeric Allowance" },
  unlimited: { label: "Unlimited", tone: "success", description: "No Product-defined Numeric Cap" },
  custom: { label: "Custom (contract)", tone: "brand", description: "A Contract-specific Value" },
} as const satisfies StatusRegistry<LimitKind>;

export const ROLLOUT_POLICY: Record<RolloutPolicy, { label: string; description: string }> = {
  new_only: { label: "New Subscriptions Only", description: "Existing subscriptions stay on their current version. Nobody's price or limits change." },
  at_renewal: { label: "Existing Subscriptions At Renewal", description: "Existing subscriptions move to the new version when they next renew. Shown as a scheduled change." },
  migrate_selected: { label: "Migrate Selected Companies Now", description: "You choose the companies that move to the new version immediately. Others stay on their version." },
};

export const SCHEDULED_KIND: Record<ScheduledChangeKind, { label: string; tone: "success" | "warning" | "info" | "neutral" | "danger" }> = {
  upgrade: { label: "Upgrade", tone: "success" },
  downgrade: { label: "Downgrade", tone: "warning" },
  billing_cycle: { label: "Billing Cycle Change", tone: "info" },
  cancellation: { label: "Cancellation", tone: "danger" },
  override_expiry: { label: "Override Expiry", tone: "neutral" },
  version_migration: { label: "Plan Version Migration", tone: "info" },
};

export const SCHEDULED_STATUS = {
  scheduled: { label: "Scheduled", tone: "info" },
  ready: { label: "Ready To Apply", tone: "success" },
  overdue: { label: "Not Applied", tone: "danger", description: "Past its effective date but still pending; needs review" },
} as const satisfies StatusRegistry<ScheduledChangeStatus>;

export const ATTENTION_KIND: Record<AttentionKind, { label: string }> = {
  trial_ending: { label: "Trial Ending Soon" },
  past_due: { label: "Past Due" },
  scheduled_cancellation: { label: "Scheduled Cancellation" },
  override_expired: { label: "Override Expired" },
  usage_over_limit: { label: "Usage Above Effective Limit" },
  missing_plan: { label: "Missing Plan Reference" },
  failed_change: { label: "Scheduled Change Not Applied" },
};

export const OVER_LIMIT_POLICY: Record<OverLimitPolicy, { label: string; description: string }> = {
  block_new_creation: { label: "Block New Creation", description: "Existing resources stay; creating more is refused until usage is within the limit." },
  allow_existing_resources: { label: "Allow Existing Resources", description: "Existing resources keep working; new ones are refused." },
  require_upgrade: { label: "Require Plan Upgrade", description: "Work continues, and the company is asked to upgrade." },
  temporary_grace_period: { label: "Temporary Grace Period", description: "Use above the limit is allowed for the grace period, then creation is blocked." },
};

export const OVER_LIMIT_RESOURCES: ReadonlyArray<{ key: OverLimitResource; label: string; options: OverLimitPolicy[] }> = [
  { key: "users", label: "Users Above Limit", options: ["allow_existing_resources", "block_new_creation", "require_upgrade"] },
  { key: "clients", label: "Clients Above Limit", options: ["allow_existing_resources", "block_new_creation", "require_upgrade"] },
  { key: "connectedAccounts", label: "Connections Above Limit", options: ["allow_existing_resources", "block_new_creation", "require_upgrade"] },
  { key: "aiCredits", label: "AI Credits Exhausted", options: ["block_new_creation", "temporary_grace_period", "require_upgrade"] },
  { key: "automationRuns", label: "Automation Quota Exhausted", options: ["block_new_creation", "temporary_grace_period", "require_upgrade"] },
];

export const FAILED_PAYMENT_HANDLING: Record<FailedPaymentHandling, { label: string; description: string }> = {
  keep_access_with_warning: { label: "Keep access, show a warning", description: "The subscription stays Past Due and access continues." },
  pause_after_grace: { label: "Pause After The Grace Period", description: "If still unpaid after the grace period, the subscription is paused for review." },
  manual_review: { label: "Manual Review", description: "Nothing changes automatically; the account appears in Needs Attention." },
};

/* ------------------------------------------------------------------ */
/* Thresholds                                                          */
/* ------------------------------------------------------------------ */

export const TRIAL_ENDING_SOON_DAYS = 7;
export const RENEWAL_SOON_DAYS = 14;
export const RECENT_OVERRIDE_EXPIRY_DAYS = 30;
export const MAX_TRIAL_EXTENSION_DAYS = 90;
export const NEAR_LIMIT_PERCENT = 90;
export const DEFAULT_PAGE_SIZE = 15;

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export const TARGET_SEGMENTS = ["Individual Brands", "Growing Brand Teams", "Marketing Agencies", "Enterprise And Strategic Accounts", "Non-profits And Institutions"] as const;
export const CURRENCIES = ["INR", "USD", "GBP", "EUR"] as const;

export const TREND_METRICS: ReadonlyArray<{ value: TrendMetric; label: string }> = [
  { value: "active_paid", label: "Active Paid" },
  { value: "active_trials", label: "Active Trials" },
  { value: "new_subscriptions", label: "New Subscriptions" },
  { value: "cancellations", label: "Cancellations" },
];
export const TREND_PERIODS: ReadonlyArray<{ value: TrendPeriod; label: string }> = [
  { value: "30d", label: "30D" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
];

export const SUBSCRIPTION_SORT_OPTIONS: ReadonlyArray<{ value: string; label: string; field: string; direction: "asc" | "desc" }> = [
  { value: "renewsAt:asc", label: "Renewal Soonest", field: "renewsAt", direction: "asc" },
  { value: "mrr:desc", label: "Highest MRR", field: "mrr", direction: "desc" },
  { value: "startedAt:desc", label: "Newest", field: "startedAt", direction: "desc" },
  { value: "company:asc", label: "Company Name", field: "company", direction: "asc" },
];

export const CREATED_OPTIONS = [
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "1y", label: "Last 12 Months" },
];
export const RENEWAL_OPTIONS = [
  { value: "7d", label: "Within 7 Days" },
  { value: "14d", label: "Within 14 Days" },
  { value: "30d", label: "Within 30 Days" },
];

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export type ModuleTab = "overview" | "plans" | "subscriptions" | "changes" | "settings";

export const MODULE_TABS: ReadonlyArray<{ key: ModuleTab; label: string; href: string }> = [
  { key: "overview", label: "Overview", href: ROUTES.superAdmin.plans },
  { key: "plans", label: "Plans", href: `${ROUTES.superAdmin.plans}/catalogue` },
  { key: "subscriptions", label: "Subscriptions", href: ROUTES.superAdmin.subscriptions },
  { key: "changes", label: "Trials & Changes", href: `${ROUTES.superAdmin.plans}/changes` },
  { key: "settings", label: "Settings", href: `${ROUTES.superAdmin.plans}/settings` },
];

export function activeModuleTab(pathname: string): ModuleTab {
  if (pathname.startsWith(ROUTES.superAdmin.subscriptions)) return "subscriptions";
  const rest = pathname.slice(ROUTES.superAdmin.plans.length).replace(/^\/+/, "").split("/")[0] ?? "";
  if (rest === "") return "overview";
  if (rest === "changes") return "changes";
  if (rest === "settings") return "settings";
  return "plans";
}

const PLANS = ROUTES.superAdmin.plans;
const SUBS = ROUTES.superAdmin.subscriptions;

export const PLAN_SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "pricing", label: "Pricing" },
  { key: "features", label: "Features & Limits" },
  { key: "availability", label: "Availability" },
  { key: "versions", label: "Versions & Activity" },
] as const;
export type PlanSection = (typeof PLAN_SECTIONS)[number]["key"];

export const SUBSCRIPTION_SECTIONS = [
  { key: "overview", label: "Overview" },
  { key: "entitlements", label: "Entitlements" },
  { key: "history", label: "Changes & History" },
] as const;
export type SubscriptionSection = (typeof SUBSCRIPTION_SECTIONS)[number]["key"];

export const routes = {
  overview: PLANS,
  plans: `${PLANS}/catalogue`,
  compare: `${PLANS}/catalogue?view=compare`,
  createPlan: `${PLANS}/new`,
  plan: (id: string, section?: PlanSection) => (section && section !== "overview" ? `${PLANS}/${id}?section=${section}` : `${PLANS}/${id}`),
  editPlan: (id: string) => `${PLANS}/${id}/edit`,
  subscriptions: SUBS,
  subscription: (id: string, section?: SubscriptionSection) => (section && section !== "overview" ? `${SUBS}/${id}?section=${section}` : `${SUBS}/${id}`),
  changes: (view?: "trials" | "scheduled" | "recent") => (view ? `${PLANS}/changes?view=${view}` : `${PLANS}/changes`),
  settings: `${PLANS}/settings`,
  subscriptionsFor: (query: Record<string, string>) => `${SUBS}?${new URLSearchParams(query).toString()}`,
} as const;
