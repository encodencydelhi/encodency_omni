/**
 * Static configuration for Global Settings: sections, navigation, route helpers,
 * labels for the metadata vocabulary. No values live here (see `registry.ts`).
 */
import {
  BuildingIcon,
  DatabaseIcon,
  GlobeIcon,
  HistoryIcon,
  MegaphoneIcon,
  RocketIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UsersRoundIcon,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/config/routes";
import { COMPANIES_MOCK_MODE } from "@/features/companies/data/config";
import type { Tone } from "@/types/common";
import type { Permission } from "@/types/domain/team";
import type {
  ApprovalRequirement,
  EffectiveTiming,
  EnforcementKind,
  GlobalSettingsCapabilityKey,
  OverridePolicy,
  PolicyKind,
  ScopeKey,
  SectionKey,
  Sensitivity,
  UnitKey,
} from "./types";

export const SETTINGS_MOCK_MODE = COMPANIES_MOCK_MODE;

export const SESSION_STORAGE_KEYS = {
  state: "omni.global-settings.demo-state.v1",
} as const;

/** The example instant used by every date/time preview, so previews never look like a live clock. */
export const PREVIEW_TIMESTAMP = "2026-09-19T12:00:00.000Z";
export const PREVIEW_AMOUNT = 1234567.89;

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export interface SectionDefinition {
  key: SectionKey;
  label: string;
  /** Last URL segment; `null` for the default section at the module root. */
  slug: string | null;
  description: string;
  icon: LucideIcon;
}

export const SECTIONS: readonly SectionDefinition[] = [
  { key: "identity", label: "General & Identity", slug: null, description: "Platform name, contacts and branding", icon: BuildingIcon },
  { key: "localization", label: "Localization & Defaults", slug: "localization", description: "Regional and currency display defaults", icon: GlobeIcon },
  { key: "onboarding", label: "Company Onboarding", slug: "onboarding", description: "How new company workspaces start", icon: RocketIcon },
  { key: "security", label: "Authentication & Security", slug: "security", description: "Login, MFA, session and password policy", icon: ShieldCheckIcon },
  { key: "governance", label: "Access & Governance", slug: "governance", description: "Who may edit what, and how far companies may customise", icon: UsersRoundIcon },
  { key: "privacy", label: "Data & Privacy", slug: "data-privacy", description: "Retention, export and deletion policy", icon: DatabaseIcon },
  { key: "communications", label: "Communications & Legal", slug: "communications", description: "Official contacts and legal document references", icon: MegaphoneIcon },
  { key: "maintenance", label: "Maintenance & Availability", slug: "maintenance", description: "Announcements and access restriction policy", icon: SlidersHorizontalIcon },
  { key: "history", label: "Configuration History", slug: "history", description: "Changes, pending changes and versions", icon: HistoryIcon },
];

export const SECTION_BY_KEY: Record<SectionKey, SectionDefinition> = Object.fromEntries(SECTIONS.map((section) => [section.key, section])) as Record<SectionKey, SectionDefinition>;

export function sectionFromSlug(slug: string | undefined): SectionDefinition | undefined {
  return SECTIONS.find((section) => (section.slug ?? "") === (slug ?? ""));
}

/** Every route in the module. The sidebar item stays active for all of them. */
export const routes = {
  root: ROUTES.superAdmin.settings,
  section(section: SectionKey, params?: { tab?: string; focus?: string; view?: string }): string {
    const slug = SECTION_BY_KEY[section].slug;
    const base = slug ? `${ROUTES.superAdmin.settings}/${slug}` : ROUTES.superAdmin.settings;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) if (value) query.set(key, value);
    const text = query.toString();
    return text ? `${base}?${text}` : base;
  },
  history: (view?: string) => routes.section("history", { tab: view }),
} as const;

/* ------------------------------------------------------------------ */
/* Layout inside a section                                             */
/* ------------------------------------------------------------------ */

export interface GroupDefinition {
  id: string;
  title: string;
  description?: string;
  /** Sub-navigation tab this group belongs to (Authentication & Security only). */
  tab?: string;
}

export const SECURITY_TABS = [
  { key: "login", label: "Login Policy" },
  { key: "mfa", label: "MFA / TOTP" },
  { key: "session", label: "Session Policy" },
  { key: "password", label: "Password & Recovery" },
  { key: "sensitive", label: "Sensitive Actions" },
  { key: "review", label: "Security Review" },
] as const;

export type SecurityTab = (typeof SECURITY_TABS)[number]["key"];

export const PRIVACY_TABS = [
  { key: "retention", label: "Retention" },
  { key: "export", label: "Export & Portability" },
  { key: "deletion", label: "Deletion Requests" },
  { key: "handling", label: "Data Handling References" },
] as const;

export type PrivacyTab = (typeof PRIVACY_TABS)[number]["key"];

export const GOVERNANCE_TABS = [
  { key: "access", label: "Settings Access" },
  { key: "sensitive", label: "Sensitive Changes" },
  { key: "customization", label: "Company Customisation" },
] as const;

export type GovernanceTab = (typeof GOVERNANCE_TABS)[number]["key"];

export const HISTORY_VIEWS = [
  { key: "changes", label: "Change History" },
  { key: "pending", label: "Pending Changes" },
  { key: "versions", label: "Versions" },
] as const;

export type HistoryView = (typeof HISTORY_VIEWS)[number]["key"];

export const SECTION_LAYOUT: Record<Exclude<SectionKey, "history">, readonly GroupDefinition[]> = {
  identity: [
    { id: "platform_information", title: "Platform Information", description: "The platform's own name and default support contacts. Company profiles are never overwritten." },
  ],
  localization: [
    { id: "regional", title: "Regional Defaults", description: "Fallback values for companies that have not chosen their own." },
    { id: "currency", title: "Currency Display Defaults", description: "How amounts are shown. Changing these never converts a stored price, invoice or record." },
  ],
  onboarding: [
    { id: "new_company", title: "New Company Defaults", description: "Applied when a company is created from now on. Existing companies are not changed." },
    { id: "invitations", title: "Invitation Defaults", description: "Already-issued invitations keep the expiry they were sent with." },
  ],
  security: [
    { id: "login", tab: "login", title: "Login Policy", description: "Sign-in attempts, lockout and review." },
    { id: "mfa", tab: "mfa", title: "MFA / TOTP Policy", description: "The policy requirement. Individual enrolment status lives with each account." },
    { id: "session", tab: "session", title: "Session Policy", description: "Lifetimes, idle timeout and reauthentication windows." },
    { id: "password", tab: "password", title: "Password & Recovery", description: "Password rules and account recovery. Reset email delivery is managed in Notifications." },
    { id: "sensitive", tab: "sensitive", title: "Sensitive Action Security", description: "Checks required before a security-critical or high-impact change." },
  ],
  governance: [
    { id: "company_customization", title: "Company Customisation", description: "Which platform defaults a company may override." },
  ],
  privacy: [
    { id: "retention", title: "Retention", description: "Configured retention per data category." },
    { id: "export", title: "Export & Portability", description: "Who may request a company data export and how it is handled." },
    { id: "deletion", title: "Deletion Request Policy", description: "Requirements for closing a company or removing client data." },
  ],
  communications: [
    { id: "contacts", title: "Official Contacts", description: "Platform-owned contact details. Support email and website come from General & Identity." },
  ],
  maintenance: [
    { id: "announcement", title: "Maintenance Announcement", description: "Information shown to the selected audience. It never marks the platform as unavailable." },
    { id: "access", title: "Maintenance Access Policy", description: "A separate, backend-enforced restriction on selected platform operations." },
  ],
};

/* ------------------------------------------------------------------ */
/* Metadata vocabulary                                                 */
/* ------------------------------------------------------------------ */

export const SCOPE_LABEL: Record<ScopeKey, { label: string; tone: Tone; who: string }> = {
  platform_wide: { label: "Platform-Wide", tone: "brand", who: "Everything on the platform" },
  platform_staff: { label: "Platform Staff", tone: "info", who: "EnCodency platform staff accounts" },
  company_users: { label: "Company Users", tone: "info", who: "Users inside company workspaces" },
  staff_and_company_users: { label: "Staff & Company Users", tone: "info", who: "Platform staff and company users" },
  new_companies: { label: "New Companies Only", tone: "neutral", who: "Companies created after the change" },
  existing_and_new: { label: "Existing & New Companies", tone: "neutral", who: "Every company that has not set its own value" },
};

export const POLICY_KIND_LABEL: Record<PolicyKind, { label: string; tone: Tone; description: string }> = {
  default: { label: "Default / Fallback", tone: "neutral", description: "Used when nothing more specific is set." },
  mandatory_minimum: { label: "Mandatory Minimum", tone: "warning", description: "Companies may add to this but never weaken it." },
  fixed: { label: "Fixed Policy", tone: "warning", description: "Applies as written; not company-customisable." },
};

export const OVERRIDE_LABEL: Record<OverridePolicy, { label: string; tone: Tone; description: string }> = {
  not_allowed: { label: "Not Overridable", tone: "neutral", description: "Companies cannot change this." },
  allowed: { label: "Company-Overridable", tone: "success", description: "A company may replace this default with its own value." },
  stricter_only: { label: "Stricter Only", tone: "warning", description: "A company may make this stricter, never weaker." },
  not_applicable: { label: "Not Applicable", tone: "neutral", description: "Companies have no equivalent of this setting." },
};

export const SENSITIVITY_LABEL: Record<Sensitivity, { label: string; tone: Tone }> = {
  low: { label: "Standard", tone: "neutral" },
  moderate: { label: "Moderate", tone: "info" },
  high: { label: "High Impact", tone: "warning" },
  critical: { label: "Security-Critical", tone: "danger" },
};

export const APPROVAL_LABEL: Record<ApprovalRequirement, string> = {
  none: "No approval",
  reason: "Change reason",
  sensitive_review: "Reason + sensitive review",
};

export const TIMING_LABEL: Record<EffectiveTiming, { label: string; description: string }> = {
  immediate: { label: "Immediately", description: "Takes effect as soon as it is saved." },
  new_companies_only: { label: "New Companies Only", description: "Applies to companies created after the change. Existing companies are not migrated." },
  fallback: { label: "Fallback for Existing", description: "Companies without their own value follow the new default; companies with an explicit value keep it." },
  next_session: { label: "Next Session", description: "Applies to sessions started after enforcement. Saving does not revoke existing sessions." },
  on_enforcement: { label: "When Enforced", description: "Takes effect when the backend enforcing service applies it." },
  on_schedule: { label: "At Scheduled Time", description: "Takes effect at the configured start time." },
};

export const ENFORCEMENT_LABEL: Record<EnforcementKind, { label: string; backend: boolean }> = {
  not_security_critical: { label: "Not Security-Critical", backend: false },
  authentication_backend: { label: "Authentication Backend", backend: true },
  data_lifecycle_backend: { label: "Data Lifecycle Service", backend: true },
  platform_backend: { label: "Platform Backend", backend: true },
  display_only: { label: "Display Only", backend: false },
};

export const UNIT_LABEL: Record<UnitKey, { singular: string; plural: string }> = {
  minutes: { singular: "minute", plural: "minutes" },
  hours: { singular: "hour", plural: "hours" },
  days: { singular: "day", plural: "days" },
  characters: { singular: "character", plural: "characters" },
  attempts: { singular: "attempt", plural: "attempts" },
  sessions: { singular: "session", plural: "sessions" },
  count: { singular: "", plural: "" },
};

/* ------------------------------------------------------------------ */
/* Access                                                              */
/* ------------------------------------------------------------------ */

export interface SectionAccess {
  view: GlobalSettingsCapabilityKey;
  edit: GlobalSettingsCapabilityKey;
  viewPermissions: readonly Permission[];
  editPermissions: readonly Permission[];
  /** What a change in this category needs beyond edit access. */
  approval: ApprovalRequirement;
  note: string;
}

/**
 * One table drives both the capability derivation and the Settings Access
 * Matrix, so the matrix can never describe access the code does not enforce.
 */
export const SECTION_ACCESS: Record<SectionKey, SectionAccess> = {
  identity: { view: "canViewGlobalSettings", edit: "canManageIdentity", viewPermissions: ["platform:read"], editPermissions: ["settings:write"], approval: "reason", note: "Branding and platform contact changes are recorded with a reason." },
  localization: { view: "canViewGlobalSettings", edit: "canManageLocalization", viewPermissions: ["platform:read"], editPermissions: ["settings:write"], approval: "none", note: "Defaults only; company values are never rewritten." },
  onboarding: { view: "canViewGlobalSettings", edit: "canManageOnboardingDefaults", viewPermissions: ["platform:read"], editPermissions: ["settings:write", "companies:write"], approval: "reason", note: "Affects every company created from now on." },
  security: { view: "canViewGlobalSettings", edit: "canManageGlobalSecurityPolicies", viewPermissions: ["platform:read"], editPermissions: ["settings:write", "platform:write"], approval: "sensitive_review", note: "Security-critical values are held for review; nothing is enforced by this frontend." },
  governance: { view: "canViewGlobalSettings", edit: "canManageGovernance", viewPermissions: ["platform:read"], editPermissions: ["settings:write", "platform:write"], approval: "sensitive_review", note: "Changes who may customise platform policy." },
  privacy: { view: "canViewGlobalSettings", edit: "canManageDataPolicies", viewPermissions: ["platform:read"], editPermissions: ["settings:write", "platform:write"], approval: "sensitive_review", note: "Retention and deletion policy changes need an impact review." },
  communications: { view: "canViewGlobalSettings", edit: "canManageCommunications", viewPermissions: ["platform:read"], editPermissions: ["settings:write"], approval: "reason", note: "Legal references are recorded, not approved, here." },
  maintenance: { view: "canViewGlobalSettings", edit: "canManageMaintenance", viewPermissions: ["platform:read"], editPermissions: ["settings:write", "platform:write"], approval: "sensitive_review", note: "Enabling an access restriction is a sensitive action." },
  history: { view: "canViewConfigurationHistory", edit: "canWithdrawPendingChanges", viewPermissions: ["audit:read"], editPermissions: ["settings:write"], approval: "none", note: "History is read-only. Withdrawing a pending change needs settings:write." },
};

/* ------------------------------------------------------------------ */
/* Dedicated modules                                                   */
/* ------------------------------------------------------------------ */

export const MODULE_LINKS = [
  { id: "plans", label: "Plans & Subscriptions", owns: "Prices, plan versions, trial policy, renewal and cancellation", href: `${ROUTES.superAdmin.plans}/settings` },
  { id: "usage", label: "Usage & Limits", owns: "Resource catalogue, quota thresholds, metering and over-limit behaviour", href: ROUTES.superAdmin.usage },
  { id: "integrations", label: "Integrations", owns: "Provider configuration, OAuth apps, connection and retry defaults", href: ROUTES.superAdmin.integrations },
  { id: "flags", label: "Feature Flags", owns: "Feature rollout, company availability and targeting", href: ROUTES.superAdmin.featureFlags },
  { id: "notifications", label: "Notifications", owns: "Templates, channels, routing and delivery records", href: ROUTES.superAdmin.notifications },
  { id: "billing", label: "Billing & Payments", owns: "Invoices, payments, refunds and gateway operations", href: ROUTES.superAdmin.billing },
  { id: "health", label: "System Health", owns: "Service monitoring, outages and incidents", href: ROUTES.superAdmin.systemHealth },
  { id: "jobs", label: "Jobs & Queues", owns: "Queue execution, workers and retries", href: ROUTES.superAdmin.jobs },
  { id: "api", label: "API Monitoring", owns: "Request metrics, service diagnostics and traffic", href: ROUTES.superAdmin.apiMonitoring },
  { id: "webhooks", label: "Webhooks", owns: "Endpoints, delivery and signing configuration", href: ROUTES.superAdmin.webhooks },
  { id: "team", label: "Internal Team / Users", owns: "Staff identities, roles and individual account security", href: ROUTES.superAdmin.userSecurity },
  { id: "audit", label: "Audit Logs", owns: "Platform-wide audit search and investigation", href: ROUTES.superAdmin.auditLogs },
] as const;
