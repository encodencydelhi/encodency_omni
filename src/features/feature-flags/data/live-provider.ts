import { superAdminFeatureFlagsApi } from "../live/super-admin-feature-flags-api";
import type {
  ChangeOutcome,
  ConfigDiff,
  CreateFlagInput,
  Environment,
  FeatureFlag,
  FlagChange,
  FlagListQuery,
  MutationActor,
  ProposeChangeInput,
  ValidationIssue,
} from "./types";
import type {
  ActivityResult,
  ChangePreview,
  ChangesQuery,
  ChangesResult,
  CompanyAccessResult,
  CompanyImpactQuery,
  CompanyImpactResult,
  CompanyOption,
  EvaluationDetail,
  FlagDetail,
  FlagListResult,
  FlagsRepository,
  OverviewData,
  OverviewFilter,
  VersionComparison,
  VersionsResult,
} from "./repository";

export const liveFlagsProvider: FlagsRepository = {
  mode: "live",

  getOverview(environment: Environment, filter?: OverviewFilter): Promise<OverviewData> {
    return superAdminFeatureFlagsApi.getOverview(environment, filter);
  },

  listFlags(query: FlagListQuery): Promise<FlagListResult> {
    return superAdminFeatureFlagsApi.listFlags(query);
  },

  getFlag(key: string, environment: Environment): Promise<FlagDetail> {
    return superAdminFeatureFlagsApi.getFlag(key, environment);
  },

  previewChange(key: string, environment: Environment, proposed: Partial<ConfigDiff>): Promise<ChangePreview> {
    return superAdminFeatureFlagsApi.previewChange(key, environment, proposed);
  },

  proposeChange(input: ProposeChangeInput, _actor: MutationActor): Promise<ChangeOutcome> {
    return superAdminFeatureFlagsApi.proposeChange(input);
  },

  createFlag(input: CreateFlagInput, _actor: MutationActor): Promise<FeatureFlag> {
    return superAdminFeatureFlagsApi.createFlag(input);
  },

  validateCreate(input: CreateFlagInput): Promise<ValidationIssue[]> {
    return superAdminFeatureFlagsApi.validateCreate(input);
  },

  updateMetadata(
    key: string,
    patch: Partial<Pick<FeatureFlag, "description" | "ownerTeam" | "relatedModule" | "documentation">>,
    _actor: MutationActor,
  ): Promise<FeatureFlag> {
    return superAdminFeatureFlagsApi.updateMetadata(key, patch);
  },

  setLifecycle(key: string, action: "deprecate" | "archive", reason: string, _actor: MutationActor): Promise<FeatureFlag> {
    return superAdminFeatureFlagsApi.setLifecycle(key, action, reason);
  },

  listCompanyImpact(key: string, environment: Environment, query: CompanyImpactQuery): Promise<CompanyImpactResult> {
    return superAdminFeatureFlagsApi.listCompanyImpact(key, environment, query);
  },

  evaluateCompany(key: string, environment: Environment, companyId: string): Promise<EvaluationDetail> {
    return superAdminFeatureFlagsApi.evaluateCompany(key, environment, companyId);
  },

  getCompanyAccess(companyId: string, environment: Environment): Promise<CompanyAccessResult> {
    return superAdminFeatureFlagsApi.getCompanyAccess(companyId, environment);
  },

  searchCompanies(term: string): Promise<CompanyOption[]> {
    return superAdminFeatureFlagsApi.searchCompanies(term);
  },

  listChanges(query: ChangesQuery): Promise<ChangesResult> {
    return superAdminFeatureFlagsApi.listChanges(query);
  },

  getChange(id: string): Promise<FlagChange> {
    return superAdminFeatureFlagsApi.getChange(id);
  },

  cancelChange(id: string, reason: string, _actor: MutationActor): Promise<FlagChange> {
    return superAdminFeatureFlagsApi.cancelChange(id, reason);
  },

  listActivity(query: ChangesQuery): Promise<ActivityResult> {
    return superAdminFeatureFlagsApi.listActivity(query);
  },

  listVersions(flagKey: string | null, environment: Environment): Promise<VersionsResult> {
    return superAdminFeatureFlagsApi.listVersions(flagKey, environment);
  },

  compareVersions(fromId: string, toId: string): Promise<VersionComparison> {
    return superAdminFeatureFlagsApi.compareVersions(fromId, toId);
  },

  async resetDemoData(): Promise<void> {
    await superAdminFeatureFlagsApi.resetDemoData();
  },
};
