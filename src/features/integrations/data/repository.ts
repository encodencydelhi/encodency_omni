/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Integrations Repository Interface & Async Implementation
 *
 *   Mock mode:   UI → hooks → integrationsRepository → mock store (in-memory, demo)
 *   API mode:    UI → hooks → integrationsRepository → api provider (GET /integrations/registry)
 *                ... with an injected demo fallback for everything the backend
 *                does not serve yet (configs, connections, issues, mutations, ...)
 *
 * Components never import a provider. Connecting more backend endpoints means
 * implementing them once inside `api-provider.ts`; no page, hook or component
 * changes.
 */

import { createApiIntegrationsProvider } from "./api-provider";
import { INTEGRATIONS_MOCK_MODE } from "./config";
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
  readonly mode: "mock" | "api";

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
  /** People an issue can be assigned to: active platform staff. */
  getIssueOwners(): Promise<{ id: string; name: string; email: string }[]>;

  // Mutate
  updateProviderAvailability(
    providerId: string,
    newAvailability: PlatformAvailability,
    reason: string
  ): Promise<boolean>;
  updateProviderOperationalControls(
    providerId: string,
    controls: Partial<Pick<ProviderConfiguration, "allowNewConnections" | "maintenanceMode">>
  ): Promise<boolean>;
  updateProviderConfig(
    providerId: string,
    updates: Partial<ProviderConfiguration>
  ): Promise<boolean>;
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

const mockIntegrationsProvider: IntegrationsRepository = {
  mode: "mock",

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

  async getIssueOwners(): Promise<{ id: string; name: string; email: string }[]> {
    return [
      { id: "usr_superadmin", name: "Super Administrator", email: "admin@encodency.com" },
      { id: "usr_support", name: "Support Lead", email: "support@encodency.com" },
    ];
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
    controls: Partial<Pick<ProviderConfiguration, "allowNewConnections" | "maintenanceMode">>
  ): Promise<boolean> {
    return store.updateProviderOperationalControls(providerId, controls);
  },

  async updateProviderConfig(
    providerId: string,
    updates: Partial<ProviderConfiguration>
  ): Promise<boolean> {
    return store.updateProviderConfig(providerId, updates);
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

const useLiveIntegrations = !INTEGRATIONS_MOCK_MODE || process.env.NEXT_PUBLIC_DATA_SOURCE === "api";

export const integrationsRepository: IntegrationsRepository = useLiveIntegrations
  ? createApiIntegrationsProvider()
  : mockIntegrationsProvider;
