export type ISODate = string;
export type Maybe<T> = T | null;
export interface IntegrationClient {
  id: string;
  name: string;
  color: string;
}
export type ModuleKey =
  | "content_studio"
  | "campaigns"
  | "analytics"
  | "automation"
  | "reports"
  | "lead_capture"
  | "reviews"
  | "inbox"
  | "seo"
  | "website"
  | "email";
export type ProviderId =
  | "meta"
  | "linkedin"
  | "google-business"
  | "whatsapp"
  | "youtube"
  | "x"
  | "search-console"
  | "ga4"
  | "website-tracking"
  | "smtp"
  | "mailchimp"
  | "tiktok"
  | "hubspot";

export type ProviderCategory = "social" | "messaging" | "google" | "website" | "email" | "crm";

export type ProviderAvailability = "available" | "plan_restricted" | "platform_disabled" | "coming_soon";

export type ResourceType =
  | "facebook_page"
  | "instagram_account"
  | "ad_account"
  | "linkedin_page"
  | "gbp_location"
  | "whatsapp_number"
  | "youtube_channel"
  | "x_account"
  | "search_console_property"
  | "ga4_property"
  | "website"
  | "smtp_sender";

export type SyncDataType = "posts" | "analytics" | "comments" | "reviews" | "leads" | "profile" | "audience" | "messages" | "search_performance";

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  /** Required permissions are requested on every connect; optional ones can be declined. */
  optional: boolean;
  requiredFor: ModuleKey[];
  /** The provider's own identifier — only shown behind "Advanced". */
  technicalScope: string;
}

export interface IntegrationProvider {
  id: ProviderId;
  name: string;
  category: ProviderCategory;
  description: string;
  /** `organization` providers (e.g. SMTP) serve every client at once. */
  scope: "client" | "organization";
  resourceTypes: { type: ResourceType; label: string; multiple: boolean }[];
  permissions: PermissionDefinition[];
  dataTypes: SyncDataType[];
  modules: ModuleKey[];
  requirements: string[];
  availability: ProviderAvailability;
  /** Plain-language explanation when not available. Never platform config. */
  availabilityNote?: string;
  learnMoreUrl: string;
}

/* ------------------------------------------------------------------ */
/* Connections                                                         */
/* ------------------------------------------------------------------ */

/** The one status model used on every screen. */
export type ConnectionStatus =
  | "connected"
  | "syncing"
  | "needs_reconnect"
  | "expiring"
  | "permission_missing"
  | "sync_failed"
  | "rate_limited"
  | "disconnected";

export type ReconnectReason = "token_expired" | "access_revoked" | "scope_changed" | "permission_missing" | "expiring";

export type SyncFrequency = "15m" | "hourly" | "6h" | "daily" | "manual";

export type ResourceStatus = "active" | "access_revoked" | "removed";

export interface IntegrationResource {
  id: string;
  connectionId: string;
  type: ResourceType;
  name: string;
  /** A human-recognisable handle or URL, not an internal id. */
  handle: string;
  /** Resources can be mapped to a different client than their connection. */
  clientId: string;
  primary: boolean;
  status: ResourceStatus;
  lastSyncAt: Maybe<ISODate>;
}

export type PermissionStatus = "granted" | "missing" | "expired" | "optional";

export interface IntegrationPermission {
  key: string;
  status: PermissionStatus;
}

export interface IntegrationConnection {
  id: string;
  providerId: ProviderId;
  /** Home client. `null` means organization-wide. */
  clientId: Maybe<string>;
  accountName: string;
  status: ConnectionStatus;
  /** Why the connection is not healthy, when it isn't. */
  statusReason: Maybe<{ code: ReconnectReason | "sync_error" | "rate_limit"; detail: string }>;
  connectedAt: ISODate;
  connectedBy: string;
  lastSyncAt: Maybe<ISODate>;
  nextSyncAt: Maybe<ISODate>;
  tokenExpiresAt: Maybe<ISODate>;
  rateLimitResetAt: Maybe<ISODate>;
  syncFrequency: SyncFrequency;
  resources: IntegrationResource[];
  permissions: IntegrationPermission[];
  disconnectedAt: Maybe<ISODate>;
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */

export type SyncRunStatus = "running" | "success" | "partial" | "failed";
export type SyncTrigger = "scheduled" | "manual" | "sync_all" | "retry" | "reconnect";

export interface IntegrationSyncRun {
  id: string;
  connectionId: string;
  clientId: Maybe<string>;
  trigger: SyncTrigger;
  status: SyncRunStatus;
  startedAt: ISODate;
  endedAt: Maybe<ISODate>;
  durationMs: Maybe<number>;
  recordsProcessed: number;
  failedRecords: number;
  dataTypes: SyncDataType[];
  error: Maybe<{ message: string; hint: string }>;
}

/** A sync currently in flight in this session. */
export interface SyncJob {
  runId: string;
  progress: number;
  phase: string;
}

/* ------------------------------------------------------------------ */
/* Dependencies                                                        */
/* ------------------------------------------------------------------ */

export type DependencyStatus = "active" | "ready" | "at_risk" | "broken";

export interface IntegrationDependency {
  id: string;
  connectionId: string;
  clientId: Maybe<string>;
  module: ModuleKey;
  feature: string;
  activeCount: number;
  /** "workflows", "scheduled posts" — reads as "3 workflows". */
  unit: string;
  /** Critical dependencies break something live if the connection goes away. */
  critical: boolean;
  status: DependencyStatus;
  href: string;
}

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

export type ActivityEvent =
  | "connected"
  | "disconnected"
  | "reconnected"
  | "reconnect_required"
  | "sync_completed"
  | "sync_partial"
  | "sync_failed"
  | "sync_started"
  | "permission_changed"
  | "mapping_changed"
  | "primary_changed"
  | "resource_removed"
  | "settings_updated"
  | "rate_limited";

export type ActivityResult = "success" | "warning" | "failed" | "info";

export interface IntegrationActivity {
  id: string;
  connectionId: Maybe<string>;
  providerId: Maybe<ProviderId>;
  clientId: Maybe<string>;
  event: ActivityEvent;
  result: ActivityResult;
  actor: string;
  summary: string;
  at: ISODate;
  syncRunId: Maybe<string>;
}

/* ------------------------------------------------------------------ */
/* Issues (derived — never stored)                                     */
/* ------------------------------------------------------------------ */

export type Severity = "critical" | "warning" | "info";
export type IssueAction = "reconnect" | "review_permissions" | "retry_sync" | "view_details";

export interface IntegrationIssue {
  id: string;
  connectionId: string;
  providerId: ProviderId;
  clientId: Maybe<string>;
  severity: Severity;
  title: string;
  /** What happened. */
  happened: string;
  /** What it affects, in module terms. */
  affects: string;
  /** What the admin should do. */
  todo: string;
  action: IssueAction;
  detectedAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Settings (company-level only)                                       */
/* ------------------------------------------------------------------ */

export type NotificationKey =
  | "connectionExpired"
  | "reconnectRequired"
  | "syncFailed"
  | "permissionMissing"
  | "rateLimit"
  | "accountRemoved";

export interface IntegrationSettings {
  sync: {
    defaultFrequency: SyncFrequency;
    retryFailed: boolean;
    retryAttempts: number;
    manualSyncBehavior: "incremental" | "full";
    backgroundRefresh: boolean;
  };
  notifications: Record<NotificationKey, { inApp: boolean; email: boolean; slack: boolean }>;
  clientMapping: {
    oneAccountPerClient: boolean;
    allowMultipleResources: boolean;
    primaryBehavior: "first_selected" | "ask_every_time";
  };
  security: {
    orgAdminOnly: boolean;
    confirmCriticalDisconnect: boolean;
    requirePauseBeforeDisconnect: boolean;
  };
  dataHandling: {
    retentionDays: number;
  };
}

/* ------------------------------------------------------------------ */
/* Access                                                              */
/* ------------------------------------------------------------------ */

export type OrgRole = "org_admin" | "manager" | "member";

export interface Capability {
  allowed: boolean;
  reason?: string;
}

export type CapabilityKey = "canConnect" | "canDisconnect" | "canReconnect" | "canSync" | "canChangeMapping" | "canManageSettings";

export type CapabilityMap = Record<CapabilityKey, Capability>;

/* ------------------------------------------------------------------ */
/* Snapshot                                                            */
/* ------------------------------------------------------------------ */

export interface IntegrationsSnapshot {
  clients: IntegrationClient[];
  providers: IntegrationProvider[];
  connections: IntegrationConnection[];
  syncRuns: IntegrationSyncRun[];
  dependencies: IntegrationDependency[];
  activity: IntegrationActivity[];
  settings: IntegrationSettings;
  currentUser: { name: string; role: OrgRole };
}
