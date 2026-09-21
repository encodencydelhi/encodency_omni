/**
 * Static configuration for Feature Flags: routes, tabs, vocabulary and the
 * governance policy. No flag data lives here (see `mock/seed.ts`).
 */
import { ROUTES } from "@/config/routes";
import { COMPANIES_MOCK_MODE } from "@/features/companies/data/config";
import type { Tone } from "@/types/common";
import type {
  Availability,
  ChangeStatus,
  ChangeType,
  Environment,
  FeatureCategory,
  FlagType,
  ImplementationStatus,
  LifecycleStatus,
  OperationalState,
  Protection,
  RolloutStrategy,
} from "./types";

export const FLAGS_MOCK_MODE = COMPANIES_MOCK_MODE;
export const SESSION_STORAGE_KEYS = { state: "omni.feature-flags.demo-state.v1" } as const;

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

const ROOT = ROUTES.superAdmin.featureFlags;

export const DEFAULT_ENVIRONMENT: Environment = "production";
export const ENVIRONMENTS: ReadonlyArray<{ value: Environment; label: string }> = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

export function parseEnvironment(value: string | null | undefined): Environment | null {
  return ENVIRONMENTS.find((item) => item.value === value)?.value ?? null;
}

function withEnv(path: string, environment: Environment | undefined, extra: Record<string, string | undefined> = {}): string {
  const query = new URLSearchParams();
  if (environment && environment !== DEFAULT_ENVIRONMENT) query.set("env", environment);
  for (const [key, value] of Object.entries(extra)) if (value) query.set(key, value);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export const flagRoutes = {
  root: ROOT,
  overview: (env?: Environment) => withEnv(ROOT, env),
  all: (env?: Environment, extra?: Record<string, string | undefined>) => withEnv(`${ROOT}/all`, env, extra),
  flag: (key: string, env?: Environment, tab?: FlagTab) => withEnv(`${ROOT}/all/${encodeURIComponent(key)}`, env, { tab: tab && tab !== "overview" ? tab : undefined }),
  rollouts: (env?: Environment) => withEnv(`${ROOT}/rollouts`, env),
  access: (env?: Environment, company?: string) => withEnv(`${ROOT}/company-access`, env, { company }),
  changes: (env?: Environment, tab?: ChangesTab, extra?: Record<string, string | undefined>) => withEnv(`${ROOT}/changes`, env, { tab: tab && tab !== "pending" ? tab : undefined, ...extra }),
  settings: (env?: Environment) => withEnv(`${ROOT}/settings`, env),
  company: (id: string) => ROUTES.superAdmin.company(id),
  subscription: (id: string) => `${ROUTES.superAdmin.subscriptions}/${id}`,
  usage: (companyId: string, resource?: string) => `${ROUTES.superAdmin.company(companyId)}/usage${resource ? `?metric=${resource}` : ""}`,
  plans: `${ROUTES.superAdmin.plans}/catalogue`,
  integrations: ROUTES.superAdmin.integrations,
} as const;

export const MODULE_TABS = [
  { key: "overview", label: "Overview", href: (env?: Environment) => flagRoutes.overview(env), base: ROOT },
  { key: "all", label: "All Flags", href: (env?: Environment) => flagRoutes.all(env), base: `${ROOT}/all` },
  { key: "rollouts", label: "Rollouts & Targeting", href: (env?: Environment) => flagRoutes.rollouts(env), base: `${ROOT}/rollouts` },
  { key: "access", label: "Company Access", href: (env?: Environment) => flagRoutes.access(env), base: `${ROOT}/company-access` },
  { key: "changes", label: "Changes & Activity", href: (env?: Environment) => flagRoutes.changes(env), base: `${ROOT}/changes` },
  { key: "settings", label: "Settings & Governance", href: (env?: Environment) => flagRoutes.settings(env), base: `${ROOT}/settings` },
] as const;

export type ModuleTabKey = (typeof MODULE_TABS)[number]["key"];

export function activeModuleTab(pathname: string): ModuleTabKey {
  const found = MODULE_TABS.filter((tab) => tab.key !== "overview").find((tab) => pathname === tab.base || pathname.startsWith(`${tab.base}/`));
  return found?.key ?? "overview";
}

export const FLAG_TABS = [
  { key: "overview", label: "Overview" },
  { key: "targeting", label: "Targeting & Rollout" },
  { key: "rules", label: "Rules & Dependencies" },
  { key: "impact", label: "Company Impact" },
  { key: "activity", label: "Activity" },
  { key: "settings", label: "Settings & Lifecycle" },
] as const;
export type FlagTab = (typeof FLAG_TABS)[number]["key"];

export const CHANGES_TABS = [
  { key: "pending", label: "Pending Changes" },
  { key: "scheduled", label: "Scheduled Changes" },
  { key: "history", label: "Change History" },
  { key: "versions", label: "Configuration Versions" },
] as const;
export type ChangesTab = (typeof CHANGES_TABS)[number]["key"];

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORIES: readonly FeatureCategory[] = ["AI & Content", "Automation", "Channels", "Website & SEO", "Analytics", "Workspace", "Agency", "Platform", "Security", "Billing"];

export const OWNER_TEAMS = ["Content Platform", "Automation", "Channels", "Growth & SEO", "Analytics", "Core Workspace", "Agency Products", "Platform Engineering", "Trust & Safety", "Billing Systems"] as const;

/** The Company Admin surfaces a flag can belong to. */
export const RELATED_MODULES = ["Dashboard", "Meta / Instagram", "LinkedIn", "Google Business", "WhatsApp", "YouTube", "Website", "SEO Overview", "SEO Audit", "Content Studio", "Calendar", "Campaigns", "Media Library", "Platform"] as const;

export const FLAG_TYPE: Record<FlagType, { label: string; description: string }> = {
  release: { label: "Release Flag", description: "Controls the introduction or gradual rollout of a feature." },
  operational: { label: "Operational Flag", description: "Controls supported operational availability of an already implemented feature." },
};

export const LIFECYCLE: Record<LifecycleStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  active: { label: "Active", tone: "success" },
  deprecated: { label: "Deprecated", tone: "warning" },
  archived: { label: "Archived", tone: "neutral" },
};

export const IMPLEMENTATION: Record<ImplementationStatus, { label: string; tone: Tone; description: string }> = {
  not_implemented: { label: "Not Implemented", tone: "danger", description: "The feature is not built. A flag cannot make it available." },
  in_development: { label: "In Development", tone: "warning", description: "Available in the development environment only." },
  testing: { label: "Testing", tone: "info", description: "Available in development and staging." },
  ready: { label: "Ready", tone: "success", description: "Implemented and available in every environment." },
  deprecated: { label: "Deprecated", tone: "neutral", description: "Being retired. Still runs where it is enabled." },
};

export const PROTECTION: Record<Protection, { label: string; tone: Tone; description: string }> = {
  standard: { label: "Standard", tone: "neutral", description: "Ordinary feature. Governance follows the environment." },
  sensitive: { label: "Sensitive", tone: "warning", description: "Production changes always need a reason and review." },
  protected: { label: "Protected / Core", tone: "danger", description: "Core or security-related. Production changes need approval and it cannot be emergency-disabled from here." },
};

export const OPERATIONAL_STATE: Record<OperationalState, { label: string; tone: Tone }> = {
  enabled: { label: "Enabled", tone: "success" },
  disabled: { label: "Disabled", tone: "neutral" },
  emergency_off: { label: "Emergency Off", tone: "danger" },
};

export const STRATEGY: Record<RolloutStrategy, { label: string; short: string; description: string }> = {
  disabled: { label: "Disabled", short: "Disabled", description: "No company is matched." },
  internal: { label: "Internal Staff Only", short: "Internal Only", description: "Exposed only in an explicitly supported internal testing context. No tenant company is matched and no tenant data is opened to staff." },
  selected: { label: "Selected Companies", short: "Selected", description: "Only the companies you choose are matched." },
  percentage: { label: "Percentage of Eligible Companies", short: "Percentage", description: "A stable, deterministic share of companies is matched. The evaluated count can differ from the percentage." },
  all: { label: "All Eligible Companies", short: "All Eligible", description: "Every company is matched; plan, dependency and integration conditions still apply." },
};

export const AVAILABILITY: Record<Availability, { label: string; tone: Tone; explanation: string }> = {
  available: { label: "Available", tone: "success", explanation: "Every condition is satisfied." },
  emergency_off: { label: "Emergency Off", tone: "danger", explanation: "An emergency disable is active in this environment. The rollout configuration is preserved." },
  not_ready: { label: "Not Ready", tone: "danger", explanation: "The feature is not implemented for this environment." },
  flag_disabled: { label: "Flag Disabled", tone: "neutral", explanation: "The flag is switched off in this environment." },
  plan_restricted: { label: "Plan Restricted", tone: "warning", explanation: "Targeted for rollout, but the current subscription does not include this feature." },
  subscription_inactive: { label: "Subscription Inactive", tone: "neutral", explanation: "The company has no active subscription or account." },
  rollout_restricted: { label: "Rollout Restricted", tone: "neutral", explanation: "The company is not matched by the current targeting." },
  internal_only: { label: "Internal Only", tone: "info", explanation: "The flag is limited to internal testing, so no tenant company receives it." },
  dependency_blocked: { label: "Dependency Blocked", tone: "warning", explanation: "A prerequisite feature is not available to this company." },
  integration_blocked: { label: "Integration Not Ready", tone: "warning", explanation: "A required integration is not connected or not healthy for this company." },
};

export const CHANGE_TYPE: Record<ChangeType, string> = {
  flag_created: "Flag Created",
  state_changed: "State Changed",
  rollout_updated: "Rollout Updated",
  target_added: "Company Target Added",
  target_removed: "Company Target Removed",
  dependency_updated: "Dependency Updated",
  emergency_disabled: "Emergency Disabled",
  emergency_restored: "Emergency Restored",
  metadata_updated: "Metadata Updated",
  flag_deprecated: "Flag Deprecated",
  flag_archived: "Flag Archived",
};

export const CHANGE_STATUS: Record<ChangeStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_approval: { label: "Pending Approval", tone: "warning" },
  scheduled: { label: "Scheduled (Planned)", tone: "info" },
  applied: { label: "Applied (Demo)", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/* ------------------------------------------------------------------ */
/* Governance                                                          */
/* ------------------------------------------------------------------ */

export const KEY_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/;
export const KEY_HELP = "Lowercase area.feature_name, e.g. content.ai_generator. It cannot change once application code references it.";

/** A production change touching more than this many companies is not a low-impact change. */
export const LOW_IMPACT_COMPANY_LIMIT = 3;

/** Days without an update after which a flag is a cleanup candidate. */
export const CLEANUP_AFTER_DAYS = 45;

export const GOVERNANCE = {
  creation: [
    { label: "Stable key convention", value: "area.feature_name, lowercase, at least two segments" },
    { label: "Required owner team", value: "Yes" },
    { label: "Required description", value: "Yes, 10 characters or more" },
    { label: "Default initial state", value: "Disabled in every environment; production is always disabled at creation" },
    { label: "Allowed flag types", value: "Release and Operational. There is no entitlement or permission flag type" },
    { label: "Allowed environments", value: "Development, Staging, Production" },
    { label: "Implementation readiness", value: "Taken from the feature registry. A flag cannot mark an unbuilt feature as available" },
  ],
  production: [
    { label: "Impact review", value: "Required before any production change" },
    { label: "Change reason", value: "Required" },
    { label: "Approval", value: `Required for protected flags, and for changes that enable more than ${LOW_IMPACT_COMPANY_LIMIT} companies. No approval service is connected, so these stay pending` },
    { label: "Sensitive flag classification", value: "Standard, Sensitive, Protected / Core" },
    { label: "Emergency disable", value: "Permitted for standard and sensitive flags. Protected flags cannot be emergency-disabled from here" },
    { label: "Minimum documentation", value: "Reason and impact summary recorded with every change" },
  ],
  rollout: [
    { label: "Allowed strategies", value: "Disabled, Internal Staff Only, Selected Companies, Percentage, All Eligible" },
    { label: "Percentage behaviour", value: "Stable hash of feature key, environment, company ID and salt; the evaluated count may differ from the percentage" },
    { label: "Deterministic assignment", value: "Never random. Changing the salt would reassign companies, so it is not editable here" },
    { label: "Scheduled rollouts", value: "Recorded as planned changes. No worker runs them in this phase" },
    { label: "Company targeting", value: "Targeting never grants a plan entitlement" },
    { label: "Internal testing", value: "Does not open tenant data to platform staff" },
  ],
  lifecycle: [
    { label: "Review interval", value: `${CLEANUP_AFTER_DAYS} days without a change` },
    { label: "Deprecation", value: "A deprecated flag can stay enabled. Deprecating does not remove code" },
    { label: "Cleanup candidates", value: "Fully rolled out, or disabled and unchanged past the review interval, or deprecated" },
    { label: "Archive requirements", value: "No active rollout, no dependent flags, no scheduled or pending changes" },
    { label: "Code reference verification", value: "Not connected. Code references are shown as unverified" },
    { label: "Protected flags", value: "Cannot be archived or emergency-disabled from this screen" },
  ],
} as const;
