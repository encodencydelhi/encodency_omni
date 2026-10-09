/**
 * Real HTTP provider for the Super Admin Companies workspace.
 *
 * Wired in `repository.ts` when `NEXT_PUBLIC_DATA_SOURCE=api`. Reads the two
 * endpoints the backend actually serves today:
 *
 *   GET /api/v1/super-admin/companies      (list: page, limit, search, status)
 *   GET /api/v1/super-admin/companies/:id  (detail)
 *
 * The backend only knows a handful of the fields this UI renders (name,
 * status, dates, member/client counts, owner email). Everything it does not
 * serve is mapped to an explicit "not recorded / not assessed" default rather
 * than a plausible-looking invention, so a real row never masquerades as a
 * fully-populated demo record.
 *
 * Fallback policy (owner decision, 2026-09-24): when the backend is
 * unreachable (network / 5xx), the id does not exist there (404 / non-UUID
 * demo id), or the list comes back empty, the injected `fallback` provider
 * (the demo dataset) answers instead — "if there is no data, show the mock".
 * 401/403/429 and validation errors still propagate: an authorization or
 * contract problem must surface, not quietly swap in demo rows.
 *
 * `getPortfolio()` has no stats endpoint either, so it pages the list endpoint
 * to the end and derives the KPIs with the same `computePortfolio()` the demo
 * provider uses. Billing-derived numbers (MRR, trialing, past due) stay at
 * their honest zero until the backend serves subscription data.
 *
 * Every other method the backend does not serve (overview, billing, usage,
 * mutations, ...) delegates straight to the fallback so the whole workspace
 * stays functional while those APIs are built (TASK-12+).
 */
import { apiClient } from "@/lib/api/client";
import { ApiError, type PaginationMeta } from "@/types/api";
import type { BulkResult, CompaniesRepository } from "./repository";
import { commercialContext } from "@/features/plans-subscriptions/data/mock/plan-store";
import { platformNow } from "./clock";
import { STAFF } from "./mock/dataset";
import { computePortfolio, type DerivationContext } from "./selectors";
import type {
  CompanyAccountStatus,
  CompanyListQuery,
  CompanyListResult,
  CompanyOwner,
  CompanySummary,
  CreateCompanyInput,
  PortfolioSummary,
  UpdateCompanyInput,
} from "./types";
import { ensureBundle, writeBundle } from "./mock/store";
import { PLAN_TIER, type PlanTier } from "@/types/domain/plan";
import { organizationApi, type UpdateOrganizationPayload } from "@/features/admin/settings/live/organization-api";
import { countryToIso } from "./config";
import { superAdminCompaniesApi } from "../live/super-admin-companies-api";

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
  address?: any;
  taxId?: string | null;
  timezone?: string | null;
  currency?: string | null;
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
  members: Array<{ membershipId: string; email: string; systemRole: string }>;
  clients: Array<{ id: string; name: string; createdAt: string }>;
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

function toCompanySummary(row: SuperAdminCompanySummary): CompanySummary {
  const address = (row.address as Record<string, string> | null) || {};
  const website = row.website ?? null;
  const domain = website ? website.replace(/^https?:\/\//i, "").split("/")[0] : null;
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
        country: address.country ?? "",
        companySize: null,
        contactEmail: row.contactEmail ?? null,
        contactPhone: row.contactPhone ?? null,
        timezone: row.timezone ?? "Asia/Kolkata",
        currency: row.currency ?? "INR",
        language: "English",
        region: address.state ?? "",
      },
      accountStatus: toAccountStatus(row.status),
      suspension: null,
      archivedAt: row.archivedAt,
      ownerUserId: null,
      internalOwners: { accountManagerId: null, supportOwnerId: null, technicalOwnerId: null },
      internalTags: [],
      createdAt: row.createdAt,
      // The backend reports no activity stream yet; creation time is the only
      // truthful anchor available rather than a fabricated "last seen".
      lastActiveAt: row.createdAt,
      isDemoCreated: false,
    },
    plan: { tier: "starter", name: "Starter", billingCycle: "monthly" },
    subscriptionStatus: "active",
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
    internalOwners: { accountManager: null, supportOwner: null, technicalOwner: null },
  };
}

/** Maps a backend row and overlays the local-only bundle fields (tags, owners, size, logo). */
function mapApiRow(row: SuperAdminCompanySummary): CompanySummary {
  const summary = toCompanySummary(row);
  try {
    const bundle = ensureBundle(row.id, row.name);
    summary.company.internalTags = bundle.company.internalTags ?? [];
    summary.company.internalOwners = bundle.company.internalOwners ?? { accountManagerId: null, supportOwnerId: null, technicalOwnerId: null };
    summary.company.profile.companySize = bundle.company.profile.companySize ?? null;
    if (!summary.company.logoUrl && bundle.company.logoUrl) {
      summary.company.logoUrl = bundle.company.logoUrl;
    }
  } catch {}
  return summary;
}

/** Derivation context for portfolio KPIs — the currency is the only plan data `computePortfolio` reads. */
function portfolioContext(): DerivationContext {
  return { now: platformNow(), staff: STAFF, ...commercialContext() };
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
      const page = query.page ?? 1;
      const limit = Math.min(Math.max(query.pageSize ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
      const status = toBackendStatus(query.accountStatus);
      const search = query.search?.trim() || undefined;

      try {
        const response = await apiClient.request<SuperAdminCompanyListResponse>({
          method: "GET",
          path: "/super-admin/companies",
          query: {
            page,
            limit,
            ...(search ? { search } : {}),
            ...(status ? { status } : {}),
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

        return {
          data: combined,
          pagination: {
            ...pagination,
            total: pagination.total + demoCreated.length,
          },
          matchingIds: combined.map((row) => row.company.id),
        };
      } catch (error) {
        throw error;
      }
    },

    /**
     * No stats endpoint: page the list endpoint to the end and derive the KPIs
     * from the real rows, so the strip matches the table below it. Unreachable
     * or empty backend → demo portfolio (the documented fallback policy).
     */
    async getPortfolio(): Promise<PortfolioSummary> {
      const apiSummaries = await fetchAllSummaries();
      if (apiSummaries.length === 0) return fallback.getPortfolio();

      let demoCreated: CompanySummary[] = [];
      try {
        demoCreated = (await fallback.exportCompanies({})).filter((c) => c.company.isDemoCreated);
      } catch {
        // ignore fallback failures
      }

      return computePortfolio(portfolioContext(), [...demoCreated, ...apiSummaries]);
    },

    async getCompany(id: string): Promise<CompanySummary> {
      // Demo ids (cmp_*) are handled by fallback only when explicitly in mock mode
      if (!UUID_PATTERN.test(id)) {
        return fallback.getCompany(id);
      }

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

      // Decision 2: name/status are Company administration fields;
      // legalName, industry, website, contact, address, taxId, timezone, currency remain Organization Profile fields.
      const name = input.name?.trim();
      const body: Record<string, any> = {};
      if (name) body.name = name;

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
            updated.push(id);
          } catch (e) {
            skipped.push({ id, name: id, reason: e instanceof Error ? e.message : "Failed to reactivate" });
          }
        }
      }
      return { updated, skipped };
    },
  };
}
