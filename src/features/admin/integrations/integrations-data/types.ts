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

export interface PermissionDefinition {
  /** The provider's own scope name. */
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
  /** `organization` providers serve every client at once; every connectable provider today is per client. */
  scope: "client" | "organization";
  resourceTypes: { type: ResourceType; label: string; multiple: boolean }[];
  /** The scopes the authorization really asks for, with plain-language explanations. */
  permissions: PermissionDefinition[];
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

/** The one status model used on every screen. `syncing` only ever means "a check is running right now". */
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

export type ResourceStatus = "active" | "access_revoked" | "removed";

export interface IntegrationResource {
  id: string;
  connectionId: string;
  type: ResourceType;
  /** The provider's name for it; a placeholder until a check has captured one. */
  name: string;
  /** A human-recognisable handle or URL, not an internal id. Empty when the provider gave none. */
  handle: string;
  /** The provider's own id for the account (what discovery returns), used to tell which found accounts are already mapped. */
  externalId: string;
  /** Resources can be mapped to a different client than their connection. */
  clientId: string;
  status: ResourceStatus;
  /** Posts still waiting to go out through this account. */
  pendingPosts: number;
  /** Whether posts were ever scheduled through it (such an account can no longer be removed or moved). */
  hasPostHistory: boolean;
}

export type PermissionStatus = "granted" | "missing" | "expired" | "optional" | "unknown";

export interface IntegrationPermission {
  key: string;
  status: PermissionStatus;
}

export interface IntegrationConnection {
  id: string;
  providerId: ProviderId;
  /** Home client. `null` means it is a company login with no account mapped yet. */
  clientId: Maybe<string>;
  accountName: string;
  status: ConnectionStatus;
  /** Why the connection is not healthy, when it isn't. */
  statusReason: Maybe<{ code: ReconnectReason | "sync_error" | "rate_limit"; detail: string }>;
  connectedAt: ISODate;
  connectedBy: string;
  /** When a check of this connection last succeeded. */
  lastCheckedAt: Maybe<ISODate>;
  tokenExpiresAt: Maybe<ISODate>;
  /** Whether the login renews its own access (Google, LinkedIn, YouTube) or must be reconnected (Meta). */
  autoRenews: boolean;
  resources: IntegrationResource[];
  permissions: IntegrationPermission[];
  /** Posts still waiting to go out through this connection. */
  pendingPosts: number;
  disconnectedAt: Maybe<ISODate>;
}

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

export type CheckRunStatus = "running" | "success" | "failed";
export type CheckTrigger = "scheduled" | "manual";

/** One recorded check of a connection: either a person pressed "Check now" or the background renewal ran. */
export interface IntegrationCheckRun {
  id: string;
  connectionId: string;
  clientId: Maybe<string>;
  trigger: CheckTrigger;
  status: CheckRunStatus;
  startedAt: ISODate;
  endedAt: Maybe<ISODate>;
  durationMs: Maybe<number>;
  /** Accounts, pages or channels the provider returned; null for a token-only renewal. */
  accountsFound: Maybe<number>;
  error: Maybe<{ message: string; hint: string }>;
}

/** A check currently in flight in this session. */
export interface CheckJob {
  runId: string;
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
  /** "scheduled posts", "accounts" — reads as "3 scheduled posts". */
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
  | "sync_failed"
  | "mapping_changed"
  | "resource_removed"
  | "settings_updated";

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
}

/* ------------------------------------------------------------------ */
/* Issues (derived — never stored)                                     */
/* ------------------------------------------------------------------ */

export type Severity = "critical" | "warning" | "info";
export type IssueAction = "reconnect" | "review_permissions" | "retry_check" | "view_details";

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
  /** Nothing in Media360 uses this login (no account mapped, nothing scheduled), so it may simply be removed. */
  unused?: boolean;
  detectedAt: ISODate;
}

/* ------------------------------------------------------------------ */
/* Settings (company-level; every field is applied by the server)       */
/* ------------------------------------------------------------------ */

export interface IntegrationSettings {
  /** The background job renews this company's expiring tokens. */
  autoRefresh: boolean;
  /** The console asks for a typed confirmation before it disconnects something that live posts depend on. */
  confirmBeforeDisconnect: boolean;
  /** The server refuses to disconnect while posts are still waiting to go out through it. */
  blockDisconnectWithScheduledPosts: boolean;
  /** The most one Meta campaign or ad set may be given per day, in whole units of the ad account's currency. 0 = no limit. */
  metaMaxDailyBudget: number;
}

/* ------------------------------------------------------------------ */
/* Access                                                              */
/* ------------------------------------------------------------------ */

export interface Capability {
  allowed: boolean;
  reason?: string;
}

export type CapabilityKey = "canConnect" | "canDisconnect" | "canReconnect" | "canCheck" | "canChangeMapping" | "canManageSettings";

export type CapabilityMap = Record<CapabilityKey, Capability>;

/* ------------------------------------------------------------------ */
/* Snapshot                                                            */
/* ------------------------------------------------------------------ */

export interface IntegrationsSnapshot {
  clients: IntegrationClient[];
  providers: IntegrationProvider[];
  connections: IntegrationConnection[];
  checkRuns: IntegrationCheckRun[];
  dependencies: IntegrationDependency[];
  activity: IntegrationActivity[];
  settings: IntegrationSettings;
  /** `canManage` is the server's answer to "may this person change connections" (integrations:write). */
  currentUser: { name: string; email: string; canManage: boolean };
}
