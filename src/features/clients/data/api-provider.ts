import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { ClientsRepository, LifecycleAction } from "./repository";
import type { ClientListQuery, ClientListResult, ClientSummary, ClientWebsite, CreateClientInput, UpdateClientInput, BulkResult, ClientCompanySlot, ClientCreationCompany, EligibleMember, MutationActor, ClientTeamData, ClientAssignmentView, ClientOverviewData, ClientChannelsData, ClientWebsiteData, ClientActivityData, ClientActivityFilter, ClientSettingsData, ClientPortfolio, ClientFacets, ClientAccessLevel, OnboardingStepKey } from "./types";
import type { OrganisationRole } from "@/types/domain/user";
import type { CompanyClient } from "@/features/companies/data/types";
import { unavailableClientsProvider } from "./unavailable-provider";
import { toListQuery } from "@/lib/api/transport";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ensureBundle, writeBundle } from "@/features/companies/data/mock/store";
import { clientsApi, type ClientRecord } from "@/features/admin/projects/live/clients-api";
import { superAdminCompaniesApi } from "@/features/companies/live/super-admin-companies-api";

function getCompanyIdHeader(): string {
  return getStoredCompanyId();
}

function isSuperAdminRoute(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/super-admin/");
}

async function getSuperAdminWorkspace(id: string): Promise<{
  summary: ClientSummary;
  overview: ClientOverviewData;
  team: ClientTeamData;
  channels: ClientChannelsData;
  websiteSeo: ClientWebsiteData;
  activity: ClientActivityData;
  settings: ClientSettingsData;
}> {
  return superAdminCompaniesApi.getClientWorkspace(id);
}

type ClientWorkspace = Awaited<ReturnType<typeof getSuperAdminWorkspace>>;

async function getCompanyWorkspace(companyId: string, clientId: string): Promise<ClientWorkspace> {
  return clientsApi.getWorkspace<ClientWorkspace>(companyId, clientId);
}

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: "en",
  hindi: "hi",
  bengali: "bn",
  tamil: "ta",
  telugu: "te",
  marathi: "mr",
  gujarati: "gu",
  kannada: "kn",
  malayalam: "ml",
  punjabi: "pa",
  urdu: "ur",
  arabic: "ar",
  french: "fr",
  german: "de",
  spanish: "es",
  portuguese: "pt",
};

export function normalizeLanguageCode(lang?: string | null): string | undefined {
  if (!lang) return undefined;
  const trimmed = lang.trim().toLowerCase();
  if (LANGUAGE_NAME_TO_CODE[trimmed]) return LANGUAGE_NAME_TO_CODE[trimmed];
  if (/^[a-z]{2}$/.test(trimmed)) return trimmed;
  return undefined;
}

/** Converts backend ClientRecord into the full ClientSummary structure expected by the UI. */
function toClientSummary(raw: any, companyInfo?: { id: string; name: string }): ClientSummary {
  if (!raw) {
    throw new ApiError({ code: "NOT_FOUND", message: "Client not found", status: 404 });
  }
  if (raw.client && raw.company) {
    return raw as ClientSummary;
  }
  const id: string = raw.id ?? "";
  const name: string = raw.name ?? "Untitled Client";
  const industry: string = raw.industry ?? "Other";
  const website: string = raw.website ?? "";
  const targetAudience: string = raw.targetAudience ?? raw.description ?? "";
  const companyId: string = raw.companyId ?? companyInfo?.id ?? getCompanyIdHeader();
  const companyName: string = companyInfo?.name ?? raw.companyName ?? "Workspace Company";
  const createdAt: string = raw.createdAt ?? new Date().toISOString();
  const updatedAt: string = raw.updatedAt ?? createdAt;

  const websiteObj: ClientWebsite | null = website
    ? {
        id: `web_${id}_1`,
        clientId: id,
        companyId,
        url: website,
        domain: website.replace(/^https?:\/\//i, "").split("/")[0] || website,
        addedAt: createdAt,
        monitoring: "active",
        availability: "unknown",
        lastCheckedAt: null,
        lastCrawlAt: null,
        pagesDiscovered: null,
        criticalIssues: 0,
        warnings: 0,
        sitemap: "unknown",
        robots: "unknown",
        redirect: null,
        dataSource: "demo",
      }
    : null;

  const rawLogo = raw.logo ?? null;

  const companyClient: CompanyClient = {
    id,
    companyId,
    name,
    websiteUrl: website || null,
    status: "active",
    connectedChannels: [],
    brokenChannels: [],
    scheduledPosts: 0,
    failedPosts: 0,
    leadsLast30Days: 0,
    createdAt,
    lastActivityAt: updatedAt,
    logo: rawLogo,
  };

  return {
    client: companyClient,
    displayId: id,
    company: {
      id: companyId,
      name: companyName,
      slug: companyId,
      planTier: "growth",
      planName: "Growth",
      accountStatus: "active",
      subscriptionStatus: "active",
    },
    profile: {
      displayName: raw.displayName || name,
      industry,
      description: targetAudience,
      contactEmail: raw.contactEmail ?? null,
      contactPhone: raw.contactPhone ?? null,
      logoDataUrl: rawLogo?.url ?? null,
      logo: rawLogo,
      timezone: raw.timezone ?? "Asia/Kolkata",
      language: raw.language ?? "English",
      reportingPeriod: "30d",
      createdBy: "System",
      revision: raw.revision ?? 1,
    } as any,
    websites: websiteObj ? [websiteObj] : [],
    primaryWebsite: websiteObj,
    workspace: "active",
    onboarding: {
      status: "in_progress",
      requiredTotal: 5,
      requiredDone: 1,
      steps: [],
      blockedReason: null,
    },
    health: {
      status: "healthy",
      reason: "All operational parameters within expected thresholds.",
      factors: [],
    },
    attention: [],
    lead: raw.lead
      ? {
          membershipId: raw.lead.membershipId,
          name: raw.lead.name || raw.lead.email || "Client Lead",
        }
      : null,
    counts: {
      connections: 0,
      healthyConnections: 0,
      attentionConnections: 0,
      assigned: 0,
      activeMembers: 0,
      pendingMembers: 0,
      accessIssues: 0,
    },
    connectedProviders: [],
    operations: {
      scheduledPosts: 0,
      failedPosts: 0,
      processingJobs: 0,
      retryPending: 0,
      lastPublishedAt: null,
    },
    lastActiveAt: updatedAt,
    pause: null,
    platformReviewer: null,
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Maps GET /clients/:id/members rows into the assignment view the UI renders. */
function toAssignmentView(m: any): ClientAssignmentView {
  const roleLower = (m.systemRole || "").toLowerCase();
  const companyRole: OrganisationRole =
    roleLower === "owner" ? "owner" :
    roleLower === "admin" ? "admin" :
    roleLower === "manager" ? "marketing_manager" :
    roleLower === "viewer" ? "viewer" : "viewer";

  return {
    membershipId: m.membershipId,
    name: m.user?.name || m.user?.email?.split("@")[0] || "Team Member",
    email: m.user?.email || "",
    companyRole,
    level: m.isLead ? "admin" : "editor",
    isLead: !!m.isLead,
    membershipStatus: "active",
    lastLoginAt: null,
    assignedAt: new Date().toISOString(),
    assignedBy: "System",
    issue: null,
  };
}

/** Shape of `GET /billing/summary` (see the backend's `getBillingSummary`). */
interface BillingSummaryResponse {
  subscriptionRequired?: unknown;
  status?: unknown;
  plan?: { name?: unknown } | null;
  limits?: { maxClients?: unknown } | null;
  usage?: { currentClients?: unknown } | null;
}

/**
 * Plan/limit verdict for a company, mirroring the backend's `checkEntitlement`
 * (`billing.service.ts`) so the wizard promises exactly what the server will allow:
 * no subscription means no limit, a non-ACTIVE subscription blocks creation, and an
 * ACTIVE one allows `maxClients` total. `NONE` is our own marker for "not provisioned".
 */
function slotEligibility(input: { planName: string; clientLimit: number | null; clientsUsed: number | null; status: string }): ClientCompanySlot["eligibility"] {
  if (input.status === "NONE") return { ok: true, code: "ok", reason: null };
  if (input.status !== "ACTIVE") {
    return {
      ok: false,
      code: "subscription_ended",
      reason: `This company's subscription is ${input.status.toLowerCase()}. Reactivate it before adding clients.`,
    };
  }
  if (input.clientLimit !== null && input.clientsUsed !== null && input.clientsUsed >= input.clientLimit) {
    return { ok: false, code: "limit_reached", reason: "Client limit reached for the selected company." };
  }
  return { ok: true, code: "ok", reason: null };
}

/** Reads a `GET /super-admin/subscriptions` row (plan included) into plan name + limit, or "no subscription". */
function planSlotFromSubscription(subscription: unknown): { planName: string; clientLimit: number | null; status: string } {
  const row = (subscription ?? null) as { plan?: { name?: unknown; maxClients?: unknown } | null; status?: unknown } | null;
  const planName = typeof row?.plan?.name === "string" && row.plan.name.length > 0 ? row.plan.name : null;
  if (!planName) return { planName: "No subscription", clientLimit: null, status: "NONE" };
  return {
    planName,
    clientLimit: typeof row?.plan?.maxClients === "number" ? row.plan.maxClients : null,
    status: typeof row?.status === "string" ? row.status : "NONE",
  };
}

export function createApiClientsProvider(fallback: ClientsRepository): ClientsRepository {
  const provider: ClientsRepository = {
    ...fallback,
    mode: "api",
    
    async listClients(query: ClientListQuery): Promise<ClientListResult> {
      // In Super Admin cross-company view, fetch from GET /super-admin/clients
      if (isSuperAdminRoute()) {
        try {
          const directory = await superAdminCompaniesApi.listClients({
            page: query.page ?? 1,
            limit: query.pageSize ?? 25,
            search: query.search || undefined,
            companyId: query.company && UUID_PATTERN.test(query.company) ? query.company : undefined,
          });
          const liveClients = await Promise.all(
            (directory.items ?? []).map(async (item) => {
              try {
                const workspace = await getSuperAdminWorkspace(item.id);
                return workspace.summary;
              } catch {
                return toClientSummary(item, { id: item.companyId, name: item.companyName });
              }
            }),
          );
          return {
            data: liveClients,
            matchingIds: liveClients.map((c) => c.displayId ?? c.client.id),
            pagination: {
              total: directory.total,
              page: directory.page,
              pageSize: directory.limit,
              totalPages: Math.max(1, Math.ceil(directory.total / (directory.limit || 25))),
              hasNextPage: directory.page < Math.ceil(directory.total / (directory.limit || 25)),
              hasPreviousPage: directory.page > 1,
            },
          };
        } catch {
          return {
            data: [],
            matchingIds: [],
            pagination: {
              total: 0,
              page: query.page ?? 1,
              pageSize: query.pageSize ?? 25,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          };
        }
      }

      const companyId = query.company || getCompanyIdHeader();

      // If a specific company is selected with a valid UUID
      if (companyId && UUID_PATTERN.test(companyId)) {
        try {
          const rawClients = await apiClient.request<any[]>({
            method: "GET",
            path: "/clients",
            query: toListQuery(query),
            headers: { "x-company-id": companyId }
          });
          const clients = await Promise.all(
            (Array.isArray(rawClients) ? rawClients : []).map(async (client) => {
              try {
                const workspace = await getCompanyWorkspace(companyId, client.id);
                return workspace.summary;
              } catch {
                return toClientSummary(client);
              }
            }),
          );
          for (const c of clients) {
            try {
              const bundle = ensureBundle(companyId, c.company.name);
              if (!bundle.clients.some((item) => item.id === c.client.id)) {
                bundle.clients.push(c.client);
                writeBundle(bundle);
              }
            } catch {}
          }
          const page = query.page ?? 1;
          const pageSize = query.pageSize ?? 10;
          const totalPages = Math.max(1, Math.ceil(clients.length / pageSize));
          
          return {
            data: clients,
            matchingIds: clients.map(c => c.displayId ?? c.client.id),
            pagination: { 
              total: clients.length, 
              page, 
              pageSize, 
              totalPages,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1
            }
          };
        } catch {
          return {
            data: [],
            matchingIds: [],
            pagination: { 
              total: 0, 
              page: query.page ?? 1, 
              pageSize: query.pageSize ?? 10, 
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            }
          };
        }
      }

      return {
        data: [],
        matchingIds: [],
        pagination: {
          total: 0,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    },

    async createClient(input: CreateClientInput, actor): Promise<ClientSummary> {
      const companyId = input.companyId || getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId)) {
        return fallback.createClient(input, actor);
      }

      const name = input.name.trim().replace(/\s+/g, " ");
      const displayName = input.displayName?.trim() || undefined;
      const website = input.website?.trim() || undefined;
      const industry = input.industry?.trim() || undefined;
      const targetAudience = (input.targetAudience ?? input.description)?.trim() || undefined;
      const description = input.description?.trim() || undefined;
      const contactEmail = input.contactEmail?.trim() || undefined;
      const contactPhone = input.contactPhone?.trim() || undefined;
      const timezone = input.timezone?.trim() || undefined;
      const language = normalizeLanguageCode(input.language);
      const membershipIds = input.membershipIds && input.membershipIds.length > 0
        ? input.membershipIds
        : (input.memberIds && input.memberIds.length > 0 ? input.memberIds : undefined);
      const leadMembershipId = input.leadMembershipId !== undefined
        ? input.leadMembershipId
        : (input.leadUserId !== undefined ? input.leadUserId : undefined);

      const payload: Record<string, any> = {
        name,
        ...(displayName ? { displayName } : {}),
        ...(industry ? { industry } : {}),
        ...(website ? { website } : {}),
        ...(targetAudience ? { targetAudience } : {}),
        ...(description ? { description } : {}),
        ...(contactEmail ? { contactEmail } : {}),
        ...(contactPhone ? { contactPhone } : {}),
        ...(timezone ? { timezone } : {}),
        ...(language ? { language } : {}),
        ...(membershipIds && membershipIds.length > 0 ? { membershipIds } : {}),
        ...(leadMembershipId ? { leadMembershipId } : {}),
      };

      try {
        const created = await apiClient.request<any>({
          method: "POST",
          path: "/clients",
          body: payload,
          headers: { "x-company-id": companyId },
        });
        const summary = toClientSummary(created);
        try {
          const bundle = ensureBundle(companyId, summary.company.name);
          if (!bundle.clients.some((item) => item.id === summary.client.id)) {
            bundle.clients.push(summary.client);
            writeBundle(bundle);
          }
        } catch {}
        return summary;
      } catch (err) {
        if (ApiError.isApiError(err) && (err.status === 400 || err.status === 403 || err.status === 404)) {
          throw err;
        }
        return fallback.createClient(input, actor);
      }
    },

    async getClient(id: string): Promise<ClientSummary> {
      if (isSuperAdminRoute()) {
        return (await getSuperAdminWorkspace(id)).summary;
      }
      const companyId = getCompanyIdHeader();
      if (companyId && UUID_PATTERN.test(companyId) && UUID_PATTERN.test(id)) {
        try {
          return (await getCompanyWorkspace(companyId, id)).summary;
        } catch {
          return (await getSuperAdminWorkspace(id)).summary;
        }
      }

      return (await getSuperAdminWorkspace(id)).summary;
    },

    async listCreationCompanies(): Promise<ClientCreationCompany[]> {
      const fallbackCompanies = await fallback.listCreationCompanies();
      try {
        const response = await apiClient.request<any>({
          method: "GET",
          path: "/super-admin/companies",
          query: { page: 1, limit: 100, status: "ACTIVE" },
        });
        const items: any[] = response.items ?? [];
        // Plan + limit per company come from the billing service — never from client-side constants.
        const subscriptionByCompany = new Map<string, unknown>();
        try {
          const subscriptions = await apiClient.request<unknown>({ method: "GET", path: "/super-admin/subscriptions" });
          if (Array.isArray(subscriptions)) {
            for (const subscription of subscriptions) {
              if (subscription?.companyId) subscriptionByCompany.set(subscription.companyId, subscription);
            }
          }
        } catch (subscriptionError) {
          console.warn("Failed to read company subscriptions for plan limits:", subscriptionError);
        }
        const liveCompanies: ClientCreationCompany[] = items.map((item) => {
          const slot = planSlotFromSubscription(subscriptionByCompany.get(item.id));
          const clientsUsed = item.clientCount ?? 0;
          return {
            id: item.id,
            name: item.name,
            accountStatus: item.status === "ARCHIVED" ? "archived" : "active",
            planName: slot.planName,
            clientsUsed,
            clientLimit: slot.clientLimit,
            availableSlots: slot.clientLimit === null ? null : Math.max(0, slot.clientLimit - clientsUsed),
            eligibleMembers: item.memberCount ?? 1,
            eligibility: slotEligibility({ ...slot, clientsUsed }),
          };
        });
        return [
          ...liveCompanies,
          ...fallbackCompanies.filter((fc) => !liveCompanies.some((lc) => lc.id === fc.id)),
        ];
      } catch {
        return fallbackCompanies;
      }
    },

    /**
     * The admin wizard's own company: `GET /billing/summary` (Company scope + `billing:read`)
     * reports the real plan, limit and usage. `null` when the read fails, so callers show
     * "unknown" rather than a number the backend would contradict with a 402.
     */
    async getOwnCompanySlot(companyId: string): Promise<ClientCompanySlot | null> {
      if (!UUID_PATTERN.test(companyId)) return null;
      try {
        const summary = await apiClient.request<BillingSummaryResponse>({
          method: "GET",
          path: "/billing/summary",
          headers: { "x-company-id": companyId },
        });
        if (summary?.subscriptionRequired === false && summary.plan) {
          const planName = typeof summary.plan.name === "string" ? summary.plan.name : "Subscription";
          const clientLimit = typeof summary.limits?.maxClients === "number" ? summary.limits.maxClients : null;
          const clientsUsed = typeof summary.usage?.currentClients === "number" ? summary.usage.currentClients : null;
          const status = typeof summary.status === "string" ? summary.status : "ACTIVE";
          return {
            planName,
            clientsUsed,
            clientLimit,
            availableSlots: clientLimit === null || clientsUsed === null ? null : Math.max(0, clientLimit - clientsUsed),
            eligibility: slotEligibility({ planName, clientLimit, clientsUsed, status }),
          };
        }
        // `subscriptionRequired: true` — the company is not provisioned, so it has no client limit.
        return {
          planName: "No subscription",
          clientsUsed: null,
          clientLimit: null,
          availableSlots: null,
          eligibility: slotEligibility({ planName: "No subscription", clientLimit: null, clientsUsed: null, status: "NONE" }),
        };
      } catch (error) {
        console.warn("Failed to read the company's plan slot:", error);
        return null;
      }
    },

    async listEligibleMembers(companyId: string, clientId?: string): Promise<EligibleMember[]> {
      if (UUID_PATTERN.test(companyId)) {
        try {
          let rawCompanyMembers: Array<{
            membershipId?: string;
            id?: string;
            email?: string;
            systemRole?: string;
            user?: { email?: string; name?: string | null };
          }> = [];

          try {
            const teamRes = await apiClient.request<any[]>({
              method: "GET",
              path: "/team/members",
              headers: { "x-company-id": companyId },
            });
            if (Array.isArray(teamRes)) {
              rawCompanyMembers = teamRes;
            }
          } catch {
            const detail = await apiClient.request<any>({
              method: "GET",
              path: `/super-admin/companies/${encodeURIComponent(companyId)}`,
            });
            if (Array.isArray(detail?.members)) {
              rawCompanyMembers = detail.members;
            }
          }

          let assignedIds = new Set<string>();
          if (clientId && UUID_PATTERN.test(clientId)) {
            try {
              const clientMembers = await clientsApi.listMembers(companyId, clientId);
              assignedIds = new Set(clientMembers.map((cm) => cm.membershipId));
            } catch {
              // ignore
            }
          }

          if (rawCompanyMembers.length > 0) {
            return rawCompanyMembers.map((m) => {
              const email = m.email || m.user?.email || "";
              const name = m.user?.name || email.split("@")[0] || "Member";
              const sysRole = (m.systemRole || "").toLowerCase();
              const role = (sysRole === "owner" ? "owner" : sysRole === "admin" ? "admin" : "member") as any;
              // GET /team/members returns `id`; the super-admin company detail returns `membershipId`.
              const membershipId = m.membershipId ?? m.id ?? "";
              return {
                membershipId,
                name,
                email,
                companyRole: role,
                alreadyAssigned: assignedIds.has(membershipId),
              };
            });
          }
        } catch (liveErr) {
          console.warn("Failed to fetch live eligible members, using fallback:", liveErr);
        }
      }

      return fallback.listEligibleMembers(companyId, clientId);
    },

    async exportClients(scope: { query?: ClientListQuery; ids?: string[] }): Promise<ClientSummary[]> {
      const result = await provider.listClients(scope.query || { pageSize: 500 });
      if (scope.ids && scope.ids.length > 0) {
        const idSet = new Set(scope.ids);
        return result.data.filter((item) => idSet.has(item.client.id) || idSet.has(item.displayId));
      }
      return result.data;
    },

    async getPortfolio() {
      if (isSuperAdminRoute()) {
        try {
          return await superAdminCompaniesApi.getClientPortfolio();
        } catch {
          return fallback.getPortfolio();
        }
      }
      const companyId = getCompanyIdHeader();
      if (companyId && UUID_PATTERN.test(companyId)) {
        return clientsApi.getPortfolio<ClientPortfolio>(companyId);
      }
      return fallback.getPortfolio();
    },

    async getFacets() {
      if (isSuperAdminRoute()) {
        try {
          return await superAdminCompaniesApi.getClientFacets();
        } catch {
          return fallback.getFacets();
        }
      }
      const companyId = getCompanyIdHeader();
      if (companyId && UUID_PATTERN.test(companyId)) {
        return clientsApi.getFacets<ClientFacets>(companyId);
      }
      return fallback.getFacets();
    },

    async getOverview(id: string): Promise<ClientOverviewData> {
      if (isSuperAdminRoute()) return (await getSuperAdminWorkspace(id)).overview;
      const companyId = getCompanyIdHeader();
      if (companyId && UUID_PATTERN.test(companyId) && UUID_PATTERN.test(id)) {
        try {
          return (await getCompanyWorkspace(companyId, id)).overview;
        } catch {
          return (await getSuperAdminWorkspace(id)).overview;
        }
      }
      return (await getSuperAdminWorkspace(id)).overview;
    },

    async getTeam(id: string): Promise<ClientTeamData> {
      if (isSuperAdminRoute()) return (await getSuperAdminWorkspace(id)).team;
      const companyId = getCompanyIdHeader();
      if (companyId && UUID_PATTERN.test(companyId) && UUID_PATTERN.test(id)) {
        try {
          return (await getCompanyWorkspace(companyId, id)).team;
        } catch {
          return (await getSuperAdminWorkspace(id)).team;
        }
      }
      return (await getSuperAdminWorkspace(id)).team;
    },

    async getChannels(id: string): Promise<ClientChannelsData> {
      if (isSuperAdminRoute()) return (await getSuperAdminWorkspace(id)).channels;
      const companyId = getCompanyIdHeader();
      if (companyId && UUID_PATTERN.test(companyId) && UUID_PATTERN.test(id)) {
        try {
          return (await getCompanyWorkspace(companyId, id)).channels;
        } catch {
          return (await getSuperAdminWorkspace(id)).channels;
        }
      }
      return (await getSuperAdminWorkspace(id)).channels;
    },

    async getWebsiteSeo(id: string): Promise<ClientWebsiteData> {
      if (isSuperAdminRoute()) return (await getSuperAdminWorkspace(id)).websiteSeo;
      const companyId = getCompanyIdHeader();
      if (companyId && UUID_PATTERN.test(companyId) && UUID_PATTERN.test(id)) {
        try {
          return (await getCompanyWorkspace(companyId, id)).websiteSeo;
        } catch {
          return (await getSuperAdminWorkspace(id)).websiteSeo;
        }
      }
      return (await getSuperAdminWorkspace(id)).websiteSeo;
    },

    async getActivity(id: string, filter: ClientActivityFilter): Promise<ClientActivityData> {
      const companyId = getCompanyIdHeader();
      let data: ClientActivityData;
      if (isSuperAdminRoute() || !companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(id)) {
        data = (await getSuperAdminWorkspace(id)).activity;
      } else {
        try {
          data = (await getCompanyWorkspace(companyId, id)).activity;
        } catch {
          data = (await getSuperAdminWorkspace(id)).activity;
        }
      }
      const entries = data.entries.filter((entry) => {
        const term = filter.search?.trim().toLowerCase();
        if (filter.actor && entry.actor.name !== filter.actor) return false;
        if (filter.module && entry.module !== filter.module) return false;
        if (filter.event && entry.action !== filter.event) return false;
        if (filter.severity && entry.severity !== filter.severity) return false;
        if (filter.result && entry.result !== filter.result) return false;
        if (filter.from && entry.at < filter.from) return false;
        if (filter.to && entry.at >= `${filter.to}T23:59:59.999Z`) return false;
        return !term || [entry.summary, entry.action, entry.actor.name, entry.entity.label].some((value) => value.toLowerCase().includes(term));
      });
      return { ...data, entries };
    },

    async getSettings(id: string): Promise<ClientSettingsData> {
      let settings: ClientSettingsData;
      if (isSuperAdminRoute()) {
        settings = (await getSuperAdminWorkspace(id)).settings;
      } else {
        const companyId = getCompanyIdHeader();
        if (companyId && UUID_PATTERN.test(companyId) && UUID_PATTERN.test(id)) {
          try {
            settings = (await getCompanyWorkspace(companyId, id)).settings;
          } catch {
            settings = (await getSuperAdminWorkspace(id)).settings;
          }
        } else {
          settings = (await getSuperAdminWorkspace(id)).settings;
        }
      }

      // Populate live staff if staff list is empty so the Platform Internal Reviewer dropdown works
      if (!settings.staff || settings.staff.length === 0) {
        try {
          const staffRes = await apiClient.request<any[]>({ method: "GET", path: "/super-admin/staff" });
          if (Array.isArray(staffRes)) {
            settings = {
              ...settings,
              staff: staffRes.map((s) => ({
                id: s.id || s.userId,
                name: s.name || s.user?.name || s.user?.email || "Staff member",
                email: s.email || s.user?.email || "",
                status: (s.status?.toLowerCase() as any) ?? "active",
                role: s.platformRole?.toLowerCase() ?? "support",
                department: s.department || "Operations",
                avatarUrl: s.avatarUrl ?? s.user?.avatarAsset?.secureUrl ?? null,
              })),
            };
          }
        } catch {
          // staff fetch is optional
        }
      }

      return settings;
    },

    async updateClient(id: string, input: UpdateClientInput, actor): Promise<ClientSummary> {
      let companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId)) {
        const ws = await getSuperAdminWorkspace(id).catch(() => null);
        if (ws?.summary?.company?.id) companyId = ws.summary.company.id;
      }
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(id)) {
        return unavailableClientsProvider.updateClient(id, input, actor);
      }
      try {
        let expectedRevision = input.expectedRevision;
        if (expectedRevision === undefined) {
          const current = await clientsApi.get(companyId, id);
          expectedRevision = current.revision;
        }

        const language = normalizeLanguageCode(input.language);
        const websiteValue = input.website?.trim() || input.primaryWebsite?.trim() || null;
        const updated = await clientsApi.update(companyId, id, {
          expectedRevision,
          name: input.name?.trim(),
          displayName: input.displayName?.trim() || null,
          industry: input.industry?.trim() || null,
          website: websiteValue,
          targetAudience: input.description?.trim() || null,
          contactEmail: input.contactEmail?.trim() || null,
          contactPhone: input.contactPhone?.trim() || null,
          description: input.description?.trim() || null,
          timezone: input.timezone?.trim() || null,
          language: language || null,
        });

        const leadMembershipId = input.leadMembershipId !== undefined
          ? input.leadMembershipId
          : (input.leadUserId !== undefined ? input.leadUserId : undefined);
        if (leadMembershipId !== undefined) {
          const withLead = await clientsApi.setLead(companyId, id, leadMembershipId);
          return toClientSummary(withLead);
        }

        return toClientSummary(updated);
      } catch (err) {
        if (ApiError.isApiError(err) && (err.status === 400 || err.status === 403 || err.status === 404 || err.status === 409)) {
          throw err;
        }
        return unavailableClientsProvider.updateClient(id, input, actor);
      }
    },

    async setLead(clientId: string, leadMembershipId: string | null, actor: MutationActor): Promise<ClientSummary> {
      let companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId)) {
        const ws = await getSuperAdminWorkspace(clientId).catch(() => null);
        if (ws?.summary?.company?.id) companyId = ws.summary.company.id;
      }
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) {
        return unavailableClientsProvider.setLead(clientId, leadMembershipId, actor);
      }
      const updated = await clientsApi.setLead(companyId, clientId, leadMembershipId);
      return toClientSummary(updated);
    },

    async assignMember(clientId: string, input: { membershipId: string; level: any }, actor: MutationActor): Promise<ClientSummary> {
      let companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId)) {
        const ws = await getSuperAdminWorkspace(clientId).catch(() => null);
        if (ws?.summary?.company?.id) companyId = ws.summary.company.id;
      }
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) {
        return unavailableClientsProvider.assignMember(clientId, input, actor);
      }
      await clientsApi.addMembers(companyId, clientId, [input.membershipId]);
      if (input.level === "admin") {
        await clientsApi.setLead(companyId, clientId, input.membershipId);
      }
      const current = await clientsApi.get(companyId, clientId);
      return toClientSummary(current);
    },

    async removeAccess(clientId: string, input: { membershipId: string; newLeadId?: string | null; note: string }, actor: MutationActor): Promise<ClientSummary> {
      let companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId)) {
        const ws = await getSuperAdminWorkspace(clientId).catch(() => null);
        if (ws?.summary?.company?.id) companyId = ws.summary.company.id;
      }
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) {
        return unavailableClientsProvider.removeAccess(clientId, input, actor);
      }
      if (input.newLeadId) {
        await clientsApi.setLead(companyId, clientId, input.newLeadId);
      }
      await clientsApi.removeMember(companyId, clientId, input.membershipId);
      const current = await clientsApi.get(companyId, clientId);
      return toClientSummary(current);
    },

    async changeLifecycle(ids: string[], action: LifecycleAction, actor: MutationActor): Promise<BulkResult> {
      const updated: string[] = [];
      const skipped: Array<{ id: string; name: string; reason: string }> = [];

      for (const id of ids) {
        let companyId = getCompanyIdHeader();
        if (!companyId || !UUID_PATTERN.test(companyId)) {
          const ws = await getSuperAdminWorkspace(id).catch(() => null);
          if (ws?.summary?.company?.id) companyId = ws.summary.company.id;
        }

        try {
          if (action.kind === "archive") {
            if (companyId && UUID_PATTERN.test(companyId)) {
              await clientsApi.delete(companyId, id);
              updated.push(id);
              continue;
            }
          }
          updated.push(id);
        } catch (err) {
          skipped.push({ id, name: id, reason: ApiError.isApiError(err) ? err.message : "Action failed" });
        }
      }

      return { updated, skipped };
    },

    async changeAccess(clientId: string, input: { membershipId: string; level: ClientAccessLevel }, actor: MutationActor): Promise<ClientSummary> {
      let companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId)) {
        const ws = await getSuperAdminWorkspace(clientId).catch(() => null);
        if (ws?.summary?.company?.id) companyId = ws.summary.company.id;
      }
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) {
        return unavailableClientsProvider.changeAccess(clientId, input, actor);
      }
      if (input.level === "admin") {
        await clientsApi.setLead(companyId, clientId, input.membershipId);
      } else {
        const current = await clientsApi.get(companyId, clientId);
        if (current.lead?.membershipId === input.membershipId) {
          await clientsApi.setLead(companyId, clientId, null);
        }
      }
      const updated = await clientsApi.get(companyId, clientId);
      return toClientSummary(updated);
    },

    async addWebsite(clientId: string, input: { url: string; makePrimary: boolean }, actor: MutationActor): Promise<ClientSummary> {
      let companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId)) {
        const ws = await getSuperAdminWorkspace(clientId).catch(() => null);
        if (ws?.summary?.company?.id) companyId = ws.summary.company.id;
      }
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) {
        return unavailableClientsProvider.addWebsite(clientId, input, actor);
      }
      const current = await clientsApi.get(companyId, clientId);
      const updated = await clientsApi.update(companyId, clientId, {
        expectedRevision: current.revision,
        website: input.url.trim(),
      });
      return toClientSummary(updated);
    },

    async setPrimaryWebsite(clientId: string, websiteId: string, actor: MutationActor): Promise<ClientSummary> {
      return provider.getClient(clientId);
    },

    async removeWebsite(clientId: string, websiteId: string, actor: MutationActor): Promise<ClientSummary> {
      let companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId)) {
        const ws = await getSuperAdminWorkspace(clientId).catch(() => null);
        if (ws?.summary?.company?.id) companyId = ws.summary.company.id;
      }
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) {
        return unavailableClientsProvider.removeWebsite(clientId, websiteId, actor);
      }
      const current = await clientsApi.get(companyId, clientId);
      const updated = await clientsApi.update(companyId, clientId, {
        expectedRevision: current.revision,
        website: null,
      });
      return toClientSummary(updated);
    },

    async setOnboardingRequirements(id: string, required: Record<OnboardingStepKey, boolean>, actor: MutationActor): Promise<ClientSummary> {
      return provider.getClient(id);
    },

    async markAccessReviewed(id: string, actor: MutationActor): Promise<ClientSummary> {
      return provider.getClient(id);
    },

    async setPlatformReviewer(id: string, staffId: string | null, actor: MutationActor): Promise<ClientSummary> {
      return provider.getClient(id);
    },

    async requestReconnection(id: string, connectionId: string, actor: MutationActor): Promise<ClientSummary> {
      return provider.getClient(id);
    },
  };
  return provider;
}

export const apiClientsProvider: ClientsRepository = createApiClientsProvider(unavailableClientsProvider);
