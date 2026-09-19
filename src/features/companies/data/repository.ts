/**
 * The one seam between the tenant workspace UI and wherever its data lives.
 *
 *   Today:  UI -> hooks -> companiesRepository -> mock provider (in-memory, demo)
 *   Later:  UI -> hooks -> companiesRepository -> backend tenant service
 *
 * Components never import a provider. Connecting the backend means implementing
 * `CompaniesRepository` once; no page, hook or component changes. When mock mode
 * is off the repository resolves to a provider that refuses to invent data.
 */
import type { Plan } from "@/types/domain/plan";
import type { OrganisationRole } from "@/types/domain/user";
import type { IntegrationCounts } from "./selectors";
import { COMPANIES_MOCK_MODE } from "./config";
import { mockCompaniesProvider } from "./mock-provider";
import { unavailableCompaniesProvider } from "./unavailable-provider";
import type {
  ActivityFilter,
  ChangePlanInput,
  CompanyActivity,
  CompanyAttentionItem,
  CompanyBillingStatus,
  CompanyBillingSummary,
  CompanyClient,
  CompanyIntegration,
  CompanyInternalNote,
  CompanyInvoice,
  CompanyListQuery,
  CompanyListResult,
  CompanyNotificationInput,
  CompanyOwner,
  CompanyPayment,
  CompanySecurity,
  CompanySubscription,
  CompanySummary,
  CompanySupportSnapshot,
  CompanyUsageSummary,
  CompanyUser,
  CreateCompanyInput,
  CompanyInternalOwner,
  MutationActor,
  NoteInput,
  PortfolioSummary,
  SecurityWarning,
  StaffRef,
  SuspensionReason,
  UpdateCompanyInput,
  UsageOverrideInput,
  UsageResource,
} from "./types";

/* ------------------------------------------------------------------ */
/* Response shapes                                                     */
/* ------------------------------------------------------------------ */

export interface CompanyDirectoryEntry {
  id: string;
  name: string;
  domain: string | null;
  ownerEmail: string | null;
}

export interface PlatformUserMatch {
  id: string;
  name: string;
  email: string;
  role: OrganisationRole;
  companyId: string;
  companyName: string;
}

export interface CompanyOverviewData {
  summary: CompanySummary;
  subscription: CompanySubscription;
  usage: CompanyUsageSummary;
  support: CompanySupportSnapshot;
  recentActivity: CompanyActivity[];
  notes: CompanyInternalNote[];
}

export interface CompanyUsersData {
  users: CompanyUser[];
  clients: Array<{ id: string; name: string }>;
  owner: CompanyOwner;
}

export interface CompanyClientsData {
  clients: CompanyClient[];
  /** Names of the members who can reach each client, keyed by client id. */
  members: Record<string, string[]>;
}

export interface CompanySubscriptionData {
  subscription: CompanySubscription;
  plan: Plan;
  plans: Plan[];
  usage: CompanyUsageSummary;
  billingStatus: CompanyBillingStatus;
  mrrMinor: number;
  companyName: string;
  accountStatus: CompanySummary["company"]["accountStatus"];
}

export interface CompanyBillingData {
  summary: CompanyBillingSummary;
  invoices: CompanyInvoice[];
  payments: CompanyPayment[];
  billingNotes: CompanyInternalNote[];
  plan: Plan;
}

export interface CompanyIntegrationsData {
  integrations: CompanyIntegration[];
  counts: IntegrationCounts;
}

export interface CompanyActivityData {
  entries: CompanyActivity[];
  total: number;
  actors: string[];
  events: string[];
}

export interface CompanySecurityData {
  security: CompanySecurity;
  owner: CompanyOwner;
  users: CompanyUser[];
  adoption: { totalUsers: number; withTwoFactor: number; percent: number; adminsWithout2fa: CompanyUser[] };
  warnings: SecurityWarning[];
}

export interface UsageHistory {
  resource: UsageResource;
  unit: string;
  kind: "level" | "flow";
  limit: number | null;
  points: Array<{ date: string; value: number }>;
}

export interface BulkResult {
  updated: string[];
  skipped: Array<{ id: string; name: string; reason: string }>;
}

/* ------------------------------------------------------------------ */
/* Repository                                                          */
/* ------------------------------------------------------------------ */

export interface CompaniesRepository {
  readonly mode: "mock" | "unavailable";

  /* Reads */
  listCompanies(query: CompanyListQuery): Promise<CompanyListResult>;
  /** Every company matching a query (or a set of ids) - used by exports. */
  exportCompanies(scope: { query?: CompanyListQuery; ids?: string[] }): Promise<CompanySummary[]>;
  getPortfolio(): Promise<PortfolioSummary>;
  getDirectory(): Promise<CompanyDirectoryEntry[]>;
  findPlatformUsers(email: string): Promise<PlatformUserMatch[]>;
  listPlans(): Promise<Plan[]>;
  listStaff(): Promise<StaffRef[]>;
  getCompany(id: string): Promise<CompanySummary>;
  getOverview(id: string): Promise<CompanyOverviewData>;
  getUsers(id: string): Promise<CompanyUsersData>;
  getClients(id: string): Promise<CompanyClientsData>;
  getSubscription(id: string): Promise<CompanySubscriptionData>;
  getBilling(id: string): Promise<CompanyBillingData>;
  getUsage(id: string): Promise<CompanyUsageSummary>;
  getUsageHistory(id: string, resource: UsageResource, range: { from: string; to: string }): Promise<UsageHistory>;
  getIntegrations(id: string): Promise<CompanyIntegrationsData>;
  getActivity(id: string, filter: ActivityFilter): Promise<CompanyActivityData>;
  getSecurity(id: string): Promise<CompanySecurityData>;
  getAttention(id: string): Promise<CompanyAttentionItem[]>;

  /* Lifecycle */
  createCompany(input: CreateCompanyInput, actor: MutationActor): Promise<CompanySummary>;
  updateCompany(id: string, input: UpdateCompanyInput, actor: MutationActor): Promise<CompanySummary>;
  suspendCompanies(ids: string[], input: { reason: SuspensionReason; note: string }, actor: MutationActor): Promise<BulkResult>;
  reactivateCompanies(ids: string[], input: { note: string }, actor: MutationActor): Promise<BulkResult>;
  archiveCompany(id: string, input: { note: string }, actor: MutationActor): Promise<CompanySummary>;
  transferOwnership(id: string, input: { newOwnerUserId: string; note: string }, actor: MutationActor): Promise<CompanySummary>;
  assignInternalOwners(ids: string[], patch: Partial<CompanyInternalOwner>, actor: MutationActor): Promise<BulkResult>;
  sendNotification(ids: string[], input: CompanyNotificationInput, actor: MutationActor): Promise<BulkResult>;

  /* Subscription */
  changePlan(id: string, input: ChangePlanInput, actor: MutationActor): Promise<CompanySummary>;
  extendTrial(id: string, input: { days: number; reason: string }, actor: MutationActor): Promise<CompanySummary>;
  convertTrialToPaid(id: string, input: { billingCycle: "monthly" | "annual" }, actor: MutationActor): Promise<CompanySummary>;
  changeBillingCycle(id: string, input: { billingCycle: "monthly" | "annual"; reason: string }, actor: MutationActor): Promise<CompanySummary>;
  scheduleCancellation(id: string, input: { reason: string }, actor: MutationActor): Promise<CompanySummary>;
  reactivateSubscription(id: string, actor: MutationActor): Promise<CompanySummary>;
  applyUsageOverride(id: string, input: UsageOverrideInput, actor: MutationActor): Promise<CompanySummary>;

  /* Users and security */
  setUserStatus(id: string, userId: string, status: "active" | "suspended", actor: MutationActor): Promise<CompanySummary>;
  requireUserTwoFactor(id: string, userId: string, actor: MutationActor): Promise<CompanySummary>;
  requireCompanyTwoFactor(id: string, actor: MutationActor): Promise<CompanySummary>;
  requirePasswordReset(id: string, actor: MutationActor): Promise<CompanySummary>;
  revokeSessions(id: string, actor: MutationActor): Promise<CompanySummary>;
  setAccessLock(id: string, input: { locked: boolean; reason: string }, actor: MutationActor): Promise<CompanySummary>;
  resendOwnerInvitation(id: string, actor: MutationActor): Promise<CompanySummary>;

  /* Internal notes (visible to Super Admin only) */
  addNote(id: string, input: NoteInput, actor: MutationActor): Promise<CompanyInternalNote>;
  updateNote(id: string, noteId: string, input: NoteInput, actor: MutationActor): Promise<CompanyInternalNote>;
  setNotePinned(id: string, noteId: string, pinned: boolean, actor: MutationActor): Promise<CompanyInternalNote>;
  deleteNote(id: string, noteId: string, actor: MutationActor): Promise<void>;

  /** Demo workspace only: discard this session's changes. Absent on real backends. */
  resetDemoData?(): Promise<void>;
}

export const companiesRepository: CompaniesRepository = COMPANIES_MOCK_MODE
  ? mockCompaniesProvider
  : unavailableCompaniesProvider;
