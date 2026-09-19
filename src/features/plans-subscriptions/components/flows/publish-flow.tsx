"use client";

import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner, FlowDialog, Stepper, SubmitButton } from "@/features/companies/components/flows/flow-kit";
import { Field } from "@/features/companies/components/primitives";
import { pluralise } from "@/features/companies/lib/format";
import { formatRule } from "../../data/catalogue";
import { ROLLOUT_POLICY } from "../../data/config";
import { describeError, useCompaniesOnPlan, useImpactPreview, usePlanMutations } from "../../data/hooks";
import { draftInputOf } from "../../data/selectors";
import type { PlanSummary, RolloutPolicy } from "../../data/types";
import { money, signedMoney } from "../../lib/money";
import { MiniTable } from "../mini-table";

const STEPS = ["Differences", "Subscriber impact", "Rollout", "Confirm"];

/**
 * Publishing turns a draft into an immutable version. For a plan that is already
 * live it shows what changes, who is affected and how the change reaches existing
 * subscriptions - it never reprices anyone silently.
 */
export function PublishFlow({ summary, onClose }: { summary: PlanSummary; onClose: () => void }) {
  const mutations = usePlanMutations();
  const { plan, draft, current } = summary;
  const firstPublish = current === null;
  const input = useMemo(() => (draft ? draftInputOf(plan, draft) : null), [plan, draft]);
  const impact = useImpactPreview(plan.id, firstPublish ? null : input);
  const companies = useCompaniesOnPlan(plan.id, !firstPublish);

  const [step, setStep] = useState(0);
  const [rollout, setRollout] = useState<RolloutPolicy>("new_only");
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!draft) return null;
  const errors = summary.issues.filter((issue) => issue.severity === "error");
  const data = impact.data;

  const publish = async () => {
    setPending(true);
    setError(null);
    try {
      await mutations.publishPlan(plan.id, { rollout, migrateCompanyIds: rollout === "migrate_selected" ? selected : [], note: note.trim() });
      toast.success(`${plan.name} version ${draft.version} published`);
      onClose();
    } catch (failure) {
      setError(describeError(failure).message);
    } finally {
      setPending(false);
    }
  };

  const title = firstPublish ? `Publish ${plan.name}?` : `Publish ${plan.name} version ${draft.version}`;

  if (firstPublish) {
    return (
      <FlowDialog
        open
        onOpenChange={(open) => !open && !pending && onClose()}
        title={title}
        description="Publishing creates version 1, an immutable snapshot of the price, features and limits."
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
            <SubmitButton pending={pending} disabled={errors.length > 0} onClick={() => void publish()}>Publish Plan</SubmitButton>
          </>
        }
      >
        <ErrorBanner message={error} />
        {errors.length > 0 ? (
          <AlertBanner tone="danger" title="Fix these before publishing">
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {errors.map((issue) => <li key={issue.field}>{issue.message}</li>)}
            </ul>
          </AlertBanner>
        ) : (
          <AlertBanner tone="success" title="The configuration is valid">
            Nobody is subscribed yet, so nothing changes for any company. It becomes available according to its availability rules.
          </AlertBanner>
        )}
      </FlowDialog>
    );
  }

  return (
    <FlowDialog
      open
      onOpenChange={(open) => !open && !pending && onClose()}
      title={title}
      description={`Replaces version ${current?.version} as the current version for new subscriptions.`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending} className="mr-auto">Cancel</Button>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={pending}>
              <ArrowLeftIcon />
              Back
            </Button>
          ) : null}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={impact.isPending || (step === 2 && rollout === "migrate_selected" && selected.length === 0)}>
              Next
              <ArrowRightIcon />
            </Button>
          ) : (
            <SubmitButton pending={pending} disabled={errors.length > 0} onClick={() => void publish()}>Publish version {draft.version}</SubmitButton>
          )}
        </>
      }
    >
      <Stepper steps={STEPS} current={step} />
      <ErrorBanner message={error} />
      {impact.error ? <ErrorBanner message={describeError(impact.error).message} /> : null}

      {step === 0 ? (
        !data ? (
          <p className="text-[0.8125rem] text-muted-foreground">Comparing with version {current?.version}...</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
              {[
                ["Current version", `Version ${data.fromVersion}`],
                ["Proposed version", `Version ${data.toVersion}`],
                ["Monthly price", data.priceDiff ? `${money(current?.price.monthlyMinor ?? 0, data.priceDiff.currency)} → ${money((current?.price.monthlyMinor ?? 0) + data.priceDiff.monthlyMinor, data.priceDiff.currency)} (${signedMoney(data.priceDiff.monthlyMinor, data.priceDiff.currency)})` : "-"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-sm border border-border px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="text-[0.8125rem] font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
            {data.priceDiff && data.priceDiff.annualMinor !== 0 ? <p className="text-2xs text-muted-foreground">Annual price {signedMoney(data.priceDiff.annualMinor, data.priceDiff.currency)}.</p> : null}
            <h4 className="text-[0.8125rem] font-semibold text-foreground">Changed features</h4>
            <MiniTable
              caption="Changed features"
              rows={data.changedFeatures}
              getKey={(row) => row.key}
              empty={<p className="text-[0.8125rem] text-muted-foreground">No feature changes.</p>}
              columns={[
                { id: "name", header: "Feature", cell: (row) => row.name },
                { id: "from", header: "Was", cell: (row) => (row.from ? "Included" : "Not included") },
                { id: "to", header: "Becomes", cell: (row) => <span className={row.to ? "text-success" : "text-danger"}>{row.to ? "Included" : "Not included"}</span> },
              ]}
            />
            <h4 className="text-[0.8125rem] font-semibold text-foreground">Changed limits</h4>
            <MiniTable
              caption="Changed limits"
              rows={data.changedLimits}
              getKey={(row) => row.key}
              empty={<p className="text-[0.8125rem] text-muted-foreground">No limit changes.</p>}
              columns={[
                { id: "name", header: "Resource", cell: (row) => row.name },
                { id: "from", header: "Was", cell: (row) => formatRule(row.from, row.unit) },
                { id: "to", header: "Becomes", cell: (row) => <span className="font-medium">{formatRule(row.to, row.unit)}</span> },
              ]}
            />
          </div>
        )
      ) : null}

      {step === 1 && data ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
            <div className="rounded-sm border border-border px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Current subscribers</p><p className="text-sm font-semibold tabular text-foreground">{data.subscribers}</p></div>
            <div className="rounded-sm border border-border px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Exceeding new limits</p><p className={`text-sm font-semibold tabular ${data.affectedCompanies > 0 ? "text-warning" : "text-foreground"}`}>{data.affectedCompanies}</p></div>
            <div className="rounded-sm border border-border px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Proposed effect</p><p className="text-[0.8125rem] font-medium text-foreground">Set in the next step</p></div>
          </div>
          {data.exceedingNewLimits.length === 0 ? (
            <AlertBanner tone="success" title="No company exceeds the proposed limits">Every current subscriber&apos;s usage fits within version {data.toVersion}.</AlertBanner>
          ) : (
            <>
              <AlertBanner tone="warning" title={`${pluralise(data.affectedCompanies, "company", "companies")} would be above a reduced limit`}>
                Nothing is deleted or disconnected. Under the over-limit policy their existing resources keep working and new ones are refused until usage fits.
              </AlertBanner>
              <MiniTable
                caption="Subscribers exceeding the new limits"
                rows={data.exceedingNewLimits}
                getKey={(row) => `${row.subscriptionId}-${row.resource}`}
                columns={[
                  { id: "company", header: "Company", cell: (row) => row.companyName },
                  { id: "resource", header: "Resource", cell: (row) => row.resourceName },
                  { id: "used", header: "In use", align: "right", cell: (row) => <span className="tabular">{row.used}</span> },
                  { id: "limit", header: "New limit", align: "right", cell: (row) => <span className="tabular font-medium">{row.newLimit}</span> },
                ]}
              />
            </>
          )}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-2">
          <p className="text-[0.8125rem] text-foreground">How does version {draft.version} reach existing subscriptions? New subscriptions always start on it.</p>
          <RadioGroup value={rollout} onValueChange={(value) => setRollout(value as RolloutPolicy)} className="gap-1.5" aria-label="Rollout policy">
            {(Object.keys(ROLLOUT_POLICY) as RolloutPolicy[]).map((option) => (
              <div key={option} className="flex items-start gap-2.5 rounded-sm border border-border px-3 py-2">
                <RadioGroupItem value={option} id={`rollout-${option}`} className="mt-0.5" />
                <Label htmlFor={`rollout-${option}`} className="flex-1 cursor-pointer font-normal">
                  <span className="block text-[0.8125rem] font-medium text-foreground">{ROLLOUT_POLICY[option].label}</span>
                  <span className="block text-2xs text-muted-foreground">{ROLLOUT_POLICY[option].description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          {rollout === "migrate_selected" ? (
            <div className="space-y-1">
              <p className="text-[0.8125rem] font-medium text-foreground">Companies to migrate now ({selected.length} selected)</p>
              <ul className="max-h-44 divide-y divide-border overflow-y-auto rounded-sm border border-border scrollbar-thin">
                {(companies.data ?? []).map((company) => (
                  <li key={company.id} className="flex items-center gap-2.5 px-3 py-1.5">
                    <Checkbox id={`migrate-${company.id}`} checked={selected.includes(company.id)} onCheckedChange={(checked) => setSelected((list) => (checked === true ? [...list, company.id] : list.filter((id) => id !== company.id)))} />
                    <Label htmlFor={`migrate-${company.id}`} className="flex-1 font-normal">{company.name} <span className="text-2xs text-muted-foreground">on version {company.version}</span></Label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-2xs text-muted-foreground">This demo records the rollout choice. It runs no background job: &ldquo;at renewal&rdquo; appears as a scheduled change, and nothing is applied on a schedule.</p>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-2">
          <dl className="divide-y divide-border rounded-sm border border-border px-3 text-[0.8125rem]">
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Plan</dt><dd className="text-foreground">{plan.name}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Version</dt><dd className="text-foreground">{current?.version} → {draft.version}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Changes</dt><dd className="max-w-md text-right text-foreground">{data?.summary.join("; ")}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Rollout</dt><dd className="text-foreground">{ROLLOUT_POLICY[rollout].label}{rollout === "migrate_selected" ? ` (${selected.length})` : ""}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-muted-foreground">Exceeding new limits</dt><dd className="text-foreground">{pluralise(data?.affectedCompanies ?? 0, "company", "companies")}</dd></div>
          </dl>
          {errors.length > 0 ? (
            <AlertBanner tone="danger" title="Fix these before publishing">
              <ul className="mt-1 list-disc space-y-0.5 pl-4">{errors.map((issue) => <li key={issue.field}>{issue.message}</li>)}</ul>
            </AlertBanner>
          ) : null}
          <Field label="Note (optional)" htmlFor="publish-note" hint="Recorded with the version.">
            <Textarea id="publish-note" rows={2} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </div>
      ) : null}
    </FlowDialog>
  );
}
