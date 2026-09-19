/**
 * Data contracts for the Super Admin Clients workspace.
 *
 * A client is a brand/workspace inside exactly one company. There is no second
 * client store: the core record is the `CompanyClient` the Companies module
 * already owns (so a company's client count, usage and Clients tab can never
 * disagree with this module), and everything client-specific lives in a
 * `ClientDetailRecord` kept inside the same company bundle. Anything computable
 * (health, onboarding status, counts, attention items) is derived, never stored.
 */
import type { PaginationMeta } from "@/types/api";
import type { IntegrationProvider } from "@/types/domain/integration";
import type { OrganisationRole, UserStatus } from "@/types/domain/user";
import type {
  CompanyAccountStatus,
  CompanyClient,
  CompanyIntegration,
  CompanySubscriptionStatus,
  StaffRef,
} from "@/features/companies/data/types";
import type { PlanTier } from "@/types/domain/plan";

/* ------------------------------------------------------------------ */
/* Independent status dimensions                                       */
/* ------------------------------------------------------------------ */

export type ClientWorkspaceStatus = "active" | "paused" | "archived";
export type ClientOnboardingStatus = "not_started" | "in_progress" | "completed" | "blocked";
export type ClientHealthStatus = "healthy" | "needs_attention" | "critical" | "not_enough_data";
export type ClientFactorStatus = "healthy" | "warning" | "critical" | "not_configured";
export type ClientHealthArea = "workspace" | "channels" | "publishing" | "website" | "team" | "usage";

export type ClientSection = "overview" | "team" | "channels" | "website-seo" | "activity" | "settings";

export type ClientAccessLevel = "admin" | "editor" | "viewer";
export type OnboardingStepKey = "identity" | "website" | "lead" | "team" | "channel" | "access_review";
export type PauseReason = "customer_request" | "billing" | "campaign_ended" | "content_review" | "operational" | "other";
export type ReportingPeriod = "7d" | "30d" | "90d";

/* ------------------------------------------------------------------ */
/* Stored records                                                      */
/* ------------------------------------------------------------------ */

export interface ClientProfile {
  displayName: string;
  industry: string;
  description: string;
  contactEmail: string | null;
  contactPhone: string | null;
  /** A local preview (data URL). Nothing is uploaded in frontend-only mode. */
  logoDataUrl: string | null;
  timezone: string;
  language: string;
  reportingPeriod: ReportingPeriod;
  createdBy: string;
}

export type WebsiteMonitoring = "active" | "paused" | "stopped";
export type WebsiteAvailability = "up" | "down" | "unknown";
export type WebsiteFileStatus = "found" | "missing" | "unknown";

/** Future-ready: Client -> Websites[] -> primaryWebsiteId. */
export interface ClientWebsite {
  id: string;
  clientId: string;
  companyId: string;
  url: string;
  domain: string;
  addedAt: string;
  monitoring: WebsiteMonitoring;
  availability: WebsiteAvailability;
  lastCheckedAt: string | null;
  lastCrawlAt: string | null;
  pagesDiscovered: number | null;
  criticalIssues: number;
  warnings: number;
  sitemap: WebsiteFileStatus;
  robots: WebsiteFileStatus;
  redirect: string | null;
  /** Always demo in this phase; a real crawler will set its own source. */
  dataSource: "demo";
}

/**
 * What is *configured* for search and analytics. Whether reporting access is
 * actually *authorised* is a different question, answered by the connection
 * records - a measurement ID alone never counts as a connected GA4 account.
 */
export interface ClientSearchConfig {
  gscProperty: string | null;
  ga4MeasurementId: string | null;
}

export interface ClientAssignmentMeta {
  level: ClientAccessLevel;
  assignedAt: string;
  assignedBy: string;
}

export interface ClientOnboardingConfig {
  /** Required steps are configurable per client; optional steps never block completion. */
  required: Record<OnboardingStepKey, boolean>;
  accessReviewedAt: string | null;
  accessReviewedBy: string | null;
}

export interface ClientOperations {
  processingJobs: number;
  retryPending: number;
  lastPublishedAt: string | null;
  activeAutomations: number;
  pendingApprovals: { count: number; oldestAt: string } | null;
}

export interface ClientLifecycleEvent {
  id: string;
  at: string;
  type: "created" | "paused" | "resumed" | "archived";
  by: string;
  reason: string | null;
}

export interface ClientLifecycle {
  pause: { reason: PauseReason; note: string; pausedAt: string; pausedBy: string } | null;
  archive: { archivedAt: string; archivedBy: string; note: string } | null;
  events: ClientLifecycleEvent[];
}

export type ClientActivityModule = "client" | "team" | "channels" | "website" | "jobs" | "settings" | "onboarding";

export interface ClientActivity {
  id: string;
  clientId: string;
  companyId: string;
  at: string;
  actor: { id: string; name: string; type: "staff" | "customer" | "system" };
  action: string;
  summary: string;
  module: ClientActivityModule;
  entity: { type: string; id: string; label: string };
  severity: "info" | "warning" | "critical";
  result: "success" | "failure" | "denied";
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  correlationId: string | null;
}

export interface ClientDetailRecord {
  clientId: string;
  companyId: string;
  profile: ClientProfile;
  websites: ClientWebsite[];
  primaryWebsiteId: string | null;
  searchConfig: ClientSearchConfig;
  /** Membership id of the company member acting as client lead. */
  leadUserId: string | null;
  /** Client-level access for each assigned membership id. Who is assigned lives on `CompanyUser.clientAccessIds`. */
  assignments: Record<string, ClientAssignmentMeta>;
  onboarding: ClientOnboardingConfig;
  operations: ClientOperations;
  lifecycle: ClientLifecycle;
  /** Internal OmniPlatform staff reviewing this workspace - never a company membership. */
  platformReviewerId: string | null;
  activity: ClientActivity[];
}

/* ------------------------------------------------------------------ */
/* Derived views                                                       */
/* ------------------------------------------------------------------ */

export interface ClientCompanyRef {
  id: string;
  name: string;
  slug: string;
  planTier: PlanTier;
  planName: string;
  accountStatus: CompanyAccountStatus;
  subscriptionStatus: CompanySubscriptionStatus;
}

export interface ClientAssignmentView {
  membershipId: string;
  name: string;
  email: string;
  companyRole: OrganisationRole;
  level: ClientAccessLevel;
  isLead: boolean;
  membershipStatus: UserStatus;
  lastLoginAt: string | null;
  assignedAt: string;
  assignedBy: string;
  /** Why this assignment is not effective, if it is not. */
  issue: string | null;
}

export interface OnboardingStepView {
  key: OnboardingStepKey;
  label: string;
  required: boolean;
  done: boolean;
  detail: string;
}

export interface ClientOnboarding {
  status: ClientOnboardingStatus;
  requiredTotal: number;
  requiredDone: number;
  steps: OnboardingStepView[];
  blockedReason: string | null;
}

export interface ClientHealthFactor {
  area: ClientHealthArea;
  status: ClientFactorStatus;
  label: string;
  detail: string;
  section: ClientSection;
}

export interface ClientHealth {
  status: ClientHealthStatus;
  reason: string;
  factors: ClientHealthFactor[];
}

export type ClientAttentionKind =
  | "connection_expired"
  | "permission_revoked"
  | "sync_failing"
  | "posts_failed"
  | "lead_missing"
  | "no_team"
  | "website_monitoring_stopped"
  | "website_down"
  | "website_issues"
  | "high_usage"
  | "approval_pending"
  | "access_issue"
  | "onboarding_blocked";

export type ClientAttentionModule = "channels" | "jobs" | "team" | "website" | "usage" | "approvals" | "onboarding";

export interface ClientAttentionItem {
  id: string;
  clientId: string;
  clientName: string;
  companyId: string;
  companyName: string;
  kind: ClientAttentionKind;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  module: ClientAttentionModule;
  detectedAt: string;
  actionLabel: string;
  section: ClientSection;
  /** Extra query parameters for the target section, e.g. an activity module filter. */
  query?: Record<string, string>;
}

export interface ClientUsageRow {
  key: "connectedAccounts" | "scheduledPosts" | "aiCredits" | "automationRuns" | "storage" | "apiRequests";
  label: string;
  used: number;
  unit: string;
  /** The parent company's consumption of the same resource, when one exists. */
  companyUsed: number | null;
  companyLimit: number | null;
}

export interface ClientUsage {
  rows: ClientUsageRow[];
  /** Client rows are attributable consumption, not the company's subscription utilisation. */
  attributableNote: string;
}

export interface ClientSummary {
  client: CompanyClient;
  displayId: string;
  company: ClientCompanyRef;
  profile: ClientProfile;
  websites: ClientWebsite[];
  primaryWebsite: ClientWebsite | null;
  workspace: ClientWorkspaceStatus;
  onboarding: ClientOnboarding;
  health: ClientHealth;
  attention: ClientAttentionItem[];
  lead: { membershipId: string; name: string } | null;
  counts: {
    connections: number;
    healthyConnections: number;
    attentionConnections: number;
    assigned: number;
    activeMembers: number;
    pendingMembers: number;
    accessIssues: number;
  };
  connectedProviders: IntegrationProvider[];
  operations: {
    scheduledPosts: number;
    failedPosts: number;
    processingJobs: number;
    retryPending: number;
    lastPublishedAt: string | null;
  };
  lastActiveAt: string;
  pause: ClientLifecycle["pause"];
  platformReviewer: StaffRef | null;
}

export type ClientAnalyticsLinkState = "connected" | "needs_reconnect" | "configured_only" | "not_connected";

export interface ClientSearchAnalytics {
  gscProperty: string | null;
  gscState: ClientAnalyticsLinkState;
  ga4Stream: string | null;
  ga4State: ClientAnalyticsLinkState;
  lastSyncAt: string | null;
  reportingAvailable: boolean;
}

export interface ClientCreationCompany {
  id: string;
  name: string;
  accountStatus: CompanyAccountStatus;
  planName: string;
  clientsUsed: number;
  clientLimit: number | null;
  availableSlots: number | null;
  eligibleMembers: number;
  eligibility: {
    ok: boolean;
    code: "ok" | "company_not_active" | "subscription_ended" | "limit_reached";
    reason: string | null;
  };
}

export interface EligibleMember {
  membershipId: string;
  name: string;
  email: string;
  companyRole: OrganisationRole;
  alreadyAssigned: boolean;
}

/* ------------------------------------------------------------------ */
/* Queries, portfolio                                                  */
/* ------------------------------------------------------------------ */

export type ClientSortField = "createdAt" | "lastActive" | "name" | "company" | "connections" | "issues";

export interface ClientListQuery {
  search?: string;
  company?: string;
  workspace?: string;
  onboarding?: string;
  health?: string;
  provider?: string;
  website?: string;
  team?: string;
  created?: string;
  lastActive?: string;
  sort?: { field: ClientSortField | string; direction: "asc" | "desc" } | null;
  page?: number;
  pageSize?: number;
}

export interface ClientListResult {
  data: ClientSummary[];
  pagination: PaginationMeta;
  matchingIds: string[];
}

export interface ClientPortfolio {
  total: number;
  companies: number;
  workspace: Record<ClientWorkspaceStatus, number>;
  newThisMonth: number;
  newLastMonth: number;
  connectedAccounts: number;
  healthyAccounts: number;
  attentionAccounts: number;
  onboardingPending: number;
  needsAttention: number;
  noTeam: number;
  noWebsite: number;
}

export interface ClientFacets {
  companies: Array<{ id: string; name: string; planName: string }>;
  providers: IntegrationProvider[];
}

/* ------------------------------------------------------------------ */
/* Section payloads                                                    */
/* ------------------------------------------------------------------ */

export interface ClientOverviewData {
  summary: ClientSummary;
  usage: ClientUsage;
  team: ClientAssignmentView[];
  connections: CompanyIntegration[];
  recentActivity: ClientActivity[];
  search: ClientSearchAnalytics;
}

export interface ClientTeamData {
  summary: ClientSummary;
  assignments: ClientAssignmentView[];
  eligibleMembers: EligibleMember[];
}

export interface ClientChannelsData {
  summary: ClientSummary;
  connections: CompanyIntegration[];
  /** Providers the platform supports that this client has not connected. */
  unconnectedProviders: IntegrationProvider[];
}

export interface ClientWebsiteData {
  summary: ClientSummary;
  websites: ClientWebsite[];
  primaryWebsiteId: string | null;
  search: ClientSearchAnalytics;
}

export interface ClientActivityFilter {
  search?: string;
  actor?: string;
  module?: string;
  event?: string;
  severity?: string;
  result?: string;
  from?: string;
  to?: string;
}

export interface ClientActivityData {
  summary: ClientSummary;
  entries: ClientActivity[];
  total: number;
  actors: string[];
  events: string[];
}

export interface ClientSettingsData {
  summary: ClientSummary;
  onboarding: ClientOnboardingConfig;
  lifecycle: ClientLifecycle;
  automations: number;
  createdBy: string;
  createdAt: string;
  staff: StaffRef[];
}

/* ------------------------------------------------------------------ */
/* Mutation inputs                                                     */
/* ------------------------------------------------------------------ */

export interface MutationActor {
  id: string;
  name: string;
}

export interface CreateClientInput {
  companyId: string;
  name: string;
  displayName?: string;
  industry: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoDataUrl?: string | null;
  description?: string;
  timezone: string;
  language: string;
  leadUserId?: string | null;
  memberIds: string[];
}

export interface UpdateClientInput {
  name: string;
  displayName: string;
  industry: string;
  description: string;
  contactEmail: string | null;
  contactPhone: string | null;
  logoDataUrl: string | null;
  timezone: string;
  language: string;
  reportingPeriod: ReportingPeriod;
  leadUserId: string | null;
  primaryWebsite: string | null;
}

export interface BulkResult {
  updated: string[];
  skipped: Array<{ id: string; name: string; reason: string }>;
}
