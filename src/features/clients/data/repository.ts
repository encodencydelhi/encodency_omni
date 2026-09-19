/**
 * The one seam between the Clients workspace UI and wherever its data lives.
 *
 *   Today:  UI -> hooks -> clientsRepository -> shared mock provider (company bundles)
 *   Later:  UI -> hooks -> clientsRepository -> backend client service
 *
 * Components never import a provider. When mock mode is off the repository
 * resolves to a provider that refuses to invent data.
 */
import { CLIENTS_MOCK_MODE } from "./config";
import { mockClientsProvider } from "./mock-provider";
import { unavailableClientsProvider } from "./unavailable-provider";
import type {
  BulkResult,
  ClientActivityData,
  ClientActivityFilter,
  ClientChannelsData,
  ClientCreationCompany,
  ClientFacets,
  ClientListQuery,
  ClientListResult,
  ClientOnboardingConfig,
  ClientOverviewData,
  ClientPortfolio,
  ClientSettingsData,
  ClientSummary,
  ClientTeamData,
  ClientWebsiteData,
  ClientAccessLevel,
  CreateClientInput,
  EligibleMember,
  MutationActor,
  OnboardingStepKey,
  PauseReason,
  UpdateClientInput,
} from "./types";

export type LifecycleAction =
  | { kind: "pause"; reason: PauseReason; note: string }
  | { kind: "resume"; note: string }
  | { kind: "archive"; note: string };

export interface ClientsRepository {
  readonly mode: "mock" | "unavailable";

  /* Reads */
  listClients(query: ClientListQuery): Promise<ClientListResult>;
  exportClients(scope: { query?: ClientListQuery; ids?: string[] }): Promise<ClientSummary[]>;
  getPortfolio(): Promise<ClientPortfolio>;
  getFacets(): Promise<ClientFacets>;
  /** Every company with its client-creation eligibility, for the create wizard. */
  listCreationCompanies(): Promise<ClientCreationCompany[]>;
  /** Members of one company who could be assigned to a client (active memberships only). */
  listEligibleMembers(companyId: string, clientId?: string): Promise<EligibleMember[]>;
  getClient(id: string): Promise<ClientSummary>;
  getOverview(id: string): Promise<ClientOverviewData>;
  getTeam(id: string): Promise<ClientTeamData>;
  getChannels(id: string): Promise<ClientChannelsData>;
  getWebsiteSeo(id: string): Promise<ClientWebsiteData>;
  getActivity(id: string, filter: ClientActivityFilter): Promise<ClientActivityData>;
  getSettings(id: string): Promise<ClientSettingsData>;

  /* Lifecycle and identity */
  createClient(input: CreateClientInput, actor: MutationActor): Promise<ClientSummary>;
  updateClient(id: string, input: UpdateClientInput, actor: MutationActor): Promise<ClientSummary>;
  changeLifecycle(ids: string[], action: LifecycleAction, actor: MutationActor): Promise<BulkResult>;

  /* Team */
  assignMember(id: string, input: { membershipId: string; level: ClientAccessLevel }, actor: MutationActor): Promise<ClientSummary>;
  changeAccess(id: string, input: { membershipId: string; level: ClientAccessLevel }, actor: MutationActor): Promise<ClientSummary>;
  removeAccess(id: string, input: { membershipId: string; newLeadId?: string | null; note: string }, actor: MutationActor): Promise<ClientSummary>;
  setLead(id: string, membershipId: string | null, actor: MutationActor): Promise<ClientSummary>;

  /* Websites */
  addWebsite(id: string, input: { url: string; makePrimary: boolean }, actor: MutationActor): Promise<ClientSummary>;
  setPrimaryWebsite(id: string, websiteId: string, actor: MutationActor): Promise<ClientSummary>;
  removeWebsite(id: string, websiteId: string, actor: MutationActor): Promise<ClientSummary>;

  /* Governance */
  setOnboardingRequirements(id: string, required: Record<OnboardingStepKey, boolean>, actor: MutationActor): Promise<ClientSummary>;
  markAccessReviewed(id: string, actor: MutationActor): Promise<ClientSummary>;
  setPlatformReviewer(id: string, staffId: string | null, actor: MutationActor): Promise<ClientSummary>;
  requestReconnection(id: string, connectionId: string, actor: MutationActor): Promise<ClientSummary>;

  /** Demo workspace only: discard this session's changes (shared with Companies). */
  resetDemoData?(): Promise<void>;
}

export type { ClientOnboardingConfig };

export const clientsRepository: ClientsRepository = CLIENTS_MOCK_MODE ? mockClientsProvider : unavailableClientsProvider;
