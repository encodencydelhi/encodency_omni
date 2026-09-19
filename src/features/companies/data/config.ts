/**
 * Static configuration for the tenant workspace: status vocabularies, thresholds,
 * resource definitions and the routes of other Super Admin modules.
 */
import { isMockMode } from "@/config/env";
import { ROUTES } from "@/config/routes";
import type { StatusRegistry } from "@/types/common";
import type { QuotaMetric } from "@/types/domain/plan";
import type {
  ActivityModule,
  AttentionKind,
  AttentionSeverity,
  CompanyAccountStatus,
  CompanyBillingStatus,
  CompanyHealthDisplay,
  CompanyOnboardingStatus,
  CompanySection,
  CompanySize,
  CompanySubscriptionStatus,
  IntegrationConnectionState,
  InternalNoteTag,
  InvoiceStatus,
  PaymentState,
  SuspensionReason,
  UsageLevel,
  UsageResource,
  UsageResourceStatus,
} from "./types";
export const COMPANIES_MOCK_MODE = isMockMode;
export const DEMO_CLOCK_ANCHOR = Date.parse("2026-09-09T09:30:00.000Z");
export const ACCOUNT_STATUS = {
  active: { label: "Active", tone: "success" },
  suspended: { label: "Suspended", tone: "danger", description: "Access restricted by a platform administrator" },
  deactivated: { label: "Deactivated", tone: "neutral", description: "Closed by the customer or after churn" },
  archived: { label: "Archived", tone: "neutral", description: "Retained for records; not operated" },
} as const satisfies StatusRegistry<CompanyAccountStatus>;

export const SUBSCRIPTION_STATUS_META = {
  trialing: { label: "Trialing", tone: "info" },
  active: { label: "Active", tone: "success" },
  past_due: { label: "Past Due", tone: "warning", description: "Renewal payment has not been collected" },
  paused: { label: "Paused", tone: "neutral" },
  scheduled_cancellation: { label: "Cancelling", tone: "warning", description: "Ends at the close of the current period" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  expired: { label: "Expired", tone: "danger" },
} as const satisfies StatusRegistry<CompanySubscriptionStatus>;

export const BILLING_STATUS_META = {
  paid: { label: "Paid", tone: "success" },
  payment_due: { label: "Payment Due", tone: "warning" },
  payment_failed: { label: "Payment Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
  no_payment_method: { label: "No Payment Method", tone: "neutral" },
} as const satisfies StatusRegistry<CompanyBillingStatus>;

export const HEALTH_META = {
  healthy: { label: "Healthy", tone: "success" },
  needs_attention: { label: "Needs Attention", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
  suspended: { label: "Suspended", tone: "neutral", description: "Health is not assessed while an account is suspended" },
  not_assessed: { label: "Not assessed", tone: "neutral", description: "Deactivated and archived companies are not assessed" },
} as const satisfies StatusRegistry<CompanyHealthDisplay>;

export const USAGE_LEVEL_META = {
  normal: { label: "Normal", tone: "success" },
  high: { label: "High", tone: "info" },
  near_limit: { label: "Near Limit", tone: "warning" },
  exceeded: { label: "Exceeded", tone: "danger" },
  not_metered: { label: "Not metered", tone: "neutral" },
} as const satisfies StatusRegistry<UsageLevel>;

export const RESOURCE_STATUS_META = {
  healthy: { label: "Normal", tone: "success" },
  high: { label: "High", tone: "info" },
  near_limit: { label: "Near Limit", tone: "warning" },
  exceeded: { label: "Exceeded", tone: "danger" },
  not_metered: { label: "Not plan-controlled", tone: "neutral" },
} as const satisfies StatusRegistry<UsageResourceStatus>;

export const ONBOARDING_META = {
  awaiting_owner: { label: "Awaiting owner", tone: "warning" },
  setting_up: { label: "Setting up", tone: "info" },
  completed: { label: "Completed", tone: "success" },
} as const satisfies StatusRegistry<CompanyOnboardingStatus>;

export const INVOICE_STATUS_META = {
  paid: { label: "Paid", tone: "success" },
  open: { label: "Open", tone: "info" },
  overdue: { label: "Overdue", tone: "danger" },
  void: { label: "Void", tone: "neutral" },
} as const satisfies StatusRegistry<InvoiceStatus>;

export const PAYMENT_STATE_META = {
  paid: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "info" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
} as const satisfies StatusRegistry<PaymentState>;

export const CONNECTION_STATE_META = {
  healthy: { label: "Healthy", tone: "success" },
  needs_reconnect: { label: "Needs reconnect", tone: "danger" },
  permission_issue: { label: "Permission issue", tone: "warning" },
  sync_failure: { label: "Sync failing", tone: "warning" },
  rate_limited: { label: "Rate limited", tone: "info" },
} as const satisfies StatusRegistry<IntegrationConnectionState>;

export const SEVERITY_META = {
  critical: { label: "Critical", tone: "danger" },
  warning: { label: "Warning", tone: "warning" },
  info: { label: "Info", tone: "info" },
} as const satisfies StatusRegistry<AttentionSeverity>;

export const FACTOR_META = {
  healthy: { label: "Healthy", tone: "success" },
  warning: { label: "Warning", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
} as const satisfies StatusRegistry<"healthy" | "warning" | "critical">;

export const RESULT_META = {
  success: { label: "Success", tone: "success" },
  failure: { label: "Failure", tone: "danger" },
  denied: { label: "Denied", tone: "warning" },
} as const satisfies StatusRegistry<"success" | "failure" | "denied">;

export const OWNER_STATE_LABEL = {
  active: "Active",
  invited: "Invitation pending",
  invitation_expired: "Invitation expired",
  suspended: "Suspended",
  inactive: "Inactive",
  none: "No owner",
} as const;

/* ------------------------------------------------------------------ */
/* Thresholds and methodology                                          */
/* ------------------------------------------------------------------ */

/** Utilisation bands. The same values drive badges, filters and health. */
export const USAGE_THRESHOLDS = { high: 70, nearLimit: 90, exceeded: 100 } as const;

export const TRIAL_ENDING_SOON_DAYS = 3;
export const DORMANT_AFTER_DAYS = 30;
export const JOB_FAILURE_WARNING = 1;
export const JOB_FAILURE_CRITICAL = 8;

export const HEALTH_METHOD =
  "OmniPlatform Tenant Health is an internal assessment of seven factors: billing, subscription, usage limits, integrations, security, background jobs and recent activity. A company is Critical if any factor is critical, Needs Attention if any factor warns, and Healthy otherwise.";

export const USAGE_METHOD =
  "Highest limit utilisation: the largest used-to-effective-limit ratio across the plan-controlled resources. Resources are never averaged together, because their units are not comparable. Seat, client and connection caps are hard limits, so sitting exactly at the cap is normal - they only count once exceeded.";

/* ------------------------------------------------------------------ */
/* Usage resources                                                     */
/* ------------------------------------------------------------------ */

export interface UsageResourceDef {
  key: UsageResource;
  label: string;
  unit: string;
  /** Plan-catalogue metric that defines the included limit; null = not plan-controlled. */
  metric: QuotaMetric | null;
  /** "level" resources are a current count; "flow" resources accumulate per period. */
  kind: "level" | "flow";
  /** Hard caps enforced when adding people, clients or connections. */
  capped: boolean;
  /** Where a Super Admin would inspect the consumption. */
  section: CompanySection;
}

export const USAGE_RESOURCES: readonly UsageResourceDef[] = [
  { key: "users", label: "Users", unit: "users", metric: "users", kind: "level", capped: true, section: "users" },
  { key: "clients", label: "Clients", unit: "clients", metric: "Clients", kind: "level", capped: true, section: "clients" },
  { key: "connectedAccounts", label: "Connected Accounts", unit: "accounts", metric: "channels", kind: "level", capped: true, section: "integrations" },
  { key: "aiCredits", label: "AI Credits", unit: "credits", metric: "aiCredits", kind: "flow", capped: false, section: "usage" },
  { key: "automationRuns", label: "Automation Runs", unit: "runs", metric: "automationRuns", kind: "flow", capped: false, section: "usage" },
  { key: "scheduledPosts", label: "Scheduled Posts", unit: "posts", metric: null, kind: "level", capped: false, section: "clients" },
  { key: "reports", label: "Reports Generated", unit: "reports", metric: "reports", kind: "flow", capped: false, section: "usage" },
  { key: "apiRequests", label: "API Requests", unit: "requests", metric: "apiCalls", kind: "flow", capped: false, section: "usage" },
  { key: "storage", label: "Storage", unit: "GB", metric: "storageGb", kind: "level", capped: false, section: "usage" },
];

export const USAGE_RESOURCE_BY_KEY: Readonly<Record<UsageResource, UsageResourceDef>> = Object.fromEntries(
  USAGE_RESOURCES.map((def) => [def.key, def]),
) as Record<UsageResource, UsageResourceDef>;

/** Resources a Super Admin may grant a temporary exception for. */
export const OVERRIDABLE_RESOURCES: readonly UsageResource[] = USAGE_RESOURCES.filter(
  (def) => def.metric !== null,
).map((def) => def.key);

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export const COMPANY_SECTIONS: ReadonlyArray<{ key: CompanySection; label: string; slug: string }> = [
  { key: "overview", label: "Overview", slug: "" },
  { key: "users", label: "Users", slug: "users" },
  { key: "clients", label: "Clients", slug: "clients" },
  { key: "subscription", label: "Subscription", slug: "subscription" },
  { key: "billing", label: "Billing", slug: "billing" },
  { key: "usage", label: "Usage", slug: "usage" },
  { key: "integrations", label: "Integrations", slug: "integrations" },
  { key: "activity", label: "Activity", slug: "activity" },
  { key: "security", label: "Security", slug: "security" },
];

export function companySectionHref(companyId: string, section: CompanySection, query?: Record<string, string>): string {
  const slug = COMPANY_SECTIONS.find((item) => item.key === section)?.slug ?? "";
  const base = slug ? `${ROUTES.superAdmin.company(companyId)}/${slug}` : ROUTES.superAdmin.company(companyId);
  const search = query ? new URLSearchParams(query).toString() : "";
  return search ? `${base}?${search}` : base;
}

/**
 * Other Super Admin modules this workspace links to. Only modules that have a
 * real route are marked available; the rest render as an honest "not available
 * yet" state rather than a link that would 404.
 */
export type GlobalModule =
  | "users"
  | "clients"
  | "plans"
  | "billing"
  | "usage"
  | "integrations"
  | "systemHealth"
  | "jobs"
  | "auditLogs"
  | "support"
  | "team"
  | "notifications";

interface ModuleDef {
  label: string;
  path: string;
  available: boolean;
}

const MODULES: Record<GlobalModule, ModuleDef> = {
  users: { label: "Users", path: ROUTES.superAdmin.users, available: true },
  clients: { label: "Clients", path: ROUTES.superAdmin.Clients, available: true },
  plans: { label: "Plans & Subscriptions", path: ROUTES.superAdmin.plans, available: false },
  billing: { label: "Billing & Payments", path: ROUTES.superAdmin.billing, available: false },
  usage: { label: "Usage & Limits", path: ROUTES.superAdmin.usage, available: false },
  integrations: { label: "Integrations", path: ROUTES.superAdmin.integrations, available: false },
  systemHealth: { label: "System Health", path: ROUTES.superAdmin.systemHealth, available: false },
  jobs: { label: "Jobs & Queues", path: ROUTES.superAdmin.jobs, available: false },
  auditLogs: { label: "Audit Logs", path: ROUTES.superAdmin.auditLogs, available: false },
  support: { label: "Support & Tickets", path: ROUTES.superAdmin.support, available: false },
  team: { label: "Internal Team", path: ROUTES.superAdmin.team, available: false },
  notifications: { label: "Notifications", path: ROUTES.superAdmin.notifications, available: false },
};

export interface ModuleLink {
  label: string;
  href: string | null;
  available: boolean;
}

export function resolveModuleLink(module: GlobalModule, query?: Record<string, string>): ModuleLink {
  const def = MODULES[module];
  const search = query ? new URLSearchParams(query).toString() : "";
  return {
    label: def.label,
    available: def.available,
    href: def.available ? (search ? `${def.path}?${search}` : def.path) : null,
  };
}

/* ------------------------------------------------------------------ */
/* Attention                                                           */
/* ------------------------------------------------------------------ */

export const ATTENTION_KIND_META: Record<
  AttentionKind,
  { label: string; plural: (count: number) => string; severity: AttentionSeverity }
> = {
  payment_failed: {
    label: "Payment failed",
    plural: (n) => `${n} ${n === 1 ? "company has a" : "companies have"} failed payment${n === 1 ? "" : "s"}`,
    severity: "critical",
  },
  payment_due: {
    label: "Payment due",
    plural: (n) => `${n} ${n === 1 ? "company has a" : "companies have"} payment${n === 1 ? "" : "s"} due`,
    severity: "warning",
  },
  trial_ending: {
    label: "Trial ending",
    plural: (n) => `${n} trial${n === 1 ? " ends" : "s end"} within ${TRIAL_ENDING_SOON_DAYS} days`,
    severity: "warning",
  },
  usage_near_limit: {
    label: "Near usage limit",
    plural: (n) => `${n} ${n === 1 ? "company is" : "companies are"} above ${USAGE_THRESHOLDS.nearLimit}% of a limit`,
    severity: "warning",
  },
  usage_exceeded: {
    label: "Limit exceeded",
    plural: (n) => `${n} ${n === 1 ? "company has" : "companies have"} exceeded a limit`,
    severity: "critical",
  },
  integration_reconnect: {
    label: "Integration needs reconnection",
    plural: (n) => `${n} ${n === 1 ? "company has" : "companies have"} integrations that need reconnection`,
    severity: "warning",
  },
  no_active_admin: {
    label: "No active organisation admin",
    plural: (n) => `${n} ${n === 1 ? "company has" : "companies have"} no active organisation administrator`,
    severity: "critical",
  },
  owner_invitation_expired: {
    label: "Owner invitation expired",
    plural: (n) => `${n} owner invitation${n === 1 ? " has" : "s have"} expired`,
    severity: "warning",
  },
  job_failures: {
    label: "Background job failures",
    plural: (n) => `${n} ${n === 1 ? "company has" : "companies have"} background job failures`,
    severity: "warning",
  },
  support_sla: {
    label: "Support SLA breached",
    plural: (n) => `${n} ${n === 1 ? "company has" : "companies have"} a breached support SLA`,
    severity: "warning",
  },
  cancellation_scheduled: {
    label: "Cancellation scheduled",
    plural: (n) => `${n} subscription${n === 1 ? " is" : "s are"} scheduled to cancel`,
    severity: "info",
  },
  no_payment_method: {
    label: "No payment method",
    plural: (n) => `${n} paying ${n === 1 ? "company has" : "companies have"} no payment method`,
    severity: "warning",
  },
};

/* ------------------------------------------------------------------ */
/* Lifecycle, forms and lists                                          */
/* ------------------------------------------------------------------ */

export const SUSPENSION_REASONS: ReadonlyArray<{ value: SuspensionReason; label: string; hint: string }> = [
  { value: "billing", label: "Billing", hint: "Unpaid invoices, chargebacks or disputes" },
  { value: "security", label: "Security", hint: "Suspected compromise or abuse" },
  { value: "policy_violation", label: "Policy violation", hint: "Breach of the terms of service" },
  { value: "customer_request", label: "Customer request", hint: "The organisation asked for a pause" },
  { value: "operational", label: "Operational", hint: "Migration, incident or maintenance" },
  { value: "other", label: "Other", hint: "Explain in the note" },
];

export const SUSPENSION_REASON_LABEL: Record<SuspensionReason, string> = Object.fromEntries(
  SUSPENSION_REASONS.map((item) => [item.value, item.label]),
) as Record<SuspensionReason, string>;

/**
 * What suspension is *intended* to do. These are policy statements the backend
 * must enforce - the demo workspace only records the account status change.
 */
export const SUSPENSION_IMPACTS: ReadonlyArray<{ area: string; intent: string }> = [
  { area: "Company access", intent: "Organisation users are blocked from signing in to the workspace." },
  { area: "User sessions", intent: "Existing sessions should be ended by the identity service." },
  { area: "Scheduled posts", intent: "Queued posts should stop publishing until reactivation." },
  { area: "Automations", intent: "Automation runs should pause; nothing is deleted." },
  { area: "Background jobs", intent: "Crawls, syncs and reports should be held by the scheduler." },
  { area: "Integrations", intent: "Provider tokens are retained; syncing should pause." },
  { area: "Billing status", intent: "The subscription record is unchanged; invoicing policy applies." },
  { area: "Data retention", intent: "All company data is retained while suspended." },
];

export const INTERNAL_TAG_OPTIONS = [
  "Enterprise",
  "High Usage",
  "Priority Support",
  "Payment Risk",
  "Beta Program",
  "Strategic Account",
] as const;

export const NOTE_TAGS: ReadonlyArray<{ value: InternalNoteTag; label: string }> = [
  { value: "billing", label: "Billing" },
  { value: "support", label: "Support" },
  { value: "technical", label: "Technical" },
  { value: "sales", label: "Sales" },
];

export const COMPANY_SIZES: readonly CompanySize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export const INDUSTRIES = [
  "Marketing Agency",
  "Retail",
  "FMCG",
  "Healthcare",
  "Education",
  "Financial Services",
  "Real Estate",
  "Hospitality",
  "Media",
  "Non-profit",
  "Manufacturing",
  "Professional Services",
  "Technology",
  "Travel",
  "Other",
] as const;

export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Singapore",
  "Australia",
  "Canada",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Poland",
] as const;

export const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

export const CURRENCIES = ["INR", "USD", "GBP", "EUR", "AED", "SGD", "AUD"] as const;
export const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Arabic"] as const;
export const REGIONS = ["India (Mumbai)", "Europe (Frankfurt)", "United States (Virginia)", "Asia Pacific (Singapore)"] as const;

export const DASHBOARD_ROUTE_LABEL: Record<ActivityModule, string> = {
  company: "Company",
  users: "Users",
  clients: "Clients",
  subscription: "Subscription",
  billing: "Billing",
  usage: "Usage",
  integrations: "Integrations",
  security: "Security",
  support: "Support",
};

export const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string; field: string; direction: "asc" | "desc" }> = [
  { value: "createdAt:desc", label: "Newest", field: "createdAt", direction: "desc" },
  { value: "createdAt:asc", label: "Oldest", field: "createdAt", direction: "asc" },
  { value: "name:asc", label: "Company name", field: "name", direction: "asc" },
  { value: "mrr:desc", label: "Highest MRR", field: "mrr", direction: "desc" },
  { value: "usage:desc", label: "Highest usage", field: "usage", direction: "desc" },
  { value: "lastActiveAt:desc", label: "Recently active", field: "lastActiveAt", direction: "desc" },
];

export const CREATED_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const LAST_ACTIVE_OPTIONS = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "dormant", label: "Inactive 30+ days" },
];

export const SESSION_STORAGE_KEYS = {
  demoState: "omni.companies.demo-state.v1",
  createDraft: "omni.companies.create-draft.v1",
} as const;
