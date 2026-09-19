"use client";

import { ArrowLeftIcon, ArrowRightIcon, CircleCheckIcon, Loader2Icon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ErrorBanner, Stepper } from "@/features/companies/components/flows/flow-kit";
import { Panel } from "@/features/companies/components/primitives";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { AvailabilitySection, BasicsSection, FeaturesSection, LimitsSection, PricingSection, ReviewSummary } from "../components/plan-config";
import { routes } from "../data/config";
import { describeError, usePlanMutations, usePlans } from "../data/hooks";
import { emptyPlanInput, validatePlanConfig } from "../data/selectors";
import type { CreatePlanInput, PlanDraftInput, PlanIssue, PlanSummary } from "../data/types";

const STEPS = ["Basic details", "Pricing", "Features", "Limits", "Availability", "Review & publish"];

/** Which validation fields belong to which step, so Continue only blocks on the step you are on. */
const STEP_FIELDS: Array<(field: string) => boolean> = [
  (field) => field === "name" || field === "internalCode",
  (field) => ["currency", "monthlyMinor", "annualMinor", "trialDays", "setupFeeMinor"].includes(field),
  (field) => field.startsWith("feature.") || field === "features",
  (field) => field.startsWith("limit."),
  (field) => field === "currencies" || field === "availability",
  () => true,
];

function toMap(issues: PlanIssue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of issues) map[issue.field] ??= issue.message;
  return map;
}

/** A dedicated workspace for defining a new plan: six steps, saved as a draft or published from the last one. */
export function PlanCreatePage() {
  const router = useRouter();
  const mutations = usePlanMutations();
  const plans = usePlans({ showRetired: true });
  const [value, setValue] = useState<PlanDraftInput>(() => emptyPlanInput());
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<"draft" | "published" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ summary: PlanSummary; published: boolean } | null>(null);

  const dirty = useMemo(() => JSON.stringify(value) !== JSON.stringify(emptyPlanInput()), [value]);
  const codes = useMemo(() => (plans.data?.summaries ?? []).map((item) => item.plan.internalCode), [plans.data]);
  const issues = useMemo(() => validatePlanConfig(value, codes), [value, codes]);
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  const stepErrors = (index: number) => errors.filter((issue) => STEP_FIELDS[index]?.(issue.field));
  const shown = { ...(step === 5 ? toMap(issues) : attempted.has(step) ? toMap(issues.filter((issue) => STEP_FIELDS[step]?.(issue.field))) : {}), ...serverErrors };

  const update = (patch: Partial<PlanDraftInput>) => {
    setValue((current) => ({ ...current, ...patch }));
    setServerErrors({});
  };

  const leave = () => router.push(routes.plans);
  const guard = useUnsavedGuard({ dirty: dirty && !created, onDiscard: leave, label: "this plan" });

  const next = () => {
    if (stepErrors(step).length > 0) {
      setAttempted((current) => new Set(current).add(step));
      return;
    }
    setStep((current) => Math.min(5, current + 1));
  };

  const save = async (intent: "draft" | "published") => {
    setPending(intent);
    setError(null);
    setServerErrors({});
    try {
      const summary = await mutations.createPlan({ ...(value as CreatePlanInput), intent });
      setCreated({ summary, published: intent === "published" });
      toast.success(intent === "published" ? `${summary.plan.name} published` : `${summary.plan.name} saved as a draft`);
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setServerErrors(described.fieldErrors);
      // Send the operator to the earliest step that holds a problem.
      const index = STEP_FIELDS.findIndex((match, position) => position < 5 && Object.keys(described.fieldErrors).some(match));
      if (index >= 0) setStep(index);
    } finally {
      setPending(null);
    }
  };

  const another = () => {
    setCreated(null);
    setValue(emptyPlanInput());
    setStep(0);
    setAttempted(new Set());
  };

  if (created) {
    const { summary, published } = created;
    return (
      <div className="space-y-3">
        <PageHeader title="Create Plan" description="Define pricing, features, limits and availability for a new plan." />
        <Panel>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <span className="flex size-10 items-center justify-center rounded-sm bg-success-subtle text-success">
              <CircleCheckIcon className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foreground">Plan created in demo workspace</p>
            <p className="max-w-md text-[0.8125rem] text-muted-foreground">
              {summary.plan.name} ({summary.plan.internalCode}) {published ? "was published as version 1. It now appears in the catalogue, the comparison and plan selectors, according to its availability." : "was saved as a draft. It is not available to any company until it is published."}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button onClick={() => router.push(routes.plan(summary.plan.id))}>Open Plan</Button>
              <Button variant="outline" onClick={another}>Create Another</Button>
              <Button asChild variant="ghost"><Link href={routes.plans}>Back to Plans</Link></Button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  const blocking = errors.length > 0;

  return (
    <div className="space-y-3">
      <PageHeader title="Create Plan" description="Define pricing, features, limits and availability for a new plan. Demo configuration only - nothing is charged." />
      <Panel bodyClassName="space-y-3">
        <Stepper steps={STEPS} current={step} />
        <ErrorBanner message={error} />

        <div className="min-h-64">
          {step === 0 ? <BasicsSection value={value} onChange={update} errors={shown} idPrefix="create" /> : null}
          {step === 1 ? <PricingSection value={value} onChange={update} errors={shown} idPrefix="create" /> : null}
          {step === 2 ? <FeaturesSection value={value} onChange={update} errors={shown} idPrefix="create" /> : null}
          {step === 3 ? <LimitsSection value={value} onChange={update} errors={shown} idPrefix="create" /> : null}
          {step === 4 ? <AvailabilitySection value={value} onChange={update} errors={shown} idPrefix="create" /> : null}
          {step === 5 ? (
            <div className="space-y-2">
              {blocking ? (
                <AlertBanner tone="danger" title={`${errors.length} problem${errors.length === 1 ? "" : "s"} block publishing`}>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {errors.map((issue) => (
                      <li key={issue.field}>{issue.message}</li>
                    ))}
                  </ul>
                  <span className="mt-1 block">You can still save this as a draft and finish it later.</span>
                </AlertBanner>
              ) : (
                <AlertBanner tone="success" title="Ready to publish">
                  The configuration is valid. Publishing creates version 1, which becomes an immutable snapshot.
                </AlertBanner>
              )}
              {warnings.length > 0 ? (
                <AlertBanner tone="warning" title="Worth a look">
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {warnings.map((issue) => (
                      <li key={issue.field + issue.message}>{issue.message}</li>
                    ))}
                  </ul>
                </AlertBanner>
              ) : null}
              <ReviewSummary value={value} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button variant="ghost" onClick={guard.requestClose} disabled={pending !== null}>
            Cancel
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void save("draft")} disabled={pending !== null || !value.name.trim() || !value.internalCode.trim()}>
              {pending === "draft" ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              Save as Draft
            </Button>
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={pending !== null}>
                <ArrowLeftIcon />
                Back
              </Button>
            ) : null}
            {step < 5 ? (
              <Button onClick={next}>
                Continue
                <ArrowRightIcon />
              </Button>
            ) : (
              <Button onClick={() => void save("published")} disabled={pending !== null || blocking}>
                {pending === "published" ? <Loader2Icon className="animate-spin" /> : null}
                Publish Plan
              </Button>
            )}
          </div>
        </div>
      </Panel>
      {guard.guardDialog}
    </div>
  );
}
