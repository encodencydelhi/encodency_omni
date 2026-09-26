import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { ClientsRepository, LifecycleAction } from "./repository";
import type { ClientListQuery, ClientListResult, ClientSummary, ClientWebsite, CreateClientInput, UpdateClientInput, BulkResult, ClientCreationCompany, EligibleMember } from "./types";
import type { CompanyClient } from "@/features/companies/data/types";
import { unavailableClientsProvider } from "./unavailable-provider";
import { toListQuery } from "@/lib/api/transport";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { ensureBundle, writeBundle } from "@/features/companies/data/mock/store";

function getCompanyIdHeader(): string {
  return getStoredCompanyId();
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
      displayName: name,
      industry,
      description: targetAudience,
      contactEmail: null,
      contactPhone: null,
      logoDataUrl: rawLogo?.url ?? null,
      logo: rawLogo,
      timezone: "Asia/Kolkata",
      language: "English",
      reportingPeriod: "30d",
      createdBy: "System",
    },
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
    lead: null,
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

export function createApiClientsProvider(fallback: ClientsRepository): ClientsRepository {
  return {
    ...fallback,
    mode: "api",
    
    async listClients(query: ClientListQuery): Promise<ClientListResult> {
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
          const clients = (Array.isArray(rawClients) ? rawClients : []).map((c) => toClientSummary(c));
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
        } catch (err) {
          if (ApiError.isApiError(err) && (err.status === 400 || err.status === 404)) {
            return fallback.listClients(query);
          }
        }
      }

      // In Super Admin cross-company view, fetch live companies and their clients from backend
      let liveClients: ClientSummary[] = [];
      try {
        const companiesRes = await apiClient.request<any>({
          method: "GET",
          path: "/super-admin/companies",
          query: { page: 1, limit: 100, status: "ACTIVE" },
        });
        const companiesWithClients = (companiesRes.items ?? []).filter((c: any) => c.clientCount > 0);
        const detailPromises = companiesWithClients.map((c: any) =>
          apiClient.request<any>({
            method: "GET",
            path: `/super-admin/companies/${c.id}`,
          }).then((detail: any) =>
            (detail.clients ?? []).map((client: any) => {
              const summary = toClientSummary(client, { id: c.id, name: c.name });
              try {
                const bundle = ensureBundle(c.id, c.name);
                if (!bundle.clients.some((item) => item.id === summary.client.id)) {
                  bundle.clients.push(summary.client);
                  writeBundle(bundle);
                }
              } catch {}
              return summary;
            })
          ).catch(() => [])
        );
        const clientArrays = await Promise.all(detailPromises);
        liveClients = clientArrays.flat();
      } catch {
        // ignore if not super admin or offline
      }

      const fallbackResult = await fallback.listClients(query);
      const combined = [
        ...liveClients,
        ...fallbackResult.data.filter((fc) => !liveClients.some((lc) => lc.client.id === fc.client.id)),
      ];

      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? 10;
      const totalPages = Math.max(1, Math.ceil(combined.length / pageSize));
      const paged = combined.slice((page - 1) * pageSize, page * pageSize);

      return {
        data: paged,
        matchingIds: combined.map((c) => c.displayId ?? c.client.id),
        pagination: {
          total: combined.length,
          page,
          pageSize,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    },

    async createClient(input: CreateClientInput, actor): Promise<ClientSummary> {
      const companyId = input.companyId || getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId)) {
        return fallback.createClient(input, actor);
      }

      const name = input.name.trim().replace(/\s+/g, " ");
      const website = input.website?.trim() || undefined;
      const industry = input.industry?.trim() || undefined;
      const targetAudience = (input.targetAudience ?? input.description)?.trim() || undefined;

      try {
        const created = await apiClient.request<any>({
          method: "POST",
          path: "/clients",
          body: {
            name,
            ...(industry ? { industry } : {}),
            ...(website ? { website } : {}),
            ...(targetAudience ? { targetAudience } : {}),
          },
          headers: { "x-company-id": companyId }
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
        if (ApiError.isApiError(err) && (err.status === 400 || err.status === 404)) {
          return fallback.createClient(input, actor);
        }
        throw err;
      }
    },

    async getClient(id: string): Promise<ClientSummary> {
      const companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(id)) {
        return fallback.getClient(id);
      }

      try {
        const raw = await apiClient.request<any>({
          method: "GET",
          path: `/clients/${id}`,
          headers: { 
            "x-company-id": companyId,
            "x-client-id": id
          }
        });
        return toClientSummary(raw);
      } catch (err) {
        if (ApiError.isApiError(err) && (err.status === 400 || err.status === 404)) {
          return fallback.getClient(id);
        }
        throw err;
      }
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
        const liveCompanies: ClientCreationCompany[] = items.map((item) => ({
          id: item.id,
          name: item.name,
          accountStatus: item.status === "ARCHIVED" ? "archived" : "active",
          planName: "Growth",
          clientsUsed: item.clientCount ?? 0,
          clientLimit: 10,
          availableSlots: Math.max(0, 10 - (item.clientCount ?? 0)),
          eligibleMembers: item.memberCount ?? 1,
          eligibility: { ok: true, code: "ok", reason: null },
        }));
        return [
          ...liveCompanies,
          ...fallbackCompanies.filter((fc) => !liveCompanies.some((lc) => lc.id === fc.id)),
        ];
      } catch {
        return fallbackCompanies;
      }
    },

    async listEligibleMembers(companyId: string, clientId?: string): Promise<EligibleMember[]> {
      try {
        return await fallback.listEligibleMembers(companyId, clientId);
      } catch (err) {
        if (!UUID_PATTERN.test(companyId)) throw err;
        try {
          const detail = await apiClient.request<any>({
            method: "GET",
            path: `/super-admin/companies/${encodeURIComponent(companyId)}`,
          });
          const members: any[] = detail.members ?? [];
          return members.map((m) => {
            const role = (m.systemRole?.toLowerCase() === "owner" ? "owner" : m.systemRole?.toLowerCase() === "admin" ? "admin" : "member") as any;
            return {
              membershipId: m.membershipId,
              name: m.email.split("@")[0] ?? m.email,
              email: m.email,
              companyRole: role,
              alreadyAssigned: false,
            };
          });
        } catch {
          return [];
        }
      }
    },

    exportClients: fallback.exportClients,
    getPortfolio: fallback.getPortfolio,
    getFacets: fallback.getFacets,
    getOverview: fallback.getOverview,
    getTeam: fallback.getTeam,
    getChannels: fallback.getChannels,
    getWebsiteSeo: fallback.getWebsiteSeo,
    getActivity: fallback.getActivity,
    getSettings: fallback.getSettings,

    // Blocked lifecycle mutations keep returning 503 from unavailableClientsProvider
    updateClient: unavailableClientsProvider.updateClient,
    changeLifecycle: unavailableClientsProvider.changeLifecycle,
    assignMember: unavailableClientsProvider.assignMember,
    changeAccess: unavailableClientsProvider.changeAccess,
    removeAccess: unavailableClientsProvider.removeAccess,
    setLead: unavailableClientsProvider.setLead,
    addWebsite: unavailableClientsProvider.addWebsite,
    setPrimaryWebsite: unavailableClientsProvider.setPrimaryWebsite,
    removeWebsite: unavailableClientsProvider.removeWebsite,
    setOnboardingRequirements: unavailableClientsProvider.setOnboardingRequirements,
    markAccessReviewed: unavailableClientsProvider.markAccessReviewed,
    setPlatformReviewer: unavailableClientsProvider.setPlatformReviewer,
    requestReconnection: unavailableClientsProvider.requestReconnection
  };
}

export const apiClientsProvider: ClientsRepository = createApiClientsProvider(unavailableClientsProvider);
