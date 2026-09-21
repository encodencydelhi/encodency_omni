"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { OVERRIDABLE_RESOURCES } from "@/features/companies/data/config";
import { KeyValue } from "@/features/companies/components/primitives";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { OverrideFlow } from "@/features/plans-subscriptions/components/flows/override-flow";
import { resourceKeyForUsage } from "@/features/plans-subscriptions/data/entitlements";
import { describeError as describePlanError, usePlanMutations, useSubscription } from "@/features/plans-subscriptions/data/hooks";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { RESOURCE_BY_KEY } from "../data/catalogue";
import { usageRoutes } from "../data/config";
import { revocationImpact } from "../data/selectors";
import type { OverrideRow, ResourceKey } from "../data/types";
import { number, withUnit } from "../lib/format";
import { OverrideStatusBadge } from "./badges";

const limitLabel = (value: number | null, resource: ResourceKey) => (value === null ? "Unlimited" : withUnit(value, resource));

/** Loads the subscription the shared Plans & Subscriptions override wizard needs, then hands over to it. */
function SharedOverrideWizard({ subscriptionId, resource, onClose }: { subscriptionId: string; resource: ResourceKey; onClose: () => void }) {
  const detail = useSubscription(subscriptionId);
  if (!detail.data) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Override</DialogTitle><DialogDescription>Opening the shared override wizard...</DialogDescription></DialogHeader>
          {detail.error ? <AlertBanner tone="danger" title="Subscription Unavailable">The subscription could not be loaded. Nothing was changed.</AlertBanner> : <Loader2Icon className="mx-auto size-5 animate-spin text-muted-foreground" aria-label="Loading" />}
        </DialogContent>
      </Dialog>
    );
  }
  const planResource = resourceKeyForUsage(resource) ?? undefined;
  return <OverrideFlow row={detail.data.row} initialResource={planResource} onClose={onClose} />;
}

/**
 * Step one of the flow: choose the company and resource. Everything after it -
 * amounts, dates, conflict checks, impact review and confirmation - is the shared
 * wizard from Plans & Subscriptions, so there is exactly one override system.
 */
export function CreateOverrideDialog({ companies, initial, subscriptions, onClose }: { companies: Array<{ id: string; name: string }>; initial?: { companyId?: string; resource?: ResourceKey }; subscriptions: Record<string, string>; onClose: () => void }) {
  const [companyId, setCompanyId] = useState(initial?.companyId ?? "");
  const [resource, setResource] = useState<ResourceKey>(initial?.resource && OVERRIDABLE_RESOURCES.includes(initial.resource) ? initial.resource : "aiCredits");
  const [continued, setContinued] = useState(false);
  const subscriptionId = subscriptions[companyId];

  if (continued && subscriptionId) return <SharedOverrideWizard subscriptionId={subscriptionId} resource={resource} onClose={onClose} />;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Override</DialogTitle>
          <DialogDescription>Choose the company and the resource. You then set the amount, dates and reason, and review the impact before anything changes.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor="ov-company" className="text-[0.8125rem]">Company</Label>
            <Select value={companyId || undefined} onValueChange={setCompanyId}>
              <SelectTrigger id="ov-company"><SelectValue placeholder="Select a company" /></SelectTrigger>
              <SelectContent>{companies.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ov-resource" className="text-[0.8125rem]">Resource</Label>
            <Select value={resource} onValueChange={(next) => setResource(next as ResourceKey)}>
              <SelectTrigger id="ov-resource"><SelectValue /></SelectTrigger>
              <SelectContent>{OVERRIDABLE_RESOURCES.map((key) => <SelectItem key={key} value={key}>{RESOURCE_BY_KEY[key].name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <p className="text-2xs text-muted-foreground">An override is an approved exception to one company&apos;s plan allowance. It does not change the plan.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!companyId || !subscriptionId} onClick={() => setContinued(true)}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Revoking ends an override now. The review shows what the limit falls back to and whether usage would then be above it. */
export function RevokeOverrideDialog({ row, onClose }: { row: OverrideRow; onClose: () => void }) {
  const mutations = usePlanMutations();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const impact = revocationImpact(row);

  const confirm = async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await mutations.revokeOverride(row.subscriptionId, row.id, reason.trim());
      return true;
    } catch (failure) {
      setError(describePlanError(failure).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const guard = useUnsavedGuard({
    dirty: reason.trim().length > 0 && !busy,
    onDiscard: onClose,
    onSave: async () => {
      if (!reason.trim()) return false;
      const ok = await confirm();
      if (ok) onClose();
      return ok;
    },
    label: "this revocation",
  });

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && guard.requestClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revoke Override</DialogTitle>
            <DialogDescription>The override ends now and the company returns to its plan allowance. Nothing is charged or refunded.</DialogDescription>
          </DialogHeader>
          <dl className="divide-y divide-border rounded-sm border border-border px-3">
            <KeyValue label="Company">{row.companyName}</KeyValue>
            <KeyValue label="Resource">{RESOURCE_BY_KEY[row.resource].name}</KeyValue>
            <KeyValue label="Base allowance">{limitLabel(row.base, row.resource)}</KeyValue>
            <KeyValue label="Current effective allowance">{limitLabel(row.effective, row.resource)}</KeyValue>
            <KeyValue label="Current usage">{row.used === null ? "Data Unavailable" : withUnit(row.used, row.resource)}</KeyValue>
            <KeyValue label="Effective allowance after revocation">{limitLabel(impact.effectiveAfter, row.resource)}</KeyValue>
          </dl>
          {impact.over ? (
            <AlertBanner tone="warning" title="The Company Would Be Over Its Limit">
              After revocation, usage of {row.used === null ? "" : number(row.used)} is {number(impact.excess)} above the {limitLabel(impact.effectiveAfter, row.resource)} allowance. Existing data is kept, but the resource&apos;s over-limit policy would apply.
            </AlertBanner>
          ) : (
            <AlertBanner tone="info" title="No Over-Limit Impact">Current usage stays within the plan allowance after revocation.</AlertBanner>
          )}
          <div className="space-y-1">
            <Label htmlFor="revoke-reason" className="text-[0.8125rem]">Reason<span className="ml-0.5 text-danger" aria-hidden>*</span></Label>
            <Textarea id="revoke-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this override ending early?" />
          </div>
          {error ? <AlertBanner tone="danger" title="Not Revoked">{error}</AlertBanner> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => guard.requestClose()} disabled={busy}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                if (await confirm()) onClose();
              }}
            >
              {busy ? <Loader2Icon className="animate-spin" /> : null}
              Revoke Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.guardDialog}
    </>
  );
}

/** One override in full, with what happens when it ends. */
export function OverrideDrawer({ row, onClose, onRevoke, canManage }: { row: OverrideRow | null; onClose: () => void; onRevoke: (row: OverrideRow) => void; canManage: boolean }) {
  return (
    <Sheet open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{row ? `${RESOURCE_BY_KEY[row.resource].name} Override` : "Override"}</SheetTitle>
          <SheetDescription>{row ? `${row.companyName} - ${row.id}` : ""}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {row ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1"><OverrideStatusBadge status={row.status} /></div>
              <div className="rounded-sm border border-border bg-muted/30 p-3 text-[0.8125rem]">
                <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">How the allowance is reached</p>
                <p className="mt-1 tabular text-foreground">
                  {row.rule === "additive" ? `${limitLabel(row.base, row.resource)} + ${number(row.amount)} = ${limitLabel(row.effective, row.resource)}` : `Replaces the plan allowance with ${number(row.amount)} (absolute)`}
                </p>
              </div>
              {row.overAfterExpiry ? (
                <AlertBanner tone="warning" title="Usage Would Exceed the Limit After Expiry">
                  Without this override the limit falls back to {limitLabel(row.base, row.resource)}, and current usage of {row.used === null ? "" : number(row.used)} would be above it. The frontend does not run a real expiry job.
                </AlertBanner>
              ) : null}
              <dl className="divide-y divide-border">
                <KeyValue label="Type">{row.rule === "additive" ? "Additive" : "Absolute"}</KeyValue>
                <KeyValue label="Base allowance">{limitLabel(row.base, row.resource)}</KeyValue>
                <KeyValue label="Effective allowance">{limitLabel(row.effective, row.resource)}</KeyValue>
                <KeyValue label="Current usage">{row.used === null ? "Data Unavailable" : withUnit(row.used, row.resource)}</KeyValue>
                <KeyValue label="Starts">{formatDate(row.startsAt)}</KeyValue>
                <KeyValue label="Expires">{formatDate(row.expiresAt)}{row.expiresInDays !== null ? ` (${row.expiresInDays} days)` : ""}</KeyValue>
                {row.revokedAt ? <KeyValue label="Revoked">{formatDateTime(row.revokedAt)}</KeyValue> : null}
                <KeyValue label="Approved by">{row.approvedBy}</KeyValue>
                <KeyValue label="Reason">{row.reason}</KeyValue>
              </dl>
            </div>
          ) : null}
        </SheetBody>
        {row ? (
          <SheetFooter className="flex-wrap">
            {canManage && (row.status === "active" || row.status === "scheduled") ? <Button variant="destructive" size="sm" onClick={() => onRevoke(row)}>Revoke Override</Button> : null}
            <Button asChild variant="outline" size="sm"><Link href={usageRoutes.companyUsage(row.companyId, row.resource)}>Open Company Usage</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={usageRoutes.subscription(row.subscriptionId)}>Open Subscription</Link></Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
