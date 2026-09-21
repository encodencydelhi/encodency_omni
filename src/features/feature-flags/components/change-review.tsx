"use client";

import { ArrowRightIcon, Loader2Icon, SnowflakeIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { platformNow } from "@/features/companies/data/clock";
import { cn } from "@/lib/utils/cn";
import { ENVIRONMENTS, STRATEGY } from "../data/config";
import { describeError, useChangePreview, useFlagCapabilities, useFlagMutations } from "../data/hooks";
import type { ChangeOutcome, ConfigDiff, Environment } from "../data/types";
import { plural } from "../lib/format";

/** A proposed change, described once and reviewed the same way wherever it starts. */
export interface ChangeRequest {
  flagKey: string;
  flagName: string;
  environment: Environment;
  proposed: Partial<ConfigDiff>;
  title: string;
  description?: string;
  /** Emergency changes are worded and coloured as what they are. */
  kind?: "standard" | "emergency" | "restore";
}

const envLabel = (environment: Environment) => ENVIRONMENTS.find((item) => item.value === environment)?.label ?? environment;

function describeConfig(config: ConfigDiff) {
  return {
    "Platform State": config.emergencyOff ? "Emergency Off" : config.enabled ? "Enabled" : "Disabled",
    "Rollout Strategy": STRATEGY[config.strategy].label,
    Percentage: config.strategy === "percentage" ? `${config.percentage}%` : "-",
    "Selected Companies": config.strategy === "selected" ? plural(config.selectedCompanyIds.length, "Company", "Companies") : "-",
    Prerequisites: config.prerequisites.length > 0 ? config.prerequisites.join(", ") : "None",
  } as const;
}

function ListNames({ label, items, tone }: { label: string; items: Array<{ id: string; name: string }>; tone: "success" | "danger" }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={cn("text-2xs font-medium", tone === "success" ? "text-success" : "text-danger")}>{label} ({items.length})</p>
      <p className="mt-0.5 text-[0.8125rem] text-foreground">
        {items.slice(0, 8).map((item) => item.name).join(", ")}
        {items.length > 8 ? `, and ${items.length - 8} more` : ""}
      </p>
    </div>
  );
}

/**
 * Reviews any change to a flag's configuration before it is recorded: the current
 * and proposed configuration side by side, who it reaches, and what governance says
 * about it. Nothing here grants an entitlement or permission, and nothing is enforced
 * outside this demo; a change that needs approval is recorded as pending, never as approved.
 */
export function ChangeReviewDrawer({ request, onClose, onDone }: { request: ChangeRequest | null; onClose: () => void; onDone?: (outcome: ChangeOutcome) => void }) {
  return (
    <Sheet open={Boolean(request)} onOpenChange={(open) => !open && onClose()}>
      {request ? <ReviewContent key={`${request.flagKey}-${request.environment}-${request.title}`} request={request} onClose={onClose} onDone={onDone} /> : null}
    </Sheet>
  );
}

function ReviewContent({ request, onClose, onDone }: { request: ChangeRequest; onClose: () => void; onDone?: (outcome: ChangeOutcome) => void }) {
  const preview = useChangePreview(request.flagKey, request.environment, request.proposed);
  const mutations = useFlagMutations();
  const capabilities = useFlagCapabilities();
  const [reason, setReason] = useState("");
  const [scheduled, setScheduled] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; fieldErrors: Record<string, string> } | null>(null);

  const data = preview.data;
  const production = request.environment === "production";
  const emergency = request.kind === "emergency";
  const reasonRequired = production || emergency || request.kind === "restore";
  const effectiveAt = scheduled ? new Date(`${scheduled}:00Z`).toISOString() : null;
  const future = effectiveAt !== null && Date.parse(effectiveAt) > platformNow();

  const blockedByRole = production && !(emergency ? capabilities.canEmergencyDisable : capabilities.canChangeProduction) ? "Changing production needs the flag-management and platform-write rights. You can review this change but not submit it." : !production && !capabilities.canChangeRollout ? "You do not have the right to change flags." : null;

  const submit = async (saveAsDraft: boolean): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const outcome = await mutations.proposeChange({ flagKey: request.flagKey, environment: request.environment, proposed: request.proposed, reason, effectiveAt: future ? effectiveAt : null, saveAsDraft });
      const status = outcome.change.status;
      toast.success(status === "applied" ? "Change Applied (Demo)" : status === "pending_approval" ? "Sent For Approval (Demo Request)" : status === "scheduled" ? "Change Planned" : "Draft Saved", {
        description: status === "applied" ? `${request.flagName} updated in ${envLabel(request.environment)}. Nothing is enforced outside this demo.` : status === "pending_approval" ? "No approval service is connected, so it stays pending. It is not applied." : status === "scheduled" ? "Recorded for later. No scheduler runs in this phase, so it is not applied automatically." : "Not submitted for review.",
      });
      onDone?.(outcome);
      return true;
    } catch (failure) {
      setError(describeError(failure));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const guard = useUnsavedGuard({ dirty: (reason.trim().length > 0 || scheduled.length > 0) && !busy, onDiscard: onClose, label: "this change" });
  const before = data ? describeConfig(data.before) : null;
  const after = data ? describeConfig(data.after) : null;
  const blocking = Boolean(data && (data.noChange || data.issues.length > 0 || data.decision.forbidden)) || Boolean(blockedByRole) || (reasonRequired && !reason.trim());
  const needsApproval = Boolean(data?.decision.required);

  const primaryLabel = data?.decision.forbidden ? "Not Permitted" : needsApproval ? "Submit For Approval" : future ? "Schedule Change" : emergency ? "Disable Now" : request.kind === "restore" ? "Restore Configuration" : "Apply Change";

  return (
    <>
      <SheetContent className="w-full sm:max-w-xl" onInteractOutside={(event) => busy && event.preventDefault()} onEscapeKeyDown={(event) => { event.preventDefault(); if (!busy) guard.requestClose(); }} aria-describedby="change-review-description">
        <SheetHeader>
          <SheetTitle>{request.title}</SheetTitle>
          <SheetDescription id="change-review-description">{request.description ?? `${request.flagName} - ${envLabel(request.environment)}. Review what changes and who it reaches before confirming.`}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3">
          {preview.error && !data ? (
            <AlertBanner tone="danger" title="Change Review Unavailable" action={<Button variant="outline" size="sm" onClick={() => void preview.refetch()}>Retry</Button>}>{describeError(preview.error).message}</AlertBanner>
          ) : !data || !before || !after ? (
            <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" role="status"><Loader2Icon className="size-4 animate-spin" />Evaluating the impact...</div>
          ) : (
            <>
              {production ? <AlertBanner tone="warning" title="Production Change">This affects the production configuration. A reason is required and the impact is recorded.</AlertBanner> : null}
              {data.noChange ? <AlertBanner tone="info" title="Nothing To Change">The proposed configuration matches the current one.</AlertBanner> : null}
              {data.issues.length > 0 ? (
                <AlertBanner tone="danger" title="This Change Is Not Valid">
                  <ul className="list-disc pl-4">{data.issues.map((issue) => <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>)}</ul>
                </AlertBanner>
              ) : null}

              <section aria-label="Current and proposed configuration" className="overflow-hidden rounded-sm border border-border">
                <table className="w-full text-[0.8125rem]">
                  <caption className="sr-only">Current and proposed configuration</caption>
                  <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wide text-muted-foreground">
                    <tr><th className="px-3 py-1.5 font-medium">Setting</th><th className="px-3 py-1.5 font-medium">Current</th><th className="w-6" /><th className="px-3 py-1.5 font-medium">Proposed</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(Object.keys(before) as Array<keyof typeof before>).filter((row) => before[row] !== "-" || after[row] !== "-").map((row) => {
                      const changed = before[row] !== after[row];
                      return (
                        <tr key={row} className={changed ? "bg-primary-subtle/40" : undefined}>
                          <td className="px-3 py-1.5 text-muted-foreground">{row}</td>
                          <td className="px-3 py-1.5 text-foreground">{before[row]}</td>
                          <td className="text-muted-foreground">{changed ? <ArrowRightIcon className="size-3" aria-hidden /> : null}</td>
                          <td className={cn("px-3 py-1.5", changed ? "font-medium text-foreground" : "text-foreground")}>{after[row]}{changed ? <span className="sr-only"> (changed)</span> : null}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              <section aria-label="Impact" className="space-y-2 rounded-sm border border-border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-[13px] font-semibold text-foreground">Company Impact</h4>
                  <p className="text-2xs text-muted-foreground">Evaluated against the current demo records</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.8125rem] sm:grid-cols-3">
                  <div><dt className="text-2xs text-muted-foreground">Available Now</dt><dd className="tabular font-medium">{data.impact.currentEnabled}</dd></div>
                  <div><dt className="text-2xs text-muted-foreground">Available After</dt><dd className="tabular font-medium">{data.impact.projectedEnabled}</dd></div>
                  <div><dt className="text-2xs text-muted-foreground">Eligible Companies</dt><dd className="tabular font-medium">{data.impact.eligible}</dd></div>
                  <div><dt className="text-2xs text-muted-foreground">Blocked By Plan</dt><dd className="tabular font-medium">{data.impact.planBlocked}</dd></div>
                  <div><dt className="text-2xs text-muted-foreground">Blocked By Dependency</dt><dd className="tabular font-medium">{data.impact.dependencyBlocked}</dd></div>
                  <div><dt className="text-2xs text-muted-foreground">Integration Not Ready</dt><dd className="tabular font-medium">{data.impact.integrationBlocked}</dd></div>
                  <div><dt className="text-2xs text-muted-foreground">Clients Affected</dt><dd className="text-muted-foreground">Unavailable</dd></div>
                  <div><dt className="text-2xs text-muted-foreground">Scheduled Jobs Affected</dt><dd className="text-muted-foreground">Unavailable</dd></div>
                </dl>
                <ListNames label="Companies Newly Reached" items={data.impact.newlyEnabled} tone="success" />
                <ListNames label="Companies No Longer Reached" items={data.impact.newlyDisabled} tone="danger" />
                <p className="text-2xs text-muted-foreground">Availability still depends on each company&rsquo;s plan, subscription, prerequisites and integrations. A flag never grants an entitlement or a permission.</p>
              </section>

              <AlertBanner tone={data.decision.forbidden ? "danger" : needsApproval ? "warning" : "info"} title={data.decision.forbidden ? "Not Permitted From Here" : needsApproval ? "Approval Required" : "No Approval Required"}>
                {data.decision.reason}
                {needsApproval && !data.decision.forbidden ? " No approval service is connected in this frontend phase, so submitting records a pending request. It does not apply the change and it is not approved." : ""}
              </AlertBanner>

              {blockedByRole ? <AlertBanner tone="warning" title="View Only">{blockedByRole}</AlertBanner> : null}

              <div className="space-y-1">
                <Label htmlFor="change-reason" className="text-[0.8125rem]">Reason {reasonRequired ? <span className="text-danger" aria-hidden>*</span> : <span className="text-muted-foreground">(optional)</span>}</Label>
                <Textarea id="change-reason" rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(error?.fieldErrors.reason)} placeholder={emergency ? "What is going wrong?" : "Why is this changing?"} />
                {error?.fieldErrors.reason ? <p role="alert" className="text-2xs text-danger">{error.fieldErrors.reason}</p> : <p className="text-2xs text-muted-foreground">{reason.length}/300. Recorded with the change.</p>}
              </div>

              {!emergency && !needsApproval ? (
                <div className="space-y-1">
                  <Label htmlFor="change-effective" className="text-[0.8125rem]">Apply At <span className="text-muted-foreground">(UTC, optional)</span></Label>
                  <Input id="change-effective" type="datetime-local" value={scheduled} min={new Date(platformNow()).toISOString().slice(0, 16)} onChange={(event) => setScheduled(event.target.value)} className="w-56" />
                  <p className="text-2xs text-muted-foreground">{future ? "It will be recorded as a planned change. No scheduler runs in this phase, so it is not applied automatically." : "Leave empty to apply now."}</p>
                </div>
              ) : null}

              {emergency ? <AlertBanner tone="danger" title="Emergency Disable">{`The feature is switched off at once in ${envLabel(request.environment)}. The rollout configuration is preserved, so it can be restored exactly as it was.`}</AlertBanner> : null}
              {error && !error.fieldErrors.reason ? <AlertBanner tone="danger" title="Change Not Recorded">{error.message}</AlertBanner> : null}
            </>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => guard.requestClose()} disabled={busy}>Cancel</Button>
          {!emergency && !data?.decision.forbidden ? <Button variant="outline" onClick={async () => { if (await submit(true)) onClose(); }} disabled={busy || !data || data.noChange || data.issues.length > 0 || Boolean(blockedByRole)}>Save As Draft</Button> : null}
          <Button variant={emergency ? "destructive" : "default"} onClick={async () => { if (await submit(false)) onClose(); }} disabled={busy || !data || blocking}>
            {busy ? <Loader2Icon className="animate-spin" /> : emergency ? <SnowflakeIcon /> : null}
            {primaryLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
      {guard.guardDialog}
    </>
  );
}
