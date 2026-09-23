import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/types/api";
import type { ClientsRepository, LifecycleAction } from "./repository";
import type { ClientListQuery, ClientListResult, ClientSummary, CreateClientInput, UpdateClientInput, BulkResult } from "./types";
import { unavailableClientsProvider } from "./unavailable-provider";
import { toListQuery } from "@/lib/api/transport";

function getCompanyIdHeader() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("omni_active_company_id") ?? "development-company-id";
  }
  return "development-company-id";
}

export const apiClientsProvider: ClientsRepository = {
  mode: "mock",
  
  async listClients(query: ClientListQuery): Promise<ClientListResult> {
    const clients = await apiClient.request<ClientSummary[]>({
      method: "GET",
      path: "/clients",
      query: toListQuery(query),
      headers: { "x-company-id": getCompanyIdHeader() }
    });
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
    return await apiClient.request<ClientSummary>({
      method: "POST",
      path: "/clients",
      body: {
        name: input.name,
        industry: input.industry,
        website: input.website,
        description: input.description
      },
      headers: { "x-company-id": getCompanyIdHeader() }
    });
  },

  async getClient(id: string): Promise<ClientSummary> {
    return await apiClient.request<ClientSummary>({
      method: "GET",
      path: `/clients/${id}`,
      headers: { 
        "x-company-id": getCompanyIdHeader(),
        "x-client-id": id
      }
    });
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
