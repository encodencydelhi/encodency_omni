"use client";

import { ArrowLeftIcon, Loader2Icon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { PanelSkeleton } from "@/features/companies/components/states";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { formatDateTime } from "@/lib/utils/format";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { CATEGORY_LABEL, MEASUREMENT_LABEL, RESET_LABEL } from "../data/catalogue";
import { USAGE_MOCK_MODE, usageRoutes } from "../data/config";
import { describeError, useResource, useUsageCapabilities, useUsageMutations } from "../data/hooks";
import type { ResourceDetail } from "../data/repository";
import { number } from "../lib/format";
import { DemoTag } from "../components/badges";
import { UsageError } from "../components/states";

const ATTRIBUTION = { direct: "Direct: each record belongs to a client.", event_level: "Event level: each usage event carries a client when it can be attributed; the rest is company-level.", none: "Not attributable to clients. One user or record can serve several clients." } as const;

function PolicyDialog({ detail, onClose }: { detail: ResourceDetail; onClose: () => void }) {
  const mutations = useUsageMutations();
  const [warning, setWarning] = useState(String(detail.thresholds.warningPct));
  const [critical, setCritical] = useState(String(detail.thresholds.criticalPct));
  const [reason, setReason] = useState("");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const warningPct = Number(warning);
  const criticalPct = Number(critical);
  const errors: Record<string, string> = {
    ...(!Number.isInteger(warningPct) || warningPct < 50 || warningPct > 99 ? { warningPct: "Use a whole number from 50 to 99." } : {}),
    ...(!Number.isInteger(criticalPct) || criticalPct <= warningPct || criticalPct > 100 ? { criticalPct: "The critical threshold must be above the warning threshold and at most 100." } : {}),
    ...fieldErrors,
  };
  const changed = warningPct !== detail.thresholds.warningPct || criticalPct !== detail.thresholds.criticalPct;
  const dirty = changed || reason.trim().length > 0;
  const valid = Object.keys(errors).length === 0 && changed;

  const save = async (): Promise<boolean> => {
    if (!valid || !reason.trim()) return false;
    setBusy(true);
    setError(null);
    try {
      await mutations.updateResourcePolicy(detail.definition.key, { warningPct, criticalPct }, reason.trim());
      return true;
    } catch (failure) {
      const described = describeError(failure);
      setError(described.message);
      setFieldErrors(described.fieldErrors);
      setReview(false);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const guard = useUnsavedGuard({
    dirty: dirty && !busy,
    onDiscard: onClose,
    onSave: async () => {
      const ok = await save();
      if (ok) onClose();
      return ok;
    },
    label: "these threshold changes",
  });

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && guard.requestClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{review ? "Review Threshold Change" : `Edit ${detail.definition.name} Thresholds`}</DialogTitle>
            <DialogDescription>{review ? "Confirm the new thresholds. Company states and alerts are re-evaluated immediately." : "Thresholds decide when a resource is flagged. They do not change any plan allowance or enforce anything."}</DialogDescription>
          </DialogHeader>
          {review ? (
            <div className="space-y-3">
              <dl className="divide-y divide-border rounded-sm border border-border px-3">
                <KeyValue label="Resource">{detail.definition.name}</KeyValue>
                <KeyValue label="Warning threshold">{detail.thresholds.warningPct}% to <strong>{warningPct}%</strong></KeyValue>
                <KeyValue label="Critical threshold">{detail.thresholds.criticalPct}% to <strong>{criticalPct}%</strong></KeyValue>
                <KeyValue label="Currently">{detail.companies.near} near, {detail.companies.atLimit} at limit, {detail.companies.exceeded} exceeded</KeyValue>
                <KeyValue label="Reason">{reason}</KeyValue>
              </dl>
              <AlertBanner tone="info" title="Effect">
                {warningPct < detail.thresholds.warningPct ? "More companies may now read as Near Limit and raise threshold alerts." : warningPct > detail.thresholds.warningPct ? "Fewer companies will read as Near Limit; some open threshold alerts may resolve." : "The warning threshold is unchanged."} Over-limit behaviour is a separate policy and is not changed.
              </AlertBanner>
              {error ? <AlertBanner tone="danger" title="Not Saved">{error}</AlertBanner> : null}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="pol-warning" className="text-[0.8125rem]">Warning threshold (%)</Label>
                <Input id="pol-warning" inputMode="numeric" value={warning} aria-invalid={Boolean(errors.warningPct) || undefined} onChange={(event) => { setWarning(event.target.value.replace(/\D/g, "")); setFieldErrors({}); }} className="tabular" />
                {errors.warningPct ? <p role="alert" className="text-2xs text-danger">{errors.warningPct}</p> : <p className="text-2xs text-muted-foreground">Flag as Near Limit from here.</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="pol-critical" className="text-[0.8125rem]">Critical threshold (%)</Label>
                <Input id="pol-critical" inputMode="numeric" value={critical} aria-invalid={Boolean(errors.criticalPct) || undefined} onChange={(event) => { setCritical(event.target.value.replace(/\D/g, "")); setFieldErrors({}); }} className="tabular" />
                {errors.criticalPct ? <p role="alert" className="text-2xs text-danger">{errors.criticalPct}</p> : <p className="text-2xs text-muted-foreground">Raise alerts as Critical from here.</p>}
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="pol-reason" className="text-[0.8125rem]">Reason<span className="ml-0.5 text-danger" aria-hidden>*</span></Label>
                <Textarea id="pol-reason" rows={2} maxLength={300} value={reason} aria-invalid={Boolean(errors.reason) || undefined} onChange={(event) => { setReason(event.target.value); setFieldErrors({}); }} placeholder="Why are the thresholds changing?" />
                {errors.reason ? <p role="alert" className="text-2xs text-danger">{errors.reason}</p> : null}
              </div>
              {error ? <div className="sm:col-span-2"><AlertBanner tone="danger" title="Not Saved">{error}</AlertBanner></div> : null}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => (review ? setReview(false) : guard.requestClose())} disabled={busy}>{review ? "Back" : "Cancel"}</Button>
            {review ? (
              <Button
                disabled={busy}
                onClick={async () => {
                  if (await save()) onClose();
                }}
              >
                {busy ? <Loader2Icon className="animate-spin" /> : null}
                Confirm Change
              </Button>
            ) : (
              <Button disabled={!valid || !reason.trim()} onClick={() => setReview(true)}>Review Change</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.guardDialog}
    </>
  );
}

export function ResourceDetailPage() {
  const params = useParams<{ resourceKey: string }>();
  const key = decodeURIComponent(params.resourceKey ?? "");
  const query = useResource(key);
  const capabilities = useUsageCapabilities();
  const [editing, setEditing] = useState(false);
  const detail = query.data;
  const definition = detail?.definition;

  const back = { href: usageRoutes.resources, label: "Back to Resources & Limits" };
  if (query.error && !detail) return <UsageError subject="Resource" error={query.error} onRetry={() => void query.refetch()} back={back} />;
  if (!detail || !definition) return <div className="space-y-1" aria-busy="true"><PanelSkeleton rows={4} /><PanelSkeleton rows={4} /></div>;

  return (
    <div className="space-y-3">
      <PageHeader
        title={definition.name}
        description={definition.description}
        meta={<div className="flex flex-wrap items-center gap-1.5"><code className="rounded-sm bg-muted px-1.5 py-px text-[11px]">{definition.key}</code>{USAGE_MOCK_MODE ? <DemoTag>Demo catalogue policy</DemoTag> : null}</div>}
        actions={<Button asChild variant="outline" size="sm"><Link href={usageRoutes.resources}><ArrowLeftIcon />Resources</Link></Button>}
      />

      <div className="grid grid-cols-1 gap-1 lg:grid-cols-2">
        <Panel title="Identity">
          <dl className="divide-y divide-border">
            <KeyValue label="Display name">{definition.name}</KeyValue>
            <KeyValue label="Resource key"><code className="text-[11px]">{definition.key}</code></KeyValue>
            <KeyValue label="Category">{CATEGORY_LABEL[definition.category]}</KeyValue>
            <KeyValue label="Unit">{definition.unit}</KeyValue>
            <KeyValue label="Related features">{definition.relatedFeatures.join(", ")}</KeyValue>
          </dl>
        </Panel>

        <Panel title="Measurement" description={MEASUREMENT_LABEL[definition.measurement].description}>
          <dl className="divide-y divide-border">
            <KeyValue label="Measurement type">{MEASUREMENT_LABEL[definition.measurement].label}</KeyValue>
            <KeyValue label="Reset policy">{RESET_LABEL[definition.resetPolicy]}</KeyValue>
            <KeyValue label="What counts">{definition.countingPolicy}{definition.policyStatus === "pending" ? <Badge tone="warning" className="ml-1.5">Policy Pending</Badge> : null}</KeyValue>
            <KeyValue label="Client attribution">{ATTRIBUTION[definition.clientAttribution]}</KeyValue>
          </dl>
        </Panel>

        <Panel title="Limit Behavior" description="The intended behaviour at the limit. A policy description: the frontend does not enforce it.">
          <p className="text-[0.8125rem] text-foreground">{definition.overLimitBehavior}</p>
          <ul className="mt-2 space-y-1 text-2xs text-muted-foreground">
            <li><strong className="font-medium text-foreground">Not Entitled</strong> - the plan does not include it (a limit of zero).</li>
            <li><strong className="font-medium text-foreground">Fixed / Custom Limit</strong> - a numeric allowance, or a contract-specific one.</li>
            <li><strong className="font-medium text-foreground">Unlimited</strong> - no numeric limit, so no utilization percentage.</li>
            <li><strong className="font-medium text-foreground">Unknown Data</strong> - the reading is missing; it is never shown as zero or healthy.</li>
          </ul>
        </Panel>

        <Panel
          title="Thresholds"
          description="When a resource is flagged as Near Limit and when an alert becomes Critical."
          action={capabilities.canManageResourcePolicies ? <Button variant="outline" size="sm" onClick={() => setEditing(true)}><PencilIcon />Edit Thresholds</Button> : <Badge tone="neutral">Read Only</Badge>}
        >
          <dl className="divide-y divide-border">
            <KeyValue label="Warning threshold">{detail.thresholds.warningPct}%{detail.edited ? <Badge tone="warning" className="ml-1.5">Edited</Badge> : null}</KeyValue>
            <KeyValue label="Critical threshold">{detail.thresholds.criticalPct}%</KeyValue>
            <KeyValue label="Default">{definition.warningPct}% / {definition.criticalPct}%</KeyValue>
            <KeyValue label="Companies now">{detail.companies.within} within, {detail.companies.near} near, {detail.companies.atLimit} at limit, {detail.companies.exceeded} exceeded, {detail.companies.unknown} unknown</KeyValue>
          </dl>
          {!capabilities.canManageResourcePolicies ? <p className="mt-2 text-2xs text-muted-foreground">Editing thresholds needs settings and platform write access. The policy backend is not connected yet, so changes here are demo configuration.</p> : null}
        </Panel>

        <Panel title="Metering Source" description="Where the numbers come from and how fresh they must be.">
          <dl className="divide-y divide-border">
            <KeyValue label="Source">{definition.meteringSource}</KeyValue>
            <KeyValue label="Freshness policy">A reading older than {definition.freshnessHours} hour{definition.freshnessHours === 1 ? "" : "s"} is stale</KeyValue>
          </dl>
          <p className="mt-2 text-2xs"><Link href={usageRoutes.metering} className="font-medium text-primary hover:underline">Review metering health</Link></p>
        </Panel>

        <Panel title="Related Plan Entitlements" description="What each plan includes. Allowances are edited in Plans & Subscriptions." flush>
          <MiniTable
            caption="Plan entitlements"
            rows={detail.planEntitlements}
            getKey={(item) => item.plan}
            empty={<p className="px-3 py-4 text-[0.8125rem] text-muted-foreground">This resource is not part of any plan entitlement. It is monitored only.</p>}
            columns={[
              { id: "plan", header: "Plan", cell: (item) => <span className="font-medium text-foreground">{item.plan}</span> },
              { id: "limit", header: "Allowance", align: "right", cell: (item) => <span className="tabular">{item.limit === null ? "Unlimited" : item.limit === 0 ? "Not Entitled" : `${number(item.limit)} ${definition.unit}`}</span> },
            ]}
          />
          <p className="border-t border-border px-3 py-2 text-2xs"><Link href="/super-admin/plans/catalogue" className="font-medium text-primary hover:underline">Open Plan Catalogue</Link></p>
        </Panel>

        <Panel title="Activity" className="lg:col-span-2">
          {detail.activity.length === 0 ? (
            <p className="text-[0.8125rem] text-muted-foreground">No recent activity for this resource.</p>
          ) : (
            <ul className="divide-y divide-border">
              {detail.activity.map((entry) => (
                <li key={entry.id} className="py-1.5 text-[0.8125rem]">
                  {entry.text}
                  <span className="block text-2xs text-muted-foreground">{formatDateTime(entry.at)}{entry.actor ? ` - ${entry.actor}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      {editing ? <PolicyDialog detail={detail} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
