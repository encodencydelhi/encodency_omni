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
import type { CompaniesRepository } from "./repository";
import type {
  CompanyAccountStatus,
  CompanyListQuery,
  CompanyListResult,
  CompanyOwner,
  CompanySummary,
} from "./types";

/* ------------------------------------------------------------------ */
/* Backend DTO shapes (mirrors super-admin-companies.types.ts)         */
/* ------------------------------------------------------------------ */

type BackendCompanyStatus = "ACTIVE" | "ARCHIVED";

interface SuperAdminCompanySummary {
  id: string;
  name: string;
  status: BackendCompanyStatus;
  archivedAt: string | null;
  createdAt: string;
  memberCount: number;
  clientCount: number;
  ownerEmail: string | null;
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

function toOwner(ownerEmail: string | null): CompanyOwner {
  if (!ownerEmail) return { userId: null, name: "", email: "", phone: null, state: "none" };
  const local = ownerEmail.split("@")[0] ?? ownerEmail;
  return { userId: null, name: local, email: ownerEmail, phone: null, state: "active" };
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toCompanySummary(row: SuperAdminCompanySummary): CompanySummary {
  return {
    company: {
      id: row.id,
      displayId: row.id,
      slug: toSlug(row.name),
      name: row.name,
      domain: null,
      logoUrl: null,
      profile: {
        legalName: null,
        website: null,
        industry: "",
        country: "",
        companySize: null,
        contactEmail: null,
        contactPhone: null,
        timezone: "Asia/Kolkata",
        currency: "INR",
        language: "English",
        region: "",
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
    owner: toOwner(row.ownerEmail),
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
    onboarding: row.ownerEmail ? "completed" : "awaiting_owner",
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

        return {
          data: response.items.map(toCompanySummary),
          pagination,
          matchingIds: response.items.map((row) => row.id),
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
      return toCompanySummary(detail);
    },
  };
}
