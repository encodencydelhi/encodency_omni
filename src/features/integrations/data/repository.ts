/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Integrations Repository Interface & Async Implementation
 */

import * as store from "./mock/store";
import type {
  IntegrationActivity,
  IntegrationIssue,
  IntegrationProvider,
  IntegrationSettings,
  IntegrationsKpis,
  IssueStatus,
  PlatformAvailability,
  ProviderAuthorization,
  ProviderCapability,
  ProviderConfiguration,
  ExternalResource,
  ClientResourceMapping,
  ReauthorizationRequest,
} from "./types";

export interface IntegrationsRepository {
  // Read
  getOverviewKpis(): Promise<IntegrationsKpis>;
  getProviders(): Promise<IntegrationProvider[]>;
  getProviderById(id: string): Promise<IntegrationProvider | null>;
  getProviderConfig(providerId: string): Promise<ProviderConfiguration | null>;
  getProviderCapabilities(providerId?: string): Promise<ProviderCapability[]>;
  getAuthorizations(providerId?: string): Promise<ProviderAuthorization[]>;
  getAuthorizationById(id: string): Promise<ProviderAuthorization | null>;
  getResources(authorizationId?: string): Promise<ExternalResource[]>;
  getMappings(authorizationId?: string): Promise<ClientResourceMapping[]>;
  getIssues(): Promise<IntegrationIssue[]>;
  getIssueById(id: string): Promise<IntegrationIssue | null>;
  getActivities(): Promise<IntegrationActivity[]>;
  getReauthorizationRequests(): Promise<ReauthorizationRequest[]>;
  getSettings(): Promise<IntegrationSettings>;

  // Mutate
  updateProviderAvailability(
    providerId: string,
    newAvailability: PlatformAvailability,
    reason: string
  ): Promise<boolean>;
  updateProviderOperationalControls(
    providerId: string,
    controls: Partial<Pick<ProviderConfiguration, "allowNewConnections" | "allowExistingPublishing" | "allowExistingSync" | "enableWebhooks" | "maintenanceMode" | "visibilityInCompanyAdmin">>
  ): Promise<boolean>;
  updateProviderConfig(
    providerId: string,
    updates: Partial<ProviderConfiguration>
  ): Promise<boolean>;
  toggleCapability(capabilityId: string, enabled: boolean): Promise<boolean>;
  createReauthorizationRequest(params: {
    providerId: string;
    authorizationId: string;
    companyId: string;
    companyName: string;
    affectedAccount: string;
    affectedClients: string[];
    missingScopes: string[];
    reason: string;
    targetRole: "owner" | "admin";
  }): Promise<ReauthorizationRequest>;
  updateIssueStatus(
    issueId: string,
    newStatus: IssueStatus,
    noteContent?: string
  ): Promise<boolean>;
  assignIssueOwner(
    issueId: string,
    owner: { id: string; name: string; email: string } | null
  ): Promise<boolean>;
  addIssueNote(issueId: string, content: string): Promise<boolean>;
  updateSettings(newSettings: Partial<IntegrationSettings>): Promise<IntegrationSettings>;
  resetDemo(): Promise<void>;
}

export const integrationsRepository: IntegrationsRepository = {
  async getOverviewKpis(): Promise<IntegrationsKpis> {
    return store.computeIntegrationsKpis();
  },

  async getProviders(): Promise<IntegrationProvider[]> {
    return store.getAllProviders();
  },

  async getProviderById(id: string): Promise<IntegrationProvider | null> {
    return store.getProviderById(id) ?? null;
  },

  async getProviderConfig(providerId: string): Promise<ProviderConfiguration | null> {
    return store.getProviderConfig(providerId) ?? null;
  },

  async getProviderCapabilities(providerId?: string): Promise<ProviderCapability[]> {
    return store.getProviderCapabilities(providerId);
  },

  async getAuthorizations(providerId?: string): Promise<ProviderAuthorization[]> {
    const all = store.getAllAuthorizations();
    if (providerId) {
      return all.filter((a) => a.providerId === providerId);
    }
    return all;
  },

  async getAuthorizationById(id: string): Promise<ProviderAuthorization | null> {
    return store.getAuthorizationById(id) ?? null;
  },

  async getResources(authorizationId?: string): Promise<ExternalResource[]> {
    if (authorizationId) {
      return store.getResourcesByAuthorizationId(authorizationId);
    }
    return store.getAllResources();
  },

  async getMappings(authorizationId?: string): Promise<ClientResourceMapping[]> {
    const all = store.getAllMappings();
    if (authorizationId) {
      return all.filter((m) => m.authorizationId === authorizationId);
    }
    return all;
  },

  async getIssues(): Promise<IntegrationIssue[]> {
    return store.getAllIssues();
  },

  async getIssueById(id: string): Promise<IntegrationIssue | null> {
    return store.getIssueById(id) ?? null;
  },

  async getActivities(): Promise<IntegrationActivity[]> {
    return store.getAllActivities();
  },

  async getReauthorizationRequests(): Promise<ReauthorizationRequest[]> {
    return store.getAllReauthorizationRequests();
  },

  async getSettings(): Promise<IntegrationSettings> {
    return store.getSettings();
  },

  async updateProviderAvailability(
    providerId: string,
    newAvailability: PlatformAvailability,
    reason: string
  ): Promise<boolean> {
    return store.updateProviderAvailability(providerId, newAvailability, reason);
  },

  async updateProviderOperationalControls(
    providerId: string,
    controls: Partial<Pick<ProviderConfiguration, "allowNewConnections" | "allowExistingPublishing" | "allowExistingSync" | "enableWebhooks" | "maintenanceMode" | "visibilityInCompanyAdmin">>
  ): Promise<boolean> {
    return store.updateProviderOperationalControls(providerId, controls);
  },

  async updateProviderConfig(
    providerId: string,
    updates: Partial<ProviderConfiguration>
  ): Promise<boolean> {
    return store.updateProviderConfig(providerId, updates);
  },

  async toggleCapability(capabilityId: string, enabled: boolean): Promise<boolean> {
    return store.toggleCapability(capabilityId, enabled);
  },

  async createReauthorizationRequest(params): Promise<ReauthorizationRequest> {
    return store.createReauthorizationRequest(params);
  },

  async updateIssueStatus(
    issueId: string,
    newStatus: IssueStatus,
    noteContent?: string
  ): Promise<boolean> {
    return store.updateIssueStatus(issueId, newStatus, noteContent);
  },

  async assignIssueOwner(
    issueId: string,
    owner: { id: string; name: string; email: string } | null
  ): Promise<boolean> {
    return store.assignIssueOwner(issueId, owner);
  },

  async addIssueNote(issueId: string, content: string): Promise<boolean> {
    return store.addIssueNote(issueId, content);
  },

  async updateSettings(newSettings: Partial<IntegrationSettings>): Promise<IntegrationSettings> {
    return store.updateSettings(newSettings);
  },

  async resetDemo(): Promise<void> {
    store.resetDemoStore();
  },
};
