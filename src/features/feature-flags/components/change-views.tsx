"use client";

import { Loader2Icon, XCircleIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { useUnsavedGuard } from "@/features/companies/hooks/use-unsaved-guard";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { formatDateTime } from "@/lib/utils/format";
import { CHANGE_TYPE, STRATEGY, flagRoutes } from "../data/config";
import { describeError, useComparison, useFlagCapabilities, useFlagMutations, useVersions } from "../data/hooks";
import type { ConfigDiff, Environment, FlagChange } from "../data/types";
import { ago } from "../lib/format";
import { ChangeStatusBadge } from "./badges";
import { ChangeReviewDrawer, type ChangeRequest } from "./change-review";

const isOpen = (change: FlagChange) => change.status === "draft" || change.status === "pending_approval" || change.status === "scheduled";

function configLines(config: ConfigDiff | null): Array<[string, string]> {
  if (!config) return [];
  return [
    ["Platform State", config.emergencyOff ? "Emergency Off" : config.enabled ? "Enabled" : "Disabled"],
    ["Rollout Strategy", STRATEGY[config.strategy].label],
    ["Percentage", config.strategy === "percentage" ? `${config.percentage}%` : "-"],
    ["Selected Companies", config.strategy === "selected" ? String(config.selectedCompanyIds.length) : "-"],
    ["Prerequisites", config.prerequisites.length ? config.prerequisites.join(", ") : "None"],
  ];
}

/** The change list used by Pending, Scheduled, History and a single flag's activity. */
export function ChangesTable({ rows, onOpen, showFlag = true, empty }: { rows: readonly FlagChange[]; onOpen: (change: FlagChange) => void; showFlag?: boolean; empty: { title: string; description: string } }) {
  return (
    <MiniTable
      caption="Flag changes"
      rows={rows}
      getKey={(change) => change.id}
      onRowClick={onOpen}
      empty={<EmptyState icon={XCircleIcon} title={empty.title} description={empty.description} size="sm" />}
      columns={[
        ...(showFlag ? [{ id: "flag", header: "Feature", cell: (change: FlagChange) => <div className="min-w-0"><p className="truncate font-medium text-foreground">{change.flagName}</p><p className="truncate font-mono text-2xs text-muted-foreground">{change.flagKey}</p></div> }] : []),
        { id: "type", header: "Change", cell: (change: FlagChange) => CHANGE_TYPE[change.type] },
        { id: "env", header: "Environment", hideBelow: "md" as const, cell: (change: FlagChange) => <span className="capitalize">{change.environment}</span> },
        { id: "status", header: "Status", cell: (change: FlagChange) => <ChangeStatusBadge status={change.status} /> },
        { id: "by", header: "Requested By", hideBelow: "lg" as const, cell: (change: FlagChange) => change.requestedBy },
        { id: "at", header: "Requested", hideBelow: "md" as const, cell: (change: FlagChange) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{ago(change.requestedAt)}</span> },
        { id: "effective", header: "Effective", hideBelow: "lg" as const, cell: (change: FlagChange) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{change.effectiveAt ? formatDateTime(change.effectiveAt) : "-"}</span> },
      ]}
    />
  );
}

/** Asks why an open change is being withdrawn. Cancelling does not touch the live configuration. */
function CancelDialog({ change, onClose }: { change: FlagChange; onClose: () => void }) {
  const mutations = useFlagMutations();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guard = useUnsavedGuard({ dirty: reason.trim().length > 0 && !busy, onDiscard: onClose, label: "this reason" });
  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && guard.requestClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel This Change</DialogTitle>
            <DialogDescription>{CHANGE_TYPE[change.type]} for {change.flagName} is withdrawn. The live configuration is not touched.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="cancel-reason" className="text-[0.8125rem]">Reason <span className="text-danger" aria-hidden>*</span></Label>
            <Textarea id="cancel-reason" rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          {error ? <AlertBanner tone="danger" title="Not Cancelled">{error}</AlertBanner> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => guard.requestClose()} disabled={busy}>Keep Change</Button>
            <Button
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await mutations.cancelChange(change.id, reason);
                  toast.success("Change Cancelled", { description: "The change was withdrawn. Nothing was applied." });
                  onClose();
                } catch (failure) {
                  setError(describeError(failure).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Loader2Icon className="animate-spin" /> : null}
              Cancel Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {guard.guardDialog}
    </>
  );
}

/**
 * One change in full: what it would set, who it reaches, what governance said, and
 * what happened to it. An open change can be cancelled or reviewed again; a demo
 * approval is never simulated, so a request waiting for approval stays waiting.
 */
export function ChangeDrawer({ change, onClose }: { change: FlagChange | null; onClose: () => void }) {
  const capabilities = useFlagCapabilities();
  const [cancelling, setCancelling] = useState(false);
  const [revising, setRevising] = useState<ChangeRequest | null>(null);
  const before = configLines(change?.before ?? null);
  const after = configLines(change?.after ?? null);

  return (
    <>
      <Sheet open={Boolean(change)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{change ? `${CHANGE_TYPE[change.type]} - ${change.flagName}` : "Change"}</SheetTitle>
            <SheetDescription>{change ? `${change.id} - ${change.environment[0]?.toUpperCase()}${change.environment.slice(1)}` : ""}</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3">
            {change ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5"><ChangeStatusBadge status={change.status} />{change.demo ? <span className="text-2xs text-muted-foreground">Demo record</span> : null}</div>
                <AlertBanner tone={change.status === "pending_approval" ? "warning" : "info"} title={change.approvalRequired ? "Approval Required" : "No Approval Required"}>{change.approvalNote}</AlertBanner>
                {before.length > 0 ? (
                  <div className="overflow-hidden rounded-sm border border-border">
                    <table className="w-full text-[0.8125rem]">
                      <caption className="sr-only">Configuration before and after</caption>
                      <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-1.5 font-medium">Setting</th><th className="px-3 py-1.5 font-medium">Before</th><th className="px-3 py-1.5 font-medium">After</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {before.map(([label, value], index) => {
                          const next = after[index]?.[1] ?? "-";
                          return <tr key={label} className={value !== next ? "bg-primary-subtle/40" : undefined}><td className="px-3 py-1.5 text-muted-foreground">{label}</td><td className="px-3 py-1.5">{value}</td><td className="px-3 py-1.5 font-medium">{next}</td></tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <dl className="divide-y divide-border rounded-sm border border-border px-3">
                  <KeyValue label="Requested By">{change.requestedBy}</KeyValue>
                  <KeyValue label="Requested">{formatDateTime(change.requestedAt)}</KeyValue>
                  <KeyValue label="Effective">{change.effectiveAt ? `${formatDateTime(change.effectiveAt)} (${change.timezone})` : "Not Set"}</KeyValue>
                  <KeyValue label="Applied">{change.appliedAt ? formatDateTime(change.appliedAt) : "Not Applied"}</KeyValue>
                  <KeyValue label="Version Created">{change.versionNumber ? `v${change.versionNumber}` : "None"}</KeyValue>
                  {change.impact ? <KeyValue label="Companies Reached">{change.impact.currentEnabled} to {change.impact.projectedEnabled}</KeyValue> : null}
                  {change.impact ? <KeyValue label="Clients Affected">Unavailable</KeyValue> : null}
                  {change.impact ? <KeyValue label="Scheduled Jobs Affected">Unavailable</KeyValue> : null}
                </dl>
                <div><p className="text-2xs font-medium text-foreground">Reason</p><p className="text-[0.8125rem] text-muted-foreground">{change.reason || "No reason recorded."}</p></div>
                {change.impact && change.impact.newlyEnabled.length > 0 ? <p className="text-2xs text-muted-foreground">Newly reached: {change.impact.newlyEnabled.map((item) => item.name).join(", ")}</p> : null}
                {change.status === "scheduled" ? <AlertBanner tone="info" title="Planned, Not Applied">No scheduler runs in this frontend phase, so a scheduled change is only a record of intent.</AlertBanner> : null}
              </>
            ) : null}
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
            {change ? <Button asChild variant="outline"><Link href={flagRoutes.flag(change.flagKey, change.environment)}>Open Flag</Link></Button> : null}
            {change && isOpen(change) && capabilities.canChangeRollout && change.after ? (
              <Button variant="outline" onClick={() => setRevising({ flagKey: change.flagKey, flagName: change.flagName, environment: change.environment, proposed: change.after ?? {}, title: `Review Again - ${change.flagName}`, description: "The change is re-evaluated against today's companies, plans and prerequisites before anything is recorded. If the situation changed, the review says so." })}>Review Again</Button>
            ) : null}
            {change && isOpen(change) && capabilities.canChangeRollout ? <Button variant="destructive" onClick={() => setCancelling(true)}>Cancel Change</Button> : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {change && cancelling ? <CancelDialog change={change} onClose={() => { setCancelling(false); onClose(); }} /> : null}
      <ChangeReviewDrawer request={revising} onClose={() => setRevising(null)} onDone={() => { setRevising(null); onClose(); }} />
    </>
  );
}

/**
 * Configuration versions and a comparison. There is deliberately no one-click rollback:
 * reverting means proposing the older configuration through the same review, which
 * revalidates it against what exists today.
 */
export function VersionsPanel({ flagKey, environment }: { flagKey: string | null; environment: Environment }) {
  const capabilities = useFlagCapabilities();
  const versions = useVersions(flagKey, environment);
  const rows = versions.data?.rows ?? [];
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const comparison = useComparison(from || null, to || null);
  const [request, setRequest] = useState<ChangeRequest | null>(null);
  const label = (id: string) => { const row = rows.find((item) => item.id === id); return row ? `${row.flagKey} v${row.version}${row.current ? " (Current)" : ""}` : id; };

  return (
    <div className="space-y-1">
      <Panel title="Configuration Versions" description="Each applied change creates a new version. A version is a snapshot of the configuration, not a rollback point.">
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={from || undefined} onValueChange={setFrom}>
            <SelectTrigger size="sm" aria-label="Compare from" className="w-56"><SelectValue placeholder="Compare from..." /></SelectTrigger>
            <SelectContent>{rows.map((row) => <SelectItem key={row.id} value={row.id}>{label(row.id)}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={to || undefined} onValueChange={setTo}>
            <SelectTrigger size="sm" aria-label="Compare to" className="w-56"><SelectValue placeholder="Compare to..." /></SelectTrigger>
            <SelectContent>{rows.map((row) => <SelectItem key={row.id} value={row.id}>{label(row.id)}</SelectItem>)}</SelectContent>
          </Select>
          {from && to && from === to ? <span className="text-2xs text-warning">Choose two different versions.</span> : null}
        </div>
        {comparison.data ? (
          <div className="mt-2 overflow-hidden rounded-sm border border-border">
            <table className="w-full text-[0.8125rem]">
              <caption className="sr-only">Version comparison</caption>
              <thead className="bg-surface-sunken text-left text-2xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-1.5 font-medium">Setting</th><th className="px-3 py-1.5 font-medium">{label(comparison.data.from.id)}</th><th className="px-3 py-1.5 font-medium">{label(comparison.data.to.id)}</th></tr></thead>
              <tbody className="divide-y divide-border">
                {comparison.data.rows.map((row) => <tr key={row.field} className={row.changed ? "bg-primary-subtle/40" : undefined}><td className="px-3 py-1.5 text-muted-foreground">{row.field}</td><td className="px-3 py-1.5">{row.from}</td><td className="px-3 py-1.5 font-medium">{row.to}{row.changed ? <span className="sr-only"> (changed)</span> : null}</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>
      <Panel flush>
        <MiniTable
          caption="Configuration versions"
          rows={rows}
          getKey={(row) => row.id}
          empty={<EmptyState icon={XCircleIcon} size="sm" title="No Versions" description="No configuration version exists for this environment." />}
          columns={[
            ...(flagKey ? [] : [{ id: "flag", header: "Feature", cell: (row: (typeof rows)[number]) => <span className="font-mono text-2xs">{row.flagKey}</span> }]),
            { id: "version", header: "Version", cell: (row) => <span className="font-medium tabular">v{row.version}{row.current ? <span className="ml-1 text-2xs text-success">Current</span> : null}</span> },
            { id: "config", header: "Configuration", cell: (row) => <span className="text-2xs text-muted-foreground">{row.config.emergencyOff ? "Emergency Off" : row.config.enabled ? "Enabled" : "Disabled"} - {STRATEGY[row.config.strategy].short}{row.config.strategy === "percentage" ? ` ${row.config.percentage}%` : ""}{row.config.strategy === "selected" ? ` (${row.config.selectedCompanyIds.length})` : ""}</span> },
            { id: "by", header: "Created By", hideBelow: "md", cell: (row) => row.createdBy },
            { id: "at", header: "Created", hideBelow: "md", cell: (row) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{ago(row.createdAt)}</span> },
            { id: "reason", header: "Reason", hideBelow: "lg", cell: (row) => <span className="line-clamp-1 max-w-64 text-2xs text-muted-foreground">{row.reason}</span> },
            { id: "revert", header: <span className="sr-only">Revert</span>, align: "right", cell: (row) => (row.current || !capabilities.canChangeRollout ? null : <Button variant="ghost" size="sm" onClick={() => setRequest({ flagKey: row.flagKey, flagName: row.flagKey, environment: row.environment, proposed: row.config, title: `Draft Reversion To v${row.version}`, description: "This proposes the older configuration through the normal review. It is revalidated against today's companies, plans and prerequisites, and is not applied until you confirm." })}>Draft Reversion</Button>) },
          ]}
        />
      </Panel>
      <ChangeReviewDrawer request={request} onClose={() => setRequest(null)} />
    </div>
  );
}
