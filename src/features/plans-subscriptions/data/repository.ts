/**
 * The one seam between the Plans & Subscriptions UI and wherever its data lives.
 *
 *   Today:  UI -> hooks -> plansRepository -> shared mock provider (plan store + company bundles)
 *   Later:  UI -> hooks -> plansRepository -> backend commercial service
 *
 * Components never import a provider. When mock mode is off the repository
 * resolves to a provider that refuses to invent data.
 */
import type { PlanKey } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import { PLANS_MOCK_MODE } from "./config";
import { mockPlansProvider } from "./mock-provider";
import { unavailablePlansProvider } from "./unavailable-provider";
import type {
  CancellationInput,
  ConversionInput,
  CreatePlanInput,
  MutationActor,
  OverviewData,
  OverrideInput,
  PlanActivity,
  PlanAvailability,
  PlanChangeImpact,
  PlanChangeInput,
  PlanChoice,
  PlanDraftInput,
  PlanIssue,
  PlanListQuery,
  PlanSummary,
  PlansPortfolio,
  PublishInput,
  ReactivationInput,
  ScheduledChangeView,
  SubscriptionDetail,
  SubscriptionEvent,
  SubscriptionListQuery,
  SubscriptionListResult,
  SubscriptionPolicy,
  SubscriptionRow,
  TrendMetric,
  TrendPeriod,
  TrendPoint,
  TrialExtensionInput,
  TrialRow,
  VersionImpact,
} from "./types";

export interface PlanListResult {
  summaries: PlanSummary[];
  portfolio: PlansPortfolio;
}

export interface PlanDetailData {
  summary: PlanSummary;
  activity: PlanActivity[];
  /** Active subscriptions on each version number. */
  subscribersByVersion: Record<number, number>;
}

export interface SubscriptionFacets {
  companies: Array<{ id: string; name: string }>;
  plans: Array<{ key: PlanKey; name: string }>;
}

export interface TrialQuery {
  state?: string;
  search?: string;
}

export interface CompaniesLite {
  id: string;
  name: string;
  planKey: PlanKey;
  version: number;
  subscriptionId: string;
}

export interface PlansRepository {
  readonly mode: "mock" | "unavailable";

  /* Reads */
  getOverview(): Promise<OverviewData>;
  getTrend(metric: TrendMetric, period: TrendPeriod): Promise<TrendPoint[]>;
  listPlans(query: PlanListQuery): Promise<PlanListResult>;
  getPlan(id: string): Promise<PlanDetailData>;
  /** Plans as they read for comparison: every plan with a published version or a draft. */
  getComparison(): Promise<PlanSummary[]>;
  previewImpact(planId: string, input: PlanDraftInput): Promise<VersionImpact>;
  validatePlan(input: PlanDraftInput, planId?: string): Promise<PlanIssue[]>;
  listCompaniesOnPlan(planId: string): Promise<CompaniesLite[]>;

  listSubscriptions(query: SubscriptionListQuery): Promise<SubscriptionListResult>;
  exportSubscriptions(scope: { query?: SubscriptionListQuery; ids?: string[] }): Promise<SubscriptionRow[]>;
  getFacets(): Promise<SubscriptionFacets>;
  getSubscription(id: string): Promise<SubscriptionDetail>;
  getPlanChangeImpact(subscriptionId: string, planKey: PlanKey, cycle: BillingCycle): Promise<PlanChangeImpact>;
  listSelectablePlans(subscriptionId: string): Promise<PlanChoice[]>;

  getTrials(query: TrialQuery): Promise<TrialRow[]>;
  getScheduledChanges(): Promise<ScheduledChangeView[]>;
  getRecentChanges(): Promise<SubscriptionEvent[]>;
  getPolicy(): Promise<SubscriptionPolicy>;

  /* Plan mutations */
  createPlan(input: CreatePlanInput, actor: MutationActor): Promise<PlanSummary>;
  saveDraft(planId: string, input: PlanDraftInput, actor: MutationActor): Promise<PlanSummary>;
  startNewVersion(planId: string, actor: MutationActor): Promise<PlanSummary>;
  discardDraft(planId: string, actor: MutationActor): Promise<PlanSummary>;
  publishPlan(planId: string, input: PublishInput, actor: MutationActor): Promise<PlanSummary>;
  setAvailability(planId: string, availability: PlanAvailability, actor: MutationActor): Promise<PlanSummary>;
  hidePlan(planId: string, actor: MutationActor): Promise<PlanSummary>;
  showPlan(planId: string, actor: MutationActor): Promise<PlanSummary>;
  retirePlan(planId: string, input: { reason: string }, actor: MutationActor): Promise<PlanSummary>;

  /* Subscription mutations */
  changeCompanyPlan(subscriptionId: string, input: PlanChangeInput, actor: MutationActor): Promise<SubscriptionDetail>;
  extendTrial(subscriptionId: string, input: TrialExtensionInput, actor: MutationActor): Promise<SubscriptionDetail>;
  convertTrial(subscriptionId: string, input: ConversionInput, actor: MutationActor): Promise<SubscriptionDetail>;
  endTrial(subscriptionId: string, input: { reason: string }, actor: MutationActor): Promise<SubscriptionDetail>;
  cancelSubscription(subscriptionId: string, input: CancellationInput, actor: MutationActor): Promise<SubscriptionDetail>;
  undoCancellation(subscriptionId: string, input: { reason: string }, actor: MutationActor): Promise<SubscriptionDetail>;
  reactivateSubscription(subscriptionId: string, input: ReactivationInput, actor: MutationActor): Promise<SubscriptionDetail>;
  cancelScheduledChange(subscriptionId: string, input: { target: "plan_change" | "cancellation"; reason: string }, actor: MutationActor): Promise<SubscriptionDetail>;
  rescheduleChange(subscriptionId: string, input: { effectiveAt: string; reason: string }, actor: MutationActor): Promise<SubscriptionDetail>;
  grantOverride(subscriptionId: string, input: OverrideInput, actor: MutationActor): Promise<SubscriptionDetail>;
  revokeOverride(subscriptionId: string, overrideId: string, input: { reason: string }, actor: MutationActor): Promise<SubscriptionDetail>;
  savePolicy(policy: SubscriptionPolicy, actor: MutationActor): Promise<SubscriptionPolicy>;

  /** Demo workspace only: discard this session's changes (shared with Companies and Clients). */
  resetDemoData?(): Promise<void>;
}

export const plansRepository: PlansRepository = PLANS_MOCK_MODE ? mockPlansProvider : unavailablePlansProvider;
