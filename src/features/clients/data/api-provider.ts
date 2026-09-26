import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { ClientsRepository, LifecycleAction } from "./repository";
import type { ClientListQuery, ClientListResult, ClientSummary, ClientWebsite, CreateClientInput, UpdateClientInput, BulkResult, ClientCreationCompany, EligibleMember, MutationActor, ClientTeamData, ClientAssignmentView } from "./types";
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

export function createApiClientsProvider(fallback: ClientsRepository): ClientsRepository {
  const provider: ClientsRepository = {
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

      // In Super Admin cross-company view, fetch from GET /super-admin/clients
      try {
        const directory = await superAdminCompaniesApi.listClients({
          page: query.page ?? 1,
          limit: query.pageSize ?? 25,
          search: query.search || undefined,
          companyId: query.company && UUID_PATTERN.test(query.company) ? query.company : undefined,
        });
        const liveClients = (directory.items ?? []).map((item) =>
          toClientSummary(item, { id: item.companyId, name: item.companyName }),
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
        // fallback if not super admin or offline
      }

      const fallbackResult = await fallback.listClients(query);
      return fallbackResult;
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
      if (UUID_PATTERN.test(companyId)) {
        try {
          let rawCompanyMembers: Array<{
            membershipId: string;
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
              return {
                membershipId: m.membershipId,
                name,
                email,
                companyRole: role,
                alreadyAssigned: assignedIds.has(m.membershipId),
              };
            });
          }
        } catch (liveErr) {
          console.warn("Failed to fetch live eligible members, using fallback:", liveErr);
        }
      }

      return fallback.listEligibleMembers(companyId, clientId);
    },

    exportClients: fallback.exportClients,
    getPortfolio: fallback.getPortfolio,
    getFacets: fallback.getFacets,
    getOverview: fallback.getOverview,

    async getTeam(id: string): Promise<ClientTeamData> {
      const companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(id)) {
        return fallback.getTeam(id);
      }
      try {
        const [summary, rawMembers, eligible] = await Promise.all([
          provider.getClient(id),
          clientsApi.listMembers(companyId, id),
          provider.listEligibleMembers(companyId, id),
        ]);

        const assignments: ClientAssignmentView[] = (rawMembers as any[]).map((m: any) => {
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
        });

        return {
          summary,
          assignments,
          eligibleMembers: eligible,
        };
      } catch (err) {
        console.warn("Live clientsApi.listMembers failed, falling back to mock:", err);
        return fallback.getTeam(id);
      }
    },

    getChannels: fallback.getChannels,
    getWebsiteSeo: fallback.getWebsiteSeo,
    getActivity: fallback.getActivity,
    getSettings: fallback.getSettings,

    async updateClient(id: string, input: UpdateClientInput, actor): Promise<ClientSummary> {
      const companyId = getCompanyIdHeader();
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
        const updated = await clientsApi.update(companyId, id, {
          expectedRevision,
          name: input.name?.trim(),
          displayName: input.displayName?.trim() || null,
          industry: input.industry?.trim() || null,
          website: input.website?.trim() || null,
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
      const companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) {
        return unavailableClientsProvider.setLead(clientId, leadMembershipId, actor);
      }
      const updated = await clientsApi.setLead(companyId, clientId, leadMembershipId);
      return toClientSummary(updated);
    },

    async assignMember(clientId: string, input: { membershipId: string; level: any }, actor: MutationActor): Promise<ClientSummary> {
      const companyId = getCompanyIdHeader();
      if (!companyId || !UUID_PATTERN.test(companyId) || !UUID_PATTERN.test(clientId)) {
        return unavailableClientsProvider.assignMember(clientId, input, actor);
      }
      await clientsApi.addMembers(companyId, clientId, [input.membershipId]);
      const current = await clientsApi.get(companyId, clientId);
      return toClientSummary(current);
    },

    async removeAccess(clientId: string, input: { membershipId: string; newLeadId?: string | null; note: string }, actor: MutationActor): Promise<ClientSummary> {
      const companyId = getCompanyIdHeader();
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

    changeLifecycle: unavailableClientsProvider.changeLifecycle,
    changeAccess: unavailableClientsProvider.changeAccess,
    addWebsite: unavailableClientsProvider.addWebsite,
    setPrimaryWebsite: unavailableClientsProvider.setPrimaryWebsite,
    removeWebsite: unavailableClientsProvider.removeWebsite,
    setOnboardingRequirements: unavailableClientsProvider.setOnboardingRequirements,
    markAccessReviewed: unavailableClientsProvider.markAccessReviewed,
    setPlatformReviewer: unavailableClientsProvider.setPlatformReviewer,
    requestReconnection: unavailableClientsProvider.requestReconnection,
  };
  return provider;
}

export const apiClientsProvider: ClientsRepository = createApiClientsProvider(unavailableClientsProvider);
