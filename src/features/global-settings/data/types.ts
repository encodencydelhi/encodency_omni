export type EditableSectionKey =
  | "identity"
  | "localization"
  | "onboarding"
  | "security"
  | "governance"
  | "privacy"
  | "communications"
  | "maintenance";

export type SectionKey = EditableSectionKey | "history";

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */

export type AssetKind = "primary_logo" | "compact_logo" | "app_icon" | "favicon";

/** A branding asset. In the demo it is only ever held in memory / session storage; nothing is uploaded. */
export interface AssetValue {
  source: "default" | "uploaded" | "removed";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  /** Local preview only. Never persisted to a server and stripped from history records. */
  dataUrl: string | null;
}

export type LegalDocumentStatus = "published" | "under_review" | "draft" | "not_published";

/** A reference to a legal document. Entering a URL here does not make a document legally approved. */
export interface LegalDocValue {
  title: string;
  url: string;
  version: string;
  /** YYYY-MM-DD */
  effectiveDate: string;
  /** YYYY-MM-DD, empty when never reviewed */
  lastReviewed: string;
  status: LegalDocumentStatus;
  owner: string;
}

export type SettingValue = string | number | boolean | string[] | AssetValue | LegalDocValue | null;
export type SettingValues = Record<string, SettingValue>;

/* ------------------------------------------------------------------ */
/* Definitions                                                         */
/* ------------------------------------------------------------------ */

export type ValueType =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "boolean"
  | "select"
  | "multiselect"
  | "number"
  | "timezone"
  | "locale"
  | "datetime"
  | "asset"
  | "legal_document"
  | "readonly";

export type UnitKey = "minutes" | "hours" | "days" | "characters" | "attempts" | "sessions" | "count";

export type ScopeKey =
  | "platform_wide"
  | "platform_staff"
  | "company_users"
  | "staff_and_company_users"
  | "new_companies"
  | "existing_and_new";

/** How the value relates to the layers below it. */
export type PolicyKind = "default" | "mandatory_minimum" | "fixed";

export type OverridePolicy = "not_allowed" | "allowed" | "stricter_only" | "not_applicable";

export type Sensitivity = "low" | "moderate" | "high" | "critical";

export type ApprovalRequirement = "none" | "reason" | "sensitive_review";

export type EffectiveTiming =
  | "immediate"
  | "new_companies_only"
  | "fallback"
  | "next_session"
  | "on_enforcement"
  | "on_schedule";

export type EnforcementKind = "not_security_critical" | "authentication_backend" | "data_lifecycle_backend" | "platform_backend" | "display_only";

export type StrictnessOrder = "higher_is_stricter" | "lower_is_stricter" | "option_order";

export interface SettingOption {
  value: string;
  label: string;
  description?: string;
}

export interface GlobalSettingDefinition {
  key: string;
  name: string;
  description: string;
  section: EditableSectionKey;
  /** Group id inside the section (see `SECTION_LAYOUT`). */
  group: string;
  valueType: ValueType;
  defaultValue: SettingValue;
  options?: readonly SettingOption[];
  unit?: UnitKey;
  min?: number;
  max?: number;
  maxLength?: number;
  required?: boolean;
  placeholder?: string;
  /** Extra guidance under the control. */
  help?: string;
  /** For booleans that read better as a select, e.g. ["Not required", "Required"]. */
  booleanLabels?: readonly [string, string];
  /** Present when the value is mandatory under the application's security design and cannot be edited here. */
  locked?: string;
  visibleWhen?: { key: string; equals: SettingValue | readonly SettingValue[] };

  ownerModule: "global_settings";
  scope: ScopeKey;
  policyKind: PolicyKind;
  override: OverridePolicy;
  strictness?: StrictnessOrder;
  /** Key of the governance switch that must be on for a company override to count. */
  overrideGate?: string;
  sensitivity: Sensitivity;
  approval: ApprovalRequirement;
  viewCapability: GlobalSettingsCapabilityKey;
  editCapability: GlobalSettingsCapabilityKey;
  timing: EffectiveTiming;
  enforcement: EnforcementKind;
  keywords?: readonly string[];
}

export interface ExternalSettingDefinition {
  id: string;
  name: string;
  description: string;
  ownerModule: string;
  href: string;
  keywords: readonly string[];
}

/* ------------------------------------------------------------------ */
/* Capabilities                                                        */
/* ------------------------------------------------------------------ */

export type GlobalSettingsCapabilityKey =
  | "canViewGlobalSettings"
  | "canManageIdentity"
  | "canManageLocalization"
  | "canManageOnboardingDefaults"
  | "canManageGlobalSecurityPolicies"
  | "canManageGovernance"
  | "canManageDataPolicies"
  | "canManageCommunications"
  | "canManageMaintenance"
  | "canViewConfigurationHistory"
  | "canWithdrawPendingChanges";

export type GlobalSettingsCapabilities = Record<GlobalSettingsCapabilityKey, boolean>;

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export type ChangeResult = "applied" | "pending_approval" | "scheduled" | "withdrawn";
export type ChangeType = "update" | "reset" | "asset" | "reference";

export interface ConfigurationChange {
  id: string;
  versionId: string | null;
  at: string;
  actorId: string;
  actorName: string;
  section: EditableSectionKey;
  key: string;
  settingName: string;
  previous: SettingValue;
  next: SettingValue;
  changeType: ChangeType;
  result: ChangeResult;
  scope: ScopeKey;
  /** When it takes (or took) effect. Null while awaiting approval. */
  effectiveAt: string | null;
  reason: string;
  sensitivity: Sensitivity;
  /** Demo records are recorded in the frontend only; nothing was enforced on a real account. */
  demo: boolean;
  /** Audit Logs reference, when the backend would record one. */
  auditRef: string | null;
  /** Free-text status line for the approval column. */
  approvalNote: string;
}

export type VersionStatus = "current" | "previous";

export interface ConfigurationVersion {
  id: string;
  number: number;
  label: string;
  status: VersionStatus;
  createdBy: string;
  createdAt: string;
  effectiveAt: string;
  sections: EditableSectionKey[];
  summary: string;
  changeIds: string[];
  /** Full value snapshot at this version (assets carry no image data). */
  snapshot: SettingValues;
}

export type MaintenanceEntryStatus = "upcoming" | "active" | "completed" | "disabled";

export interface MaintenanceEntry {
  id: string;
  kind: "announcement" | "access_restriction";
  title: string;
  audience: string[];
  area: string;
  startsAt: string;
  endsAt: string;
  status: MaintenanceEntryStatus;
  /** True for the entry configured in the Announcement form; false for read-only records. */
  editable: boolean;
}

export interface ConfigurationSnapshot {
  values: SettingValues;
  version: { id: string; number: number; label: string };
  updatedAt: string;
  updatedBy: string;
  /** Last time each key was changed; used as the "effective date" of a policy. */
  changedAt: Record<string, string>;
  pendingCount: number;
  pendingSensitiveCount: number;
  maintenance: MaintenanceEntry[];
}

/* ------------------------------------------------------------------ */
/* Review / save                                                       */
/* ------------------------------------------------------------------ */

export type ChangeDirection = "stricter" | "weaker" | "neutral";

export interface ReviewRow {
  key: string;
  name: string;
  section: EditableSectionKey;
  previous: SettingValue;
  next: SettingValue;
  previousText: string;
  nextText: string;
  scope: ScopeKey;
  sensitivity: Sensitivity;
  timing: EffectiveTiming;
  enforcement: EnforcementKind;
  direction: ChangeDirection;
  existingImpact: string;
  newImpact: string;
  /** True when this row is held as a pending change instead of being applied. */
  pending: boolean;
  warning?: string;
}

export interface RequiredCheck {
  id: string;
  label: string;
  /** What this frontend actually does about the check. */
  state: "recorded" | "backend_required" | "not_required";
  note: string;
}

export interface ChangeReview {
  rows: ReviewRow[];
  requiresReason: boolean;
  /** True when at least one row will be held pending instead of applied. */
  hasPending: boolean;
  checks: RequiredCheck[];
  warnings: string[];
}

export interface SaveSectionInput {
  section: EditableSectionKey;
  /** Changed keys only. */
  values: SettingValues;
  reason?: string;
}

export interface SaveResult {
  version: ConfigurationVersion | null;
  applied: ConfigurationChange[];
  pending: ConfigurationChange[];
}

export interface MutationActor {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export interface ChangeQuery {
  section?: string;
  actor?: string;
  range?: string;
  changeType?: string;
  result?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ChangeListResult {
  rows: ConfigurationChange[];
  total: number;
  page: number;
  pageSize: number;
  actors: Array<{ id: string; name: string }>;
}

export interface VersionComparisonRow {
  key: string;
  name: string;
  section: EditableSectionKey;
  previousText: string;
  nextText: string;
  scope: ScopeKey;
  direction: ChangeDirection;
  impact: string;
}

export interface VersionComparison {
  from: ConfigurationVersion;
  to: ConfigurationVersion;
  rows: VersionComparisonRow[];
}

/* ------------------------------------------------------------------ */
/* Derived                                                             */
/* ------------------------------------------------------------------ */

export interface SearchHit {
  id: string;
  name: string;
  description: string;
  sectionLabel: string;
  groupLabel: string | null;
  href: string;
  external: boolean;
  ownerModule: string;
  key: string | null;
}

export interface SecurityReviewData {
  configured: Array<{ key: string; label: string; value: string }>;
  incomplete: Array<{ key: string; label: string; detail: string }>;
  backendDependencies: Array<{ key: string; label: string }>;
  pendingSensitive: ConfigurationChange[];
  lastUpdatedAt: string | null;
  /** A configuration state, never a score. */
  status: "configured" | "needs_review";
}

export interface NewCompanyDefaults {
  timezone: string;
  language: string;
  currency: string;
  region: string;
  accountStatus: "active";
  ownerInviteExpiryDays: number;
  memberInviteExpiryDays: number;
  configurationVersion: string;
}
