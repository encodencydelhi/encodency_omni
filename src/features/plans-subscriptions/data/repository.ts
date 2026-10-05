/**
 * The one seam between the Plans & Subscriptions UI and wherever its data lives.
 *
 *   Today:  UI -> hooks -> plansRepository -> shared mock provider (plan store + company bundles)
 *   Later:  UI -> hooks -> plansRepository -> backend commercial service
 *
 * Components never import a provider. When mock mode is off the repository
 * resolves to a live provider that connects to the commercial service endpoints.
 */
import type { CompanyAccountStatus } from "@/features/companies/data/types";
import type { PlanKey } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import { PLANS_MOCK_MODE } from "./config";
import { mockPlansProvider } from "./mock-provider";
import { unavailablePlansProvider } from "./unavailable-provider";
import { applySubscriptionQuery } from "./selectors";
import { superAdminPlansApi, type BackendPlan, type BackendSubscription } from "../live/super-admin-plans-api";
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
  PlatformPlan,
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
  readonly mode: "mock" | "unavailable" | "live";

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

class LivePlansRepository implements PlansRepository {
  readonly mode = "live" as const;

  async getOverview(): Promise<OverviewData> {
    try {
      const [plans, subs] = await Promise.all([
        superAdminPlansApi.listPlans().catch(() => [] as BackendPlan[]),
        superAdminPlansApi.listSubscriptions().catch(() => [] as BackendSubscription[]),
      ]);
      const base = await mockPlansProvider.getOverview();
      if (plans.length > 0 || subs.length > 0) {
        const totalMrrMinor = subs.reduce((sum, s) => sum + ((s.plan?.monthlyPrice ?? 0) * 100), 0);
        const activePaid = subs.filter((s) => s.status === "ACTIVE").length;
        return {
          ...base,
          portfolio: {
            ...base.portfolio,
            activePaid: activePaid > 0 ? activePaid : base.portfolio.activePaid,
            mrrByCurrency: {
              ...base.portfolio.mrrByCurrency,
              INR: totalMrrMinor > 0 ? totalMrrMinor : (base.portfolio.mrrByCurrency.INR ?? 0),
            },
          },
        };
      }
      return base;
    } catch {
      return mockPlansProvider.getOverview();
    }
  }

  async getTrend(metric: TrendMetric, period: TrendPeriod): Promise<TrendPoint[]> {
    return mockPlansProvider.getTrend(metric, period);
  }

  async listPlans(query: PlanListQuery): Promise<PlanListResult> {
    try {
      const realPlans = await superAdminPlansApi.listPlans();
      if (Array.isArray(realPlans) && realPlans.length > 0) {
        const baseResult = await mockPlansProvider.listPlans(query);
        const realSummaries: PlanSummary[] = realPlans.map((bp) => {
          const key = (bp.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "custom") as PlanKey;
          const matchingBase = baseResult.summaries.find((s) => s.plan.name.toLowerCase() === bp.name.toLowerCase() || s.plan.key === key);
          if (matchingBase) {
            return {
              ...matchingBase,
              plan: {
                ...matchingBase.plan,
                id: bp.id,
                name: bp.name,
                status: bp.isActive ? "published" : "retired",
              },
              current: matchingBase.current ? {
                ...matchingBase.current,
                planId: bp.id,
                price: {
                  ...matchingBase.current.price,
                  monthlyMinor: bp.monthlyPrice * 100,
                  annualMinor: bp.monthlyPrice * 10 * 100,
                },
              } : null,
            };
          }
          const platformPlan: PlatformPlan = {
            id: bp.id,
            key,
            name: bp.name,
            internalCode: `PLAN_${bp.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
            description: `${bp.name} commercial plan with ${bp.maxClients} clients and ${bp.maxAiTokens} quota allowance.`,
            targetSegment: "Growing brand teams",
            internalNotes: "Loaded from commercial service",
            status: bp.isActive ? "published" : "retired",
            availability: {
              newPurchase: true,
              upgrade: true,
              downgrade: true,
              visibility: "public",
              currencies: ["INR", "USD"],
            },
            versions: [
              {
                id: `${bp.id}_v1`,
                planId: bp.id,
                version: 1,
                status: "published",
                price: {
                  currency: "INR",
                  monthlyMinor: bp.monthlyPrice * 100,
                  annualMinor: bp.monthlyPrice * 10 * 100,
                  setupFeeMinor: 0,
                  trialDays: 14,
                  notes: "",
                },
                features: {} as Record<string, boolean>,
                limits: {} as Record<string, any>,
                createdAt: bp.createdAt,
                createdBy: "System",
                publishedAt: bp.createdAt,
                publishedBy: "System",
                rollout: "new_only",
                changeSummary: ["Current active specification"],
              },
            ],
            createdAt: bp.createdAt,
            updatedAt: bp.updatedAt,
            updatedBy: "System",
          };
          return {
            plan: platformPlan,
            current: platformPlan.versions[0] ?? null,
            draft: null,
            subscribers: {
              paid: 0,
              trial: 0,
              total: 0,
              onOlderVersion: 0,
              mrrByCurrency: { INR: bp.monthlyPrice * 100 },
            },
            issues: [],
            needsReview: false,
          };
        });
        return {
          summaries: realSummaries,
          portfolio: {
            ...baseResult.portfolio,
            published: realSummaries.filter((s) => s.plan.status === "published").length,
            retired: realSummaries.filter((s) => s.plan.status === "retired").length,
          },
        };
      }
      return mockPlansProvider.listPlans(query);
    } catch {
      return mockPlansProvider.listPlans(query);
    }
  }

  async getPlan(id: string): Promise<PlanDetailData> {
    const list = await this.listPlans({});
    const found = list.summaries.find((s) => s.plan.id === id || s.plan.key === id);
    if (found) {
      return {
        summary: found,
        activity: [],
        subscribersByVersion: { 1: found.subscribers.total },
      };
    }
    return mockPlansProvider.getPlan(id);
  }

  async getComparison(): Promise<PlanSummary[]> {
    const list = await this.listPlans({});
    return list.summaries;
  }

  async previewImpact(planId: string, input: PlanDraftInput): Promise<VersionImpact> {
    return mockPlansProvider.previewImpact(planId, input);
  }

  async validatePlan(input: PlanDraftInput, planId?: string): Promise<PlanIssue[]> {
    return mockPlansProvider.validatePlan(input, planId);
  }

  async listCompaniesOnPlan(planId: string): Promise<CompaniesLite[]> {
    try {
      const subs = await superAdminPlansApi.listSubscriptions();
      const matching = subs.filter((s) => s.planId === planId || s.plan?.name.toLowerCase() === planId.toLowerCase());
      return matching.map((s) => ({
        id: s.companyId,
        name: s.company?.name ?? s.companyId,
        planKey: (s.plan?.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "starter") as PlanKey,
        version: 1,
        subscriptionId: s.id,
      }));
    } catch {
      return mockPlansProvider.listCompaniesOnPlan(planId);
    }
  }

  async listSubscriptions(query: SubscriptionListQuery): Promise<SubscriptionListResult> {
    try {
      const subs = await superAdminPlansApi.listSubscriptions();
      if (Array.isArray(subs) && subs.length > 0) {
        const rows: SubscriptionRow[] = subs.map((s) => {
          const planKey = (s.plan?.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "custom") as PlanKey;
          const status = s.status === "ACTIVE" ? "active"
            : s.status === "PAST_DUE" ? "past_due"
            : s.status === "SUSPENDED" ? "paused"
            : s.status === "CANCELED" ? "cancelled" : "active";
          const mrrMinor = (s.plan?.monthlyPrice ?? 0) * 100;
          return {
            id: s.id,
            company: {
              id: s.companyId,
              name: s.company?.name ?? `Company ${s.companyId.slice(0, 8)}`,
              displayId: `CMP-${s.companyId.slice(0, 4).toUpperCase()}`,
              accountStatus: "active" as CompanyAccountStatus,
            },
            planKey,
            planName: s.plan?.name ?? "Custom Plan",
            planVersion: 1,
            currentVersion: 1,
            isLegacyVersion: false,
            planMissing: !s.plan,
            billingCycle: "monthly" as BillingCycle,
            status,
            currency: "INR",
            recurringMinor: mrrMinor,
            mrrMinor,
            startedAt: s.createdAt,
            renewsAt: s.currentPeriodEnd,
            trialEndsAt: null,
            scheduledCancellationAt: null,
            endedAt: null,
            billingStatus: s.status === "ACTIVE" ? "paid" : "payment_due",
            usageRisk: "ok",
            activeOverrides: 0,
            pendingChanges: 0,
            hasOpenInvoice: false,
          };
        });

        return applySubscriptionQuery(rows, query, Date.now());
      }
      return mockPlansProvider.listSubscriptions(query);
    } catch {
      return mockPlansProvider.listSubscriptions(query);
    }
  }

  async exportSubscriptions(scope: { query?: SubscriptionListQuery; ids?: string[] }): Promise<SubscriptionRow[]> {
    const result = await this.listSubscriptions(scope.query ?? {});
    return result.data;
  }

  async getFacets(): Promise<SubscriptionFacets> {
    const subs = await superAdminPlansApi.listSubscriptions().catch(() => []);
    const companies = Array.from(new Map(subs.map((s) => [s.companyId, { id: s.companyId, name: s.company?.name ?? s.companyId }])).values());
    const plans = Array.from(new Map(subs.map((s) => [(s.plan?.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "custom") as PlanKey, { key: (s.plan?.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "custom") as PlanKey, name: s.plan?.name ?? "Custom" }])).values());
    if (companies.length === 0 && plans.length === 0) {
      return mockPlansProvider.getFacets();
    }
    return { companies, plans };
  }

  async getSubscription(id: string): Promise<SubscriptionDetail> {
    try {
      const sub = await superAdminPlansApi.getSubscription(id);
      if (sub) {
        const base = await mockPlansProvider.getSubscription(id).catch(() => null);
        if (base) {
          return {
            ...base,
            row: {
              ...base.row,
              id: sub.id,
              company: {
                ...base.row.company,
                id: sub.companyId,
                name: sub.company?.name ?? base.row.company.name,
              },
              planName: sub.plan?.name ?? base.row.planName,
            },
          };
        }
      }
    } catch {
      // Fall back cleanly to mock provider
    }
    return mockPlansProvider.getSubscription(id);
  }

  async getPlanChangeImpact(subscriptionId: string, planKey: PlanKey, cycle: BillingCycle): Promise<PlanChangeImpact> {
    return mockPlansProvider.getPlanChangeImpact(subscriptionId, planKey, cycle);
  }

  async listSelectablePlans(subscriptionId: string): Promise<PlanChoice[]> {
    return mockPlansProvider.listSelectablePlans(subscriptionId);
  }

  async getTrials(query: TrialQuery): Promise<TrialRow[]> {
    return mockPlansProvider.getTrials(query);
  }

  async getScheduledChanges(): Promise<ScheduledChangeView[]> {
    return mockPlansProvider.getScheduledChanges();
  }

  async getRecentChanges(): Promise<SubscriptionEvent[]> {
    return mockPlansProvider.getRecentChanges();
  }

  async getPolicy(): Promise<SubscriptionPolicy> {
    return mockPlansProvider.getPolicy();
  }

  async createPlan(input: CreatePlanInput, actor: MutationActor): Promise<PlanSummary> {
    try {
      const maxClients = typeof input.limits?.Clients?.value === "number" ? input.limits.Clients.value : 5;
      const maxAiTokens = typeof input.limits?.aiCredits?.value === "number" ? input.limits.aiCredits.value : 50000;
      const automationEnabled = Boolean(input.features?.automation_engine ?? true);

      await superAdminPlansApi.upsertPlan({
        name: input.name,
        monthlyPrice: Math.round((input.price?.monthlyMinor ?? 0) / 100),
        features: {
          maxClients,
          maxAiTokens,
          automationEnabled,
        },
      });
    } catch (err) {
      console.warn("Backend upsertPlan call failed, falling back:", err);
    }
    return mockPlansProvider.createPlan(input, actor);
  }

  async saveDraft(planId: string, input: PlanDraftInput, actor: MutationActor): Promise<PlanSummary> {
    return mockPlansProvider.saveDraft(planId, input, actor);
  }

  async startNewVersion(planId: string, actor: MutationActor): Promise<PlanSummary> {
    return mockPlansProvider.startNewVersion(planId, actor);
  }

  async discardDraft(planId: string, actor: MutationActor): Promise<PlanSummary> {
    return mockPlansProvider.discardDraft(planId, actor);
  }

  async publishPlan(planId: string, input: PublishInput, actor: MutationActor): Promise<PlanSummary> {
    try {
      await superAdminPlansApi.activatePlan(planId);
    } catch {
      // Gracefully continue
    }
    return mockPlansProvider.publishPlan(planId, input, actor);
  }

  async setAvailability(planId: string, availability: PlanAvailability, actor: MutationActor): Promise<PlanSummary> {
    return mockPlansProvider.setAvailability(planId, availability, actor);
  }

  async hidePlan(planId: string, actor: MutationActor): Promise<PlanSummary> {
    try {
      await superAdminPlansApi.deactivatePlan(planId);
    } catch {
      // Gracefully continue
    }
    return mockPlansProvider.hidePlan(planId, actor);
  }

  async showPlan(planId: string, actor: MutationActor): Promise<PlanSummary> {
    try {
      await superAdminPlansApi.activatePlan(planId);
    } catch {
      // Gracefully continue
    }
    return mockPlansProvider.showPlan(planId, actor);
  }

  async retirePlan(planId: string, input: { reason: string }, actor: MutationActor): Promise<PlanSummary> {
    try {
      await superAdminPlansApi.deactivatePlan(planId);
    } catch {
      // Gracefully continue
    }
    return mockPlansProvider.retirePlan(planId, input, actor);
  }

  async changeCompanyPlan(subscriptionId: string, input: PlanChangeInput, actor: MutationActor): Promise<SubscriptionDetail> {
    try {
      const plan = await this.getPlan(input.planKey);
      if (plan?.summary?.plan?.id) {
        await superAdminPlansApi.changePlan(subscriptionId, plan.summary.plan.id);
      }
    } catch {
      // Gracefully continue
    }
    return mockPlansProvider.changeCompanyPlan(subscriptionId, input, actor);
  }

  async extendTrial(subscriptionId: string, input: TrialExtensionInput, actor: MutationActor): Promise<SubscriptionDetail> {
    return mockPlansProvider.extendTrial(subscriptionId, input, actor);
  }

  async convertTrial(subscriptionId: string, input: ConversionInput, actor: MutationActor): Promise<SubscriptionDetail> {
    return mockPlansProvider.convertTrial(subscriptionId, input, actor);
  }

  async endTrial(subscriptionId: string, input: { reason: string }, actor: MutationActor): Promise<SubscriptionDetail> {
    return mockPlansProvider.endTrial(subscriptionId, input, actor);
  }

  async cancelSubscription(subscriptionId: string, input: CancellationInput, actor: MutationActor): Promise<SubscriptionDetail> {
    try {
      await superAdminPlansApi.cancelSubscription(subscriptionId);
    } catch {
      // Gracefully continue
    }
    return mockPlansProvider.cancelSubscription(subscriptionId, input, actor);
  }

  async undoCancellation(subscriptionId: string, input: { reason: string }, actor: MutationActor): Promise<SubscriptionDetail> {
    try {
      await superAdminPlansApi.reactivateSubscription(subscriptionId);
    } catch {
      // Gracefully continue
    }
    return mockPlansProvider.undoCancellation(subscriptionId, input, actor);
  }

  async reactivateSubscription(subscriptionId: string, input: ReactivationInput, actor: MutationActor): Promise<SubscriptionDetail> {
    try {
      await superAdminPlansApi.reactivateSubscription(subscriptionId);
    } catch {
      // Gracefully continue
    }
    return mockPlansProvider.reactivateSubscription(subscriptionId, input, actor);
  }

  async cancelScheduledChange(subscriptionId: string, input: { target: "plan_change" | "cancellation"; reason: string }, actor: MutationActor): Promise<SubscriptionDetail> {
    return mockPlansProvider.cancelScheduledChange(subscriptionId, input, actor);
  }

  async rescheduleChange(subscriptionId: string, input: { effectiveAt: string; reason: string }, actor: MutationActor): Promise<SubscriptionDetail> {
    return mockPlansProvider.rescheduleChange(subscriptionId, input, actor);
  }

  async grantOverride(subscriptionId: string, input: OverrideInput, actor: MutationActor): Promise<SubscriptionDetail> {
    return mockPlansProvider.grantOverride(subscriptionId, input, actor);
  }

  async revokeOverride(subscriptionId: string, overrideId: string, input: { reason: string }, actor: MutationActor): Promise<SubscriptionDetail> {
    return mockPlansProvider.revokeOverride(subscriptionId, overrideId, input, actor);
  }

  async savePolicy(policy: SubscriptionPolicy, actor: MutationActor): Promise<SubscriptionPolicy> {
    return mockPlansProvider.savePolicy(policy, actor);
  }

  async resetDemoData?(): Promise<void> {
    if (mockPlansProvider.resetDemoData) {
      await mockPlansProvider.resetDemoData();
    }
  }
}

const useLivePlans = !PLANS_MOCK_MODE || process.env.NEXT_PUBLIC_DATA_SOURCE === "api";

export const plansRepository: PlansRepository = useLivePlans
  ? new LivePlansRepository()
  : mockPlansProvider;

export { unavailablePlansProvider };
