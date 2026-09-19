"use client";

/**
 * React access layer over the repository.
 *
 * All Plans & Subscriptions queries share one key root, and every write also
 * invalidates the Companies and Clients caches: a plan change moves a company's
 * MRR and limits, and an override changes whether a client can be created.
 * Subscription-scoped keys carry their ids, so opening one subscription can
 * never show another's cached records.
 */
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/components/auth-provider";
import { clientKeys } from "@/features/clients/data/hooks";
import { useCurrentStaff } from "@/features/companies/data/capability-provider";
import { companyKeys } from "@/features/companies/data/hooks";
import { ApiError } from "@/types/api";
import type { PlanKey } from "@/types/domain/plan";
import type { BillingCycle } from "@/types/domain/subscription";
import { deriveSubscriptionCapabilities, type SubscriptionCapabilities } from "./capabilities";
import { plansRepository, type TrialQuery } from "./repository";
import type {
  CancellationInput,
  ConversionInput,
  CreatePlanInput,
  OverrideInput,
  PlanAvailability,
  PlanChangeInput,
  PlanDraftInput,
  PlanListQuery,
  PublishInput,
  ReactivationInput,
  SubscriptionListQuery,
  SubscriptionPolicy,
  TrendMetric,
  TrendPeriod,
  TrialExtensionInput,
} from "./types";

const ROOT = ["plans-subscriptions"] as const;

export const planKeys = {
  all: ROOT,
  overview: [...ROOT, "overview"] as const,
  trend: (metric: TrendMetric, period: TrendPeriod) => [...ROOT, "trend", metric, period] as const,
  plans: (query: PlanListQuery) => [...ROOT, "plans", query] as const,
  plan: (id: string) => [...ROOT, "plan", id] as const,
  comparison: [...ROOT, "comparison"] as const,
  subscriptions: (query: SubscriptionListQuery) => [...ROOT, "subscriptions", query] as const,
  facets: [...ROOT, "facets"] as const,
  subscription: (id: string) => [...ROOT, "subscription", id] as const,
  changeImpact: (id: string, plan: string, cycle: string) => [...ROOT, "change-impact", id, plan, cycle] as const,
  choices: (id: string) => [...ROOT, "choices", id] as const,
  trials: (query: TrialQuery) => [...ROOT, "trials", query] as const,
  scheduled: [...ROOT, "scheduled"] as const,
  recent: [...ROOT, "recent"] as const,
  policy: [...ROOT, "policy"] as const,
  impact: (id: string, input: unknown) => [...ROOT, "impact", id, input] as const,
  companiesOnPlan: (id: string) => [...ROOT, "companies-on-plan", id] as const,
};

export function useSubscriptionCapabilities(): SubscriptionCapabilities {
  const { can } = useAuth();
  return useMemo(() => deriveSubscriptionCapabilities(can), [can]);
}

export const useOverview = () => useQuery({ queryKey: planKeys.overview, queryFn: () => plansRepository.getOverview() });

export const useTrend = (metric: TrendMetric, period: TrendPeriod) =>
  useQuery({ queryKey: planKeys.trend(metric, period), queryFn: () => plansRepository.getTrend(metric, period), placeholderData: keepPreviousData });

export const usePlans = (query: PlanListQuery) =>
  useQuery({ queryKey: planKeys.plans(query), queryFn: () => plansRepository.listPlans(query), placeholderData: keepPreviousData });

export const usePlan = (id: string) => useQuery({ queryKey: planKeys.plan(id), queryFn: () => plansRepository.getPlan(id), retry: false });

export const useComparison = () => useQuery({ queryKey: planKeys.comparison, queryFn: () => plansRepository.getComparison() });

export const useSubscriptions = (query: SubscriptionListQuery) =>
  useQuery({ queryKey: planKeys.subscriptions(query), queryFn: () => plansRepository.listSubscriptions(query), placeholderData: keepPreviousData });

export const useSubscriptionFacets = () => useQuery({ queryKey: planKeys.facets, queryFn: () => plansRepository.getFacets(), staleTime: 60_000 });

export const useSubscription = (id: string) => useQuery({ queryKey: planKeys.subscription(id), queryFn: () => plansRepository.getSubscription(id), retry: false });

export const usePlanChangeImpact = (id: string, plan: PlanKey | null, cycle: BillingCycle) =>
  useQuery({
    queryKey: planKeys.changeImpact(id, plan ?? "", cycle),
    queryFn: () => plansRepository.getPlanChangeImpact(id, plan as PlanKey, cycle),
    enabled: Boolean(plan),
    retry: false,
  });

export const usePlanChoices = (id: string, enabled = true) => useQuery({ queryKey: planKeys.choices(id), queryFn: () => plansRepository.listSelectablePlans(id), enabled, retry: false });

export const useTrials = (query: TrialQuery) => useQuery({ queryKey: planKeys.trials(query), queryFn: () => plansRepository.getTrials(query), placeholderData: keepPreviousData });

export const useScheduledChanges = () => useQuery({ queryKey: planKeys.scheduled, queryFn: () => plansRepository.getScheduledChanges() });

export const useRecentChanges = () => useQuery({ queryKey: planKeys.recent, queryFn: () => plansRepository.getRecentChanges() });

export const usePolicy = () => useQuery({ queryKey: planKeys.policy, queryFn: () => plansRepository.getPolicy() });

export const useImpactPreview = (planId: string, input: PlanDraftInput | null) =>
  useQuery({ queryKey: planKeys.impact(planId, input), queryFn: () => plansRepository.previewImpact(planId, input as PlanDraftInput), enabled: input !== null, retry: false });

export const useCompaniesOnPlan = (planId: string, enabled: boolean) =>
  useQuery({ queryKey: planKeys.companiesOnPlan(planId), queryFn: () => plansRepository.listCompaniesOnPlan(planId), enabled });

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export interface DescribedError {
  message: string;
  fieldErrors: Record<string, string>;
}

export function describeError(error: unknown, fallback = "Something went wrong. Nothing was changed."): DescribedError {
  if (ApiError.isApiError(error)) return { message: error.message, fieldErrors: error.fieldErrors ?? {} };
  return { message: fallback, fieldErrors: {} };
}

export function usePlanMutations() {
  const queryClient = useQueryClient();
  const actor = useCurrentStaff();

  return useMemo(() => {
    const repo = plansRepository;
    const refresh = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ROOT }),
        queryClient.invalidateQueries({ queryKey: companyKeys.all }),
        queryClient.invalidateQueries({ queryKey: clientKeys.all }),
      ]);
    // Plans and subscriptions feed Companies (MRR, limits, plan lists) and Clients (creation limits).
    const done = async <T,>(work: Promise<T>): Promise<T> => {
      const result = await work;
      await refresh();
      return result;
    };

    return {
      createPlan: (input: CreatePlanInput) => done(repo.createPlan(input, actor)),
      saveDraft: (planId: string, input: PlanDraftInput) => done(repo.saveDraft(planId, input, actor)),
      startNewVersion: (planId: string) => done(repo.startNewVersion(planId, actor)),
      discardDraft: (planId: string) => done(repo.discardDraft(planId, actor)),
      publishPlan: (planId: string, input: PublishInput) => done(repo.publishPlan(planId, input, actor)),
      setAvailability: (planId: string, availability: PlanAvailability) => done(repo.setAvailability(planId, availability, actor)),
      hidePlan: (planId: string) => done(repo.hidePlan(planId, actor)),
      showPlan: (planId: string) => done(repo.showPlan(planId, actor)),
      retirePlan: (planId: string, reason: string) => done(repo.retirePlan(planId, { reason }, actor)),

      changeCompanyPlan: (id: string, input: PlanChangeInput) => done(repo.changeCompanyPlan(id, input, actor)),
      extendTrial: (id: string, input: TrialExtensionInput) => done(repo.extendTrial(id, input, actor)),
      convertTrial: (id: string, input: ConversionInput) => done(repo.convertTrial(id, input, actor)),
      endTrial: (id: string, reason: string) => done(repo.endTrial(id, { reason }, actor)),
      cancelSubscription: (id: string, input: CancellationInput) => done(repo.cancelSubscription(id, input, actor)),
      undoCancellation: (id: string, reason: string) => done(repo.undoCancellation(id, { reason }, actor)),
      reactivateSubscription: (id: string, input: ReactivationInput) => done(repo.reactivateSubscription(id, input, actor)),
      cancelScheduledChange: (id: string, target: "plan_change" | "cancellation", reason: string) => done(repo.cancelScheduledChange(id, { target, reason }, actor)),
      rescheduleChange: (id: string, effectiveAt: string, reason: string) => done(repo.rescheduleChange(id, { effectiveAt, reason }, actor)),
      grantOverride: (id: string, input: OverrideInput) => done(repo.grantOverride(id, input, actor)),
      revokeOverride: (id: string, overrideId: string, reason: string) => done(repo.revokeOverride(id, overrideId, { reason }, actor)),
      savePolicy: (policy: SubscriptionPolicy) => done(repo.savePolicy(policy, actor)),
      validatePlan: (input: PlanDraftInput, planId?: string) => repo.validatePlan(input, planId),
      previewImpact: (planId: string, input: PlanDraftInput) => repo.previewImpact(planId, input),
      resetDemoData: async () => {
        await repo.resetDemoData?.();
        queryClient.removeQueries({ queryKey: ROOT });
        queryClient.removeQueries({ queryKey: companyKeys.all });
        queryClient.removeQueries({ queryKey: clientKeys.all });
        await refresh();
      },
    };
  }, [actor, queryClient]);
}

export type PlanMutations = ReturnType<typeof usePlanMutations>;
