import { ROUTES } from "@/config/routes";
import { COMPANIES_MOCK_MODE } from "@/features/companies/data/config";
import type { Tone } from "@/types/common";
import type {
  ActorType,
  AuditCategory,
  AuditOutcome,
  CollectionState,
  Environment,
  IntegrityStatus,
  InvestigationPriority,
  InvestigationStatus,
  RangeKey,
  ReviewPriority,
  SecurityView,
  SensitiveCategory,
  WorkflowStage,
} from "./types";

export const AUDIT_MOCK_MODE = COMPANIES_MOCK_MODE;
export const SESSION_STORAGE_KEYS = { state: "omni.audit-logs.demo-state.v1" } as const;

const ROOT = ROUTES.superAdmin.auditLogs;

export const RANGES: ReadonlyArray<{ value: RangeKey; label: string }> = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];
export const DEFAULT_RANGE: RangeKey = "30d";

export const ENVIRONMENTS: ReadonlyArray<{ value: Environment; label: string }> = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

export const MAX_EXPORT_RANGE_DAYS = 90;
export const PAGE_SIZE = 15;
function withQuery(path: string, params: Record<string, string | undefined | null> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export const auditRoutes = {
  root: ROOT,
  overview: (params?: Record<string, string | undefined>) => withQuery(ROOT, params),
  events: (params?: Record<string, string | undefined>) => withQuery(`${ROOT}/events`, params),
  event: (id: string, back?: string) => withQuery(`${ROOT}/events/${encodeURIComponent(id)}`, { back }),
  security: (view?: SecurityView, params?: Record<string, string | undefined>) => withQuery(`${ROOT}/security`, { view: view && view !== "authentication" ? view : undefined, ...params }),
  sensitive: (params?: Record<string, string | undefined>) => withQuery(`${ROOT}/sensitive`, params),
  investigations: (params?: Record<string, string | undefined>) => withQuery(`${ROOT}/investigations`, params),
  investigation: (id: string) => `${ROOT}/investigations/${encodeURIComponent(id)}`,
  settings: (params?: Record<string, string | undefined>) => withQuery(`${ROOT}/settings`, params),
  company: (id: string) => ROUTES.superAdmin.company(id),
  companyActivity: (id: string) => `${ROUTES.superAdmin.company(id)}/activity`,
  privacySettings: () => `${ROUTES.superAdmin.settings}/data-privacy`,
} as const;

export const MODULE_TABS = [
  { key: "overview", label: "Overview", href: ROOT, base: ROOT },
  { key: "events", label: "Event Explorer", href: `${ROOT}/events`, base: `${ROOT}/events` },
  { key: "security", label: "Access & Security", href: `${ROOT}/security`, base: `${ROOT}/security` },
  { key: "sensitive", label: "Sensitive Changes", href: `${ROOT}/sensitive`, base: `${ROOT}/sensitive` },
  { key: "investigations", label: "Investigations", href: `${ROOT}/investigations`, base: `${ROOT}/investigations` },
  { key: "settings", label: "Settings & Retention", href: `${ROOT}/settings`, base: `${ROOT}/settings` },
] as const;

export type ModuleTabKey = (typeof MODULE_TABS)[number]["key"];

export function activeModuleTab(pathname: string): ModuleTabKey {
  const found = MODULE_TABS.filter((tab) => tab.key !== "overview").find((tab) => pathname === tab.base || pathname.startsWith(`${tab.base}/`));
  return found?.key ?? "overview";
}

export const SECURITY_VIEWS: ReadonlyArray<{ key: SecurityView; label: string; description: string }> = [
  { key: "authentication", label: "Authentication", description: "Sign-ins, MFA, password resets, sessions and lockouts." },
  { key: "user_access", label: "User Access", description: "Company membership, roles, client access and invitations." },
  { key: "staff", label: "Platform Staff", description: "Staff invitations, platform roles, suspensions, access reviews and operational assignments." },
  { key: "policies", label: "Security Policies", description: "Security and access-governance policy changes and their approval." },
];
export const CATEGORY: Record<AuditCategory, { label: string; bar: string }> = {
  authentication: { label: "Authentication & Security", bar: "bg-danger" },
  companies: { label: "Companies", bar: "bg-primary" },
  users_access: { label: "Users & Access", bar: "bg-info" },
  internal_team: { label: "Internal Team", bar: "bg-[#7C3AED]" },
  clients: { label: "Clients", bar: "bg-[#0891B2]" },
  plans_subscriptions: { label: "Plans & Subscriptions", bar: "bg-success" },
  billing: { label: "Billing & Payments", bar: "bg-warning" },
  usage_limits: { label: "Usage & Limits", bar: "bg-[#EA580C]" },
  integrations: { label: "Integrations", bar: "bg-[#0D9488]" },
  feature_flags: { label: "Feature Flags", bar: "bg-[#DB2777]" },
  global_settings: { label: "Global Settings", bar: "bg-[#475569]" },
  support_operations: { label: "Support & Operations", bar: "bg-neutral" },
};

export const OUTCOME: Record<AuditOutcome, { label: string; tone: Tone }> = {
  success: { label: "Success", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  denied: { label: "Denied", tone: "warning" },
  pending: { label: "Pending", tone: "info" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  partial: { label: "Partial", tone: "warning" },
};

export const PRIORITY: Record<ReviewPriority, { label: string; tone: Tone; rank: number }> = {
  informational: { label: "Informational", tone: "neutral", rank: 0 },
  review_recommended: { label: "Review Recommended", tone: "warning", rank: 1 },
  high: { label: "High Priority", tone: "danger", rank: 2 },
};

export const ACTOR_TYPE: Record<ActorType, { label: string }> = {
  staff: { label: "Platform Staff" },
  company_user: { label: "Company User" },
  system: { label: "System Service" },
  external_provider: { label: "External Provider" },
  anonymous: { label: "Anonymous / Unauthenticated" },
};

export const SENSITIVE: Record<SensitiveCategory, { label: string }> = {
  privileged_access: { label: "Privileged Access" },
  billing_financial: { label: "Billing & Financial" },
  subscription_entitlements: { label: "Subscription & Entitlements" },
  integrations: { label: "Integrations" },
  feature_flags: { label: "Feature Flags" },
  platform_security: { label: "Platform Security" },
  data_privacy: { label: "Data & Privacy" },
  maintenance_availability: { label: "Maintenance & Availability" },
};

export const WORKFLOW_STAGE: Record<WorkflowStage, { label: string; tone: Tone }> = {
  requested: { label: "Change Requested", tone: "info" },
  approved: { label: "Change Approved", tone: "success" },
  applied: { label: "Change Applied", tone: "success" },
  rejected: { label: "Change Rejected", tone: "danger" },
};

export const INTEGRITY: Record<IntegrityStatus, { label: string; tone: Tone }> = {
  verified: { label: "Verified By Backend", tone: "success" },
  failed: { label: "Verification Failed", tone: "danger" },
  unavailable: { label: "Verification Unavailable", tone: "neutral" },
  demo_data: { label: "Demo Data", tone: "neutral" },
};

export const COLLECTION_STATE: Record<CollectionState, { label: string; tone: Tone }> = {
  configured: { label: "Configured", tone: "success" },
  partially_instrumented: { label: "Partially Instrumented", tone: "warning" },
  not_implemented: { label: "Not Implemented", tone: "danger" },
  verification_pending: { label: "Verification Pending", tone: "info" },
  unknown: { label: "Unknown", tone: "neutral" },
};

export const INVESTIGATION_STATUS: Record<InvestigationStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "info" },
  in_review: { label: "In Review", tone: "warning" },
  awaiting_information: { label: "Awaiting Information", tone: "neutral" },
  closed: { label: "Closed", tone: "success" },
};

export const INVESTIGATION_PRIORITY: Record<InvestigationPriority, { label: string; tone: Tone; rank: number }> = {
  normal: { label: "Normal", tone: "neutral", rank: 0 },
  elevated: { label: "Elevated", tone: "warning", rank: 1 },
  high: { label: "High", tone: "danger", rank: 2 },
};

export const QUICK_FILTERS = [
  { value: "sensitive", label: "Sensitive" },
  { value: "failed", label: "Failed / Denied" },
  { value: "access", label: "Access Changes" },
  { value: "billing", label: "Billing Changes" },
  { value: "config", label: "Configuration Changes" },
] as const;

export const EVENT_SORTS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "priority", label: "Review Priority" },
  { value: "category", label: "Category" },
  { value: "actor", label: "Actor" },
] as const;

export const INVESTIGATION_SORTS = [
  { value: "updated", label: "Recently Updated" },
  { value: "oldest_open", label: "Oldest Open" },
  { value: "priority", label: "Priority" },
  { value: "id", label: "Case ID" },
] as const;

export const METRIC_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "sensitive", label: "Sensitive Events" },
  { value: "failed", label: "Failed / Denied Events" },
  { value: "auth", label: "Authentication Events" },
] as const;

export const ACCESS_CHANGE_KEYS = new Set([
  "user.company_role_changed",
  "user.suspended",
  "user.membership_added",
  "user.permission_updated",
  "client.access_granted",
  "client.access_changed",
  "client.access_revoked",
  "staff.platform_role_changed",
  "staff.suspended",
  "staff.reactivated",
  "staff.deactivated",
]);

export const CONFIG_CHANGE_KEYS = new Set([
  "feature_flag.rollout_changed",
  "feature_flag.state_changed",
  "feature_flag.emergency_disabled",
  "feature_flag.emergency_restored",
  "feature_flag.dependency_updated",
  "feature_flag.lifecycle_changed",
  "global_settings.setting_changed",
  "global_settings.security_change_applied",
  "global_settings.privacy_change_applied",
  "global_settings.maintenance_changed",
  "global_settings.governance_changed",
  "integration.provider_configuration_changed",
  "company.security_policy_changed",
  "usage.override_applied",
  "usage.override_revoked",
  "plan.published",
  "plan.updated",
  "plan.retired",
]);

export const COVERAGE_MODULES: ReadonlyArray<{ module: string; category: AuditCategory | null; expected: string[]; configured: "configured" | "partially_instrumented" | "not_implemented" | "verification_pending" | "unknown"; note: string; href: string | null }> = [
  { module: "Authentication", category: "authentication", expected: ["Login succeeded and failed", "MFA verification", "Password reset", "Session revocation", "Lockout"], configured: "partially_instrumented", note: "Sign-in outcomes are recorded. Session-level detail is not yet emitted.", href: null },
  { module: "Companies", category: "companies", expected: ["Created", "Status changed", "Ownership transferred", "Data export requested"], configured: "configured", note: "Recorded through the shared company activity contract.", href: ROUTES.superAdmin.companies },
  { module: "Users", category: "users_access", expected: ["Invited", "Company role changed", "Suspended", "Permission updated"], configured: "configured", note: "Membership and role changes are recorded.", href: ROUTES.superAdmin.users },
  { module: "Internal Team", category: "internal_team", expected: ["Staff invited", "Platform role changed", "Suspended", "Access review completed"], configured: "verification_pending", note: "Events are recorded; instrumentation has not been verified against the team service.", href: ROUTES.superAdmin.team },
  { module: "Clients", category: "clients", expected: ["Created", "Paused", "Archived", "Access granted and revoked"], configured: "configured", note: "Recorded through the shared company activity contract.", href: ROUTES.superAdmin.Clients },
  { module: "Plans & Subscriptions", category: "plans_subscriptions", expected: ["Plan published", "Subscription change requested and applied", "Trial changes", "Cancellation"], configured: "configured", note: "Recorded through the shared subscription events.", href: ROUTES.superAdmin.plans },
  { module: "Billing & Payments", category: "billing", expected: ["Payment allocated", "Refund requested, approved and confirmed", "Credit note issued"], configured: "partially_instrumented", note: "Refund workflow is recorded. Adjustment approvals are not yet emitted.", href: ROUTES.superAdmin.billing },
  { module: "Usage & Limits", category: "usage_limits", expected: ["Override applied and revoked", "Alert acknowledged"], configured: "configured", note: "Overrides are recorded through the shared subscription events.", href: ROUTES.superAdmin.usage },
  { module: "Integrations", category: "integrations", expected: ["Connected and disconnected", "Provider configuration changed", "Reauthorization requested"], configured: "configured", note: "Connection events are recorded. Credential values are never recorded.", href: ROUTES.superAdmin.integrations },
  { module: "Feature Flags", category: "feature_flags", expected: ["Rollout changed", "Emergency disabled", "State changed", "Lifecycle changed"], configured: "configured", note: "Recorded from the shared feature-flag change history.", href: ROUTES.superAdmin.featureFlags },
  { module: "Global Settings", category: "global_settings", expected: ["Setting changed", "Security change requested and applied", "Privacy policy changed"], configured: "configured", note: "Recorded from the shared configuration history.", href: ROUTES.superAdmin.settings },
  { module: "Jobs & Queues", category: "support_operations", expected: ["Queue paused and resumed", "Job retried and cancelled"], configured: "partially_instrumented", note: "Queue pause is recorded. Retries and cancellations are not emitted yet.", href: ROUTES.superAdmin.jobs },
  { module: "System Health", category: "support_operations", expected: ["Maintenance window scheduled", "Incident status changed"], configured: "partially_instrumented", note: "Maintenance windows are recorded. Incident status changes are not.", href: ROUTES.superAdmin.systemHealth },
  { module: "Webhooks", category: null, expected: ["Endpoint changed", "Delivery replayed"], configured: "not_implemented", note: "Endpoint changes and replays are not emitted as audit events yet.", href: null },
  { module: "Support & Tickets", category: "support_operations", expected: ["Ticket reassigned", "Ticket closed", "Internal note added"], configured: "partially_instrumented", note: "Reassignment is recorded. Closure and notes are not yet emitted.", href: ROUTES.superAdmin.support },
  { module: "API Monitoring", category: null, expected: ["Alert rule changed", "Key revoked"], configured: "unknown", note: "No instrumentation contract has been agreed for this module.", href: ROUTES.superAdmin.apiMonitoring },
];
