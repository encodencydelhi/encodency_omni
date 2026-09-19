"use client";

import { ArrowLeftIcon, Loader2Icon, RocketIcon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/features/companies/components/flows/flow-kit";
import { Panel } from "@/features/companies/components/primitives";
import { PanelSkeleton } from "@/features/companies/components/states";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { cn } from "@/lib/utils/cn";
import { PlanStatusBadge, VersionStatusBadge } from "../components/badges";
import { PublishFlow } from "../components/flows/publish-flow";
import { AvailabilitySection, BasicsSection, FeaturesSection, LimitsSection, PricingSection } from "../components/plan-config";
import { PlansError } from "../components/states";
import { formatRule } from "../data/catalogue";
import { routes } from "../data/config";
import { describeError, useImpactPreview, usePlan, usePlanMutations, usePlans, useSubscriptionCapabilities } from "../data/hooks";
import { draftInputOf, validatePlanConfig } from "../data/selectors";
import type { PlanDraftInput, PlanIssue, PlanSummary } from "../data/types";
import { money, signedMoney } from "../lib/money";

type Tab = "basics" | "pricing" | "features" | "limits" | "availability";

const TABS: Array<{ key: Tab; label: string; owns: (field: string) => boolean }> = [
  { key: "basics", label: "Basic details", owns: (f) => f === "name" || f === "internalCode" },
  { key: "pricing", label: "Pricing", owns: (f) => ["currency", "monthlyMinor", "annualMinor", "trialDays", "setupFeeMinor"].includes(f) },
  { key: "features", label: "Features", owns: (f) => f.startsWith("feature.") || f === "features" },
  { key: "limits", label: "Limits", owns: (f) => f.startsWith("limit.") },
  { key: "availability", label: "Availability", owns: (f) => f === "currencies" || f === "availability" },
];

function toMap(issues: PlanIssue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of issues) map[issue.field] ??= issue.message;
  return map;
}

function ImpactPanel({ planId, value, live }: { planId: string; value: PlanDraftInput; live: boolean }) {
  const impact = useImpactPreview(planId, live ? value : null);
  if (!live) return <Panel title="Impact"><p className="text-[0.8125rem] text-muted-foreground">This plan has not been published, so no subscriber is affected by changes.</p></Panel>;
  const data = impact.data;
  return (
    <Panel title="Impact on subscribers" description="Against the current published version">
      {!data ? (
        <p className="text-[0.8125rem] text-muted-foreground">Calculating...</p>
      ) : (
        <div className="space-y-2 text-[0.8125rem]">
          <ul className="space-y-0.5">
            {data.summary.map((line) => <li key={line} className="text-foreground">{line}</li>)}
          </ul>
          {data.priceDiff && data.priceDiff.monthlyMinor !== 0 ? <p className="text-2xs text-muted-foreground">Monthly {signedMoney(data.priceDiff.monthlyMinor, data.priceDiff.currency)} · current subscribers stay on their price until migrated.</p> : null}
          <p className="text-2xs text-muted-foreground">{data.subscribers} current {data.subscribers === 1 ? "subscriber" : "subscribers"}</p>
          {data.exceedingNewLimits.length > 0 ? (
            <AlertBanner tone="warning" title={`${data.affectedCompanies} ${data.affectedCompanies === 1 ? "company exceeds" : "companies exceed"} a reduced limit`}>
              {[...new Set(data.exceedingNewLimits.map((item) => `${item.companyName} (${item.resourceName}: ${item.used} in use, ${item.newLimit} allowed)`))].slice(0, 4).join("; ")}
            </AlertBanner>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

function EditorBody({ summary }: { summary: PlanSummary }) {
  const router = useRouter();
  const mutations = usePlanMutations();
  const capabilities = useSubscriptionCapabilities();
  const plans = usePlans({ showRetired: true });
  const { plan, draft, current } = summary;
  const initial = useMemo(() => (draft ? draftInputOf(plan, draft) : null), [plan, draft]);
  const [value, setValue] = useState<PlanDraftInput | null>(initial);
  const [tab, setTab] = useState<Tab>("basics");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const live = current !== null;
  const dirty = Boolean(value && initial && JSON.stringify(value) !== JSON.stringify(initial));
  const codes = useMemo(() => (plans.data?.summaries ?? []).filter((item) => item.plan.id !== plan.id).map((item) => item.plan.internalCode), [plans.data, plan.id]);
  const issues = useMemo(() => (value ? validatePlanConfig(value, codes) : []), [value, codes]);
  const errors = issues.filter((issue) => issue.severity === "error");
  const shown = attempted || dirty ? toMap(issues) : {};

  const save = async (): Promise<boolean> => {
    if (!value) return false;
    setPending(true);
    setError(null);
    try {
      await mutations.saveDraft(plan.id, value);
      toast.success("Draft saved");
      return true;
    } catch (failure) {
      setError(describeError(failure).message);
      return false;
    } finally {
      setPending(false);
    }
  };

  const leave = () => router.push(routes.plan(plan.id));
  const guard = useUnsavedGuard({ dirty, onDiscard: leave, onSave: save, label: "this draft" });

  if (!value || !draft) return null;
  const update = (patch: Partial<PlanDraftInput>) => setValue((current) => (current ? { ...current, ...patch } : current));
  const visibleTabs = TABS.filter((item) => item.key !== "availability" || !live);

  const reviewAndPublish = async () => {
    setAttempted(true);
    if (dirty && !(await save())) return;
    setPublishing(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-3.5 shadow-xs sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">Edit {plan.name}</h1>
            <PlanStatusBadge status={plan.status} />
            <VersionStatusBadge status="draft" />
            <span className="text-2xs text-muted-foreground">Version {draft.version}</span>
          </div>
          <p className="text-2xs text-muted-foreground">
            {live ? `Editing a draft of version ${draft.version}. The published version ${current?.version} is not changed until you publish.` : "This plan has not been published yet."}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={guard.requestClose}>
          <ArrowLeftIcon />
          Back to plan
        </Button>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 gap-1 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-1">
          <nav aria-label="Editor sections" className="flex gap-0.5 overflow-x-auto rounded-sm border border-border bg-card p-1 scrollbar-thin">
            {visibleTabs.map((item) => {
              const count = errors.filter((issue) => item.owns(issue.field)).length;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  aria-current={tab === item.key ? "page" : undefined}
                  className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1 text-[0.8125rem] font-medium transition-colors", tab === item.key ? "bg-primary-subtle text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                >
                  {item.label}
                  {count > 0 ? <span className="rounded-sm bg-danger-subtle px-1 text-[10px] font-semibold text-danger" aria-label={`${count} problems`}>{count}</span> : null}
                </button>
              );
            })}
          </nav>
          <Panel>
            {tab === "basics" ? <BasicsSection value={value} onChange={update} errors={shown} codeLocked={live} idPrefix="edit" /> : null}
            {tab === "pricing" ? <PricingSection value={value} onChange={update} errors={shown} idPrefix="edit" /> : null}
            {tab === "features" ? <FeaturesSection value={value} onChange={update} errors={shown} idPrefix="edit" /> : null}
            {tab === "limits" ? <LimitsSection value={value} onChange={update} errors={shown} idPrefix="edit" /> : null}
            {tab === "availability" ? <AvailabilitySection value={value} onChange={update} errors={shown} idPrefix="edit" /> : null}
            {live && tab === "basics" ? <p className="mt-2 text-2xs text-muted-foreground">Availability of a live plan is managed in the plan&apos;s Availability section, because it takes effect immediately and is not versioned.</p> : null}
          </Panel>
        </div>
        <div className="space-y-1">
          <ImpactPanel planId={plan.id} value={value} live={live} />
          {live && current ? (
            <Panel title={`Changed from v${current.version}`}>
              <ul className="space-y-0.5 text-2xs text-muted-foreground">
                <li>Monthly: {money(current.price.monthlyMinor, current.price.currency)} → {money(value.price.monthlyMinor, value.price.currency)}</li>
                <li>Clients: {formatRule(current.limits.Clients, "clients")} → {formatRule(value.limits.Clients, "clients")}</li>
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 shadow-md" role="region" aria-label="Draft actions">
        <p className="text-2xs text-muted-foreground" aria-live="polite">
          {dirty ? "Unsaved changes" : "All changes saved"}
          {errors.length > 0 ? ` · ${errors.length} problem${errors.length === 1 ? "" : "s"} to fix before publishing` : ""}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { setValue(initial); setError(null); }} disabled={!dirty || pending}>Discard changes</Button>
          <Button variant="outline" onClick={() => void save()} disabled={!dirty || pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            Save Draft
          </Button>
          {capabilities.canPublishPlan ? (
            <Button onClick={() => void reviewAndPublish()} disabled={pending}>
              <RocketIcon />
              Review &amp; Publish
            </Button>
          ) : null}
        </div>
      </div>

      {publishing ? <PublishFlow summary={{ ...summary, issues: issues }} onClose={() => { setPublishing(false); router.push(routes.plan(plan.id)); }} /> : null}
      {guard.guardDialog}
    </div>
  );
}

/** Edits the draft version of a plan. A published version is never edited in place. */
export function PlanEditorPage() {
  const params = useParams<{ planId: string }>();
  const planId = decodeURIComponent(params.planId ?? "");
  const router = useRouter();
  const mutations = usePlanMutations();
  const capabilities = useSubscriptionCapabilities();
  const query = usePlan(planId);
  const [starting, setStarting] = useState(false);

  if (query.error && !query.data) return <PlansError subject="Plan" error={query.error} onRetry={() => void query.refetch()} back={{ href: routes.plans, label: "Back to Plans" }} />;
  if (!query.data) return <PanelSkeleton rows={8} />;
  const summary = query.data.summary;

  if (!capabilities.canEditDraftPlan) {
    return <PlansError subject="Editor" error={new Error("You do not have permission to edit plans.")} back={{ href: routes.plan(planId), label: "Back to plan" }} />;
  }
  if (summary.plan.status === "retired") {
    return (
      <AlertBanner tone="info" title="This plan is retired">
        A retired plan cannot be edited. <Link href={routes.plan(planId)} className="underline">Back to the plan</Link>
      </AlertBanner>
    );
  }
  if (!summary.draft) {
    return (
      <Panel title="No draft to edit">
        <p className="text-[0.8125rem] text-foreground">{summary.plan.name} is published. To change it, start a new version - the published version stays exactly as it is.</p>
        <div className="mt-3 flex gap-2">
          <Button
            disabled={starting}
            onClick={async () => {
              setStarting(true);
              try {
                await mutations.startNewVersion(summary.plan.id);
              } catch (failure) {
                toast.error(describeError(failure).message);
              } finally {
                setStarting(false);
              }
            }}
          >
            Create New Version
          </Button>
          <Button variant="outline" onClick={() => router.push(routes.plan(planId))}>Back to plan</Button>
        </div>
      </Panel>
    );
  }
  // Remount the form when the draft changes underneath it (a different version was started).
  return <EditorBody key={summary.draft.id} summary={summary} />;
}
