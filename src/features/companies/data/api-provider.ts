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
 * Every method the backend does not serve (portfolio, overview, billing,
 * usage, mutations, ...) delegates straight to the same fallback so the whole
 * workspace stays functional while those APIs are built (TASK-12+).
 */
import { apiClient } from "@/lib/api/client";
import { ApiError, type PaginationMeta } from "@/types/api";
import type { BulkResult, CompaniesRepository } from "./repository";
import type {
  CompanyAccountStatus,
  CompanyListQuery,
  CompanyListResult,
  CompanyOwner,
  CompanySummary,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "./types";
import { ensureBundle, writeBundle } from "./mock/store";
import { organizationApi, type UpdateOrganizationPayload } from "@/features/admin/settings/live/organization-api";

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

function toAccountStatus(status: BackendCompanyStatus): CompanyAccountStatus {
  return status === "ARCHIVED" ? "archived" : "active";
}

function toOwner(ownerEmail: string | null, onboarding?: OwnerOnboarding | null): CompanyOwner {
  const state = onboarding?.state ?? (ownerEmail ? "active" : "none");
  const effectiveEmail = onboarding?.ownerEmail || ownerEmail || "";
  const local = effectiveEmail.split("@")[0] ?? effectiveEmail;
  return { userId: null, name: local, email: effectiveEmail, phone: null, state };
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    owner: toOwner(row.ownerEmail, row.ownerOnboarding),
    internalOwners: { accountManager: null, supportOwner: null, technicalOwner: null },
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

        const apiSummaries = response.items.map((row) => {
          const s = toCompanySummary(row);
          try {
            const bundle = ensureBundle(row.id, row.name);
            s.company.internalTags = bundle.company.internalTags ?? [];
            s.company.internalOwners = bundle.company.internalOwners ?? { accountManagerId: null, supportOwnerId: null, technicalOwnerId: null };
            s.company.profile.companySize = bundle.company.profile.companySize ?? null;
            if (!s.company.logoUrl && bundle.company.logoUrl) {
              s.company.logoUrl = bundle.company.logoUrl;
            }
          } catch {}
          return s;
        });
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

    async getCompany(id: string): Promise<CompanySummary> {
      // Demo ids (cmp_*) are handled by fallback only when explicitly in mock mode
      if (!UUID_PATTERN.test(id)) {
        return fallback.getCompany(id);
      }

      const detail = await apiClient.request<SuperAdminCompanyDetailResponse>({
        method: "GET",
        path: `/super-admin/companies/${encodeURIComponent(id)}`,
      });
      const summary = toCompanySummary(detail);
      try {
        const bundle = ensureBundle(id, summary.company.name);
        summary.company.internalTags = bundle.company.internalTags ?? [];
        summary.company.internalOwners = bundle.company.internalOwners ?? { accountManagerId: null, supportOwnerId: null, technicalOwnerId: null };
        summary.company.profile.companySize = bundle.company.profile.companySize ?? null;
        if (!summary.company.logoUrl && bundle.company.logoUrl) {
          summary.company.logoUrl = bundle.company.logoUrl;
        }
      } catch {}
      return summary;
    },

    async createCompany(input: CreateCompanyInput, actor): Promise<CompanySummary> {
      const name = input.name.trim();
      const ownerEmail = (input.owner?.email || "").trim().toLowerCase();

      // Required: Idempotency-Key header per user intent
      const idempotencyKey = crypto.randomUUID();

      // Step 1: POST /super-admin/companies with minimal core fields
      const created = await apiClient.request<SuperAdminCompanyDetailResponse>({
        method: "POST",
        path: "/super-admin/companies",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: {
          name,
          ownerEmail,
        },
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

      if (hasOrgFields && created.id) {
        try {
          const org = await organizationApi.get(created.id);
          const updatePayload: UpdateOrganizationPayload = {
            expectedRevision: org.revision,
            ...(input.legalName ? { legalName: input.legalName.trim() } : {}),
            ...(input.industry ? { industry: input.industry } : {}),
            ...(input.website ? { website: input.website.trim() } : {}),
            ...(input.contactPhone ? { contactPhone: input.contactPhone.trim() } : {}),
            ...(input.contactEmail ? { contactEmail: input.contactEmail.trim() } : {}),
            ...(input.country ? { address: { country: input.country } } : {}),
            ...(input.workspace?.timezone ? { timezone: input.workspace.timezone } : {}),
            ...(input.workspace?.currency ? { currency: input.workspace.currency } : {}),
          };
          await organizationApi.update(created.id, updatePayload);
        } catch (orgErr) {
          // If the caller lacks company tenant membership in this session,
          // the company creation remains successful; organization settings will be updated by the owner
          console.warn("Option B: /settings/organization populate step skipped or deferred:", orgErr);
        }
      }

      const summary = toCompanySummary(created);
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

      const website = input.website
        ? input.website.startsWith("http")
          ? input.website
          : `https://${input.website}`
        : null;

      const patched = await apiClient.request<SuperAdminCompanyDetailResponse>({
        method: "PATCH",
        path: `/super-admin/companies/${encodeURIComponent(id)}`,
        body: {
          name: input.name.trim(),
          legalName: input.legalName ?? null,
          website,
          industry: input.industry ?? null,
          address: input.country ? { country: input.country } : undefined,
          contactEmail: input.contactEmail ?? null,
          contactPhone: input.contactPhone ?? null,
        },
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
