import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { ClientsRepository, LifecycleAction } from "./repository";
import type { ClientListQuery, ClientListResult, ClientSummary, ClientWebsite, CreateClientInput, UpdateClientInput, BulkResult } from "./types";
import type { CompanyClient } from "@/features/companies/data/types";
import { unavailableClientsProvider } from "./unavailable-provider";
import { toListQuery } from "@/lib/api/transport";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";

function getCompanyIdHeader(): string {
  return getStoredCompanyId();
}

/** Converts backend ClientRecord into the full ClientSummary structure expected by the UI. */
function toClientSummary(raw: any): ClientSummary {
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
  const companyId: string = raw.companyId ?? getCompanyIdHeader();
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
  };

  return {
    client: companyClient,
    displayId: id,
    company: {
      id: companyId,
      name: "Workspace Company",
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
      logoDataUrl: null,
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

export const apiClientsProvider: ClientsRepository = {
  mode: "api",
  
  async listClients(query: ClientListQuery): Promise<ClientListResult> {
    const rawClients = await apiClient.request<any[]>({
      method: "GET",
      path: "/clients",
      query: toListQuery(query),
      headers: { "x-company-id": getCompanyIdHeader() }
    });
    const clients = (Array.isArray(rawClients) ? rawClients : []).map(toClientSummary);
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
  },

  async createClient(input: CreateClientInput, actor): Promise<ClientSummary> {
    const name = input.name.trim().replace(/\s+/g, " ");
    const website = input.website?.trim() || undefined;
    const industry = input.industry?.trim() || undefined;
    const targetAudience = (input.targetAudience ?? input.description)?.trim() || undefined;

    const created = await apiClient.request<any>({
      method: "POST",
      path: "/clients",
      body: {
        name,
        ...(industry ? { industry } : {}),
        ...(website ? { website } : {}),
        ...(targetAudience ? { targetAudience } : {}),
      },
      headers: { "x-company-id": getCompanyIdHeader() }
    });
    return toClientSummary(created);
  },

  async getClient(id: string): Promise<ClientSummary> {
    const raw = await apiClient.request<any>({
      method: "GET",
      path: `/clients/${id}`,
      headers: { 
        "x-company-id": getCompanyIdHeader(),
        "x-client-id": id
      }
    });
    return toClientSummary(raw);
  },

  exportClients: unavailableClientsProvider.exportClients,
  getPortfolio: unavailableClientsProvider.getPortfolio,
  getFacets: unavailableClientsProvider.getFacets,
  listCreationCompanies: unavailableClientsProvider.listCreationCompanies,
  listEligibleMembers: unavailableClientsProvider.listEligibleMembers,
  getOverview: unavailableClientsProvider.getOverview,
  getTeam: unavailableClientsProvider.getTeam,
  getChannels: unavailableClientsProvider.getChannels,
  getWebsiteSeo: unavailableClientsProvider.getWebsiteSeo,
  getActivity: unavailableClientsProvider.getActivity,
  getSettings: unavailableClientsProvider.getSettings,
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
