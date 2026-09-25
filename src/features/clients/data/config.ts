/**
 * Static configuration for the Super Admin Clients workspace.
 */
import { COMPANIES_MOCK_MODE } from "@/features/companies/data/config";
import { ROUTES } from "@/config/routes";
import type { StatusRegistry } from "@/types/common";
import type {
  ClientAccessLevel,
  ClientAnalyticsLinkState,
  ClientFactorStatus,
  ClientHealthArea,
  ClientHealthStatus,
  ClientOnboardingStatus,
  ClientSection,
  ClientWorkspaceStatus,
  OnboardingStepKey,
  PauseReason,
  ReportingPeriod,
  WebsiteAvailability,
  WebsiteMonitoring,
} from "./types";

/**
 * Mock mode is the app-wide setting the Companies module already reuses - this
 * module shares its store, so it can never be "live" while Companies is demo.
 */
export const CLIENTS_MOCK_MODE = COMPANIES_MOCK_MODE;

/* ------------------------------------------------------------------ */
/* Status registries                                                   */
/* ------------------------------------------------------------------ */

export const WORKSPACE_STATUS = {
  active: { label: "Active", tone: "success" },
  paused: { label: "Paused", tone: "warning", description: "Workspace is paused; nothing is deleted" },
  archived: { label: "Archived", tone: "neutral", description: "Retained for records; not operated" },
} as const satisfies StatusRegistry<ClientWorkspaceStatus>;

export const ONBOARDING_STATUS = {
  not_started: { label: "Not Started", tone: "neutral" },
  in_progress: { label: "In Progress", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  blocked: { label: "Blocked", tone: "danger" },
} as const satisfies StatusRegistry<ClientOnboardingStatus>;

export const HEALTH_STATUS = {
  healthy: { label: "Healthy", tone: "success" },
  needs_attention: { label: "Needs Attention", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
  not_enough_data: { label: "Not Enough Data", tone: "neutral", description: "Nothing to assess yet, or the workspace is not operating" },
} as const satisfies StatusRegistry<ClientHealthStatus>;

export const FACTOR_STATUS = {
  healthy: { label: "Healthy", tone: "success" },
  warning: { label: "Warning", tone: "warning" },
  critical: { label: "Critical", tone: "danger" },
  not_configured: { label: "Not Configured", tone: "neutral" },
} as const satisfies StatusRegistry<ClientFactorStatus>;

export const HEALTH_AREA_LABEL: Record<ClientHealthArea, string> = {
  workspace: "Workspace",
  channels: "Channel Connectivity",
  publishing: "Publishing & Jobs",
  website: "Website Monitoring",
  team: "Team & Access",
  usage: "Usage",
};

export const MONITORING_META = {
  active: { label: "Monitoring active", tone: "success" },
  paused: { label: "Monitoring paused", tone: "warning" },
  stopped: { label: "Monitoring stopped", tone: "danger" },
} as const satisfies StatusRegistry<WebsiteMonitoring>;

export const ANALYTICS_LINK_META = {
  connected: { label: "Connected", tone: "success" },
  needs_reconnect: { label: "Needs reconnect", tone: "warning" },
  configured_only: { label: "Configured, not connected", tone: "info" },
  not_connected: { label: "Not connected", tone: "neutral" },
} as const satisfies StatusRegistry<ClientAnalyticsLinkState>;

export const AVAILABILITY_META = {
  up: { label: "Up", tone: "success" },
  down: { label: "Down", tone: "danger" },
  unknown: { label: "Unknown", tone: "neutral" },
} as const satisfies StatusRegistry<WebsiteAvailability>;

export const ACCESS_LEVEL_META = {
  admin: { label: "Client Admin", tone: "brand" },
  editor: { label: "Editor", tone: "info" },
  viewer: { label: "Viewer", tone: "neutral" },
} as const satisfies StatusRegistry<ClientAccessLevel>;

/** What each client access level allows *inside this client* - never a global role definition. */
export const ACCESS_LEVEL_PERMISSIONS: Record<ClientAccessLevel, ReadonlyArray<{ label: string; allowed: boolean }>> = {
  admin: [
    { label: "View analytics and reports", allowed: true },
    { label: "Create and edit content", allowed: true },
    { label: "Approve and publish content", allowed: true },
    { label: "Manage channel connections", allowed: true },
    { label: "Manage client team access", allowed: true },
  ],
  editor: [
    { label: "View analytics and reports", allowed: true },
    { label: "Create and edit content", allowed: true },
    { label: "Approve and publish content", allowed: true },
    { label: "Manage channel connections", allowed: false },
    { label: "Manage client team access", allowed: false },
  ],
  viewer: [
    { label: "View analytics and reports", allowed: true },
    { label: "Create and edit content", allowed: false },
    { label: "Approve and publish content", allowed: false },
    { label: "Manage channel connections", allowed: false },
    { label: "Manage client team access", allowed: false },
  ],
};

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */

export const ONBOARDING_STEPS: ReadonlyArray<{ key: OnboardingStepKey; label: string; hint: string }> = [
  { key: "identity", label: "Client identity configured", hint: "Industry and a contact email are set" },
  { key: "website", label: "Primary website configured", hint: "Some clients have no website" },
  { key: "lead", label: "Client lead assigned", hint: "An active member leads the workspace" },
  { key: "team", label: "Team members assigned", hint: "At least one active member has access" },
  { key: "channel", label: "At least one channel connected", hint: "A provider account is connected" },
  { key: "access_review", label: "Workspace access reviewed", hint: "A platform reviewer confirmed who has access" },
];

/** Defaults; each client can override them in Settings. Optional steps never block completion. */
export const DEFAULT_REQUIRED_STEPS: Record<OnboardingStepKey, boolean> = {
  identity: true,
  website: false,
  lead: true,
  team: true,
  channel: true,
  access_review: false,
};

/* ------------------------------------------------------------------ */
/* Thresholds and policy                                               */
/* ------------------------------------------------------------------ */

/** Two or more failed scheduled posts is a critical publishing problem; one is a warning. */
export const FAILED_POSTS_CRITICAL = 2;
export const APPROVAL_STALE_DAYS = 3;
/** A handful of crawl warnings is normal; this many or more is worth a look. */
export const WEBSITE_WARNINGS_THRESHOLD = 5;
export const CLIENT_USAGE_SHARE_WARNING = 0.6;
export const COMPANY_USAGE_WARNING = 75;
export const DORMANT_AFTER_DAYS = 30;

/**
 * One centralised product policy: an archived client keeps counting towards the
 * company's client limit. Companies' own usage uses the same rule (it counts every
 * client record), so the two modules cannot disagree. Changing this changes both.
 */
export const ARCHIVED_CLIENTS_COUNT_TOWARD_LIMIT = true;
export const ARCHIVE_SLOT_POLICY =
  "Archived clients still count towards the company's client limit. Archiving does not free a slot.";

export const HEALTH_METHOD =
  "Client health is assessed from six areas: workspace, channel connectivity, publishing and jobs, website monitoring, team and access, and usage. It is Critical if any area is critical, Needs Attention if any area warns, and Healthy otherwise. Paused and archived clients, and clients with nothing configured yet, show Not Enough Data.";

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export const PAUSE_REASONS: ReadonlyArray<{ value: PauseReason; label: string; hint: string }> = [
  { value: "customer_request", label: "Customer request", hint: "The company asked for the workspace to pause" },
  { value: "billing", label: "Billing", hint: "Held while a billing matter is resolved" },
  { value: "campaign_ended", label: "Campaign ended", hint: "No active work until the next campaign" },
  { value: "content_review", label: "Content review", hint: "Publishing held for a review" },
  { value: "operational", label: "Operational", hint: "Migration, incident or maintenance" },
  { value: "other", label: "Other", hint: "Explain in the note" },
];

export const PAUSE_REASON_LABEL: Record<PauseReason, string> = Object.fromEntries(
  PAUSE_REASONS.map((item) => [item.value, item.label]),
) as Record<PauseReason, string>;

/** What pausing is *intended* to do. The backend enforces it; the demo records status only. */
export const PAUSE_IMPACTS: ReadonlyArray<{ area: string; intent: string }> = [
  { area: "Scheduled posts", intent: "Queued posts should stop publishing until the client resumes." },
  { area: "Automations", intent: "Automation runs should pause; workflows are kept." },
  { area: "Connected accounts", intent: "Tokens are retained; syncing should pause." },
  { area: "Monitoring", intent: "Website checks and crawls should pause." },
  { area: "Client access", intent: "Members keep their assignment but cannot work in the client." },
  { area: "Stored content", intent: "All content, drafts and history are retained." },
];

export const INDUSTRIES = [
  "Non-profit",
  "Retail",
  "FMCG",
  "Healthcare",
  "Education",
  "Financial Services",
  "Real Estate",
  "Hospitality",
  "Media",
  "Manufacturing",
  "Professional Services",
  "Technology",
  "Travel",
  "Automotive",
  "Energy",
  "Beauty",
  "Other",
] as const;

export const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const;

export const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Arabic"] as const;

export const REPORTING_PERIODS: ReadonlyArray<{ value: ReportingPeriod; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export const SORT_OPTIONS: ReadonlyArray<{ value: string; label: string; field: string; direction: "asc" | "desc" }> = [
  { value: "createdAt:desc", label: "Newest", field: "createdAt", direction: "desc" },
  { value: "lastActive:desc", label: "Recently active", field: "lastActive", direction: "desc" },
  { value: "name:asc", label: "Client name", field: "name", direction: "asc" },
  { value: "company:asc", label: "Company name", field: "company", direction: "asc" },
  { value: "connections:desc", label: "Most connections", field: "connections", direction: "desc" },
  { value: "issues:desc", label: "Most issues", field: "issues", direction: "desc" },
];

export const CREATED_OPTIONS = [
  { value: "month", label: "This month" },
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

export const TEAM_FILTER_OPTIONS = [
  { value: "assigned", label: "Has active members" },
  { value: "none", label: "No active members" },
];

export const WEBSITE_FILTER_OPTIONS = [
  { value: "configured", label: "Website configured" },
  { value: "none", label: "No website" },
];

export const ONBOARDING_FILTER_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "blocked", label: "Blocked" },
  { value: "pending", label: "Any pending (not completed)" },
];

export const HEALTH_FILTER_OPTIONS = [
  { value: "healthy", label: "Healthy" },
  { value: "needs_attention", label: "Needs Attention" },
  { value: "critical", label: "Critical" },
  { value: "not_enough_data", label: "Not Enough Data" },
  { value: "at_risk", label: "Needs attention or critical" },
];

export const SESSION_STORAGE_KEYS = {
  createDraft: "omni.clients.create-draft.v1",
  lastListQuery: "omni.clients.last-list-query.v1",
} as const;

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export const CLIENT_SECTIONS: ReadonlyArray<{ key: ClientSection; label: string; slug: string }> = [
  { key: "overview", label: "Overview", slug: "" },
  { key: "team", label: "Team & Access", slug: "team" },
  { key: "channels", label: "Channels", slug: "channels" },
  { key: "website-seo", label: "Website & SEO", slug: "website-seo" },
  { key: "activity", label: "Activity", slug: "activity" },
  { key: "settings", label: "Settings", slug: "settings" },
];

export function resolveClientBasePath(pathname?: string | null): string {
  if (pathname?.startsWith(ROUTES.admin.root)) {
    return ROUTES.admin.clients;
  }
  if (typeof window !== "undefined" && window.location.pathname.startsWith(ROUTES.admin.root)) {
    return ROUTES.admin.clients;
  }
  return ROUTES.superAdmin.Clients;
}

export function clientHref(clientId: string, basePath?: string): string {
  const root = basePath ?? resolveClientBasePath();
  return `${root}/${clientId}`;
}

export function clientSectionHref(clientId: string, section: ClientSection, query?: Record<string, string>, basePath?: string): string {
  const slug = CLIENT_SECTIONS.find((item) => item.key === section)?.slug ?? "";
  const root = clientHref(clientId, basePath);
  const base = slug ? `${root}/${slug}` : root;
  const search = query ? new URLSearchParams(query).toString() : "";
  return search ? `${base}?${search}` : base;
}

export const CLIENTS_LIST_ROUTE = ROUTES.superAdmin.Clients;

export function clientsListHref(basePath?: string): string {
  return basePath ?? resolveClientBasePath();
}
