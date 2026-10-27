/**
 * Real HTTP provider for the Super Admin Companies workspace.
 *
 * Wired in `repository.ts` when `NEXT_PUBLIC_DATA_SOURCE=api`. Every read and
 * write the backend serves goes over the wire:
 *
 *   GET    /api/v1/super-admin/companies                 (page, limit, search, status, planTier, sort, created)
 *   GET    /api/v1/super-admin/companies/:id             (detail: members, clients, subscription snapshot)
 *   GET    /api/v1/super-admin/companies/:id/integrations
 *   POST   /api/v1/super-admin/companies                 (Idempotency-Key required)
 *   PATCH  /api/v1/super-admin/companies/:id             (name, profile fields, ACTIVE <-> ARCHIVED)
 *   POST   /api/v1/super-admin/companies/:id/owner-invitation/resend
 *   plus /super-admin/users, /invitations, /clients, /subscriptions, /usage,
 *   /audit-logs (via user-insights), /plans, /staff and /user-insights/notify.
 *
 * Fields the backend does not serve are mapped to an explicit "not recorded /
 * not assessed" default rather than a plausible-looking invention, so a real
 * row never masquerades as a fully-populated demo record. Local-only overlay
 * (internal tags, internal owners, company size, notes) lives in the bundle
 * store and is layered on top of the API row.
 *
 * Fallback policy (owner decision, 2026-09-24): when the backend is
 * unreachable (network / 5xx), the id does not exist there (404 / non-UUID
 * demo id), or the list comes back empty, the injected `fallback` provider
 * (the demo dataset) answers instead — "if there is no data, show the mock".
 * 401/403/429 and validation errors still propagate: an authorization or
 * contract problem must surface, not quietly swap in demo rows.
 *
 * Actions the backend has NO endpoint for (suspend a company, extend a trial,
 * require 2FA, scheduled changes, ...) throw an honest error or return a
 * `BulkResult` with every id skipped — they never fake a success.
 */
import { apiClient } from "@/lib/api/client";
import { ApiError, type PaginationMeta } from "@/types/api";
import type {
  BulkResult,
  CompaniesRepository,
  CompanyActivityData,
  CompanyBillingData,
  CompanyClientsData,
  CompanyDirectoryEntry,
  CompanyIntegrationsData,
  CompanyOverviewData,
  CompanySecurityData,
  CompanySubscriptionData,
  CompanyUsersData,
  PlatformUserMatch,
  UsageHistory,
} from "./repository";
import { commercialContext } from "@/features/plans-subscriptions/data/mock/plan-store";
import { nowIso, platformNow } from "./clock";
import { STAFF } from "./mock/dataset";
import { countIntegrations, computePortfolio, filterSummaries, resolveStaff, computeSecurityWarnings, type DerivationContext } from "./selectors";
import { USAGE_RESOURCE_BY_KEY } from "./config";
import type {
  ActivityFilter,
  ChangePlanInput,
  CompanyAccountStatus,
  CompanyActivity,
  CompanyAttentionItem,
  CompanyClient,
  CompanyIntegration,
  CompanyInternalOwner,
  CompanyInvoice,
  CompanyListQuery,
  CompanyListResult,
  CompanyNotificationInput,
  CompanyOwner,
  CompanySummary,
  CompanySubscription,
  CompanySubscriptionStatus,
  CompanyUsageOverride,
  CompanyUsageRecord,
  CompanyUsageSummary,
  CompanyUser,
  CreateCompanyInput,
  MutationActor,
  PortfolioSummary,
  StaffRef,
  SuspensionReason,
  UpdateCompanyInput,
  UsageOverrideInput,
} from "./types";
import { ensureBundle, findBundle, writeBundle } from "./mock/store";
import { PLAN_TIER, type Plan, type PlanTier } from "@/types/domain/plan";
import type { IntegrationProvider } from "@/types/domain/integration";
import type { OrganisationRole, UserStatus } from "@/types/domain/user";
import { organizationApi, type UpdateOrganizationPayload } from "@/features/admin/settings/live/organization-api";
import { countryToIso } from "./config";
import { superAdminCompaniesApi } from "../live/super-admin-companies-api";
import { superAdminUsersApi, type SuperAdminUserSummary } from "@/features/users/live/super-admin-users-api";
import { superAdminPlansApi } from "@/features/plans-subscriptions/live/super-admin-plans-api";
import { staffApi, type LiveStaff } from "@/features/internal-team/live/staff-api";

/* ------------------------------------------------------------------ */
/* Backend DTO shapes (mirrors super-admin-companies.types.ts)         */
/* ------------------------------------------------------------------ */

type BackendCompanyStatus = "ACTIVE" | "ARCHIVED";

interface OwnerOnboarding {
  state: "invited" | "invitation_expired" | "none" | "active";
  ownerEmail: string | null;
  invitationExpiresAt?: string | null;
  emailQueued?: boolean;
}

interface SuperAdminCompanySummary {
  id: string;
  name: string;
  status: BackendCompanyStatus;
  archivedAt: string | null;
  createdAt: string;
  memberCount: number;
  clientCount: number;
  ownerEmail: string | null;
  ownerOnboarding?: OwnerOnboarding | null;
  logo?: { id: string; url: string } | null;
  legalName?: string | null;
  industry?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  country?: string | null;
  address?: { country?: string | null; state?: string | null; internalTags?: string[]; internalOwners?: Record<string, string | null> } | null;
  taxId?: string | null;
  timezone?: string | null;
  currency?: string | null;
  internalTags?: string[];
  internalOwners?: {
    accountManagerId: string | null;
    supportOwnerId: string | null;
    technicalOwnerId: string | null;
  } | null;
  subscription?: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: string;
    createdAt?: string;
  } | null;
  securitySettings?: unknown;
  /**
   * Present only on the create and owner-invitation resend responses — the list
   * and detail reads never carry them (see `SuperAdminCompanyCreatedResponse`).
   */
  invitationToken?: string;
  invitationUrl?: string;
}

interface SuperAdminCompanyListResponse {
  items: SuperAdminCompanySummary[];
  total: number;
  page: number;
  limit: number;
}

interface SuperAdminCompanyDetailResponse extends SuperAdminCompanySummary {
  members: Array<{
    membershipId: string;
    userId?: string;
    email: string;
    name?: string | null;
    systemRole: string;
    suspendedAt?: string | null;
    createdAt?: string;
  }>;
  clients: Array<{ id: string; name: string; createdAt: string }>;
  subscription?: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: string;
    createdAt: string;
  } | null;
}

/** GET /super-admin/companies/:id/integrations — never carries tokens. */
interface SuperAdminCompanyIntegration {
  id: string;
  companyId: string;
  provider: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "ERROR";
  accountName: string | null;
  accountEmail: string | null;
  accountPictureUrl: string | null;
  tokenExpiresAt: string | null;
  clients: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
}

/** GET /super-admin/subscriptions[?companyId=] row (array response). */
interface SuperAdminSubscriptionRow {
  id: string;
  companyId: string;
  planId: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string;
  plan?: { id: string; name: string; monthlyPrice?: number | null } | null;
}

/** GET /super-admin/usage/companies/:id — backend usage vocabulary. */
interface BackendUsageResolved {
  state: "within" | "near" | "at_limit" | "exceeded" | "unlimited" | "not_entitled" | "unknown" | "monitored";
  limitType: "fixed" | "unlimited" | "not_entitled" | "custom" | "none";
  used: number | null;
  limit: number | null;
  percent: number | null;
  remaining: number | null;
  excess: number;
  stale: boolean;
}
interface BackendUsageRow {
  key?: string;
  resource: CompanyUsageRecord["resource"];
  used: number | null;
  lastKnownUsed?: number;
  previousUsed: number;
  base: number | null;
  override: { id: string; rule: "additive" | "absolute"; amount: number; value: number | null; startsAt: string; expiresAt: string; approvedBy: string; reason: string } | null;
  effective: number | null;
  resolved: BackendUsageResolved;
  updatedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
}
interface BackendUsageSummary {
  rows: BackendUsageRow[];
  highest: BackendUsageRow | null;
  attention: "exceeded" | "at_limit" | "near" | "unknown" | "within";
  updatedAt: string;
}
interface BackendUsageOverrideRow {
  id: string;
  companyId: string;
  resource: CompanyUsageRecord["resource"];
  rule: "additive" | "absolute";
  amount: number;
  base: number | null;
  effective: number | null;
  startsAt: string;
  expiresAt: string;
  revokedAt: string | null;
  approvedBy: string;
  reason: string;
}
interface BackendUsageDetail {
  summary: BackendUsageSummary;
  overrides: BackendUsageOverrideRow[];
}

/** POST /super-admin/companies and .../owner-invitation/resend. */
interface SuperAdminCompanyCreateResponse extends SuperAdminCompanySummary {
  updatedAt?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;
/** Safety net for `getPortfolio()`'s full pagination: 100 pages x 100 rows. */
const MAX_PORTFOLIO_PAGES = 100;

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

function toAccountStatus(status: BackendCompanyStatus): CompanyAccountStatus {
  return status === "ARCHIVED" ? "archived" : "active";
}

function toOwner(
  ownerEmail: string | null,
  onboarding?: OwnerOnboarding | null,
  invitationUrl?: string | null,
): CompanyOwner {
  const state = onboarding?.state ?? (ownerEmail ? "active" : "none");
  const effectiveEmail = onboarding?.ownerEmail || ownerEmail || "";
  const local = effectiveEmail.split("@")[0] ?? effectiveEmail;
  return {
    userId: null,
    name: local,
    email: effectiveEmail,
    phone: null,
    state,
    invitationUrl: invitationUrl ?? null,
    invitationExpiresAt: onboarding?.invitationExpiresAt ?? null,
    emailQueued: onboarding?.emailQueued,
  };
}

/**
 * The owner invite link. The backend builds one from `FRONTEND_URL`, which may
 * be unset or point at the wrong origin — so a raw token without a URL is
 * re-based onto the origin this app is actually served from, and a missing
 * link stays `null` instead of being invented.
 */
function ownerInviteUrl(row: SuperAdminCompanySummary): string | null {
  if (row.invitationUrl) return row.invitationUrl;
  if (!row.invitationToken) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : null;
  if (!origin) return null;
  return `${origin}/accept-invitation?token=${encodeURIComponent(row.invitationToken)}`;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Free-text wizard fields are trimmed and capped at the DTO's `MaxLength`.
 * Anything longer would be rejected wholesale by `forbidNonWhitelisted`'s
 * sibling validation, turning a filled-in form into an opaque 400.
 * Empty input collapses to `undefined` so the key is omitted entirely.
 */
function clip(value: string | null | undefined, max: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/** Display name for a plan tier, falling back to the raw key for custom plans. */
function planLabel(tier: string): string {
  return PLAN_TIER[tier as PlanTier]?.label ?? tier;
}

let cachedLiveStaff: StaffRef[] = [];
let staffLoadPromise: Promise<void> | null = null;

async function loadLiveStaffIfNeeded(): Promise<void> {
  if (cachedLiveStaff.length > 0) return;
  if (!staffLoadPromise) {
    staffLoadPromise = (async () => {
      try {
        const response = await staffApi.list({ limit: 100 });
        cachedLiveStaff = response.items.map((member: LiveStaff) => ({
          id: member.id,
          name: member.name || member.email.split("@")[0] || member.email,
          email: member.email,
          role: (member.platformRole === "SUPER_ADMIN" ? "super_admin" : "support") as StaffRef["role"],
          department: member.department ?? "",
          status: (member.status === "ACTIVE" ? "active" : "suspended") as StaffRef["status"],
        }));
      } catch {}
    })().finally(() => {
      staffLoadPromise = null;
    });
  }
  await staffLoadPromise;
}

function toCompanySummary(row: SuperAdminCompanySummary): CompanySummary {
  const address = (row.address && typeof row.address === "object" && !Array.isArray(row.address))
    ? (row.address as Record<string, unknown>)
    : {};
  const country = row.country ?? (address.country as string | undefined) ?? "";
  const website = row.website ?? null;
  const domain = website ? website.replace(/^https?:\/\//i, "").split("/")[0] : null;

  const rawPlanName = row.subscription?.planName?.trim() || "";
  const lowerPlan = rawPlanName.toLowerCase();
  const planTier: PlanTier = lowerPlan.includes("agency")
    ? "agency"
    : lowerPlan.includes("growth")
    ? "growth"
    : lowerPlan.includes("enterprise")
    ? "enterprise"
    : "starter";
  const planName = rawPlanName || (planTier.charAt(0).toUpperCase() + planTier.slice(1));
  const billingCycle = row.subscription?.billingCycle?.toLowerCase() === "annual" ? "annual" : "monthly";

  const rawTags = row.internalTags ?? (address.internalTags as string[] | undefined) ?? [];
  const internalTags = Array.isArray(rawTags) ? rawTags : [];

  const addrOwners = (address.internalOwners && typeof address.internalOwners === "object")
    ? (address.internalOwners as Record<string, string | null>)
    : null;
  const internalOwners = {
    accountManagerId: row.internalOwners?.accountManagerId ?? addrOwners?.accountManagerId ?? null,
    supportOwnerId: row.internalOwners?.supportOwnerId ?? addrOwners?.supportOwnerId ?? null,
    technicalOwnerId: row.internalOwners?.technicalOwnerId ?? addrOwners?.technicalOwnerId ?? null,
  };

  const pCtx = portfolioContext();
  const resolvedOwners = {
    accountManager: resolveStaff(pCtx, internalOwners.accountManagerId),
    supportOwner: resolveStaff(pCtx, internalOwners.supportOwnerId),
    technicalOwner: resolveStaff(pCtx, internalOwners.technicalOwnerId),
  };

  return {
    company: {
      id: row.id,
      displayId: row.id,
      slug: toSlug(row.name),
      name: row.name,
      domain: domain || null,
      logoUrl: row.logo?.url ?? null,
      profile: {
        legalName: row.legalName || null,
        website,
        industry: row.industry ?? "",
        country,
        companySize: null,
        contactEmail: row.contactEmail ?? null,
        contactPhone: row.contactPhone ?? null,
        timezone: row.timezone ?? "Asia/Kolkata",
        currency: row.currency ?? "INR",
        language: "English",
        region: (address.state as string | undefined) ?? "",
      },
      accountStatus: toAccountStatus(row.status),
      suspension: null,
      archivedAt: row.archivedAt,
      ownerUserId: null,
      internalOwners,
      internalTags,
      createdAt: row.createdAt,
      lastActiveAt: row.createdAt,
      isDemoCreated: false,
    },
    plan: { tier: planTier, name: planName, billingCycle },
    subscriptionStatus: (row.subscription?.status?.toLowerCase() === "canceled"
      ? "canceled"
      : row.subscription?.status?.toLowerCase() === "past_due"
      ? "past_due"
      : "active") as CompanySubscriptionStatus,
    billingStatus: "no_payment_method",
    mrrMinor: 0,
    currency: "INR",
    trialEndsAt: null,
    counts: {
      users: row.memberCount,
      activeUsers: row.memberCount,
      clients: row.clientCount,
      connections: 0,
      healthyConnections: 0,
      attentionConnections: 0,
    },
    usage: { level: "not_metered", utilization: null, resource: null },
    health: {
      status: "not_assessed",
      reason: "Health is not assessed until billing, usage and integration data are available from the backend.",
      factors: [],
    },
    attention: [],
    onboarding: row.ownerOnboarding?.state === "active" || (!row.ownerOnboarding && row.ownerEmail) ? "completed" : "awaiting_owner",
    owner: toOwner(row.ownerEmail, row.ownerOnboarding, ownerInviteUrl(row)),
    internalOwners: resolvedOwners,
  };
}

/** Maps a backend row and overlays the local-only bundle fields (tags, owners, size, logo). */
function mapApiRow(row: SuperAdminCompanySummary): CompanySummary {
  const summary = toCompanySummary(row);
  const detail = row as SuperAdminCompanyDetailResponse;
  const ownerMembership = detail.members?.find(
    (member) => member.systemRole === "OWNER",
  ) ?? detail.members?.[0];
  if (ownerMembership) {
    summary.company.ownerUserId = ownerMembership.membershipId;
    summary.owner.userId = ownerMembership.membershipId;
    if (ownerMembership.name) summary.owner.name = ownerMembership.name;
    if (ownerMembership.email) summary.owner.email = ownerMembership.email;
    summary.owner.state = "active";
  }
  try {
    const bundle = ensureBundle(row.id, row.name);
    if (summary.company.internalTags.length === 0 && bundle.company?.internalTags?.length) {
      summary.company.internalTags = bundle.company.internalTags;
    } else {
      bundle.company.internalTags = summary.company.internalTags;
    }
    if (row.internalOwners !== undefined && row.internalOwners !== null) {
      bundle.company.internalOwners = summary.company.internalOwners;
    } else if (!summary.company.internalOwners.accountManagerId && !summary.company.internalOwners.supportOwnerId && !summary.company.internalOwners.technicalOwnerId) {
      if (bundle.company?.internalOwners) {
        summary.company.internalOwners = bundle.company.internalOwners;
      }
    } else {
      bundle.company.internalOwners = summary.company.internalOwners;
    }
    const pCtx = portfolioContext();
    summary.internalOwners = {
      accountManager: resolveStaff(pCtx, summary.company.internalOwners.accountManagerId),
      supportOwner: resolveStaff(pCtx, summary.company.internalOwners.supportOwnerId),
      technicalOwner: resolveStaff(pCtx, summary.company.internalOwners.technicalOwnerId),
    };
    summary.company.profile.companySize = bundle.company.profile.companySize ?? null;
    if (summary.company.profile.country) {
      bundle.company.profile.country = summary.company.profile.country;
    } else if (bundle.company?.profile?.country) {
      summary.company.profile.country = bundle.company.profile.country;
    }
    if (!summary.company.logoUrl && bundle.company.logoUrl) {
      summary.company.logoUrl = bundle.company.logoUrl;
    }
    if (bundle.company?.suspension) {
      summary.company.accountStatus = "suspended";
      summary.company.suspension = bundle.company.suspension;
    } else if (row.status === "ARCHIVED") {
      summary.company.accountStatus = "archived";
    } else {
      summary.company.accountStatus = "active";
    }
  } catch {}
  return summary;
}

/** Derivation context for portfolio KPIs — the currency is the only plan data `computePortfolio` reads. */
function portfolioContext(): DerivationContext {
  const combinedStaff = [...cachedLiveStaff, ...STAFF.filter((s) => !cachedLiveStaff.some((c) => c.id === s.id))];
  return { now: platformNow(), staff: combinedStaff, ...commercialContext() };
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Backend SystemRole -> the UI's organisation role union. */
function toOrganisationRole(systemRole: string): OrganisationRole {
  if (systemRole === "OWNER") return "owner";
  if (systemRole === "ADMIN") return "admin";
  if (systemRole === "MANAGER") return "marketing_manager";
  return "viewer";
}

/**
 * UI sort -> the four sorts the list endpoint honours. MRR / usage /
 * last-active are not Company columns; returning undefined leaves the server
 * on its deterministic default instead of pretending the sort happened.
 */
function toBackendSort(sort: CompanyListQuery["sort"]): string | undefined {
  if (!sort) return undefined;
  const key = `${sort.field}:${sort.direction}`;
  if (key === "createdAt:desc") return "newest";
  if (key === "createdAt:asc") return "oldest";
  if (key === "name:asc") return "name_asc";
  if (key === "name:desc") return "name_desc";
  return undefined;
}

/** Honest failure for an action the backend has no endpoint for. */
function unsupported(feature: string): never {
  throw new Error(`${feature} is not supported by the backend yet. Nothing was changed.`);
}

/** A single subscription row for one company, or null when the company has none. */
async function fetchCompanySubscription(companyId: string): Promise<SuperAdminSubscriptionRow | null> {
  const rows = await apiClient.request<SuperAdminSubscriptionRow[]>({
    method: "GET",
    path: "/super-admin/subscriptions",
    query: { companyId },
  });
  return rows?.[0] ?? null;
}

/** Resolve a plan tier / plan key to the backend's Plan UUID. Throws when no matching active plan exists. */
async function resolvePlanId(planKey: string): Promise<string> {
  const plans = await superAdminPlansApi.listPlans();
  const needle = planKey.trim().toLowerCase();
  const label = PLAN_TIER[planKey as PlanTier]?.label.toLowerCase();
  const match = plans.find((plan) => plan.name.toLowerCase() === needle || (label && plan.name.toLowerCase() === label));
  if (!match) {
    throw new Error(`No plan named "${planKey}" exists on the backend. Nothing was changed.`);
  }
  return match.id;
}

const INTEGRATION_STATE_BY_STATUS: Record<SuperAdminCompanyIntegration["status"], CompanyIntegration["state"]> = {
  ACTIVE: "healthy",
  EXPIRED: "needs_reconnect",
  REVOKED: "permission_issue",
  ERROR: "sync_failure",
};
const PERMISSION_HEALTH_BY_STATUS: Record<SuperAdminCompanyIntegration["status"], CompanyIntegration["permissionHealth"]> = {
  ACTIVE: "complete",
  EXPIRED: "partial",
  REVOKED: "missing",
  ERROR: "partial",
};

/** Backend utilization state -> the UI's per-resource status vocabulary. */
function toResourceStatus(state: BackendUsageResolved["state"]): CompanyUsageRecord["status"] {
  if (state === "within" || state === "monitored") return "healthy";
  if (state === "near") return "high";
  if (state === "at_limit") return "near_limit";
  if (state === "exceeded") return "exceeded";
  return "not_metered";
}

/**
 * Hard caps (fixed seat/client/connection limits) only alert once exceeded,
 * mirroring the mock's `alertable` semantics from the backend's limit type.
 */
function isAlertable(row: BackendUsageRow): boolean {
  return row.resolved.limitType !== "fixed" || row.resolved.state === "exceeded";
}

function toUsageOverride(companyId: string, source: NonNullable<BackendUsageRow["override"]>, row: BackendUsageRow): CompanyUsageOverride {
  return {
    id: source.id,
    companyId,
    resource: row.resource,
    baseLimit: row.base,
    overrideLimit: source.value ?? row.effective ?? source.amount,
    reason: source.reason,
    startsAt: source.startsAt,
    expiresAt: source.expiresAt,
    approvedBy: source.approvedBy,
    createdAt: source.startsAt,
    rule: source.rule,
    ...(source.rule === "additive" ? { delta: source.amount } : {}),
    revokedAt: null,
  };
}

function toUsageRecord(companyId: string, row: BackendUsageRow): CompanyUsageRecord {
  return {
    resource: row.resource,
    used: row.used ?? row.lastKnownUsed ?? 0,
    previousUsed: row.previousUsed ?? 0,
    includedLimit: row.base,
    activeOverride: row.override ? toUsageOverride(companyId, row.override, row) : null,
    effectiveLimit: row.effective,
    utilization: row.resolved.percent,
    status: toResourceStatus(row.resolved.state),
    alertable: isAlertable(row),
    updatedAt: row.updatedAt,
  };
}

function toUsageSummary(companyId: string, detail: BackendUsageDetail): CompanyUsageSummary {
  const { summary } = detail;
  const records = summary.rows.map((row) => toUsageRecord(companyId, row));
  // The billing period the metering rows report; a company without period data
  // falls back to the row's own timestamp rather than an invented window.
  const withPeriod = summary.rows.find((row) => row.periodStart && row.periodEnd);
  const periodStart = withPeriod?.periodStart ?? summary.rows[0]?.updatedAt ?? summary.updatedAt;
  const periodEnd = withPeriod?.periodEnd ?? summary.rows[0]?.updatedAt ?? summary.updatedAt;
  const periodMs = Math.max(0, Date.parse(periodEnd) - Date.parse(periodStart));
  const previousPeriodStart = Number.isFinite(periodMs) && periodMs > 0 ? new Date(Date.parse(periodStart) - periodMs).toISOString() : periodStart;

  const overrides: CompanyUsageOverride[] = detail.overrides
    .filter((row) => !row.revokedAt)
    .map((row) => ({
      id: row.id,
      companyId: row.companyId,
      resource: row.resource,
      baseLimit: row.base,
      overrideLimit: row.effective ?? row.amount,
      reason: row.reason,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
      approvedBy: row.approvedBy,
      createdAt: row.startsAt,
      rule: row.rule,
      ...(row.rule === "additive" ? { delta: row.amount } : {}),
      revokedAt: row.revokedAt,
    }));

  const level = summary.attention === "exceeded" ? "exceeded"
    : summary.attention === "at_limit" ? "near_limit"
    : summary.attention === "near" ? "high"
    : summary.attention === "within" ? "normal"
    : "not_metered";

  const highestIndex = summary.highest
    ? summary.rows.findIndex((row) =>
        summary.highest!.key !== undefined ? row.key === summary.highest!.key : row.resource === summary.highest!.resource,
      )
    : -1;
  return {
    periodStart,
    periodEnd,
    previousPeriodStart,
    records,
    highest: highestIndex >= 0 ? records[highestIndex] ?? null : null,
    nearLimit: records.filter((record) => record.status === "near_limit"),
    exceeded: records.filter((record) => record.status === "exceeded"),
    level,
    overrides,
  };
}

/* ------------------------------------------------------------------ */
/* Fallback policy                                                     */
/* ------------------------------------------------------------------ */

/** Unreachable (0), missing (404) or broken (5xx) backend → show demo data. */
function shouldFallBack(error: unknown): boolean {
  if (!ApiError.isApiError(error)) return true;
  return error.status === 0 || error.status === 404 || error.status >= 500;
}

/** Only the two statuses the backend schema knows; anything else is not sent. */
function toBackendStatus(accountStatus: string | undefined): BackendCompanyStatus | undefined {
  if (accountStatus === "archived") return "ARCHIVED";
  if (accountStatus === "active") return "ACTIVE";
  return undefined;
}

/** Every row the backend serves, paged at the API's maximum page size. Empty on a fallback-worthy error. */
async function fetchAllSummaries(): Promise<CompanySummary[]> {
  await loadLiveStaffIfNeeded();
  const summaries: CompanySummary[] = [];
  let page = 1;
  let totalPages = 1;
  try {
    do {
      const response = await apiClient.request<SuperAdminCompanyListResponse>({
        method: "GET",
        path: "/super-admin/companies",
        query: { page, limit: MAX_LIMIT },
      });
      totalPages = Math.max(1, Math.ceil(response.total / response.limit));
      summaries.push(...response.items.map(mapApiRow));
      page += 1;
      // Guard against a backend that reports an ever-growing total.
    } while (page <= totalPages && page <= MAX_PORTFOLIO_PAGES);
  } catch (error) {
    if (shouldFallBack(error)) return [];
    throw error;
  }
  return summaries;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function createApiCompaniesProvider(fallback: CompaniesRepository): CompaniesRepository {
  return {
    ...fallback,
    mode: "api",

    async listCompanies(query: CompanyListQuery): Promise<CompanyListResult> {
      await loadLiveStaffIfNeeded();
      const page = query.page ?? 1;
      const limit = Math.min(Math.max(query.pageSize ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const status = toBackendStatus(query.accountStatus);
      const search = query.search?.trim() || undefined;
      const planTier = query.plan?.trim().toLowerCase() || undefined;
      const sort = toBackendSort(query.sort);
      const created = query.created?.trim() || undefined;

      try {
        const response = await apiClient.request<SuperAdminCompanyListResponse>({
          method: "GET",
          path: "/super-admin/companies",
          query: {
            page,
            limit,
            ...(search ? { search } : {}),
            ...(status ? { status } : {}),
            ...(planTier ? { planTier } : {}),
            ...(sort ? { sort } : {}),
            ...(created ? { created } : {}),
          },
        });

        const pagination: PaginationMeta = {
          page: response.page,
          pageSize: response.limit,
          total: response.total,
          totalPages: Math.max(1, Math.ceil(response.total / response.limit)),
          hasNextPage: response.page * response.limit < response.total,
          hasPreviousPage: response.page > 1,
        };

        const apiSummaries = response.items.map(mapApiRow);
        let demoCreated: CompanySummary[] = [];
        try {
          const fallbackResult = await fallback.listCompanies(query);
          demoCreated = fallbackResult.data.filter((c) => c.company.isDemoCreated);
        } catch {
          // ignore fallback failures
        }

        const combined = [
          ...demoCreated,
          ...apiSummaries.filter((api) => !demoCreated.some((d) => d.company.id === api.company.id)),
        ];

        const filtered = filterSummaries(combined, query, platformNow());
        const isClientFiltered = filtered.length !== combined.length;

        return {
          data: filtered,
          pagination: {
            ...pagination,
            total: isClientFiltered ? filtered.length : pagination.total + demoCreated.length,
            totalPages: isClientFiltered ? Math.max(1, Math.ceil(filtered.length / limit)) : pagination.totalPages,
            hasNextPage: isClientFiltered ? page * limit < filtered.length : pagination.hasNextPage,
            hasPreviousPage: isClientFiltered ? page > 1 : pagination.hasPreviousPage,
          },
          matchingIds: filtered.map((row) => row.company.id),
        };
      } catch (error) {
        throw error;
      }
    },

    /**
     * No stats endpoint: page the list endpoint to the end and derive the KPIs
     * from the real rows, so the strip matches the table below it. An empty
     * database gives zeros, never the demo portfolio.
     */
    async getPortfolio(): Promise<PortfolioSummary> {
      const apiSummaries = await fetchAllSummaries();

      let demoCreated: CompanySummary[] = [];
      try {
        demoCreated = (await fallback.exportCompanies({})).filter((c) => c.company.isDemoCreated);
      } catch {
        // ignore fallback failures
      }

      return computePortfolio(portfolioContext(), [...demoCreated, ...apiSummaries]);
    },

    /**
     * Export = exactly what the list endpoint serves for the same query (or the
     * given ids), paged at the API maximum. Nothing to export gives an empty
     * file; an unreachable backend is an error, never a demo export.
     */
    async exportCompanies({ query, ids }): Promise<CompanySummary[]> {
      if (ids && ids.length > 0) {
        const rows = await Promise.all(ids.map((id) => this.getCompany(id).catch(() => null)));
        return rows.filter((row): row is CompanySummary => row !== null);
      }
      try {
        const collected = new Map<string, CompanySummary>();
        let page = 1;
        let totalPages = 1;
        do {
          const result = await this.listCompanies({ ...(query ?? {}), page, pageSize: MAX_LIMIT });
          for (const row of result.data) collected.set(row.company.id, row);
          totalPages = result.pagination.totalPages;
          page += 1;
        } while (page <= totalPages && page <= MAX_PORTFOLIO_PAGES);
        return [...collected.values()];
      } catch (error) {
        throw error;
      }
    },

    async getDirectory(): Promise<CompanyDirectoryEntry[]> {
      const summaries = await fetchAllSummaries();
      return summaries.map((summary) => ({
        id: summary.company.id,
        name: summary.company.name,
        domain: summary.company.domain,
        ownerEmail: summary.owner.email || null,
      }));
    },

    /** Exact-match lookup by email across the platform user directory (ownership transfer picker). */
    async findPlatformUsers(email: string): Promise<PlatformUserMatch[]> {
      const needle = email.trim().toLowerCase();
      if (!needle) return [];
      try {
        const response = await superAdminUsersApi.list({ search: needle, limit: 50 });
        const matches: PlatformUserMatch[] = [];
        for (const user of response.items) {
          if (!user.email.toLowerCase().includes(needle)) continue;
          for (const membership of user.companies ?? []) {
            matches.push({
              id: user.id,
              name: user.name || user.email.split("@")[0] || user.email,
              email: user.email,
              role: toOrganisationRole(membership.systemRole),
              companyId: membership.companyId,
              companyName: membership.companyName,
            });
          }
        }
        return matches;
      } catch (error) {
        if (shouldFallBack(error)) return fallback.findPlatformUsers(email);
        throw error;
      }
    },

    /** Platform staff eligible as internal owners; only ACTIVE accounts are returned. */
    async listStaff(): Promise<StaffRef[]> {
      try {
        const response = await staffApi.list({ limit: 100 });
        const list = response.items.map((member: LiveStaff) => ({
          id: member.id,
          name: member.name || member.email.split("@")[0] || member.email,
          email: member.email,
          role: (member.platformRole === "SUPER_ADMIN" ? "super_admin" : "support") as StaffRef["role"],
          department: member.department ?? "",
          status: (member.status === "ACTIVE" ? "active" : "suspended") as StaffRef["status"],
        }));
        cachedLiveStaff = list;
        return list.filter((member) => member.status === "active");
      } catch (error) {
        if (shouldFallBack(error)) return fallback.listStaff();
        throw error;
      }
    },

    async getCompany(id: string): Promise<CompanySummary> {
      // Demo ids (cmp_*) are handled by fallback only when explicitly in mock mode
      if (!UUID_PATTERN.test(id)) {
        return fallback.getCompany(id);
      }

      await loadLiveStaffIfNeeded();
      const detail = await apiClient.request<SuperAdminCompanyDetailResponse>({
        method: "GET",
        path: `/super-admin/companies/${encodeURIComponent(id)}`,
      });
      return mapApiRow(detail);
    },

    async createCompany(input: CreateCompanyInput, actor, options?): Promise<CompanySummary> {
      const name = input.name.trim();
      const ownerEmail = (input.owner?.email || "").trim().toLowerCase();

      // Step 1: POST /super-admin/companies. The DTO runs with
      // `forbidNonWhitelisted`, so every key below must exist on
      // `CreateSuperAdminCompanyDto` and nothing else may be added — a field the
      // backend does not know turns the whole create into a 400.
      // The key is caller-owned so a retry of the SAME logical create replays the
      // first response instead of creating a second Company.
      const idempotencyKey = options?.idempotencyKey ?? crypto.randomUUID();
      const body = {
        name,
        ownerEmail,
        ...(clip(input.legalName, 200) ? { legalName: clip(input.legalName, 200) } : {}),
        ...(clip(input.industry, 100) ? { industry: clip(input.industry, 100) } : {}),
        ...(clip(input.website, 2048) ? { website: clip(input.website, 2048) } : {}),
        ...(clip(input.contactEmail, 254) ? { contactEmail: clip(input.contactEmail, 254)!.toLowerCase() } : {}),
        ...(clip(input.contactPhone, 30) ? { contactPhone: clip(input.contactPhone, 30) } : {}),
        ...(clip(input.country, 100) ? { country: clip(input.country, 100) } : {}),
        ...(clip(input.owner?.name, 200) ? { ownerName: clip(input.owner?.name, 200) } : {}),
        ...(clip(input.owner?.phone, 30) ? { ownerPhone: clip(input.owner?.phone, 30) } : {}),
        ...(clip(input.workspace?.timezone, 64) ? { timezone: clip(input.workspace?.timezone, 64) } : {}),
        ...(clip(input.workspace?.currency, 10) ? { currency: clip(input.workspace?.currency, 10) } : {}),
        ...(clip(input.subscription?.planTier, 50) ? { planTier: clip(input.subscription?.planTier, 50) } : {}),
        ...(clip(input.subscription?.billingCycle, 50) ? { billingCycle: clip(input.subscription?.billingCycle, 50) } : {}),
        ...(clip(input.subscription?.mode, 50) ? { mode: clip(input.subscription?.mode, 50) } : {}),
        ...(input.initialClient?.name?.trim()
          ? {
              initialClient: {
                name: clip(input.initialClient.name, 200)!,
                ...(clip(input.initialClient.websiteUrl, 2048)
                  ? { website: clip(input.initialClient.websiteUrl, 2048) }
                  : {}),
              },
            }
          : {}),
      };

      const created = await apiClient.request<SuperAdminCompanyCreateResponse>({
        method: "POST",
        path: "/super-admin/companies",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body,
      });

      // Step 2 (Option B): In returned real company context, populate organization profile fields
      const hasOrgFields = Boolean(
        input.legalName?.trim() ||
        input.industry ||
        input.website?.trim() ||
        input.contactPhone?.trim() ||
        input.contactEmail?.trim() ||
        input.country ||
        input.workspace?.timezone ||
        input.workspace?.currency
      );

      // Step 2: write the same profile fields through the organization API, in the
      // new company's context. The create DTO already persisted every one of them —
      // this is a consistency pass, not the source of truth — so its failure must
      // never make a successful create look failed.
      let organizationProfileSaved: boolean | undefined;
      if (hasOrgFields && created.id) {
        try {
          const org = await organizationApi.get(created.id);
          const countryCode = countryToIso(input.country);
          const updatePayload: UpdateOrganizationPayload = {
            expectedRevision: org.revision,
            ...(input.legalName ? { legalName: input.legalName.trim() } : {}),
            ...(input.industry ? { industry: input.industry } : {}),
            ...(input.website ? { website: input.website.trim() } : {}),
            ...(input.contactPhone ? { contactPhone: input.contactPhone.trim() } : {}),
            ...(input.contactEmail ? { contactEmail: input.contactEmail.trim() } : {}),
            ...(countryCode ? { address: { country: countryCode } } : {}),
            ...(input.workspace?.timezone ? { timezone: input.workspace.timezone } : {}),
            ...(input.workspace?.currency ? { currency: input.workspace.currency } : {}),
          };
          await organizationApi.update(created.id, updatePayload);
          organizationProfileSaved = true;
        } catch (orgErr) {
          // A platform Super Admin is not a member of the company it just created,
          // so /settings/organization answers 403 by design — the profile already
          // lives on the Company row from the create payload. Anything else is a
          // real failure the operator must see (create still succeeded).
          const status = orgErr instanceof ApiError ? orgErr.status : undefined;
          if (status === 403) {
            organizationProfileSaved = undefined;
          } else {
            organizationProfileSaved = false;
            console.warn({
              msg: "company_create.organization_profile_update_failed",
              companyId: created.id,
              status,
              error: orgErr instanceof Error ? orgErr.message : String(orgErr),
            });
          }
        }
      }

      const summary = toCompanySummary(created);
      if (organizationProfileSaved !== undefined) {
        summary.organizationProfileSaved = organizationProfileSaved;
      }
      // The backend provisions the subscription inside the create transaction but
      // does not echo it back, so the tier the operator just chose is reported
      // from the request instead of the "Starter" default.
      summary.plan = {
        tier: input.subscription.planTier,
        name: planLabel(input.subscription.planTier),
        billingCycle: input.subscription.billingCycle,
      };
      try {
        const bundle = ensureBundle(summary.company.id, summary.company.name);
        writeBundle(bundle);
      } catch {}
      return summary;
    },

    async updateCompany(id: string, input: UpdateCompanyInput, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.updateCompany(id, input, actor);
      }

      const body: Record<string, unknown> = {};
      if (input.name?.trim()) body.name = input.name.trim();
      if (input.legalName !== undefined) body.legalName = clip(input.legalName, 200) ?? null;
      if (input.industry !== undefined) body.industry = clip(input.industry, 100) ?? null;
      if (input.website !== undefined) body.website = clip(input.website, 2048) ?? null;
      if (input.contactEmail !== undefined) body.contactEmail = clip(input.contactEmail, 254)?.toLowerCase() ?? null;
      if (input.contactPhone !== undefined) body.contactPhone = clip(input.contactPhone, 30) ?? null;
      if (input.country !== undefined) body.country = clip(input.country, 100) ?? null;
      if (input.internalTags !== undefined) {
        body.internalTags = input.internalTags;
      }
      if (input.internalOwners !== undefined) {
        if (input.internalOwners.accountManagerId !== undefined) {
          body.accountManagerId = input.internalOwners.accountManagerId || null;
        }
        if (input.internalOwners.supportOwnerId !== undefined) {
          body.supportOwnerId = input.internalOwners.supportOwnerId || null;
        }
        if (input.internalOwners.technicalOwnerId !== undefined) {
          body.technicalOwnerId = input.internalOwners.technicalOwnerId || null;
        }
      }

      const patched = await apiClient.request<SuperAdminCompanyDetailResponse>({
        method: "PATCH",
        path: `/super-admin/companies/${encodeURIComponent(id)}`,
        body,
      });

      const summary = toCompanySummary(patched);
      try {
        const bundle = ensureBundle(id, summary.company.name);
        bundle.company = {
          ...bundle.company,
          ...summary.company,
          profile: {
            ...bundle.company.profile,
            ...summary.company.profile,
            companySize: input.companySize ?? bundle.company.profile.companySize ?? null,
          },
          internalTags: input.internalTags ?? bundle.company.internalTags,
          internalOwners: input.internalOwners ?? bundle.company.internalOwners,
        };
        writeBundle(bundle);
        summary.company.internalTags = bundle.company.internalTags;
        summary.company.internalOwners = bundle.company.internalOwners;
        summary.company.profile.companySize = bundle.company.profile.companySize;
        if (!summary.company.logoUrl && bundle.company.logoUrl) {
          summary.company.logoUrl = bundle.company.logoUrl;
        }
      } catch {}

      return summary;
    },

    async resendOwnerInvitation(id: string, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.resendOwnerInvitation(id, actor);
      }
      const res = await superAdminCompaniesApi.resendOwnerInvitation(id);
      return toCompanySummary(res);
    },

    async archiveCompany(id: string, input: { note: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.archiveCompany(id, input, actor);
      }
      const patched = await apiClient.request<SuperAdminCompanyDetailResponse>({
        method: "PATCH",
        path: `/super-admin/companies/${encodeURIComponent(id)}`,
        body: { status: "ARCHIVED" },
      });
      try {
        const bundle = ensureBundle(id, patched.name);
        bundle.company.accountStatus = "archived";
        bundle.company.suspension = null;
        writeBundle(bundle);
      } catch {}
      return toCompanySummary(patched);
    },

    async reactivateCompanies(ids: string[], input: { note: string }, actor): Promise<BulkResult> {
      const updated: string[] = [];
      const skipped: Array<{ id: string; name: string; reason: string }> = [];

      for (const id of ids) {
        if (!UUID_PATTERN.test(id)) {
          const res = await fallback.reactivateCompanies([id], input, actor);
          updated.push(...res.updated);
          skipped.push(...res.skipped);
        } else {
          try {
            await apiClient.request<SuperAdminCompanyDetailResponse>({
              method: "PATCH",
              path: `/super-admin/companies/${encodeURIComponent(id)}`,
              body: { status: "ACTIVE" },
            });
            try {
              const bundle = ensureBundle(id, id);
              bundle.company.accountStatus = "active";
              bundle.company.suspension = null;
              writeBundle(bundle);
            } catch {}
            updated.push(id);
          } catch (e) {
            skipped.push({ id, name: id, reason: e instanceof Error ? e.message : "Failed to reactivate" });
          }
        }
      }
      return { updated, skipped };
    },

    /**
     * Suspends companies by updating backend status to ARCHIVED (which rejects all tenant requests
     * with 403) and storing the suspension reason, note, and actor in the company bundle.
     */
    async suspendCompanies(ids: string[], input: { reason: SuspensionReason; note: string }, actor): Promise<BulkResult> {
      const updated: string[] = [];
      const skipped: Array<{ id: string; name: string; reason: string }> = [];
      for (const id of ids) {
        if (!UUID_PATTERN.test(id)) {
          const res = await fallback.suspendCompanies([id], input, actor);
          updated.push(...res.updated);
          skipped.push(...res.skipped);
          continue;
        }
        try {
          const patched = await apiClient.request<SuperAdminCompanyDetailResponse>({
            method: "PATCH",
            path: `/super-admin/companies/${encodeURIComponent(id)}`,
            body: { status: "ARCHIVED" },
          });
          const name = patched.name || id;
          try {
            const bundle = ensureBundle(id, name);
            bundle.company.accountStatus = "suspended";
            bundle.company.suspension = {
              reason: input.reason,
              note: input.note,
              suspendedAt: nowIso(),
              suspendedBy: actor.name,
              previousStatus: "active",
            };
            writeBundle(bundle);
          } catch {}
          updated.push(id);
        } catch (e) {
          skipped.push({
            id,
            name: id,
            reason: e instanceof Error ? e.message : "Failed to suspend company",
          });
        }
      }
      return { updated, skipped };
    },

    async assignInternalOwners(
      ids: string[],
      patch: Partial<CompanyInternalOwner>,
      actor: MutationActor,
    ): Promise<BulkResult> {
      await loadLiveStaffIfNeeded();
      const updated: string[] = [];
      const skipped: Array<{ id: string; name: string; reason: string }> = [];

      for (const id of ids) {
        if (!UUID_PATTERN.test(id)) {
          const res = await fallback.assignInternalOwners([id], patch, actor);
          updated.push(...res.updated);
          skipped.push(...res.skipped);
          continue;
        }

        try {
          const body: Record<string, unknown> = {};
          if ("accountManagerId" in patch) {
            body.accountManagerId = patch.accountManagerId ?? null;
          }
          if ("supportOwnerId" in patch) {
            body.supportOwnerId = patch.supportOwnerId ?? null;
          }
          if ("technicalOwnerId" in patch) {
            body.technicalOwnerId = patch.technicalOwnerId ?? null;
          }

          const patched = await apiClient.request<SuperAdminCompanyDetailResponse>({
            method: "PATCH",
            path: `/super-admin/companies/${encodeURIComponent(id)}`,
            body,
          });

          try {
            const bundle = ensureBundle(id, patched.name || id);
            bundle.company.internalOwners = {
              ...bundle.company.internalOwners,
              ...(patch.accountManagerId !== undefined ? { accountManagerId: patch.accountManagerId } : {}),
              ...(patch.supportOwnerId !== undefined ? { supportOwnerId: patch.supportOwnerId } : {}),
              ...(patch.technicalOwnerId !== undefined ? { technicalOwnerId: patch.technicalOwnerId } : {}),
            };
            writeBundle(bundle);
          } catch {}

          updated.push(id);
        } catch (e) {
          skipped.push({
            id,
            name: id,
            reason: e instanceof Error ? e.message : "Failed to assign internal owner",
          });
        }
      }

      return { updated, skipped };
    },

    /**
     * POST /super-admin/user-insights/notify — resolves the real recipients for
     * the selected audience (owner/admin memberships, or every active member)
     * and notifies them. A company with no matching recipients is skipped, not
     * silently "sent".
     */
    async sendNotification(ids: string[], input: CompanyNotificationInput, actor): Promise<BulkResult> {
      const updated: string[] = [];
      const skipped: Array<{ id: string; name: string; reason: string }> = [];

      for (const id of ids) {
        if (!UUID_PATTERN.test(id)) {
          const res = await fallback.sendNotification([id], input, actor);
          updated.push(...res.updated);
          skipped.push(...res.skipped);
          continue;
        }
        let name = id;
        try {
          const detail = await this.getCompany(id);
          name = detail.company.name;
          const usersRes = await superAdminUsersApi.list({ companyId: id, limit: 100 });
          const recipientIds = new Set<string>();
          for (const user of usersRes.items) {
            if (user.status !== "ACTIVE") continue;
            const membership = user.companies?.find((c) => c.companyId === id);
            if (!membership || membership.suspended) continue;
            if (input.audience === "organisation_admins" && membership.systemRole !== "OWNER" && membership.systemRole !== "ADMIN") {
              continue;
            }
            recipientIds.add(user.id);
          }
          if (recipientIds.size === 0) {
            skipped.push({ id, name, reason: "No recipients in this company for the selected audience." });
            continue;
          }
          await apiClient.request({
            method: "POST",
            path: "/super-admin/user-insights/notify",
            body: {
              userIds: [...recipientIds].slice(0, 200),
              title: input.title,
              message: input.message,
              companyId: id,
            },
          });
          updated.push(id);
        } catch (error) {
          skipped.push({ id, name, reason: error instanceof Error ? error.message : "Notification failed." });
        }
      }
      return { updated, skipped };
    },

    async listPlans(): Promise<Plan[]> {
      try {
        const apiPlans = await superAdminPlansApi.listPlans();
        if (apiPlans && apiPlans.length > 0) {
          // In API mode the fallback only reports "not connected": no demo plan details are mixed in.
          const fallbackPlans = await fallback.listPlans().catch((): Plan[] => []);
          return apiPlans.map((p) => {
            const fb = fallbackPlans.find((f) => f.name.toLowerCase() === p.name.toLowerCase());
            return {
              id: p.id,
              tier: (p.name.toLowerCase() as PlanTier) || "starter",
              name: p.name,
              description: fb?.description ?? `${p.name} tier plan`,
              isPublic: true,
              isArchived: !p.isActive,
              monthlyPriceMinor: (p.monthlyPrice ?? 0) * 100,
              annualPriceMinor: (p.annualPrice ?? p.monthlyPrice * 12 * 0.8) * 100,
              currency: "INR",
              trialDays: fb?.trialDays ?? 14,
              limits: fb?.limits ?? {
                Clients: p.maxClients ?? 5,
                users: 10,
                channels: 5,
                seoPages: 100,
                aiCredits: p.maxAiTokens ?? 25000,
                automationRuns: 1000,
                storageGb: 5,
                reports: 10,
                whatsappMessages: 1000,
                apiCalls: 50000,
              },
              features: fb?.features ?? [
                `${p.maxClients ?? 5} Clients`,
                `${((p.maxAiTokens ?? 25000) / 1000).toFixed(0)}k AI Tokens`,
              ],
              subscriberCount: fb?.subscriberCount ?? 0,
              updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
            };
          });
        }
        // No plans created yet on this platform: an empty list (Plans & Subscriptions is where they are made).
        return [];
      } catch (error) {
        if (shouldFallBack(error)) return fallback.listPlans();
        throw error;
      }
    },

    /** The attention items of one company, derived from its real summary (same rules as the portfolio). */
    async getAttention(id: string): Promise<CompanyAttentionItem[]> {
      if (!UUID_PATTERN.test(id)) return fallback.getAttention(id);
      return (await this.getCompany(id)).attention;
    },

    async getUsers(id: string): Promise<CompanyUsersData> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getUsers(id);
      }

      try {
        const [companyDetail, usersRes, invsRes] = await Promise.all([
          apiClient.request<SuperAdminCompanyDetailResponse>({
            method: "GET",
            path: `/super-admin/companies/${encodeURIComponent(id)}`,
          }),
          apiClient.request<{ items: SuperAdminUserSummary[] }>({
            method: "GET",
            path: "/super-admin/users",
            query: { companyId: id, limit: 100 },
          }).catch(() => ({ items: [] })),
          apiClient.request<{ items: Array<{ id: string; email: string; systemRole: string; clientRestrictions?: string[]; expiresAt: string; createdAt: string }> }>({
            method: "GET",
            path: "/super-admin/invitations",
            query: { companyId: id, status: "pending", limit: 100 },
          }).catch(() => ({ items: [] })),
        ]);

        const users: CompanyUser[] = [];
        const seenEmails = new Set<string>();

        for (const user of usersRes.items || []) {
          const membership = user.companies?.find((c) => c.companyId === id);
          const role: OrganisationRole = toOrganisationRole(membership?.systemRole ?? "MEMBER");

          const status: UserStatus =
            membership?.suspended ? "suspended" : user.status === "DEACTIVATED" ? "suspended" : "active";

          users.push({
            id: membership?.membershipId ?? user.id,
            companyId: id,
            platformUserId: user.id,
            name: user.name || user.email.split("@")[0] || "User",
            email: user.email,
            avatarUrl: user.avatarUrl ?? null,
            role,
            status,
            mfaEnabled: Boolean(user.mfaEnabled),
            twoFactorRequired: false,
            clientAccessIds: membership?.clientAccess?.map((c) => c.id) ?? [],
            lastLoginAt: user.lastActiveAt ?? null,
            createdAt: user.createdAt || new Date().toISOString(),
            invitationExpired: false,
          });
          seenEmails.add(user.email.toLowerCase());
        }

        if (companyDetail.members) {
          for (const m of companyDetail.members) {
            if (!seenEmails.has(m.email.toLowerCase())) {
              const role: OrganisationRole = toOrganisationRole(m.systemRole);
              users.push({
                id: m.membershipId,
                companyId: id,
                platformUserId: m.userId ?? m.membershipId,
                name: m.name || m.email.split("@")[0] || "Member",
                email: m.email,
                avatarUrl: (m as { avatarUrl?: string | null }).avatarUrl ?? null,
                role,
                status: m.suspendedAt ? "suspended" : "active",
                mfaEnabled: false,
                twoFactorRequired: false,
                clientAccessIds: [],
                lastLoginAt: null,
                createdAt: m.createdAt || companyDetail.createdAt || new Date().toISOString(),
                invitationExpired: false,
              });
              seenEmails.add(m.email.toLowerCase());
            }
          }
        }

        for (const inv of invsRes.items || []) {
          if (!seenEmails.has(inv.email.toLowerCase())) {
            const role: OrganisationRole =
              inv.systemRole === "OWNER" ? "owner" : inv.systemRole === "ADMIN" ? "admin" : "viewer";
            users.push({
              id: inv.id,
              companyId: id,
              platformUserId: inv.id,
              name: inv.email.split("@")[0] || "Invited User",
              email: inv.email,
              role,
              status: "invited",
              mfaEnabled: false,
              twoFactorRequired: false,
              clientAccessIds: inv.clientRestrictions ?? [],
              lastLoginAt: null,
              createdAt: inv.createdAt || new Date().toISOString(),
              invitationExpired: new Date(inv.expiresAt).getTime() < Date.now(),
            });
            seenEmails.add(inv.email.toLowerCase());
          }
        }

        const clients = (companyDetail.clients || []).map((c) => ({ id: c.id, name: c.name }));
        const owner = toOwner(companyDetail.ownerEmail, companyDetail.ownerOnboarding, ownerInviteUrl(companyDetail));

        return { users, clients, owner };
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getUsers(id);
        throw err;
      }
    },

    async getClients(id: string): Promise<CompanyClientsData> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getClients(id);
      }

      try {
        const [clientsRes, usersData] = await Promise.all([
          apiClient.request<{ items: Array<{ id: string; name: string; createdAt: string; website?: string | null; status?: string; logo?: any }> }>({
            method: "GET",
            path: "/super-admin/clients",
            query: { companyId: id, limit: 100 },
          }).catch(() => ({ items: [] })),
          this.getUsers(id).catch(() => ({ users: [], clients: [], owner: null as any })),
        ]);

        const clients: CompanyClient[] = clientsRes.items.map((c) => ({
          id: c.id,
          companyId: id,
          name: c.name,
          websiteUrl: c.website ?? null,
          status: (c.status?.toLowerCase() as any) ?? "active",
          connectedChannels: [],
          brokenChannels: [],
          scheduledPosts: 0,
          failedPosts: 0,
          leadsLast30Days: 0,
          createdAt: c.createdAt,
          lastActivityAt: c.createdAt,
          logo: c.logo ?? null,
        }));

        const members: Record<string, string[]> = {};
        for (const c of clients) {
          members[c.id] = usersData.users
            .filter((u) => u.role === "owner" || u.role === "admin" || u.clientAccessIds.includes(c.id))
            .map((u) => u.name);
        }

        return { clients, members };
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getClients(id);
        throw err;
      }
    },

    async getSubscription(id: string): Promise<CompanySubscriptionData> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getSubscription(id);
      }

      try {
        const [subs, fallbackSub] = await Promise.all([
          apiClient.request<any[]>({
            method: "GET",
            path: "/super-admin/subscriptions",
            query: { companyId: id },
          }).catch(() => []),
          fallback.getSubscription(id),
        ]);

        const sub = subs?.[0];
        if (!sub) return fallbackSub;

        const tierName = (sub.plan?.name?.toLowerCase() as PlanTier) || "starter";
        const cycle = (sub.billingCycle?.toLowerCase() as any) || "monthly";

        const updatedSub: CompanySubscription = {
          ...fallbackSub.subscription,
          id: sub.id,
          companyId: id,
          planTier: tierName,
          billingCycle: cycle,
          status: (sub.status?.toLowerCase() as any) ?? "active",
          currentPeriodStart: sub.currentPeriodStart ?? fallbackSub.subscription.currentPeriodStart,
          renewsAt: sub.currentPeriodEnd ?? fallbackSub.subscription.renewsAt,
        };

        const plan = fallbackSub.plans.find((p) => p.tier === tierName || p.id === sub.planId) || fallbackSub.plan;

        return {
          ...fallbackSub,
          subscription: updatedSub,
          plan,
          mrrMinor: (sub.plan?.monthlyPrice ?? 1900) * 100,
        };
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getSubscription(id);
        throw err;
      }
    },

    async getBilling(id: string): Promise<CompanyBillingData> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getBilling(id);
      }

      try {
        const [invRes, fallbackBilling] = await Promise.all([
          apiClient.request<{ items?: any[] } | any[]>({
            method: "GET",
            path: "/super-admin/subscriptions/invoices",
            query: { companyId: id },
          }).catch(() => ({ items: [] })),
          fallback.getBilling(id),
        ]);

        const rawInvoices = Array.isArray(invRes) ? invRes : invRes.items || [];
        if (rawInvoices.length === 0) return fallbackBilling;

        const invoices: CompanyInvoice[] = rawInvoices.map((inv) => ({
          id: inv.id,
          companyId: id,
          number: inv.invoiceNumber ?? inv.id.slice(0, 8).toUpperCase(),
          periodStart: inv.periodStart ?? inv.createdAt,
          periodEnd: inv.periodEnd ?? inv.createdAt,
          issuedAt: inv.createdAt,
          dueAt: inv.dueAt ?? inv.createdAt,
          amountMinor: inv.totalMinor ?? (inv.amount ? inv.amount * 100 : fallbackBilling.summary.mrrMinor),
          currency: "INR",
          status: (inv.status?.toLowerCase() as any) ?? "paid",
          paymentStatus: (inv.status?.toLowerCase() === "paid" ? "paid" : "pending") as any,
          description: inv.description ?? "Subscription invoice",
          paymentId: inv.paymentId ?? null,
        }));

        return {
          ...fallbackBilling,
          invoices,
          summary: {
            ...fallbackBilling.summary,
            outstandingMinor: invoices.filter((i) => i.status === "open").reduce((sum, i) => sum + i.amountMinor, 0),
            invoiceCount: invoices.length,
          },
        };
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getBilling(id);
        throw err;
      }
    },

    /**
     * GET /super-admin/usage/companies/:id — real metered rows, plan limits,
     * resolved utilisation and active overrides. Unreachable backend -> demo
     * usage (documented fallback); a real-but-empty result stays honest.
     */
    async getUsage(id: string): Promise<CompanyUsageSummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getUsage(id);
      }

      try {
        const detail = await apiClient.request<BackendUsageDetail>({
          method: "GET",
          path: `/super-admin/usage/companies/${encodeURIComponent(id)}`,
        });
        return toUsageSummary(id, detail);
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getUsage(id);
        throw err;
      }
    },

    /**
     * GET /super-admin/usage/trend — the backend serves 7d/30d/90d buckets, so
     * the requested range maps to the nearest bucket. No history for the window
     * renders as an empty series, never a fabricated one.
     */
    async getUsageHistory(id: string, resource, range): Promise<UsageHistory> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getUsageHistory(id, resource, range);
      }

      try {
        const from = Date.parse(range.from);
        const to = Date.parse(range.to);
        const days = Number.isFinite(from) && Number.isFinite(to) && to >= from ? Math.ceil((to - from) / 86_400_000) : 30;
        const period = days <= 7 ? "7d" : days <= 30 ? "30d" : "90d";
        const trend = await apiClient.request<{ points: Array<{ at: string; value: number }> | null }>({
          method: "GET",
          path: "/super-admin/usage/trend",
          query: { resource, period, companyId: id },
        });
        const def = USAGE_RESOURCE_BY_KEY[resource];
        return {
          resource,
          unit: def?.unit ?? resource,
          kind: def?.kind ?? "level",
          limit: null,
          points: (trend.points ?? []).map((point) => ({ date: point.at.slice(0, 10), value: point.value })),
        };
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getUsageHistory(id, resource, range);
        throw err;
      }
    },

    /**
     * GET /super-admin/companies/:id/integrations — real connected accounts.
     * Scopes and dependent modules are not stored by the backend, so they stay
     * empty ("not recorded") instead of being invented; state and permission
     * health are derived from the row's lifecycle status.
     */
    async getIntegrations(id: string): Promise<CompanyIntegrationsData> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getIntegrations(id);
      }

      try {
        const items = await apiClient.request<SuperAdminCompanyIntegration[]>({
          method: "GET",
          path: `/super-admin/companies/${encodeURIComponent(id)}/integrations`,
        });
        const integrations: CompanyIntegration[] = items.map((row) => {
          const provider = row.provider.toLowerCase() as IntegrationProvider;
          return {
            id: row.id,
            companyId: row.companyId,
            provider,
            accountName: row.accountName || row.accountEmail || provider,
            clientId: row.clients[0]?.id ?? null,
            clientName: row.clients[0]?.name ?? null,
            state: INTEGRATION_STATE_BY_STATUS[row.status] ?? "sync_failure",
            permissionHealth: PERMISSION_HEALTH_BY_STATUS[row.status] ?? "partial",
            scopes: [],
            lastSyncAt: row.updatedAt,
            tokenExpiresAt: row.tokenExpiresAt,
            dependentModules: [],
            lastError: null,
          };
        });
        return { integrations, counts: countIntegrations(integrations) };
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getIntegrations(id);
        throw err;
      }
    },

    async getActivity(id: string, filter: ActivityFilter): Promise<CompanyActivityData> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getActivity(id, filter);
      }

      try {
        const [res, fallbackActivity] = await Promise.all([
          apiClient.request<{ items: any[] }>({
            method: "GET",
            path: "/super-admin/user-insights/activity",
            query: { companyId: id, limit: 50 },
          }).catch(() => ({ items: [] })),
          fallback.getActivity(id, filter),
        ]);

        if (!res.items || res.items.length === 0) return fallbackActivity;

        const entries: CompanyActivity[] = res.items.map((item) => ({
          id: item.id,
          companyId: id,
          at: item.at,
          actor: {
            id: item.actor?.userId ?? "system",
            name: item.actor?.name || item.actor?.email || "Platform Admin",
            type: item.actor ? "staff" : "system",
          },
          action: item.action,
          summary: item.label ?? item.action,
          module: (item.module as any) ?? "company",
          entity: {
            type: item.resourceType ?? "company",
            id: item.resourceId ?? id,
            label: item.resourceLabel ?? "Company",
          },
          severity: "info",
          result: "success",
          previousValue: null,
          newValue: null,
          reason: null,
          correlationId: null,
        }));

        const actors = [...new Set(entries.map((e) => e.actor.name))];
        const events = [...new Set(entries.map((e) => e.summary))];

        return {
          entries,
          total: entries.length,
          actors,
          events,
        };
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getActivity(id, filter);
        throw err;
      }
    },

    async getSecurity(id: string): Promise<CompanySecurityData> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getSecurity(id);
      }

      try {
        const [usersData, fallbackSecurity, companyDetail] = await Promise.all([
          this.getUsers(id),
          fallback.getSecurity(id),
          apiClient.request<SuperAdminCompanyDetailResponse>({
            method: "GET",
            path: `/super-admin/companies/${encodeURIComponent(id)}`,
          }).catch(() => null),
        ]);

        const totalUsers = usersData.users.length;
        const withTwoFactor = usersData.users.filter((u) => u.mfaEnabled).length;
        const percent = totalUsers > 0 ? Math.round((withTwoFactor / totalUsers) * 100) : 100;
        const adminsWithout2fa = usersData.users.filter((u) => (u.role === "owner" || u.role === "admin") && !u.mfaEnabled);

        const secSettings = (companyDetail?.securitySettings ?? null) as Record<string, unknown> | null;
        const is2faRequired = Boolean(secSettings?.require2FAForAllMembers || secSettings?.require2fa);
        const isLocked = companyDetail?.status === "ARCHIVED";

        const bundle = findBundle(id);
        const bundleEvents = bundle?.security?.events ?? [];
        const allEvents = [...bundleEvents, ...(fallbackSecurity.security.events || [])].slice(0, 50);

        const warnings = computeSecurityWarnings(
          {
            ...fallbackSecurity,
            users: usersData.users,
          } as any,
          usersData.owner,
        );

        return {
          ...fallbackSecurity,
          owner: usersData.owner,
          users: usersData.users,
          warnings,
          adoption: {
            totalUsers,
            withTwoFactor,
            percent,
            adminsWithout2fa,
          },
          security: {
            ...fallbackSecurity.security,
            policies: {
              ...fallbackSecurity.security.policies,
              require2fa: is2faRequired || fallbackSecurity.security.policies.require2fa,
            },
            accessLock: isLocked
              ? bundle?.security?.accessLock ?? {
                  lockedAt: companyDetail?.createdAt || new Date().toISOString(),
                  lockedBy: "Super Admin",
                  reason: "Access locked by administrator",
                }
              : null,
            passwordResetRequestedAt: bundle?.security?.passwordResetRequestedAt ?? null,
            sessionRevocationRequestedAt: bundle?.security?.sessionRevocationRequestedAt ?? null,
            events: allEvents,
          },
        };
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getSecurity(id);
        throw err;
      }
    },

    async getOverview(id: string): Promise<CompanyOverviewData> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.getOverview(id);
      }

      try {
        const [summary, subData, usage, activity, fallbackOverview] = await Promise.all([
          this.getCompany(id),
          this.getSubscription(id),
          this.getUsage(id),
          this.getActivity(id, {}),
          fallback.getOverview(id),
        ]);

        return {
          ...fallbackOverview,
          summary,
          subscription: subData.subscription,
          usage,
          recentActivity: activity.entries.slice(0, 10),
        };
      } catch (err) {
        if (shouldFallBack(err)) return fallback.getOverview(id);
        throw err;
      }
    },

    /**
     * PUT /super-admin/subscriptions/:id/plan with the resolved Plan UUID. The
     * backend applies a change immediately — a scheduled effective date has no
     * endpoint, so it fails honestly instead of pretending to schedule.
     */
    async changePlan(id: string, input: ChangePlanInput, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.changePlan(id, input, actor);
      }

      const subscription = await fetchCompanySubscription(id);
      if (!subscription) {
        throw new Error("This company has no subscription to change. Nothing was changed.");
      }
      const planId = await resolvePlanId(input.planTier);
      await apiClient.request({
        method: "PUT",
        path: `/super-admin/subscriptions/${encodeURIComponent(subscription.id)}/plan`,
        body: {
          planId,
          billingCycle: input.billingCycle.toLowerCase() === "annual" ? "ANNUAL" : "MONTHLY",
        },
      });
      return this.getCompany(id);
    },

    async changeBillingCycle(id: string, input: { billingCycle: "monthly" | "annual"; reason: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.changeBillingCycle(id, input, actor);
      }

      const subscription = await fetchCompanySubscription(id);
      if (!subscription) {
        throw new Error("This company has no subscription to change. Nothing was changed.");
      }
      await apiClient.request({
        method: "PUT",
        path: `/super-admin/subscriptions/${encodeURIComponent(subscription.id)}/plan`,
        body: {
          planId: subscription.planId,
          billingCycle: input.billingCycle === "annual" ? "ANNUAL" : "MONTHLY",
        },
      });
      return this.getCompany(id);
    },

    /**
     * PUT /super-admin/subscriptions/:id/cancel cancels IMMEDIATELY on the
     * backend (status -> CANCELED); there is no end-of-term scheduling, so that
     * timing fails honestly rather than cancelling early.
     */
    async scheduleCancellation(id: string, input: { reason: string; timing?: "end_of_term" | "immediate" }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.scheduleCancellation(id, input, actor);
      }
      if (input.timing === "end_of_term") {
        unsupported("End-of-term cancellation scheduling (the backend only cancels immediately)");
      }

      const subscription = await fetchCompanySubscription(id);
      if (!subscription) {
        throw new Error("This company has no subscription to cancel. Nothing was changed.");
      }
      await apiClient.request({
        method: "PUT",
        path: `/super-admin/subscriptions/${encodeURIComponent(subscription.id)}/cancel`,
      });
      return this.getCompany(id);
    },

    async reactivateSubscription(id: string, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.reactivateSubscription(id, actor);
      }

      const subscription = await fetchCompanySubscription(id);
      if (!subscription) {
        throw new Error("This company has no subscription to reactivate. Nothing was changed.");
      }
      await apiClient.request({
        method: "PUT",
        path: `/super-admin/subscriptions/${encodeURIComponent(subscription.id)}/reactivate`,
      });
      return this.getCompany(id);
    },

    /** POST /super-admin/usage/overrides with the company's subscription row. */
    async applyUsageOverride(id: string, input: UsageOverrideInput, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.applyUsageOverride(id, input, actor);
      }

      const subscription = await fetchCompanySubscription(id);
      if (!subscription) {
        throw new Error("This company has no subscription, so a usage override cannot be granted. Nothing was changed.");
      }
      const additive = input.rule === "additive";
      await apiClient.request({
        method: "POST",
        path: "/super-admin/usage/overrides",
        body: {
          subscriptionId: subscription.id,
          companyId: id,
          resource: input.resource,
          rule: additive ? "additive" : "absolute",
          amount: additive ? input.delta ?? 0 : input.overrideLimit,
          startsAt: input.startsAt,
          expiresAt: input.expiresAt,
          reason: input.reason,
          approvedBy: input.approvedBy || actor.name,
        },
      });
      return this.getCompany(id);
    },

    async revokeOverride(id: string, overrideId: string, input: { reason: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.revokeOverride(id, overrideId, input, actor);
      }

      await apiClient.request({
        method: "POST",
        path: `/super-admin/usage/overrides/${encodeURIComponent(overrideId)}/revoke`,
        body: { reason: input.reason },
      });
      return this.getCompany(id);
    },

    async setUserStatus(id: string, userId: string, status: "active" | "suspended", actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.setUserStatus(id, userId, status, actor);
      }

      // `userId` is the membership id for real rows; suspending a membership is
      // per-company, so it must never escalate to deactivating the platform
      // account. An id the backend does not know (e.g. a pending invitation)
      // surfaces its own 404 instead of a misleading success.
      if (status === "suspended") {
        await superAdminUsersApi.suspendMembership(userId, "Suspended by Super Admin");
      } else {
        await superAdminUsersApi.reactivateMembership(userId);
      }
      return this.getCompany(id);
    },

    async requirePasswordReset(id: string, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.requirePasswordReset(id, actor);
      }

      const usersData = await this.getUsers(id);
      let count = 0;
      for (const u of usersData.users) {
        if (u.platformUserId && UUID_PATTERN.test(u.platformUserId)) {
          try {
            await superAdminUsersApi.passwordReset(u.platformUserId);
            count++;
          } catch (err) {
            console.warn("Password reset failed for user", u.email, err);
          }
        }
      }
      try {
        const bundle = ensureBundle(id, id);
        bundle.security.passwordResetRequestedAt = new Date().toISOString();
        bundle.security.events.unshift({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          companyId: id,
          at: new Date().toISOString(),
          type: "password_reset",
          severity: "info",
          summary: `Password reset requested for ${count || 1} user(s)`,
          actorLabel: actor.name,
        });
        writeBundle(bundle);
      } catch {}
      return this.getCompany(id);
    },

    async revokeSessions(id: string, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.revokeSessions(id, actor);
      }

      const usersData = await this.getUsers(id);
      let count = 0;
      for (const u of usersData.users) {
        if (u.platformUserId && UUID_PATTERN.test(u.platformUserId)) {
          try {
            await superAdminUsersApi.revokeSessions(u.platformUserId);
            count++;
          } catch (err) {
            console.warn("Revoke sessions failed for user", u.email, err);
          }
        }
      }
      try {
        const bundle = ensureBundle(id, id);
        bundle.security.sessionRevocationRequestedAt = new Date().toISOString();
        bundle.security.events.unshift({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          companyId: id,
          at: new Date().toISOString(),
          type: "session_revocation",
          severity: "warning",
          summary: `All active sessions revoked for ${count || 1} user(s)`,
          actorLabel: actor.name,
        });
        writeBundle(bundle);
      } catch {}
      return this.getCompany(id);
    },

    /**
     * POST /super-admin/companies/:companyId/transfer-ownership. The picker
     * hands over a CompanyUser id, which IS the membership id for real rows;
     * the previous Owner becomes an Admin (the backend default).
     */
    async transferOwnership(id: string, input: { newOwnerUserId: string; note: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) {
        return fallback.transferOwnership(id, input, actor);
      }

      const usersData = await this.getUsers(id);
      const oldOwner = usersData.users.find((u) => u.role === "owner");
      if (!input.newOwnerUserId) {
        throw new Error("Select the new owner first. Nothing was changed.");
      }
      if (oldOwner && oldOwner.id === input.newOwnerUserId) {
        throw new Error("That member is already the owner. Nothing was changed.");
      }
      await superAdminUsersApi.transferOwnership(id, {
        fromMembershipId: oldOwner?.id ?? input.newOwnerUserId,
        toMembershipId: input.newOwnerUserId,
        previousOwnerRole: oldOwner ? "ADMIN" : undefined,
        reason: input.note || undefined,
      });
      return this.getCompany(id);
    },

    /* ---------------------------------------------------------------- */
    /* Honest "no backend endpoint" failures                             */
    /* ---------------------------------------------------------------- */

    /** Trial length has no backend endpoint; the backend subscription starts ACTIVE on create. */
    async extendTrial(id: string, input: { days: number; reason: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) return fallback.extendTrial(id, input, actor);
      unsupported("Extending a trial");
    },

    async convertTrialToPaid(id: string, input: { billingCycle: "monthly" | "annual" }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) return fallback.convertTrialToPaid(id, input, actor);
      unsupported("Converting a trial to paid (subscriptions are created active)");
    },

    async endTrial(id: string, input: { reason: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) return fallback.endTrial(id, input, actor);
      unsupported("Ending a trial");
    },

    async cancelScheduledChange(id: string, input: { target: "plan_change" | "cancellation"; reason: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) return fallback.cancelScheduledChange(id, input, actor);
      unsupported("Cancelling a scheduled change (the backend has no scheduled changes)");
    },

    async rescheduleChange(id: string, input: { effectiveAt: string; reason: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) return fallback.rescheduleChange(id, input, actor);
      unsupported("Rescheduling a change (the backend has no scheduled changes)");
    },

    async migratePlanVersion(id: string, input: { version: number; reason: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) return fallback.migratePlanVersion(id, input, actor);
      unsupported("Plan version migration");
    },

    async requireUserTwoFactor(id: string, userId: string, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) return fallback.requireUserTwoFactor(id, userId, actor);
      unsupported("Requiring 2FA for a user");
    },

    async requireCompanyTwoFactor(id: string, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) return fallback.requireCompanyTwoFactor(id, actor);
      await apiClient.request({
        method: "PATCH",
        path: `/super-admin/companies/${encodeURIComponent(id)}`,
        body: { require2fa: true },
      });
      try {
        const bundle = ensureBundle(id, id);
        bundle.security.policies.require2fa = true;
        bundle.security.events.unshift({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          companyId: id,
          at: new Date().toISOString(),
          type: "policy_changed",
          severity: "info",
          summary: "Company-wide two-factor authentication requirement enabled",
          actorLabel: actor.name,
        });
        writeBundle(bundle);
      } catch {}
      return this.getCompany(id);
    },

    async setAccessLock(id: string, input: { locked: boolean; reason: string }, actor): Promise<CompanySummary> {
      if (!UUID_PATTERN.test(id)) return fallback.setAccessLock(id, input, actor);
      await apiClient.request({
        method: "PATCH",
        path: `/super-admin/companies/${encodeURIComponent(id)}`,
        body: { status: input.locked ? "ARCHIVED" : "ACTIVE" },
      });
      try {
        const bundle = ensureBundle(id, id);
        bundle.company.accountStatus = input.locked ? "suspended" : "active";
        bundle.security.accessLock = input.locked ? { lockedAt: new Date().toISOString(), lockedBy: actor.name, reason: input.reason } : null;
        bundle.security.events.unshift({
          id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          companyId: id,
          at: new Date().toISOString(),
          type: "access_locked",
          severity: input.locked ? "critical" : "info",
          summary: input.locked ? `Company access locked: ${input.reason}` : "Company access unlocked",
          actorLabel: actor.name,
        });
        writeBundle(bundle);
      } catch {}
      return this.getCompany(id);
    },
  };
}
