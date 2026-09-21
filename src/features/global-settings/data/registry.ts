/**
 * The one registry of Global Settings.
 *
 * Every setting is defined here - what it controls, who it affects, whether it is
 * a default or a mandatory minimum, whether companies may override it, when it
 * takes effect and which system enforces it in production. Pages never invent
 * keys: forms, search, review, history and comparison are all derived from this.
 */
import { APP } from "@/config/app";
import { ROUTES } from "@/config/routes";
import { COUNTRIES, CURRENCIES, LANGUAGES, REGIONS } from "@/features/companies/data/config";
import { SECTION_ACCESS } from "./config";
import { titleCase } from "./text";
import type {
  ApprovalRequirement,
  AssetKind,
  AssetValue,
  EditableSectionKey,
  ExternalSettingDefinition,
  GlobalSettingDefinition,
  LegalDocValue,
  SettingOption,
  SettingValue,
  SettingValues,
  Sensitivity,
} from "./types";

/* ------------------------------------------------------------------ */
/* Option sets                                                         */
/* ------------------------------------------------------------------ */

const opts = (...pairs: Array<[string, string] | [string, string, string]>): SettingOption[] =>
  pairs.map(([value, label, description]) => ({ value, label: titleCase(label), ...(description ? { description } : {}) }));

const DATE_FORMATS = opts(
  ["DD MMM YYYY", "19 Sep 2026"],
  ["DD/MM/YYYY", "19/09/2026"],
  ["MM/DD/YYYY", "09/19/2026"],
  ["YYYY-MM-DD", "2026-09-19"],
);

export const AUDIENCE_OPTIONS = opts(
  ["all_companies", "All companies"],
  ["platform_staff", "Platform staff"],
  ["public_visitors", "Public visitors"],
);

export const MAINTENANCE_AREAS = opts(
  ["entire_platform", "Entire platform"],
  ["publishing", "Publishing & scheduling"],
  ["integrations", "Integrations & sync"],
  ["reporting", "Reporting & analytics"],
  ["billing", "Billing"],
);

const MFA_LEVELS = opts(
  ["optional", "Optional", "Companies decide; no platform requirement."],
  ["recommended", "Recommended", "Prompted at sign-in but not required."],
  ["required_for_admins", "Required for company admins", "Owners and admins must use MFA."],
  ["required_for_all", "Required for all company users", "Every company user must use MFA."],
);

export const LEGAL_DOCUMENT_IDS = ["terms", "privacy", "cookies", "acceptable_use", "dpa", "billing"] as const;
export type LegalDocumentId = (typeof LEGAL_DOCUMENT_IDS)[number];

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, { label: string; required: boolean; description: string }> = {
  terms: { label: "Platform Terms of Service", required: true, description: "Terms governing use of the platform." },
  privacy: { label: "Privacy Policy", required: true, description: "How personal data is handled." },
  cookies: { label: "Cookie Policy", required: false, description: "Cookies and similar technologies, where applicable." },
  acceptable_use: { label: "Acceptable Use Policy", required: false, description: "What the platform may not be used for." },
  dpa: { label: "Data Processing Agreement", required: false, description: "Processor terms, where applicable." },
  billing: { label: "Refund / Billing Policy", required: false, description: "Reference only; billing operations live in Billing & Payments." },
};

export const ASSET_KEYS = {
  primary_logo: "identity.branding.primary_logo",
  compact_logo: "identity.branding.compact_logo",
  app_icon: "identity.branding.app_icon",
  favicon: "identity.branding.favicon",
} as const;

export const ASSET_SPECS = {
  primary_logo: { label: "Primary Platform Logo", guidance: "Horizontal lockup, about 800 × 224 px. PNG, SVG, WebP or JPG, up to 300 KB.", aspect: 800 / 224, minWidth: 200, maxBytes: 300 * 1024, types: ["image/png", "image/svg+xml", "image/webp", "image/jpeg"], defaultFile: "encodency-logo.jpg", defaultSrc: "/brand/encodency-logo.jpg" },
  compact_logo: { label: "Compact Platform Logo", guidance: "Square mark for the collapsed sidebar, at least 128 × 128 px. PNG, SVG or WebP, up to 200 KB.", aspect: 1, minWidth: 64, maxBytes: 200 * 1024, types: ["image/png", "image/svg+xml", "image/webp"], defaultFile: "encodency-glyph.svg", defaultSrc: null },
  app_icon: { label: "App Icon", guidance: "Square, 512 × 512 px recommended. PNG or WebP, up to 300 KB.", aspect: 1, minWidth: 128, maxBytes: 300 * 1024, types: ["image/png", "image/webp"], defaultFile: "app-icon.png", defaultSrc: null },
  favicon: { label: "Favicon", guidance: "Square, 32 × 32 px or larger. ICO, PNG or SVG, up to 100 KB.", aspect: 1, minWidth: 16, maxBytes: 100 * 1024, types: ["image/png", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"], defaultFile: "icon.svg", defaultSrc: "/icon.svg" },
} as const;

export type AssetSpec = (typeof ASSET_SPECS)[AssetKind];
function defaultAsset(kind: AssetKind): AssetValue {
  return { source: "default", fileName: ASSET_SPECS[kind].defaultFile, mimeType: "", sizeBytes: 0, width: null, height: null, dataUrl: null };
}

export const RETENTION_CATEGORIES = [
  { id: "audit_logs", label: "Audit Logs", days: 365, min: 90, max: 3650, owner: "Audit Logs", scope: "Platform-wide" },
  { id: "integration_activity", label: "Integration Activity", days: 90, min: 7, max: 730, owner: "Integrations", scope: "All companies" },
  { id: "job_logs", label: "Operational Job Logs", days: 30, min: 7, max: 365, owner: "Jobs & Queues", scope: "Platform-wide" },
  { id: "api_logs", label: "API Monitoring Logs", days: 30, min: 7, max: 365, owner: "API Monitoring", scope: "Platform-wide" },
  { id: "usage_records", label: "Usage & Metering Records", days: 400, min: 90, max: 1825, owner: "Usage & Limits", scope: "All companies" },
  { id: "notification_history", label: "Notification History", days: 180, min: 30, max: 730, owner: "Notifications", scope: "All companies" },
  { id: "archived_clients", label: "Archived Client Data", days: 180, min: 30, max: 1095, owner: "Clients", scope: "Archived clients" },
  { id: "closed_companies", label: "Closed Company Data", days: 90, min: 30, max: 1095, owner: "Companies", scope: "Closed companies" },
] as const;

const RETENTION_KEY = (id: string) => `privacy.retention.${id}`;

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

type Input = Omit<
  GlobalSettingDefinition,
  "section" | "ownerModule" | "viewCapability" | "editCapability" | "scope" | "policyKind" | "override" | "sensitivity" | "approval" | "timing" | "enforcement"
> &
  Partial<Pick<GlobalSettingDefinition, "scope" | "policyKind" | "override" | "sensitivity" | "approval" | "timing" | "enforcement">>;

const APPROVAL_BY_SENSITIVITY: Record<Sensitivity, ApprovalRequirement> = {
  low: "none",
  moderate: "reason",
  high: "reason",
  critical: "sensitive_review",
};

function build(section: EditableSectionKey, input: Input): GlobalSettingDefinition {
  const sensitivity = input.sensitivity ?? "low";
  return {
    scope: "platform_wide",
    policyKind: "default",
    override: "not_allowed",
    timing: "immediate",
    enforcement: "not_security_critical",
    ...input,
    name: titleCase(input.name),
    section,
    sensitivity,
    approval: input.approval ?? APPROVAL_BY_SENSITIVITY[sensitivity],
    ownerModule: "global_settings",
    viewCapability: SECTION_ACCESS[section].view,
    editCapability: SECTION_ACCESS[section].edit,
  };
}

const auth = { enforcement: "authentication_backend", timing: "on_enforcement" } as const;
const lifecycle = { enforcement: "data_lifecycle_backend", timing: "on_enforcement" } as const;
const platform = { enforcement: "platform_backend", timing: "on_enforcement" } as const;

/* ------------------------------------------------------------------ */
/* Definitions                                                         */
/* ------------------------------------------------------------------ */

const IDENTITY: GlobalSettingDefinition[] = [
  build("identity", { key: "identity.platform_name", name: "Platform name", description: "The official product name shown in headings, sign-in and emails.", group: "platform_information", valueType: "text", defaultValue: APP.name, required: true, maxLength: 80, sensitivity: "moderate", keywords: ["brand", "product name"] }),
  build("identity", { key: "identity.platform_short_name", name: "Platform short name", description: "A compact form for tight spaces such as the footer and browser tab.", group: "platform_information", valueType: "text", defaultValue: APP.shortName, required: true, maxLength: 24, sensitivity: "moderate" }),
  build("identity", { key: "identity.platform_id", name: "Internal platform identifier", description: "Stable identifier used by integrations and support. It cannot be changed.", group: "platform_information", valueType: "readonly", defaultValue: "omni-platform", locked: "Read only. Assigned when the platform was provisioned.", policyKind: "fixed", override: "not_applicable" }),
  build("identity", { key: "identity.description", name: "Platform description", description: "A one-line description used where the platform introduces itself.", group: "platform_information", valueType: "textarea", defaultValue: APP.description, maxLength: 240 }),
  build("identity", { key: "identity.website_url", name: "Official website", description: "The platform's public website. Also used in communications.", group: "platform_information", valueType: "url", defaultValue: "https://encodency.com", placeholder: "https://example.com", sensitivity: "moderate" }),
  build("identity", { key: "identity.support_email", name: "Default support email", description: "Where companies are pointed for help unless they have their own contact.", group: "platform_information", valueType: "email", defaultValue: APP.supportEmail, required: true, sensitivity: "moderate", keywords: ["contact", "help"] }),
  build("identity", { key: "identity.support_url", name: "Default support contact URL", description: "The support portal or contact page.", group: "platform_information", valueType: "url", defaultValue: "https://support.encodency.com", placeholder: "https://support.example.com", keywords: ["support portal", "help center"] }),
  build("identity", { key: ASSET_KEYS.primary_logo, name: "Primary platform logo", description: "The full lockup used on light surfaces and sign-in.", group: "branding", valueType: "asset", defaultValue: defaultAsset("primary_logo"), sensitivity: "moderate", keywords: ["logo", "branding"] }),
  build("identity", { key: ASSET_KEYS.compact_logo, name: "Compact platform logo", description: "The square mark for the collapsed sidebar.", group: "branding", valueType: "asset", defaultValue: defaultAsset("compact_logo"), keywords: ["logo", "branding", "sidebar"] }),
  build("identity", { key: ASSET_KEYS.app_icon, name: "App icon", description: "Icon for installed and shared surfaces.", group: "branding", valueType: "asset", defaultValue: defaultAsset("app_icon"), keywords: ["icon", "branding"] }),
  build("identity", { key: ASSET_KEYS.favicon, name: "Favicon", description: "The small icon shown in browser tabs.", group: "branding", valueType: "asset", defaultValue: defaultAsset("favicon"), keywords: ["icon", "browser tab", "branding"] }),
];

const LOCALIZATION: GlobalSettingDefinition[] = [
  build("localization", { key: "localization.default_timezone", name: "Default timezone", description: "The IANA timezone used when a company has not chosen its own.", group: "regional", valueType: "timezone", defaultValue: "Asia/Kolkata", required: true, scope: "existing_and_new", override: "allowed", overrideGate: "governance.company_override.timezone", timing: "fallback", keywords: ["time zone", "tz", "iana"] }),
  build("localization", { key: "localization.default_locale", name: "Default language / locale", description: "The locale used for language and formatting by default.", group: "regional", valueType: "locale", defaultValue: "en-IN", required: true, scope: "existing_and_new", override: "allowed", overrideGate: "governance.company_override.language", timing: "fallback", keywords: ["language", "locale"] }),
  build("localization", { key: "localization.date_format", name: "Date format", description: "How dates are written by default.", group: "regional", valueType: "select", options: DATE_FORMATS, defaultValue: "DD MMM YYYY", scope: "existing_and_new", override: "allowed", overrideGate: "governance.company_override.regional_formats", timing: "fallback" }),
  build("localization", { key: "localization.time_format", name: "Time format", description: "12-hour or 24-hour clock.", group: "regional", valueType: "select", options: opts(["12h", "12-hour (05:30 PM)"], ["24h", "24-hour (17:30)"]), defaultValue: "12h", scope: "existing_and_new", override: "allowed", overrideGate: "governance.company_override.regional_formats", timing: "fallback" }),
  build("localization", { key: "localization.first_day_of_week", name: "First day of week", description: "The first column of calendars and weekly reports.", group: "regional", valueType: "select", options: opts(["monday", "Monday"], ["sunday", "Sunday"], ["saturday", "Saturday"]), defaultValue: "monday", scope: "existing_and_new", override: "allowed", overrideGate: "governance.company_override.regional_formats", timing: "fallback" }),
  build("localization", { key: "localization.default_region", name: "Default country / region", description: "Used to pre-select a country when a company is created.", group: "regional", valueType: "select", options: COUNTRIES.map((country) => ({ value: country, label: country })), defaultValue: "India", scope: "new_companies", timing: "new_companies_only" }),
  build("localization", { key: "localization.display_currency", name: "Default display currency", description: "The currency platform-level amounts are shown in. Stored prices and invoices are never converted.", group: "currency", valueType: "select", options: CURRENCIES.map((currency) => ({ value: currency, label: currency })), defaultValue: "INR", required: true, sensitivity: "moderate", keywords: ["currency"] }),
  build("localization", { key: "localization.number_locale", name: "Number formatting locale", description: "Controls thousands and decimal separators.", group: "currency", valueType: "locale", defaultValue: "en-IN", required: true }),
  build("localization", { key: "localization.currency_display", name: "Currency symbol display", description: "Show a symbol (₹), the code (INR) or the full name.", group: "currency", valueType: "select", options: opts(["symbol", "Symbol (₹1,00,000)"], ["code", "Code (INR 1,00,000)"], ["name", "Name (1,00,000 Indian rupees)"]), defaultValue: "symbol" }),
];

const ONBOARDING: GlobalSettingDefinition[] = [
  build("onboarding", { key: "onboarding.initial_account_status", name: "Initial company status", description: "The lifecycle state a new company starts in. Active is the only state the Companies model creates; a new company waits for its owner during onboarding.", group: "new_company", valueType: "readonly", defaultValue: "active", locked: "Follows the Companies lifecycle model. \"Pending activation\" is not a company state.", scope: "new_companies", policyKind: "fixed", override: "not_applicable", timing: "new_companies_only" }),
  build("onboarding", { key: "onboarding.timezone_source", name: "Company timezone source", description: "Where a new company's timezone comes from.", group: "new_company", valueType: "select", options: opts(["inherit_platform", "Inherit platform default", "Follows Default timezone in Localization."], ["configured", "Use configured default", "A value set here, independent of Localization."]), defaultValue: "inherit_platform", scope: "new_companies", timing: "new_companies_only", sensitivity: "moderate" }),
  build("onboarding", { key: "onboarding.configured_timezone", name: "Configured company timezone", description: "The timezone new companies start with.", group: "new_company", valueType: "timezone", defaultValue: "Asia/Kolkata", scope: "new_companies", timing: "new_companies_only", visibleWhen: { key: "onboarding.timezone_source", equals: "configured" } }),
  build("onboarding", { key: "onboarding.language_source", name: "Company language source", description: "Where a new company's language comes from.", group: "new_company", valueType: "select", options: opts(["inherit_platform", "Inherit platform default"], ["configured", "Use configured default"]), defaultValue: "inherit_platform", scope: "new_companies", timing: "new_companies_only", sensitivity: "moderate" }),
  build("onboarding", { key: "onboarding.configured_language", name: "Configured company language", description: "The language new companies start with.", group: "new_company", valueType: "select", options: LANGUAGES.map((language) => ({ value: language, label: language })), defaultValue: "English", scope: "new_companies", timing: "new_companies_only", visibleWhen: { key: "onboarding.language_source", equals: "configured" } }),
  build("onboarding", { key: "onboarding.currency_source", name: "Company currency source", description: "Where a new company's working currency comes from.", group: "new_company", valueType: "select", options: opts(["inherit_platform", "Inherit platform display currency"], ["configured", "Use configured default"]), defaultValue: "inherit_platform", scope: "new_companies", timing: "new_companies_only", sensitivity: "moderate" }),
  build("onboarding", { key: "onboarding.configured_currency", name: "Configured company currency", description: "The currency new companies start with.", group: "new_company", valueType: "select", options: CURRENCIES.map((currency) => ({ value: currency, label: currency })), defaultValue: "INR", scope: "new_companies", timing: "new_companies_only", visibleWhen: { key: "onboarding.currency_source", equals: "configured" } }),
  build("onboarding", { key: "onboarding.default_workspace_region", name: "Default workspace region", description: "The hosting region new workspaces are placed in.", group: "new_company", valueType: "select", options: REGIONS.map((region) => ({ value: region, label: region })), defaultValue: "India (Mumbai)", scope: "new_companies", timing: "new_companies_only", sensitivity: "moderate" }),
  build("onboarding", { key: "onboarding.company_configuration_version", name: "Default company configuration version", description: "The configuration version stamped on a new company. Follows the current platform configuration.", group: "new_company", valueType: "readonly", defaultValue: "current", locked: "Read only. Always the current configuration version.", scope: "new_companies", policyKind: "fixed", override: "not_applicable", timing: "new_companies_only" }),
  build("onboarding", { key: "onboarding.owner_invite_expiry_days", name: "Owner invitation expiry", description: "How long a company owner has to accept the first invitation.", group: "invitations", valueType: "number", unit: "days", min: 1, max: 30, defaultValue: 7, required: true, scope: "new_companies", timing: "new_companies_only", keywords: ["invite"] }),
  build("onboarding", { key: "onboarding.member_invite_expiry_days", name: "Member invitation expiry", description: "How long an invited member has to accept.", group: "invitations", valueType: "number", unit: "days", min: 1, max: 60, defaultValue: 14, required: true, scope: "new_companies", timing: "new_companies_only", keywords: ["invite"] }),
  build("onboarding", { key: "onboarding.invitation_acceptance", name: "Invitation acceptance requirements", description: "What an invitee must complete to activate an account.", group: "invitations", valueType: "select", options: opts(["verified_email", "Verified email"], ["verified_email_and_mfa", "Verified email + MFA enrolment"]), defaultValue: "verified_email", scope: "new_companies", timing: "new_companies_only", sensitivity: "moderate", enforcement: "authentication_backend", strictness: "option_order" }),
  build("onboarding", { key: "onboarding.invite_reminder_days", name: "Invitation reminder", description: "Send a reminder this many days before an invitation expires. 0 turns reminders off. Delivery is managed in Notifications.", group: "invitations", valueType: "number", unit: "days", min: 0, max: 14, defaultValue: 2, scope: "new_companies", timing: "new_companies_only" }),
];

const staff = { scope: "platform_staff", ...auth } as const;

const SECURITY: GlobalSettingDefinition[] = [
  // Login
  build("security", { key: "security.company_users.mfa_minimum", name: "Company user MFA minimum", description: "The lowest MFA requirement any company may run with. Companies can be stricter, never weaker.", group: "login", valueType: "select", options: MFA_LEVELS, defaultValue: "required_for_admins", scope: "company_users", policyKind: "mandatory_minimum", override: "stricter_only", overrideGate: "governance.company_override.mfa_stricter", strictness: "option_order", sensitivity: "critical", ...auth, keywords: ["mfa", "2fa", "two factor"] }),
  build("security", { key: "security.login.max_failed_attempts", name: "Maximum failed login attempts", description: "Consecutive failures before a temporary lockout applies.", group: "login", valueType: "number", unit: "attempts", min: 3, max: 10, defaultValue: 5, required: true, scope: "staff_and_company_users", policyKind: "mandatory_minimum", sensitivity: "high", strictness: "lower_is_stricter", ...auth, keywords: ["lockout", "brute force"] }),
  build("security", { key: "security.login.lockout_minutes", name: "Temporary lockout duration", description: "How long sign-in is blocked after the attempt limit is reached.", group: "login", valueType: "number", unit: "minutes", min: 5, max: 1440, defaultValue: 15, required: true, scope: "staff_and_company_users", policyKind: "mandatory_minimum", sensitivity: "high", strictness: "higher_is_stricter", ...auth }),
  build("security", { key: "security.login.suspicious_review", name: "Suspicious login review", description: "What happens when a sign-in looks unusual.", group: "login", valueType: "select", options: opts(["notify_only", "Notify only"], ["require_step_up", "Require step-up verification"], ["block_until_review", "Block until reviewed"]), defaultValue: "require_step_up", scope: "staff_and_company_users", sensitivity: "high", strictness: "option_order", ...auth }),
  build("security", { key: "security.login.notification_policy", name: "Login notification policy", description: "Which sign-ins notify the account owner. Templates and delivery are managed in Notifications.", group: "login", valueType: "select", options: opts(["never", "Never"], ["new_device", "New device or location"], ["every_login", "Every sign-in"]), defaultValue: "new_device", scope: "staff_and_company_users", sensitivity: "moderate", ...auth }),
  // MFA
  build("security", { key: "security.platform_staff.mfa_required", name: "Staff MFA requirement", description: "Require multi-factor authentication for platform staff accounts.", group: "mfa", valueType: "boolean", booleanLabels: ["Not required", "Required"], defaultValue: true, policyKind: "mandatory_minimum", strictness: "higher_is_stricter", sensitivity: "critical", ...staff, keywords: ["mfa", "2fa", "totp", "authenticator"] }),
  build("security", { key: "security.mfa.sensitive_ops_required", name: "MFA for sensitive operations", description: "Ask for a fresh MFA check before a sensitive operation.", group: "mfa", valueType: "boolean", defaultValue: true, policyKind: "mandatory_minimum", strictness: "higher_is_stricter", sensitivity: "high", scope: "staff_and_company_users", ...auth }),
  build("security", { key: "security.mfa.allowed_methods", name: "Allowed MFA methods", description: "Methods accounts may enrol. At least one is required.", group: "mfa", valueType: "multiselect", options: opts(["totp", "Authenticator app (TOTP)"], ["webauthn", "Security key / passkey"], ["email_otp", "Email one-time code"]), defaultValue: ["totp", "webauthn"], required: true, sensitivity: "critical", scope: "staff_and_company_users", ...auth }),
  build("security", { key: "security.mfa.totp_enrollment", name: "TOTP enrolment requirement", description: "When an account must enrol an authenticator.", group: "mfa", valueType: "select", options: opts(["at_first_sign_in", "At first sign-in"], ["within_grace", "Within the grace period"], ["optional", "Optional"]), defaultValue: "within_grace", sensitivity: "high", scope: "staff_and_company_users", strictness: "option_order", ...auth }),
  build("security", { key: "security.mfa.enrollment_grace_days", name: "Enrolment grace period", description: "Days an account may sign in before enrolment is enforced.", group: "mfa", valueType: "number", unit: "days", min: 0, max: 30, defaultValue: 7, sensitivity: "high", scope: "staff_and_company_users", strictness: "lower_is_stricter", visibleWhen: { key: "security.mfa.totp_enrollment", equals: "within_grace" }, ...auth }),
  build("security", { key: "security.mfa.recovery_codes", name: "Recovery code policy", description: "Whether accounts may hold recovery codes. Codes themselves are never shown or stored in this frontend.", group: "mfa", valueType: "select", options: opts(["allowed", "Allowed"], ["admin_reset_only", "Admin Reset Only"]), defaultValue: "allowed", sensitivity: "high", scope: "staff_and_company_users", ...auth }),
  build("security", { key: "security.mfa.reset_requires_approval", name: "MFA reset approval", description: "Require a second approver before an account's MFA is reset.", group: "mfa", valueType: "boolean", defaultValue: true, policyKind: "mandatory_minimum", strictness: "higher_is_stricter", sensitivity: "critical", scope: "staff_and_company_users", ...auth }),
  // Session
  build("security", { key: "security.sessions.access_lifetime_minutes", name: "Access session lifetime", description: "How long an access token stays valid before it must be refreshed.", group: "session", valueType: "number", unit: "minutes", min: 5, max: 120, defaultValue: 15, required: true, scope: "staff_and_company_users", policyKind: "mandatory_minimum", strictness: "lower_is_stricter", sensitivity: "high", ...auth }),
  build("security", { key: "security.sessions.refresh_lifetime_days", name: "Refresh session lifetime", description: "How long a sign-in can be renewed without entering credentials again.", group: "session", valueType: "number", unit: "days", min: 1, max: 90, defaultValue: 7, required: true, scope: "staff_and_company_users", policyKind: "mandatory_minimum", strictness: "lower_is_stricter", sensitivity: "high", ...auth }),
  build("security", { key: "security.sessions.idle_timeout_minutes", name: "Staff idle session timeout", description: "Sign platform staff out after this much inactivity.", group: "session", valueType: "number", unit: "minutes", min: 5, max: 480, defaultValue: 60, required: true, policyKind: "mandatory_minimum", strictness: "lower_is_stricter", sensitivity: "high", ...staff, timing: "next_session", keywords: ["timeout", "inactivity"] }),
  build("security", { key: "security.sessions.company_idle_timeout_minutes", name: "Company user idle timeout", description: "Default inactivity timeout for company users. A company may choose a shorter value.", group: "session", valueType: "number", unit: "minutes", min: 5, max: 720, defaultValue: 120, required: true, scope: "company_users", policyKind: "mandatory_minimum", override: "stricter_only", overrideGate: "governance.company_override.session_timeout", strictness: "lower_is_stricter", sensitivity: "high", ...auth, timing: "next_session" }),
  build("security", { key: "security.sessions.max_concurrent", name: "Maximum concurrent sessions", description: "Simultaneous sessions per account.", group: "session", valueType: "number", unit: "sessions", min: 1, max: 20, defaultValue: 5, scope: "staff_and_company_users", strictness: "lower_is_stricter", sensitivity: "moderate", ...auth }),
  build("security", { key: "security.sessions.reauth_minutes", name: "Recent reauthentication window", description: "A sensitive action needs a sign-in no older than this.", group: "session", valueType: "number", unit: "minutes", min: 5, max: 240, defaultValue: 30, required: true, policyKind: "mandatory_minimum", strictness: "lower_is_stricter", sensitivity: "high", ...staff }),
  build("security", { key: "security.sessions.revocation_policy", name: "Session revocation policy", description: "When existing sessions are ended automatically.", group: "session", valueType: "select", options: opts(["manual_only", "Manual only"], ["on_password_change", "On password change"], ["on_password_or_mfa_change", "On password or MFA change"]), defaultValue: "on_password_or_mfa_change", scope: "staff_and_company_users", strictness: "option_order", sensitivity: "high", ...auth }),
  build("security", { key: "security.sessions.trusted_device_days", name: "Trusted device duration", description: "Skip repeat MFA on a trusted device for this long. 0 turns trusted devices off.", group: "session", valueType: "number", unit: "days", min: 0, max: 90, defaultValue: 14, scope: "staff_and_company_users", strictness: "lower_is_stricter", sensitivity: "high", ...auth }),
  // Password
  build("security", { key: "security.password.min_length", name: "Minimum password length", description: "Shortest password an account may set.", group: "password", valueType: "number", unit: "characters", min: 8, max: 64, defaultValue: 12, required: true, scope: "staff_and_company_users", policyKind: "mandatory_minimum", strictness: "higher_is_stricter", sensitivity: "high", ...auth }),
  build("security", { key: "security.password.strength", name: "Password strength policy", description: "Composition rules beyond length.", group: "password", valueType: "select", options: opts(["standard", "Standard"], ["strong", "Strong (mixed case, digit, symbol)"], ["strong_no_common", "Strong + blocks common passwords"]), defaultValue: "strong", scope: "staff_and_company_users", policyKind: "mandatory_minimum", strictness: "option_order", sensitivity: "high", ...auth }),
  build("security", { key: "security.password.reuse_history", name: "Password reuse prevention", description: "Remember this many previous passwords and refuse them. 0 turns it off. Periodic forced rotation is deliberately not offered.", group: "password", valueType: "number", unit: "count", min: 0, max: 24, defaultValue: 5, scope: "staff_and_company_users", strictness: "higher_is_stricter", sensitivity: "moderate", ...auth }),
  build("security", { key: "security.password.reset_link_minutes", name: "Password reset link validity", description: "How long a reset link works. Delivery and template live in Notifications.", group: "password", valueType: "number", unit: "minutes", min: 5, max: 1440, defaultValue: 30, required: true, scope: "staff_and_company_users", strictness: "lower_is_stricter", sensitivity: "moderate", ...auth }),
  build("security", { key: "security.password.recovery_verification", name: "Account recovery verification", description: "What proves ownership during recovery.", group: "password", valueType: "select", options: opts(["email_only", "Email link only"], ["email_and_mfa", "Email link + MFA check"]), defaultValue: "email_and_mfa", scope: "staff_and_company_users", strictness: "option_order", sensitivity: "high", ...auth }),
  build("security", { key: "security.password.recovery_approval", name: "Account recovery approval", description: "Who must approve recovery of a privileged account.", group: "password", valueType: "select", options: opts(["self_service", "Self-service"], ["admin_approval_privileged", "Admin approval for privileged accounts"]), defaultValue: "admin_approval_privileged", scope: "staff_and_company_users", strictness: "option_order", sensitivity: "high", ...auth }),
  // Sensitive action
  build("security", { key: "security.sensitive.require_reauth", name: "Require recent reauthentication", description: "A sensitive change needs a recent sign-in.", group: "sensitive", valueType: "boolean", defaultValue: true, policyKind: "mandatory_minimum", strictness: "higher_is_stricter", sensitivity: "critical", ...staff }),
  build("security", { key: "security.sensitive.require_mfa", name: "Require MFA verification", description: "A sensitive change needs a fresh MFA check.", group: "sensitive", valueType: "boolean", defaultValue: true, policyKind: "mandatory_minimum", strictness: "higher_is_stricter", sensitivity: "critical", ...staff }),
  build("security", { key: "security.sensitive.require_reason", name: "Require change reason", description: "Every sensitive change records why it was made.", group: "sensitive", valueType: "boolean", defaultValue: true, locked: "Mandatory under the application's security design.", policyKind: "fixed", sensitivity: "high", ...staff }),
  build("security", { key: "security.sensitive.require_secondary_approval", name: "Require secondary approval", description: "A second staff member approves security-critical changes before they apply.", group: "sensitive", valueType: "boolean", defaultValue: true, policyKind: "mandatory_minimum", strictness: "higher_is_stricter", sensitivity: "critical", ...staff }),
  build("security", { key: "security.sensitive.require_audit", name: "Require audit event", description: "Every sensitive change writes an audit event.", group: "sensitive", valueType: "boolean", defaultValue: true, locked: "Mandatory under the application's security design.", policyKind: "fixed", sensitivity: "high", ...staff }),
];

const GOVERNANCE: GlobalSettingDefinition[] = [
  build("governance", { key: "governance.company_override.timezone", name: "Company timezone override permission", description: "Allow a company to set its own timezone instead of the platform default.", group: "company_customization", valueType: "boolean", defaultValue: true, scope: "existing_and_new", sensitivity: "high", ...platform }),
  build("governance", { key: "governance.company_override.language", name: "Company language override permission", description: "Allow a company to choose its own language.", group: "company_customization", valueType: "boolean", defaultValue: true, scope: "existing_and_new", sensitivity: "high", ...platform }),
  build("governance", { key: "governance.company_override.regional_formats", name: "Company date & time format override permission", description: "Allow a company to choose its own date format, time format and first day of week.", group: "company_customization", valueType: "boolean", defaultValue: true, scope: "existing_and_new", sensitivity: "high", ...platform }),
  build("governance", { key: "governance.company_override.mfa_stricter", name: "Company stricter MFA permission", description: "Allow a company to require more than the platform MFA minimum. It can never require less.", group: "company_customization", valueType: "boolean", defaultValue: true, scope: "company_users", sensitivity: "high", ...auth }),
  build("governance", { key: "governance.company_override.session_timeout", name: "Company shorter session timeout permission", description: "Allow a company to choose an idle timeout shorter than the platform value.", group: "company_customization", valueType: "boolean", defaultValue: true, scope: "company_users", sensitivity: "high", ...auth }),
];

const PRIVACY: GlobalSettingDefinition[] = [
  ...RETENTION_CATEGORIES.map((category) =>
    build("privacy", { key: RETENTION_KEY(category.id), name: `${category.label} retention`, description: `How long ${category.label.toLowerCase()} are kept. This is a configured policy, not a verified legal or compliance requirement.`, group: "retention", valueType: "number", unit: "days", min: category.min, max: category.max, defaultValue: category.days, required: true, sensitivity: "high", scope: "platform_wide", ...lifecycle, strictness: "lower_is_stricter", keywords: ["retention", category.owner.toLowerCase()] }),
  ),
  build("privacy", { key: "privacy.export.requesters", name: "Who may request a company data export", description: "The role allowed to start an export for a company.", group: "export", valueType: "select", options: opts(["company_owner", "Company owner only"], ["company_admins", "Company owners and admins"], ["staff_on_request", "Platform Staff On Request"]), defaultValue: "company_owner", sensitivity: "high", scope: "existing_and_new", ...platform }),
  build("privacy", { key: "privacy.export.scope", name: "Authorised export scope", description: "An export contains only the requesting company's own data. This cannot be widened.", group: "export", valueType: "readonly", defaultValue: "Own company data only", locked: "Tenant isolation is mandatory. Other companies' data is never included.", policyKind: "fixed", scope: "existing_and_new", override: "not_applicable" }),
  build("privacy", { key: "privacy.export.approval_required", name: "Export approval requirement", description: "Require platform staff approval before an export is generated.", group: "export", valueType: "boolean", defaultValue: true, sensitivity: "high", scope: "existing_and_new", ...platform, strictness: "higher_is_stricter" }),
  build("privacy", { key: "privacy.export.download_hours", name: "Download availability", description: "How long a generated export stays downloadable.", group: "export", valueType: "number", unit: "hours", min: 1, max: 168, defaultValue: 72, sensitivity: "moderate", scope: "existing_and_new", ...platform, strictness: "lower_is_stricter" }),
  build("privacy", { key: "privacy.export.exclusions", name: "Sensitive data exclusions", description: "Always excluded from every export.", group: "export", valueType: "readonly", defaultValue: "Credentials, secrets, password hashes and session tokens", locked: "Mandatory exclusions cannot be removed.", policyKind: "fixed", override: "not_applicable" }),
  build("privacy", { key: "privacy.export.log_activity", name: "Export activity logging", description: "Every export request and download is written to the audit trail.", group: "export", valueType: "boolean", defaultValue: true, locked: "Mandatory under the application's security design.", policyKind: "fixed", sensitivity: "high", ...platform }),
  build("privacy", { key: "privacy.deletion.closure_request", name: "Company closure request requirements", description: "What a request to close a company must include.", group: "deletion", valueType: "select", options: opts(["owner_confirmation", "Owner confirmation"], ["owner_confirmation_and_staff_review", "Owner confirmation + staff review"]), defaultValue: "owner_confirmation_and_staff_review", sensitivity: "high", scope: "existing_and_new", ...platform, strictness: "option_order" }),
  build("privacy", { key: "privacy.deletion.client_policy", name: "Client archival / deletion policy", description: "What happens to a client removed from a company.", group: "deletion", valueType: "select", options: opts(["archive_only", "Archive only"], ["archive_then_delete", "Archive, Then Delete"]), defaultValue: "archive_then_delete", sensitivity: "high", scope: "existing_and_new", ...lifecycle }),
  build("privacy", { key: "privacy.deletion.approval_required", name: "Deletion approval requirement", description: "Require staff approval before any data removal is executed.", group: "deletion", valueType: "boolean", defaultValue: true, sensitivity: "high", ...lifecycle, strictness: "higher_is_stricter" }),
  build("privacy", { key: "privacy.deletion.dependency_review", name: "Dependency review", description: "Review linked subscriptions, integrations and clients before removal.", group: "deletion", valueType: "boolean", defaultValue: true, sensitivity: "high", ...lifecycle, strictness: "higher_is_stricter" }),
  build("privacy", { key: "privacy.deletion.active_subscription_check", name: "Active subscription check", description: "Block closure while a paid subscription is active.", group: "deletion", valueType: "boolean", defaultValue: true, sensitivity: "high", ...lifecycle, strictness: "higher_is_stricter" }),
  build("privacy", { key: "privacy.deletion.legal_hold", name: "Legal hold handling", description: "Not supported yet. Nothing in this frontend can place or lift a legal hold.", group: "deletion", valueType: "readonly", defaultValue: "Not supported", locked: "Requires a backend legal-hold workflow.", policyKind: "fixed", override: "not_applicable" }),
  build("privacy", { key: "privacy.deletion.backup_retention_days", name: "Backup retention reference", description: "How long backups are kept after a removal. A reference for support answers, not a verified backup setting.", group: "deletion", valueType: "number", unit: "days", min: 7, max: 365, defaultValue: 35, sensitivity: "high", ...lifecycle }),
  build("privacy", { key: "privacy.deletion.execution_status", name: "Data removal execution status", description: "Whether a removal workflow is connected.", group: "deletion", valueType: "readonly", defaultValue: "Not connected. No data is removed by this configuration.", locked: "Removal is a separate, audited backend workflow.", policyKind: "fixed", override: "not_applicable" }),
];

const COMMUNICATIONS: GlobalSettingDefinition[] = [
  build("communications", { key: "communications.display_name", name: "Official display name", description: "The organisation name shown in communications and legal references.", group: "contacts", valueType: "text", defaultValue: "EnCodency Pvt. Ltd.", required: true, maxLength: 100, sensitivity: "moderate" }),
  build("communications", { key: "communications.security_email", name: "Security contact email", description: "Where security reports and notices are sent.", group: "contacts", valueType: "email", defaultValue: "security@encodency.com", required: true, sensitivity: "moderate" }),
  build("communications", { key: "communications.privacy_email", name: "Privacy contact email", description: "Where privacy requests are sent.", group: "contacts", valueType: "email", defaultValue: "privacy@encodency.com", required: true, sensitivity: "moderate" }),
  build("communications", { key: "communications.help_center_url", name: "Help centre URL", description: "Link to the public help centre.", group: "contacts", valueType: "url", defaultValue: "https://help.encodency.com", placeholder: "https://help.example.com" }),
  ...LEGAL_DOCUMENT_IDS.map((id) =>
    build("communications", { key: `communications.legal.${id}`, name: LEGAL_DOCUMENTS[id].label, description: LEGAL_DOCUMENTS[id].description, group: "legal", valueType: "legal_document", defaultValue: defaultLegal(id), sensitivity: "moderate", keywords: ["legal", "policy", "terms"] }),
  ),
];

const M = (key: string) => `maintenance.${key}`;

const MAINTENANCE: GlobalSettingDefinition[] = [
  build("maintenance", { key: M("announcement.enabled"), name: "Announcement enabled", description: "Show the announcement to the selected audience. This does not make the platform unavailable.", group: "announcement", valueType: "boolean", defaultValue: false, sensitivity: "moderate", scope: "platform_wide", timing: "on_schedule", keywords: ["banner", "notice"] }),
  build("maintenance", { key: M("announcement.title"), name: "Announcement title", description: "Short headline for the banner.", group: "announcement", valueType: "text", defaultValue: "Scheduled platform maintenance", maxLength: 80, required: true, timing: "on_schedule" }),
  build("maintenance", { key: M("announcement.message"), name: "Announcement message", description: "What is happening and what people should expect.", group: "announcement", valueType: "textarea", defaultValue: "We will be applying platform updates. Some features may be briefly unavailable. No action is needed.", maxLength: 300, required: true, timing: "on_schedule" }),
  build("maintenance", { key: M("announcement.starts_at"), name: "Planned start", description: "When the maintenance window begins (UTC).", group: "announcement", valueType: "datetime", defaultValue: "2026-09-13T20:30:00.000Z", required: true, timing: "on_schedule" }),
  build("maintenance", { key: M("announcement.ends_at"), name: "Planned end", description: "When the maintenance window ends (UTC).", group: "announcement", valueType: "datetime", defaultValue: "2026-09-13T22:30:00.000Z", required: true, timing: "on_schedule" }),
  build("maintenance", { key: M("announcement.audience"), name: "Audience", description: "Who sees the announcement. In the demo it is applied to the selected demo audience only.", group: "announcement", valueType: "multiselect", options: AUDIENCE_OPTIONS, defaultValue: ["all_companies", "platform_staff"], required: true, timing: "on_schedule" }),
  build("maintenance", { key: M("announcement.area"), name: "Affected platform area", description: "The part of the platform the announcement concerns.", group: "announcement", valueType: "select", options: MAINTENANCE_AREAS, defaultValue: "entire_platform", timing: "on_schedule" }),
  build("maintenance", { key: M("announcement.status_page_url"), name: "Public status page", description: "Link to a public status page, when one exists.", group: "announcement", valueType: "url", defaultValue: "", placeholder: "https://status.example.com", timing: "on_schedule" }),
  build("maintenance", { key: M("announcement.dismissible"), name: "Allow dismissing the banner", description: "Whether a person can hide the banner for their session.", group: "announcement", valueType: "boolean", defaultValue: true, timing: "on_schedule" }),
  build("maintenance", { key: M("access.enabled"), name: "Access restriction enabled", description: "Restrict the selected operations during the window. Real restriction is enforced by the backend.", group: "access", valueType: "boolean", defaultValue: false, sensitivity: "critical", ...platform, keywords: ["lockout", "read only", "downtime"] }),
  build("maintenance", { key: M("access.area"), name: "Restricted platform area", description: "Which operations are restricted.", group: "access", valueType: "select", options: MAINTENANCE_AREAS, defaultValue: "publishing", sensitivity: "high", ...platform }),
  build("maintenance", { key: M("access.audience"), name: "Restricted audience", description: "Whose access is restricted.", group: "access", valueType: "multiselect", options: opts(["company_users", "Company users"], ["api_clients", "API clients"], ["platform_staff", "Platform staff"]), defaultValue: ["company_users"], sensitivity: "high", ...platform }),
  build("maintenance", { key: M("access.starts_at"), name: "Restriction start", description: "When the restriction begins (UTC).", group: "access", valueType: "datetime", defaultValue: "2026-09-13T20:30:00.000Z", sensitivity: "high", ...platform }),
  build("maintenance", { key: M("access.ends_at"), name: "Restriction end", description: "When the restriction ends (UTC).", group: "access", valueType: "datetime", defaultValue: "2026-09-13T22:30:00.000Z", sensitivity: "high", ...platform }),
  build("maintenance", { key: M("access.behavior"), name: "Expected access behaviour", description: "What people can still do while restricted.", group: "access", valueType: "select", options: opts(["read_only", "Read-Only"], ["block_new_jobs", "Block New Jobs And Syncs"], ["sign_in_blocked", "Block sign-in"]), defaultValue: "read_only", sensitivity: "high", ...platform }),
  build("maintenance", { key: M("access.staff_exception"), name: "Staff access exception", description: "Platform staff keep access during the restriction.", group: "access", valueType: "boolean", defaultValue: true, sensitivity: "high", ...platform }),
  build("maintenance", { key: M("access.worker_impact"), name: "API / worker impact reference", description: "How workers and API traffic are treated. Queue operations stay in Jobs & Queues.", group: "access", valueType: "select", options: opts(["no_change", "No change"], ["pause_scheduled_workers", "Pause scheduled workers"], ["reject_writes", "Reject API writes"]), defaultValue: "no_change", sensitivity: "high", ...platform }),
  build("maintenance", { key: M("access.recovery"), name: "Recovery behaviour", description: "What happens when the window ends.", group: "access", valueType: "select", options: opts(["automatic", "Restore Automatically"], ["manual_release", "Restore Manually"]), defaultValue: "automatic", sensitivity: "high", ...platform }),
];

function defaultLegal(id: LegalDocumentId): LegalDocValue {
  const paths: Record<LegalDocumentId, string> = { terms: "terms", privacy: "privacy", cookies: "cookies", acceptable_use: "acceptable-use", dpa: "dpa", billing: "billing-policy" };
  const published = id === "terms" || id === "privacy" || id === "cookies";
  return {
    title: LEGAL_DOCUMENTS[id].label,
    url: published || id === "dpa" ? `https://encodency.com/legal/${paths[id]}` : "",
    version: published ? (id === "terms" ? "3.1" : id === "privacy" ? "2.4" : "1.2") : id === "dpa" ? "1.0" : "",
    effectiveDate: published ? (id === "terms" ? "2026-04-01" : id === "privacy" ? "2026-02-15" : "2025-11-01") : "",
    lastReviewed: published ? "2026-07-20" : "",
    status: published ? "published" : id === "dpa" ? "under_review" : "not_published",
    owner: id === "billing" ? "Finance" : "Legal & Compliance",
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export const SETTING_DEFINITIONS: readonly GlobalSettingDefinition[] = [
  ...IDENTITY,
  ...LOCALIZATION,
  ...ONBOARDING,
  ...SECURITY,
  ...GOVERNANCE,
  ...PRIVACY,
  ...COMMUNICATIONS,
  ...MAINTENANCE,
];

export const SETTING_BY_KEY: ReadonlyMap<string, GlobalSettingDefinition> = new Map(SETTING_DEFINITIONS.map((definition) => [definition.key, definition]));

export function getDefinition(key: string): GlobalSettingDefinition | undefined {
  return SETTING_BY_KEY.get(key);
}

export function definitionsFor(section: EditableSectionKey, group?: string): GlobalSettingDefinition[] {
  return SETTING_DEFINITIONS.filter((definition) => definition.section === section && (!group || definition.group === group));
}

export function isEditable(definition: GlobalSettingDefinition): boolean {
  return definition.valueType !== "readonly" && !definition.locked;
}

/** The registry's default for every setting: the seed of the configuration. */
export function defaultValues(): SettingValues {
  const values: SettingValues = {};
  for (const definition of SETTING_DEFINITIONS) values[definition.key] = cloneValue(definition.defaultValue);
  return values;
}

export function cloneValue<T extends SettingValue>(value: T): T {
  if (Array.isArray(value)) return [...value] as T;
  if (value && typeof value === "object") return { ...value } as T;
  return value;
}

/** Deep equality for setting values (arrays are compared in order, objects by field). */
export function sameValue(a: SettingValue | undefined, b: SettingValue | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => item === b[index]);
  if (typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const left = a as unknown as Record<string, unknown>;
    const right = b as unknown as Record<string, unknown>;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) if (left[key] !== right[key]) return false;
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Settings owned by other modules (searchable, never editable here)   */
/* ------------------------------------------------------------------ */

const S = ROUTES.superAdmin;

export const EXTERNAL_SETTINGS: readonly ExternalSettingDefinition[] = ([
  { id: "ext.trial_policy", name: "Trial Policy", description: "Default trial plan, trial duration and extension limits.", ownerModule: "Plans & Subscriptions", href: `${S.plans}/settings`, keywords: ["trial duration", "trial length", "default trial plan", "extension"] },
  { id: "ext.renewal_policy", name: "Subscription renewal & cancellation policy", description: "Renewal reminders, grace period and cancellation timing.", ownerModule: "Plans & Subscriptions", href: `${S.plans}/settings`, keywords: ["renewal", "cancellation", "grace period", "reactivation"] },
  { id: "ext.plan_pricing", name: "Plan prices & versions", description: "Plan pricing, entitlements and versions.", ownerModule: "Plans & Subscriptions", href: `${S.plans}/catalogue`, keywords: ["price", "plan version", "entitlements"] },
  { id: "ext.quota_thresholds", name: "Quota thresholds & over-limit behaviour", description: "Warning thresholds, metering policy and over-limit handling.", ownerModule: "Usage & Limits", href: S.usage, keywords: ["quota", "limit", "metering", "threshold", "overage"] },
  { id: "ext.integration_defaults", name: "Provider configuration & retry defaults", description: "OAuth applications, connection policy and sync/retry defaults.", ownerModule: "Integrations", href: S.integrations, keywords: ["oauth", "provider", "retry", "sync", "secret"] },
  { id: "ext.feature_rollout", name: "Feature rollout & targeting", description: "Feature flags and company-level availability.", ownerModule: "Feature Flags", href: S.featureFlags, keywords: ["feature flag", "rollout", "targeting"] },
  { id: "ext.notification_templates", name: "Notification templates & routing", description: "Templates, channels, routing and delivery records.", ownerModule: "Notifications", href: S.notifications, keywords: ["email template", "delivery", "channel", "routing"] },
  { id: "ext.billing", name: "Invoices, payments & refunds", description: "Payment operations and gateway configuration.", ownerModule: "Billing & Payments", href: S.billing, keywords: ["invoice", "payment", "refund", "gateway"] },
  { id: "ext.health", name: "Service monitoring & incidents", description: "Health checks, outages and incident management.", ownerModule: "System Health", href: S.systemHealth, keywords: ["incident", "outage", "uptime"] },
  { id: "ext.jobs", name: "Queue execution & job retries", description: "Workers, queues and retry behaviour.", ownerModule: "Jobs & Queues", href: S.jobs, keywords: ["worker", "queue", "retry"] },
  { id: "ext.webhooks", name: "Webhook endpoints & signing", description: "Endpoint configuration, delivery and signature verification.", ownerModule: "Webhooks", href: S.webhooks, keywords: ["webhook", "signing", "endpoint"] },
  { id: "ext.staff", name: "Staff roles & individual account security", description: "Staff identities, role assignments and per-account MFA status.", ownerModule: "Internal Team / Users", href: S.userSecurity, keywords: ["role", "staff", "enrolment status", "mfa reset"] },
  { id: "ext.audit", name: "Audit search & investigation", description: "Platform-wide audit trail.", ownerModule: "Audit Logs", href: S.auditLogs, keywords: ["audit", "investigation"] },
] as readonly ExternalSettingDefinition[]).map((item) => ({ ...item, name: titleCase(item.name) }));

/** The asset value a new default of `kind` carries. */
export function makeDefaultAsset(kind: AssetKind): AssetValue {
  return defaultAsset(kind);
}
