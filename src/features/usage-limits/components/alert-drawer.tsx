"use client";

import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { KeyValue } from "@/features/companies/components/primitives";
import { useCurrentStaff } from "@/features/companies/data/capability-provider";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { formatDateTime } from "@/lib/utils/format";
import { RESOURCE_BY_KEY } from "../data/catalogue";
import { ALERT_TYPE, usageRoutes } from "../data/config";
import { describeError, useAlert, useUsageCapabilities, useUsageMutations } from "../data/hooks";
import type { UsageAlert } from "../data/types";
import { number, percentText, withUnit } from "../lib/format";
import { AlertStatusBadge, ProcessingBadge, SeverityBadge } from "./badges";
import { UsageError } from "./states";

/**
 * Records that a person has seen an alert. It changes the alert's status and
 * writes an activity entry; it does not change consumption, and if the condition
 * persists the alert stays a live condition - acknowledged is not resolved.
 */
export function AcknowledgeDialog({ alert, onClose }: { alert: UsageAlert; onClose: () => void }) {
  const mutations = useUsageMutations();
  const staff = useCurrentStaff();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await mutations.acknowledgeAlert(alert.id, note);
      return true;
    } catch (failure) {
      setError(describeError(failure).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const guard = useUnsavedGuard({
    dirty: note.trim().length > 0 && !busy,
    onDiscard: onClose,
    onSave: async () => {
      const ok = await confirm();
      if (ok) onClose();
      return ok;
    },
    label: "this acknowledgement note",
  });

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && guard.requestClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acknowledge Alert</DialogTitle>
            <DialogDescription>Record that this alert has been seen. Usage does not change, and the condition is not marked resolved.</DialogDescription>
          </DialogHeader>
          <dl className="divide-y divide-border rounded-sm border border-border px-3">
            <KeyValue label="Alert">{ALERT_TYPE[alert.type].label}</KeyValue>
            <KeyValue label="Company">{alert.companyName}</KeyValue>
            <KeyValue label="Resource">{RESOURCE_BY_KEY[alert.resource].name}</KeyValue>
            <KeyValue label="Acknowledged by">{staff.name}</KeyValue>
          </dl>
          <div className="space-y-1">
            <Label htmlFor="ack-note" className="text-[0.8125rem]">Note <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="ack-note" rows={3} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What was reviewed, or what happens next?" />
          </div>
          {error ? <AlertBanner tone="danger" title="Not Acknowledged">{error}</AlertBanner> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => guard.requestClose()} disabled={busy}>Cancel</Button>
            <Button
              onClick={async () => {
                if (await confirm()) onClose();
              }}
              disabled={busy}
            >
              {busy ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon />}
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.guardDialog}
    </>
  );
}

/** Everything about one alert, starting with why it exists. */
export function AlertDrawer({ alertId, onClose }: { alertId: string | null; onClose: () => void }) {
  const query = useAlert(alertId);
  const capabilities = useUsageCapabilities();
  const [acknowledging, setAcknowledging] = useState(false);
  const detail = query.data;
  const alert = detail?.alert;
  const definition = alert ? RESOURCE_BY_KEY[alert.resource] : undefined;

  return (
    <>
      <Sheet open={Boolean(alertId)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{alert ? `${ALERT_TYPE[alert.type].label} - ${alert.companyName}` : "Alert"}</SheetTitle>
            <SheetDescription>{alert ? `${definition?.name} - ${alert.id}` : "Loading the alert..."}</SheetDescription>
          </SheetHeader>
          <SheetBody>
            {query.error && !alert ? (
              <UsageError subject="Alert" error={query.error} onRetry={() => void query.refetch()} back={{ href: usageRoutes.alerts, label: "Back to Alerts" }} />
            ) : !alert || !detail || !definition ? (
              <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" role="status"><Loader2Icon className="size-4 animate-spin" />Loading...</div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1"><SeverityBadge severity={alert.severity} /><AlertStatusBadge status={alert.status} /></div>
                <div className="rounded-sm border border-border bg-muted/30 p-3">
                  <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Why this alert exists</p>
                  <p className="mt-1 text-[0.8125rem] text-foreground">{alert.reason}</p>
                </div>
                {alert.status === "acknowledged" ? (
                  <AlertBanner tone="info" title="Acknowledged, Not Resolved">
                    {alert.acknowledgedBy} acknowledged this {alert.acknowledgedAt ? formatDateTime(alert.acknowledgedAt) : ""}
                    {alert.acknowledgementNote ? `: "${alert.acknowledgementNote}"` : "."} The condition still exists.
                  </AlertBanner>
                ) : null}
                {alert.status === "resolved" ? <AlertBanner tone="success" title="Resolved">{alert.resolvedReason}</AlertBanner> : null}
                <dl className="divide-y divide-border">
                  <KeyValue label="Alert ID"><code className="break-all text-[11px]">{alert.id}</code></KeyValue>
                  <KeyValue label="Company"><Link href={usageRoutes.company(alert.companyId)} className="font-medium text-primary hover:underline">{alert.companyName}</Link></KeyValue>
                  <KeyValue label="Resource">{definition.name}</KeyValue>
                  <KeyValue label="Current usage">{alert.used === null ? "Data Unavailable" : withUnit(alert.used, alert.resource)}</KeyValue>
                  <KeyValue label="Effective limit">{alert.limit === null ? "Unlimited" : withUnit(alert.limit, alert.resource)}</KeyValue>
                  <KeyValue label="Utilization">{percentText(alert.percent)}</KeyValue>
                  <KeyValue label="Threshold">{alert.threshold === null ? "-" : `${alert.threshold}%`}</KeyValue>
                  <KeyValue label="First triggered">{formatDateTime(alert.firstTriggeredAt)}</KeyValue>
                  <KeyValue label="Last observed">{formatDateTime(alert.lastObservedAt)}</KeyValue>
                  <KeyValue label="Subscription">{alert.subscriptionId ? <Link href={usageRoutes.subscription(alert.subscriptionId)} className="font-medium text-primary hover:underline">{alert.subscriptionId}</Link> : "-"}</KeyValue>
                  <KeyValue label="Related override">{detail.override ? `${detail.override.rule === "additive" ? "+" : ""}${number(detail.override.amount)} until ${formatDateTime(detail.override.expiresAt)} (${detail.override.status})` : "None"}</KeyValue>
                </dl>
                <p className="text-2xs text-muted-foreground">{definition.overLimitBehavior} These are policy descriptions; the frontend does not enforce them.</p>
                <section aria-label="Recent usage events">
                  <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Recent usage events</p>
                  {detail.events.length === 0 ? (
                    <p className="text-2xs text-muted-foreground">No consumption events for this resource.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-sm border border-border">
                      {detail.events.map((event) => (
                        <li key={event.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[0.8125rem]">
                          <span className="text-2xs text-muted-foreground">{formatDateTime(event.occurredAt)}</span>
                          <span className="tabular">+{number(event.quantity)} {event.unit}</span>
                          <ProcessingBadge status={event.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <section aria-label="Activity">
                  <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</p>
                  {detail.activity.length === 0 ? (
                    <p className="text-2xs text-muted-foreground">No activity recorded for this alert yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {detail.activity.map((entry) => (
                        <li key={entry.id} className="rounded-sm border border-border px-3 py-1.5 text-[0.8125rem]">
                          {entry.text}
                          <span className="block text-2xs text-muted-foreground">{formatDateTime(entry.at)}{entry.actor ? ` - ${entry.actor}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </SheetBody>
          {alert ? (
            <SheetFooter className="flex-wrap">
              {alert.status === "open" && capabilities.canAcknowledgeUsageAlerts ? <Button size="sm" onClick={() => setAcknowledging(true)}><CheckCircle2Icon />Acknowledge</Button> : null}
              <Button asChild variant="outline" size="sm"><Link href={usageRoutes.companyUsage(alert.companyId, alert.resource)}>Open Company Usage</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href={`${usageRoutes.overrides}?company=${alert.companyId}&resource=${alert.resource}`}>Review Entitlements</Link></Button>
              <Button asChild variant="outline" size="sm"><Link href={usageRoutes.company(alert.companyId)}>Open Company</Link></Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
      {acknowledging && alert ? <AcknowledgeDialog alert={alert} onClose={() => setAcknowledging(false)} /> : null}
    </>
  );
}
