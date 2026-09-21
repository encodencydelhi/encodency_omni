/**
 * The one seam between the Feature Flags UI and wherever its data lives.
 *
 *   Today:  UI -> hooks -> flagsRepository -> shared mock provider (flag store + company and plan records)
 *   Later:  UI -> hooks -> flagsRepository -> backend feature-management service
 *
 * Components never import a provider. When mock mode is off the repository
 * resolves to a provider that refuses to invent flags.
 */
import { FLAGS_MOCK_MODE } from "./config";
import { mockFlagsProvider } from "./mock-provider";
import { unavailableFlagsProvider } from "./unavailable-provider";
import type { ApprovalDecision } from "./selectors";
import type {
  AttentionItem,
  ChangeOutcome,
  ChangeStatus,
  ChangeType,
  CompanyEvaluation,
  ConfigDiff,
  ConfigVersion,
  CreateFlagInput,
  Dependencies,
  Environment,
  FeatureFlag,
  FlagActivity,
  FlagChange,
  FlagListQuery,
  FlagRow,
  FlagStats,
  ImpactSummary,
  MutationActor,
  ProposeChangeInput,
  ValidationIssue,
} from "./types";

export interface OverviewData {
  environment: Environment;
  kpis: { total: number; globallyEnabled: number; disabled: number; activeRollouts: number; scheduled: number; pendingApproval: number; emergencyOff: number; cleanup: number };
  rollouts: FlagRow[];
  attention: AttentionItem[];
  activity: FlagActivity[];
  updatedAt: string;
  facets: { owners: string[]; categories: string[] };
}

export interface OverviewFilter {
  category?: string;
  owner?: string;
}

export interface FlagListResult {
  rows: FlagRow[];
  summary: { total: number; enabled: number; disabled: number; targeted: number; internal: number; emergency: number; archived: number };
  facets: { owners: string[]; categories: string[] };
}

export interface FlagDetail {
  flag: FeatureFlag;
  row: FlagRow;
  dependencies: Dependencies;
  dependencyFlags: Array<{ key: string; name: string; state: string; lifecycle: string }>;
  attention: AttentionItem[];
  activity: FlagActivity[];
  changes: FlagChange[];
  archiveBlockers: string[];
  /** Other flags the dependency editor may add: registered, not archived and not creating a cycle. */
  candidatePrerequisites: Array<{ key: string; name: string }>;
}

export interface ChangePreview {
  before: ConfigDiff;
  after: ConfigDiff;
  type: ChangeType | null;
  impact: ImpactSummary;
  decision: ApprovalDecision;
  issues: ValidationIssue[];
  noChange: boolean;
}

export interface CompanyImpactQuery {
  search?: string;
  plan?: string;
  targeting?: string;
  availability?: string;
  reason?: string;
}

export interface CompanyImpactResult {
  rows: CompanyEvaluation[];
  stats: FlagStats;
  facets: { plans: string[] };
}

export interface CompanyAccessRow {
  flag: { key: string; name: string; category: string; type: string; implementation: string; lifecycle: string; entitlement: string | null };
  evaluation: CompanyEvaluation;
  state: string;
}

export interface CompanyAccessResult {
  company: { id: string; name: string; displayId: string; accountActive: boolean; planName: string; subscriptionId: string; subscriptionStatus: string };
  environment: Environment;
  rows: CompanyAccessRow[];
  counts: { total: number; available: number; planBlocked: number; rolloutBlocked: number; dependencyBlocked: number; integrationBlocked: number };
}

export interface CompanyOption {
  id: string;
  name: string;
  displayId: string;
  plan: string;
  status: string;
}

export interface EvaluationDetail {
  flag: FeatureFlag;
  evaluation: CompanyEvaluation;
  prerequisites: Array<{ key: string; name: string; availability: string; ok: boolean }>;
}

export interface ChangesQuery {
  environment?: Environment;
  status?: ChangeStatus[];
  flagKey?: string;
  type?: string;
  actor?: string;
  result?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ChangesResult {
  rows: FlagChange[];
  total: number;
  page: number;
  pageSize: number;
  actors: string[];
}

export interface ActivityResult {
  rows: FlagActivity[];
  total: number;
  page: number;
  pageSize: number;
  actors: string[];
}

export interface VersionsResult {
  rows: ConfigVersion[];
}

export interface VersionComparison {
  from: ConfigVersion;
  to: ConfigVersion;
  rows: Array<{ field: string; from: string; to: string; changed: boolean }>;
}

export interface FlagsRepository {
  readonly mode: "mock" | "unavailable";
  getOverview(environment: Environment, filter?: OverviewFilter): Promise<OverviewData>;
  listFlags(query: FlagListQuery): Promise<FlagListResult>;
  getFlag(key: string, environment: Environment): Promise<FlagDetail>;
  previewChange(key: string, environment: Environment, proposed: Partial<ConfigDiff>): Promise<ChangePreview>;
  proposeChange(input: ProposeChangeInput, actor: MutationActor): Promise<ChangeOutcome>;
  createFlag(input: CreateFlagInput, actor: MutationActor): Promise<FeatureFlag>;
  validateCreate(input: CreateFlagInput): Promise<ValidationIssue[]>;
  updateMetadata(key: string, patch: Partial<Pick<FeatureFlag, "description" | "ownerTeam" | "relatedModule" | "documentation">>, actor: MutationActor): Promise<FeatureFlag>;
  setLifecycle(key: string, action: "deprecate" | "archive", reason: string, actor: MutationActor): Promise<FeatureFlag>;
  listCompanyImpact(key: string, environment: Environment, query: CompanyImpactQuery): Promise<CompanyImpactResult>;
  evaluateCompany(key: string, environment: Environment, companyId: string): Promise<EvaluationDetail>;
  getCompanyAccess(companyId: string, environment: Environment): Promise<CompanyAccessResult>;
  searchCompanies(term: string): Promise<CompanyOption[]>;
  listChanges(query: ChangesQuery): Promise<ChangesResult>;
  getChange(id: string): Promise<FlagChange>;
  cancelChange(id: string, reason: string, actor: MutationActor): Promise<FlagChange>;
  listActivity(query: ChangesQuery): Promise<ActivityResult>;
  listVersions(flagKey: string | null, environment: Environment): Promise<VersionsResult>;
  compareVersions(fromId: string, toId: string): Promise<VersionComparison>;
  resetDemoData?(): Promise<void>;
}

export const flagsRepository: FlagsRepository = FLAGS_MOCK_MODE ? mockFlagsProvider : unavailableFlagsProvider;
