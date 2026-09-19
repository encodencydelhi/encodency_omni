/**
 * Data contracts for the Super Admin tenant workspace.
 *
 * Every company-scoped record carries `companyId`. Anything that can be
 * computed from those records (health, usage level, MRR, attention items) is a
 * *derived* type, produced by `selectors.ts` - it is never stored, so it cannot
 * drift from the records it summarises.
 */
import type { PaginationMeta } from "@/types/api";
import type { IntegrationProvider } from "@/types/domain/integration";
import type { PlanTier } from "@/types/domain/plan";
import type { Clientstatus } from "@/types/domain/project";
import type { InternalRole } from "@/types/domain/team";
import type { OrganisationRole, UserStatus } from "@/types/domain/user";
import type { BillingCycle } from "@/types/domain/subscription";

/* ------------------------------------------------------------------ */
/* Status vocabularies - deliberately separate axes                    */
/* ------------------------------------------------------------------ */

export type CompanyAccountStatus = "active" | "suspended" | "deactivated" | "archived";

export type CompanySubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "scheduled_cancellation"
  | "cancelled"
  | "expired";

export type CompanyBillingStatus =
  | "paid"
  | "payment_due"
  | "payment_failed"
  | "refunded"
  | "no_payment_method";

export type CompanyHealthStatus = "healthy" | "needs_attention" | "critical";
/** Health as displayed: suspended and dormant tenants are not assessed. */
export type CompanyHealthDisplay = CompanyHealthStatus | "suspended" | "not_assessed";

export type FactorStatus = "healthy" | "warning" | "critical";

export type CompanySection =
  | "overview"
  | "users"
  | "clients"
  | "subscription"
  | "billing"
  | "usage"
  | "integrations"
  | "activity"
  | "security";

export type CompanyOnboardingStatus = "awaiting_owner" | "setting_up" | "completed";

export type SuspensionReason =
  | "billing"
  | "security"
  | "policy_violation"
  | "customer_request"
  | "operational"
  | "other";

export type CompanySize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

/* ------------------------------------------------------------------ */
/* Core records                                                        */
/* ------------------------------------------------------------------ */

export interface CompanyProfile {
  legalName: string | null;
  website: string | null;
  industry: string;
  country: string;
  companySize: CompanySize | null;
  contactEmail: string | null;
  contactPhone: string | null;
  timezone: string;
  currency: string;
  language: string;
  region: string;
}

export interface CompanySuspension {
  reason: SuspensionReason;
  note: string;
  suspendedAt: string;
  suspendedBy: string;
  /** The state to restore when the company is reactivated. */
  previousStatus: CompanyAccountStatus;
}

export interface CompanyInternalOwner {
  accountManagerId: string | null;
  supportOwnerId: string | null;
  technicalOwnerId: string | null;
}

export type CompanyInternalTag = string;

export interface Company {
  id: string;
  /** Short human reference shown next to the name, e.g. CMP-0028. */
  displayId: string;
  slug: string;
  name: string;
  domain: string | null;
  logoUrl: string | null;
  profile: CompanyProfile;
  accountStatus: CompanyAccountStatus;
  suspension: CompanySuspension | null;
  archivedAt: string | null;
  /** Membership id (`CompanyUser.id`) of the organisation owner. */
  ownerUserId: string | null;
  internalOwners: CompanyInternalOwner;
  internalTags: CompanyInternalTag[];
  createdAt: string;
  lastActiveAt: string;
  /** True for companies created through this session's Create Company flow. */
  isDemoCreated: boolean;
}

export type OwnerState = "active" | "invited" | "invitation_expired" | "suspended" | "inactive" | "none";

export interface CompanyOwner {
  userId: string | null;
  name: string;
  email: string;
  phone: string | null;
  state: OwnerState;
}

/** A person's membership of one organisation. */
export interface CompanyUser {
  id: string;
  companyId: string;
  platformUserId: string;
  name: string;
  email: string;
  role: OrganisationRole;
  status: UserStatus;
  mfaEnabled: boolean;
  /** Set when a Super Admin requires 2FA for this user. */
  twoFactorRequired: boolean;
  clientAccessIds: string[];
  lastLoginAt: string | null;
  createdAt: string;
  invitationExpired: boolean;
}

export interface CompanyClient {
  id: string;
  companyId: string;
  name: string;
  websiteUrl: string | null;
  status: Clientstatus;
  connectedChannels: IntegrationProvider[];
  brokenChannels: IntegrationProvider[];
  scheduledPosts: number;
  failedPosts: number;
  leadsLast30Days: number;
  createdAt: string;
  lastActivityAt: string;
}

/* ------------------------------------------------------------------ */
/* Subscription, billing, usage                                        */
/* ------------------------------------------------------------------ */

export interface PaymentMethodSummary {
  brand: string;
  last4: string;
  expiresAt: string | null;
}

export interface CompanySubscription {
  id: string;
  companyId: string;
  planTier: PlanTier;
  billingCycle: BillingCycle;
  status: CompanySubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  renewsAt: string;
  trialEndsAt: string | null;
  scheduledCancellationAt: string | null;
  cancelledAt: string | null;
  scheduledChange: { planTier: PlanTier; billingCycle: BillingCycle; effectiveAt: string } | null;
  paymentMethod: PaymentMethodSummary | null;
}

export type UsageResource =
  | "users"
  | "clients"
  | "connectedAccounts"
  | "aiCredits"
  | "automationRuns"
  | "scheduledPosts"
  | "reports"
  | "apiRequests"
  | "storage";

export type UsageLevel = "normal" | "high" | "near_limit" | "exceeded" | "not_metered";

export type UsageResourceStatus = "healthy" | "high" | "near_limit" | "exceeded" | "not_metered";

export interface CompanyUsageOverride {
  id: string;
  companyId: string;
  resource: UsageResource;
  /** The plan limit at the moment the override was granted. */
  baseLimit: number | null;
  overrideLimit: number;
  reason: string;
  startsAt: string;
  expiresAt: string;
  approvedBy: string;
  createdAt: string;
}

/** Consumption for resources that are not simple counts of other records. */
export type UsageBaseline = Partial<
  Record<UsageResource, { used: number; previousUsed: number; updatedAt: string }>
>;

export interface CompanyUsageRecord {
  resource: UsageResource;
  used: number;
  previousUsed: number;
  includedLimit: number | null;
  activeOverride: CompanyUsageOverride | null;
  effectiveLimit: number | null;
  utilization: number | null;
  status: UsageResourceStatus;
  /**
   * Whether this record counts towards health, attention and the headline
   * utilisation. Hard caps (seats, clients, connections) only count once exceeded.
   */
  alertable: boolean;
  updatedAt: string;
}

export interface CompanyUsageSummary {
  periodStart: string;
  periodEnd: string;
  previousPeriodStart: string;
  records: CompanyUsageRecord[];
  highest: CompanyUsageRecord | null;
  nearLimit: CompanyUsageRecord[];
  exceeded: CompanyUsageRecord[];
  level: UsageLevel;
  overrides: CompanyUsageOverride[];
}

export type InvoiceStatus = "paid" | "open" | "overdue" | "void";
export type PaymentState = "paid" | "pending" | "failed" | "refunded";

export interface CompanyInvoice {
  id: string;
  companyId: string;
  number: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  dueAt: string;
  amountMinor: number;
  currency: string;
  status: InvoiceStatus;
  paymentStatus: PaymentState;
  description: string;
  paymentId: string | null;
}

export interface CompanyPayment {
  id: string;
  companyId: string;
  reference: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  amountMinor: number;
  currency: string;
  method: string;
  status: PaymentState;
  failureReason: string | null;
  createdAt: string;
}

export interface CompanyBillingSummary {
  companyId: string;
  status: CompanyBillingStatus;
  mrrMinor: number;
  currency: string;
  outstandingMinor: number;
  lastPayment: CompanyPayment | null;
  nextInvoice: { date: string; amountMinor: number; note: string } | null;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethodSummary | null;
  invoiceCount: number;
  paymentCount: number;
}

/* ------------------------------------------------------------------ */
/* Integrations, activity, security, notes, support                    */
/* ------------------------------------------------------------------ */

export type IntegrationConnectionState =
  | "healthy"
  | "needs_reconnect"
  | "permission_issue"
  | "sync_failure"
  | "rate_limited";

export interface CompanyIntegration {
  id: string;
  companyId: string;
  provider: IntegrationProvider;
  accountName: string;
  clientId: string | null;
  clientName: string | null;
  state: IntegrationConnectionState;
  permissionHealth: "complete" | "partial" | "missing";
  scopes: string[];
  lastSyncAt: string;
  tokenExpiresAt: string | null;
  dependentModules: string[];
  lastError: { code: string; message: string; occurredAt: string } | null;
}

export type ActivityModule =
  | "company"
  | "users"
  | "clients"
  | "subscription"
  | "billing"
  | "usage"
  | "integrations"
  | "security"
  | "support";

export type ActivitySeverity = "info" | "warning" | "critical";
export type ActivityResult = "success" | "failure" | "denied";

export interface CompanyActivity {
  id: string;
  companyId: string;
  at: string;
  actor: { id: string; name: string; type: "staff" | "customer" | "system" };
  action: string;
  summary: string;
  module: ActivityModule;
  entity: { type: string; id: string; label: string };
  severity: ActivitySeverity;
  result: ActivityResult;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  correlationId: string | null;
}

export type SecurityEventType =
  | "failed_logins"
  | "policy_changed"
  | "owner_invited"
  | "invitation_expired"
  | "access_locked"
  | "password_reset"
  | "session_revocation"
  | "new_device";

export interface CompanySecurityEvent {
  id: string;
  companyId: string;
  at: string;
  type: SecurityEventType;
  severity: ActivitySeverity;
  summary: string;
  actorLabel: string;
}

export interface CompanySecurityPolicies {
  require2fa: boolean;
  passwordPolicy: "standard" | "strict";
  sessionTimeoutMinutes: number;
  ssoEnabled: boolean;
  ipAllowlistEnabled: boolean;
}

export interface CompanySecurity {
  companyId: string;
  policies: CompanySecurityPolicies;
  allowedEmailDomains: string[];
  activeSessions: number;
  accountLockouts: number;
  accessLock: { lockedAt: string; lockedBy: string; reason: string } | null;
  passwordResetRequestedAt: string | null;
  sessionRevocationRequestedAt: string | null;
  events: CompanySecurityEvent[];
}

export type InternalNoteTag = "billing" | "support" | "technical" | "sales";

export interface CompanyInternalNote {
  id: string;
  companyId: string;
  authorId: string;
  authorName: string;
  content: string;
  tags: InternalNoteTag[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyTicket {
  id: string;
  companyId: string;
  reference: string;
  subject: string;
  priority: "urgent" | "high" | "normal" | "low";
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  slaMinutesRemaining: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySupportSnapshot {
  openTickets: number;
  highPriorityTickets: number;
  slaBreaches: number;
  latest: CompanyTicket | null;
}

/** Background-job health inputs. Detail lives in the global Jobs & Queues module. */
export interface CompanyJobHealth {
  failedLast24h: number;
  lastFailureAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Aggregate stored per company                                        */
/* ------------------------------------------------------------------ */

export interface CompanyBundle {
  company: Company;
  subscription: CompanySubscription;
  overrides: CompanyUsageOverride[];
  usageBaseline: UsageBaseline;
  users: CompanyUser[];
  clients: CompanyClient[];
  integrations: CompanyIntegration[];
  invoices: CompanyInvoice[];
  payments: CompanyPayment[];
  activity: CompanyActivity[];
  security: CompanySecurity;
  notes: CompanyInternalNote[];
  tickets: CompanyTicket[];
  jobs: CompanyJobHealth;
}

/* ------------------------------------------------------------------ */
/* Derived views                                                       */
/* ------------------------------------------------------------------ */

export type HealthArea =
  | "billing"
  | "subscription"
  | "usage"
  | "integrations"
  | "security"
  | "jobs"
  | "activity";

export interface HealthFactor {
  area: HealthArea;
  status: FactorStatus;
  label: string;
  detail: string;
  section: CompanySection;
}

export interface CompanyHealth {
  status: CompanyHealthDisplay;
  /** One-line explanation for tooltips. */
  reason: string;
  factors: HealthFactor[];
}

export type AttentionKind =
  | "payment_failed"
  | "payment_due"
  | "trial_ending"
  | "usage_near_limit"
  | "usage_exceeded"
  | "integration_reconnect"
  | "no_active_admin"
  | "owner_invitation_expired"
  | "job_failures"
  | "support_sla"
  | "cancellation_scheduled"
  | "no_payment_method";

export type AttentionSeverity = "critical" | "warning" | "info";

export interface CompanyAttentionItem {
  id: string;
  companyId: string;
  companyName: string;
  kind: AttentionKind;
  severity: AttentionSeverity;
  title: string;
  description: string;
  area: HealthArea | "support" | "users";
  detectedAt: string;
  actionLabel: string;
  section: CompanySection;
}

export type SecurityWarningAction =
  | "require_2fa"
  | "resend_invitation"
  | "open_users"
  | "review_events"
  | "review_client_access"
  | "transfer_ownership";

export interface SecurityWarning {
  id: string;
  severity: AttentionSeverity;
  title: string;
  description: string;
  action: { kind: SecurityWarningAction; label: string };
}

export interface StaffRef {
  id: string;
  name: string;
  email: string;
  role: InternalRole;
  department: string;
  status: "active" | "invited" | "suspended";
}

export interface CompanySummary {
  company: Company;
  owner: CompanyOwner;
  plan: { tier: PlanTier; name: string; billingCycle: BillingCycle };
  subscriptionStatus: CompanySubscriptionStatus;
  billingStatus: CompanyBillingStatus;
  mrrMinor: number;
  currency: string;
  trialEndsAt: string | null;
  counts: {
    users: number;
    activeUsers: number;
    clients: number;
    connections: number;
    healthyConnections: number;
    attentionConnections: number;
  };
  usage: {
    level: UsageLevel;
    utilization: number | null;
    resource: UsageResource | null;
  };
  health: CompanyHealth;
  attention: CompanyAttentionItem[];
  onboarding: CompanyOnboardingStatus;
  internalOwners: {
    accountManager: StaffRef | null;
    supportOwner: StaffRef | null;
    technicalOwner: StaffRef | null;
  };
}

/* ------------------------------------------------------------------ */
/* Queries and portfolio                                               */
/* ------------------------------------------------------------------ */

export type CompanySortField = "createdAt" | "name" | "mrr" | "usage" | "lastActiveAt";

export interface CompanyListQuery {
  search?: string;
  plan?: string;
  accountStatus?: string;
  subscriptionStatus?: string;
  billingStatus?: string;
  health?: string;
  usageLevel?: string;
  created?: string;
  lastActive?: string;
  issue?: string;
  tag?: string;
  sort?: { field: CompanySortField | string; direction: "asc" | "desc" } | null;
  page?: number;
  pageSize?: number;
}

export interface CompanyListResult {
  data: CompanySummary[];
  pagination: PaginationMeta;
  /** Ids of every company matching the filters, for "select all results". */
  matchingIds: string[];
}

export interface PortfolioSummary {
  total: number;
  accountStatus: Record<CompanyAccountStatus, number>;
  active: number;
  trialing: number;
  trialsEndingSoon: number;
  pastDue: number;
  suspended: number;
  newThisMonth: number;
  newLastMonth: number;
  mrrMinor: number;
  currency: string;
  payingCompanies: number;
  needsAttention: number;
  health: { healthy: number; needs_attention: number; critical: number; suspended: number; notAssessed: number };
  attentionItems: CompanyAttentionItem[];
  attentionByKind: Array<{ kind: AttentionKind; companies: number; items: number }>;
  recentSignups: CompanySummary[];
}

/* ------------------------------------------------------------------ */
/* Mutation inputs                                                     */
/* ------------------------------------------------------------------ */

export interface MutationActor {
  id: string;
  name: string;
}

export interface CreateCompanyInput {
  name: string;
  legalName?: string;
  website?: string;
  industry: string;
  country: string;
  companySize?: CompanySize;
  contactEmail?: string;
  contactPhone?: string;
  owner: {
    name: string;
    email: string;
    phone?: string;
    /** Set when an existing platform user is chosen as the owner. */
    existingUserId?: string;
  };
  subscription: {
    planTier: PlanTier;
    billingCycle: BillingCycle;
    mode: "trial" | "paid";
    startDate: string;
    trialEndsAt?: string;
    /** Optional temporary exception granted at creation. */
    limitOverride?: { resource: UsageResource; overrideLimit: number; expiresAt: string; reason: string };
    internalNotes?: string;
  };
  workspace: { timezone: string; currency: string; language: string; region: string };
  initialClient?: { name: string; websiteUrl?: string };
}

export interface UpdateCompanyInput {
  name: string;
  legalName: string | null;
  website: string | null;
  industry: string;
  country: string;
  contactPhone: string | null;
  contactEmail: string | null;
  companySize: CompanySize | null;
  internalTags: CompanyInternalTag[];
  internalOwners: CompanyInternalOwner;
}

export interface ChangePlanInput {
  planTier: PlanTier;
  billingCycle: BillingCycle;
  effective: "immediately" | "next_renewal";
  reason: string;
}

export interface UsageOverrideInput {
  resource: UsageResource;
  overrideLimit: number;
  reason: string;
  startsAt: string;
  expiresAt: string;
}

export interface NoteInput {
  content: string;
  tags: InternalNoteTag[];
}

export interface CompanyNotificationInput {
  title: string;
  message: string;
  audience: "organisation_admins" | "all_users";
}

export type ActivityFilter = {
  search?: string;
  actor?: string;
  module?: string;
  event?: string;
  severity?: string;
  result?: string;
  from?: string;
  to?: string;
};

export type OrganisationRoleKey = OrganisationRole;
