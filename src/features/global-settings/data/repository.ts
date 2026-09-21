/**
 * The one seam between the Global Settings UI and wherever its data lives.
 *
 *   Today:  UI -> hooks -> settingsRepository -> shared mock provider
 *   Later:  UI -> hooks -> settingsRepository -> authenticated configuration service
 *
 * Components never import a provider. When mock mode is off the repository
 * resolves to a provider that refuses to invent configuration.
 */
import { SETTINGS_MOCK_MODE } from "./config";
import { mockSettingsProvider } from "./mock-provider";
import { unavailableSettingsProvider } from "./unavailable-provider";
import type {
  ChangeListResult,
  ChangeQuery,
  ChangeReview,
  ConfigurationChange,
  ConfigurationSnapshot,
  ConfigurationVersion,
  EditableSectionKey,
  MutationActor,
  NewCompanyDefaults,
  SaveResult,
  SaveSectionInput,
  SecurityReviewData,
  SettingValues,
  VersionComparison,
} from "./types";

export interface SettingsRepository {
  readonly mode: "mock" | "unavailable";
  getConfiguration(): Promise<ConfigurationSnapshot>;
  getNewCompanyDefaults(): Promise<NewCompanyDefaults>;
  /** The review a save would show: what changes, who is affected, what is held. Nothing is written. */
  reviewChanges(section: EditableSectionKey, patch: SettingValues): Promise<ChangeReview>;
  saveSection(input: SaveSectionInput, actor: MutationActor): Promise<SaveResult>;
  listChanges(query: ChangeQuery): Promise<ChangeListResult>;
  getChange(id: string): Promise<ConfigurationChange>;
  listPending(): Promise<ConfigurationChange[]>;
  withdrawPending(id: string, reason: string, actor: MutationActor): Promise<ConfigurationChange>;
  listVersions(): Promise<ConfigurationVersion[]>;
  compareVersions(fromId: string, toId: string): Promise<VersionComparison>;
  getSecurityReview(): Promise<SecurityReviewData>;
  resetDemoData?(): Promise<void>;
}

export const settingsRepository: SettingsRepository = SETTINGS_MOCK_MODE ? mockSettingsProvider : unavailableSettingsProvider;
