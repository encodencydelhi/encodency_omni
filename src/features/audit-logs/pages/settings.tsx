"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertBanner } from "@/components/shared/alert-banner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { PanelSkeleton } from "@/features/companies/components/states";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";
import { DemoTag } from "../components/badges";
import { AuditError } from "../components/states";
import { AUDIT_MOCK_MODE, COLLECTION_STATE, auditRoutes } from "../data/config";
import { useAuditMutations, useAuditSettings } from "../data/hooks";
import { ago, utcShort } from "../lib/format";

const SECTIONS = [
  { key: "coverage", label: "Audit Coverage" },
  { key: "retention", label: "Retention Policy Reference" },
  { key: "export", label: "Export Governance" },
  { key: "status", label: "Audit System Status" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

/**
 * What is instrumented, how long records are kept, how exports are governed and what state the
 * audit system is in. Retention is a reference to Global Settings - there is no second
 * retention editor here - and nothing on this page claims tamper-proof or complete coverage.
 */
export function AuditSettingsPage() {
  const router = useRouter();
  const requested = useSearchParams().get("section");
  const section: SectionKey = SECTIONS.find((item) => item.key === requested)?.key ?? "coverage";
  const query = useAuditSettings();
  const mutations = useAuditMutations();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const data = query.data;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Settings & Retention"
        description="Audit coverage, retention reference, export governance and the state of the audit system. Retention itself is set in Global Settings."
        meta={AUDIT_MOCK_MODE ? <DemoTag>Demo Audit Data - Backend Ingestion Not Connected</DemoTag> : undefined}
      />

      <nav aria-label="Settings sections" className="flex flex-wrap gap-1">
        {SECTIONS.map((item) => (
          <Link key={item.key} href={auditRoutes.settings({ section: item.key === "coverage" ? undefined : item.key })} aria-current={item.key === section ? "page" : undefined} className={cn("rounded-sm border px-2.5 py-1 text-[0.8125rem] font-medium transition-colors", item.key === section ? "border-primary/40 bg-primary-subtle text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent")}>{item.label}</Link>
        ))}
      </nav>

      {query.error && !data ? (
        <AuditError subject="Audit Settings" error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <PanelSkeleton rows={8} />
      ) : (
        <>
          {section === "coverage" ? (
            <div className="space-y-1">
              <AlertBanner tone="warning" title="Coverage Is Not Verified">Having demo events for a module does not mean production audit collection is implemented. Instrumentation must be verified against each real service.</AlertBanner>
              <Panel title="Audit Coverage" description="The key events each module is expected to emit, and what this frontend can see of them." flush>
                <MiniTable
                  caption="Audit coverage by module"
                  rows={data.coverage}
                  getKey={(row) => row.module}
                  columns={[
                    { id: "module", header: "Module", cell: (row) => <span className="font-medium text-foreground">{row.module}</span> },
                    { id: "expected", header: "Expected Key Events", hideBelow: "md", cell: (row) => <span className="block max-w-72 text-2xs text-muted-foreground">{row.expectedEvents.join(", ")}</span> },
                    { id: "collection", header: "Collection Configuration", cell: (row) => <div><Badge tone={COLLECTION_STATE[row.collection].tone}>{COLLECTION_STATE[row.collection].label}</Badge><p className="mt-0.5 max-w-56 text-2xs text-muted-foreground">{row.note}</p></div> },
                    { id: "verification", header: "Verification", hideBelow: "lg", cell: (row) => <Badge tone={row.verification === "pending" ? "info" : "neutral"}>{row.verification === "pending" ? "Pending" : "Not Verified"}</Badge> },
                    { id: "last", header: "Last Recorded Event", hideBelow: "lg", cell: (row) => (row.lastRecordedAt ? <span className="whitespace-nowrap text-2xs">{utcShort(row.lastRecordedAt)}<span className="block text-muted-foreground">{row.recordedCount} in demo</span></span> : <span className="text-2xs text-muted-foreground">None Recorded</span>) },
                    { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (row) => (<span className="inline-flex gap-1">{row.recordedCount > 0 ? <Button size="sm" variant="ghost" onClick={() => router.push(auditRoutes.events({ module: row.module, range: "custom", from: "2000-01-01", to: "2099-12-31" }))}>View Events</Button> : null}{row.href ? <Button asChild size="sm" variant="ghost"><Link href={row.href}>Open Module</Link></Button> : null}</span>) },
                  ]}
                />
              </Panel>
              <Panel title="Known Collection Gaps" description="Modules whose auditable actions are not all recorded yet. These drive the Collection Issues count on the Overview.">
                {data.gaps.length === 0 ? <p className="text-[0.8125rem] text-muted-foreground">No known collection gap.</p> : (
                  <ul className="divide-y divide-border">
                    {data.gaps.map((gap) => <li key={gap.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5"><span className="w-44 shrink-0 text-[0.8125rem] font-medium text-foreground">{gap.module}</span><span className="min-w-0 flex-1 text-[0.8125rem] text-muted-foreground">{gap.summary}</span><span className="text-2xs text-muted-foreground">Known {ago(gap.since)}</span></li>)}
                  </ul>
                )}
              </Panel>
            </div>
          ) : null}

          {section === "retention" ? (
            <Panel title="Retention Policy Reference" description="Read from Global Settings. There is no second retention editor here." action={<Button asChild size="sm"><Link href={data.retention.policyHref}><ExternalLinkIcon />Open Global Settings: Data &amp; Privacy</Link></Button>}>
              <dl className="divide-y divide-border">
                <KeyValue label="Current Retention Policy">{data.retention.retentionDays} days</KeyValue>
                <KeyValue label="Effective Since">{data.retention.effectiveSince ? utcShort(data.retention.effectiveSince) : "Not recorded"}</KeyValue>
                <KeyValue label="Policy Owner">{data.retention.owner}</KeyValue>
                <KeyValue label="Archive Behavior">{data.retention.archiveBehavior}</KeyValue>
                <KeyValue label="Expiry / Deletion Policy">{data.retention.expiryPolicy}</KeyValue>
                <KeyValue label="Legal Hold Reference">{data.retention.legalHold}</KeyValue>
              </dl>
              <AlertBanner tone="info" className="mt-2">This is a configured policy, not a verified legal or compliance requirement. Actual cleanup needs backend enforcement, and none runs in this frontend phase.</AlertBanner>
            </Panel>
          ) : null}

          {section === "export" ? (
            <Panel title="Export Governance" description="The rules every audit export follows. They are applied by the export dialog and cannot be edited here.">
              <dl className="divide-y divide-border">
                <KeyValue label="Required Capability">{data.exportGovernance.requiredCapability}</KeyValue>
                <KeyValue label="Allowed Scope">{data.exportGovernance.allowedScope}</KeyValue>
                <KeyValue label="Reason Requirement">{data.exportGovernance.reasonRequired ? "Required for every export" : "Not required"}</KeyValue>
                <KeyValue label="Maximum Date Range">{data.exportGovernance.maxRangeDays} days</KeyValue>
                <KeyValue label="Sensitive Field Redaction">{data.exportGovernance.redaction}</KeyValue>
                <KeyValue label="Approval Requirement">{data.exportGovernance.approval}</KeyValue>
                <KeyValue label="Export Activity Logging">{data.exportGovernance.loggingPolicy}</KeyValue>
                <KeyValue label="Exports Logged This Session">{data.exportGovernance.loggedExports}</KeyValue>
              </dl>
              {data.exportGovernance.loggedExports > 0 ? <Button asChild size="sm" variant="outline" className="mt-2"><Link href={auditRoutes.events({ q: "Audit Export", range: "custom", from: "2000-01-01", to: "2099-12-31" })}>View Export Events</Link></Button> : null}
            </Panel>
          ) : null}

          {section === "status" ? (
            <div className="space-y-1">
              <Panel title="Audit System Status" description="What is actually connected. In this frontend phase most of it is not.">
                <dl className="divide-y divide-border">
                  <KeyValue label="Audit Data Source">{data.status.dataSource}</KeyValue>
                  <KeyValue label="Backend Ingestion Connection">{data.status.ingestion}</KeyValue>
                  <KeyValue label="Event Collection Status">{data.status.collection}</KeyValue>
                  <KeyValue label="Last Received Event">{data.status.lastReceivedAt ? `${utcShort(data.status.lastReceivedAt)} (${ago(data.status.lastReceivedAt)})` : "None"}</KeyValue>
                  <KeyValue label="Known Collection Gaps">{data.status.knownGaps}</KeyValue>
                  <KeyValue label="Storage Verification">{data.status.storageVerification}</KeyValue>
                  <KeyValue label="Integrity Verification">{data.status.integrity}</KeyValue>
                  <KeyValue label="Retention Execution">{data.status.retentionExecution}</KeyValue>
                  <KeyValue label="Production Coverage">{data.status.productionCoverage}</KeyValue>
                </dl>
              </Panel>
              <AlertBanner tone="info" title="What This Does Not Claim">This trail is not described as tamper-proof, compliant or fully audited, because nothing here is independently verified. Those statements need real system evidence from a connected backend.</AlertBanner>
              {AUDIT_MOCK_MODE ? (
                <Panel title="Demo Data" description="Investigations and this session's export events are held in this browser session only.">
                  <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>Reset Demo Investigations</Button>
                </Panel>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => !busy && setConfirming(open)}
        title="Reset Demo Investigations?"
        description="Investigations, notes, links and this session's export events return to their original demo state. Audit events from other modules are not affected."
        confirmLabel="Reset"
        variant="destructive"
        isPending={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await mutations.resetDemoData();
            toast.success("Demo Investigations Reset");
            setConfirming(false);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
