/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Failures & Retries: incoming processing failures, outgoing delivery failures, retry-scheduled,
 * attempts exhausted, recovery requests.
 */

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionMenu } from "@/components/shared/action-menu";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Button } from "@/components/ui/button";
import { DELIVERY_STATE, FAILURE_CLASS, MODULE_LINKS, PROCESSING_STATE, RECOVERY_KIND, RECOVERY_STATE, VERIFICATION_STATE, WEBHOOK_ROUTES } from "../data/config";
import { useWebhookMutation } from "../data/hooks";
import { webhooksRepository } from "../data/repository";
import { deliveriesInWindow, evaluateIncomingReprocess, incomingInWindow, isIncomingProcessingFailure } from "../data/selectors";
import type { Delivery, IncomingEvent, RecoveryRequest } from "../data/types";
import { CompanyCell, EndpointCell, EventKeyCell, OpenLink, TablePanel, SectionCard } from "./cells";
import { assessDelivery } from "./deliveries-list";
import { CardGrid, Chip, DirectionBadge, EmptyRows, IdCell, JobReference, Kpi, Mono, Notice, State, SubNav, Timestamp } from "./kit";
import { EligibilityBadge, RecoverySheet } from "./recovery-sheet";
import { useWebhookData } from "./webhooks-context";

type Section = "incoming" | "outgoing" | "retry" | "exhausted" | "requests";
const SECTIONS: Section[] = ["incoming", "outgoing", "retry", "exhausted", "requests"];

export function FailuresPage() {
  const { snapshot, window: period, environment } = useWebhookData();
  const router = useRouter();
  const search = useSearchParams();
  const requested = search.get("section") as Section | null;
  const [section, setSection] = useState<Section>(requested && SECTIONS.includes(requested) ? requested : "incoming");
  const [recovery, setRecovery] = useState<{ direction: "incoming" | "outgoing"; id: string } | null>(null);

  const incoming = useMemo(() => incomingInWindow(snapshot, period), [snapshot, period]);
  const deliveries = useMemo(() => deliveriesInWindow(snapshot, period), [snapshot, period]);
  const processingFailures = incoming.filter(isIncomingProcessingFailure);
  const verificationFailures = incoming.filter((e) => e.verification.state === "rejected" || e.verification.state === "unavailable");
  const failedDeliveries = deliveries.filter((d) => d.state === "failed");
  const retryScheduled = deliveries.filter((d) => d.state === "retry_scheduled");
  const exhausted = deliveries.filter((d) => d.latestFailureClass === "attempts_exhausted");
  const pendingRequests = snapshot.recoveryRequests.filter((r) => r.state === "draft" || r.state === "pending_review");

  const manualReview =
    [...failedDeliveries, ...retryScheduled].filter((d) => d.unknownOutcome || assessDelivery(snapshot, d).level !== "eligible").length +
    processingFailures.filter((e) => evaluateIncomingReprocess(e, snapshot.sources.find((s) => s.id === e.sourceId)).level !== "eligible").length;

  const updateRequest = useWebhookMutation(environment, (input: { id: string; state: "cancelled" | "pending_review" }) => webhooksRepository.updateRecoveryRequest(environment, input.id, input.state));

  const go = (next: Section) => {
    setSection(next);
    const params = new URLSearchParams(globalThis.location.search);
    params.set("section", next);
    router.replace(`${WEBHOOK_ROUTES.failures}?${params.toString()}`, { scroll: false });
  };

  const incomingColumns: Array<DataTableColumn<IncomingEvent>> = [
    { id: "event", header: "Incoming Event", cell: (row) => <IdCell id={row.id} sub={row.eventType} /> },
    { id: "provider", header: "Provider", hideBelow: "lg", cell: (row) => <span className="text-[0.8125rem]">{row.providerName}</span> },
    { id: "company", header: "Company", hideBelow: "xl", cell: (row) => <CompanyCell id={row.companyId} name={row.companyName} /> },
    { id: "ver", header: "Verification", cell: (row) => <State registry={VERIFICATION_STATE} status={row.verification.state} /> },
    { id: "error", header: "Processing Error", hideBelow: "md", cell: (row) => <span className="block max-w-[18rem] whitespace-normal text-2xs">{row.processing.errorSummary ?? "None"}</span> },
    { id: "job", header: "Attempt / Job", hideBelow: "xl", cell: (row) => (<div className="space-y-0.5"><span className="block text-2xs tabular">{row.processing.attemptsUsed} attempts</span><JobReference jobId={row.processing.jobId} /></div>) },
    { id: "state", header: "State", cell: (row) => <State registry={PROCESSING_STATE} status={row.processing.state} /> },
    { id: "elig", header: "Reprocess", hideBelow: "lg", cell: (row) => <EligibilityBadge level={evaluateIncomingReprocess(row, snapshot.sources.find((s) => s.id === row.sourceId)).level} /> },
    { id: "act", header: "Actions", align: "right", cell: (row) => (<ActionMenu label={`Actions for ${row.id}`} items={[
      { id: "open", label: "Open Event", onSelect: () => router.push(WEBHOOK_ROUTES.incomingEvent(row.id)) },
      { id: "proc", label: "View Processing", onSelect: () => router.push(`${WEBHOOK_ROUTES.incomingEvent(row.id)}?tab=processing`) },
      { id: "int", label: "Open Related Integration", onSelect: () => router.push(MODULE_LINKS.provider(row.providerId)) },
      { id: "review", label: "Review Reprocessing Eligibility", separatorBefore: true, onSelect: () => setRecovery({ direction: "incoming", id: row.id }) },
    ]} />) },
  ];

  const deliveryColumns = (kind: "failed" | "retry" | "exhausted"): Array<DataTableColumn<Delivery>> => [
    { id: "delivery", header: "Delivery", cell: (row) => <IdCell id={row.id} sub={row.eventId} /> },
    { id: "event", header: "Event Type", hideBelow: "md", cell: (row) => <EventKeyCell eventKey={row.eventKey} /> },
    { id: "endpoint", header: "Endpoint", hideBelow: "lg", cell: (row) => <EndpointCell endpoint={snapshot.endpoints.find((e) => e.id === row.endpointId)} /> },
    { id: "company", header: "Company", hideBelow: "xl", cell: (row) => <CompanyCell id={row.companyId} name={row.companyName} /> },
    { id: "failure", header: "Last Failure", cell: (row) => (<div className="space-y-0.5"><span className="block text-[0.8125rem]">{row.latestFailureClass ? FAILURE_CLASS[row.latestFailureClass].label : "None"}</span>{row.unknownOutcome ? <Chip tone="warning">Unknown outcome</Chip> : null}</div>) },
    { id: "attempts", header: "Attempts", align: "right", cell: (row) => <span className="tabular">{row.attemptsUsed}/{row.maxAttempts}</span> },
    kind === "retry"
      ? { id: "next", header: "Next Retry", cell: (row) => <Timestamp iso={row.nextRetryAt} /> }
      : { id: "elig", header: "Retry Eligibility", hideBelow: "lg", cell: (row) => <EligibilityBadge level={assessDelivery(snapshot, row).level} /> },
    { id: "state", header: "State", cell: (row) => <State registry={DELIVERY_STATE} status={row.state} /> },
    { id: "act", header: "Actions", align: "right", cell: (row) => (<ActionMenu label={`Actions for ${row.id}`} items={[
      { id: "open", label: "Open Delivery", onSelect: () => router.push(WEBHOOK_ROUTES.delivery(row.id)) },
      { id: "att", label: "View Attempts", onSelect: () => router.push(`${WEBHOOK_ROUTES.delivery(row.id)}?tab=attempts`) },
      { id: "ep", label: "Open Endpoint", onSelect: () => router.push(WEBHOOK_ROUTES.endpoint(row.endpointId)) },
      { id: "review", label: "Review Redelivery", separatorBefore: true, onSelect: () => setRecovery({ direction: "outgoing", id: row.id }) },
    ]} />) },
  ];

  const requestColumns: Array<DataTableColumn<RecoveryRequest>> = [
    { id: "id", header: "Request", cell: (row) => <IdCell id={row.id} sub={<span className="inline-flex items-center gap-1"><DirectionBadge direction={row.direction} /></span>} /> },
    { id: "kind", header: "Type", cell: (row) => <span className="text-[0.8125rem]">{RECOVERY_KIND[row.kind].label}</span> },
    { id: "target", header: "Target", cell: (row) => (<div className="min-w-0"><Mono className="block">{row.targetLabel}</Mono><span className="block max-w-[14rem] truncate text-2xs text-muted-foreground">{row.counterpartLabel}</span></div>) },
    { id: "company", header: "Company", hideBelow: "lg", cell: (row) => <span className="text-[0.8125rem]">{row.companyName ?? "Platform"}</span> },
    { id: "state", header: "State", cell: (row) => (<div className="space-y-1"><State registry={RECOVERY_STATE} status={row.state} /><Chip tone="brand">Demo request</Chip></div>) },
    { id: "reason", header: "Reason", hideBelow: "xl", cell: (row) => <span className="block max-w-[20rem] whitespace-normal text-2xs">{row.reason}</span> },
    { id: "updated", header: "Updated", hideBelow: "md", cell: (row) => <Timestamp iso={row.updatedAt} /> },
    { id: "act", header: "Actions", align: "right", cell: (row) => (
      <div className="flex justify-end gap-1">
        <OpenLink href={row.direction === "outgoing" ? WEBHOOK_ROUTES.delivery(row.targetId) : WEBHOOK_ROUTES.incomingEvent(row.targetId)} label="Target" />
        {row.state === "draft" ? <Button variant="outline" size="sm" onClick={() => void act(row.id, "pending_review")}>Submit</Button> : null}
        {row.state === "draft" || row.state === "pending_review" ? <Button variant="ghost" size="sm" onClick={() => void act(row.id, "cancelled")}>Cancel</Button> : null}
      </div>
    ) },
  ];

  async function act(id: string, state: "cancelled" | "pending_review") {
    try {
      await updateRequest.mutateAsync({ id, state });
      toast.success(state === "cancelled" ? "Demo recovery request cancelled" : "Demo recovery request submitted for review", { description: "Nothing was sent to a backend." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The request could not be updated.");
    }
  }

  const table = <T,>(title: string, description: string, rows: T[], columns: Array<DataTableColumn<T>>, id: (row: T) => string, empty: string) => (
    <TablePanel title={title} description={description}>
      <DataTable columns={columns} rows={rows} getRowId={id} isLoading={false} caption={title} emptyState={<EmptyRows title={empty} description="Nothing recorded in the selected period. An empty list is not proof of health." />} />
    </TablePanel>
  );

  return (
    <div className="space-y-1">
      <CardGrid cols={4}>
        <Kpi label="Incoming Verification Failures" value={verificationFailures.length} tone={verificationFailures.length ? "danger" : "default"} hint="Rejected or not verified. Never retried as ordinary processing" href={`${WEBHOOK_ROUTES.incomingEvents}?verification=rejected`} />
        <Kpi label="Incoming Processing Failures" value={processingFailures.length} tone={processingFailures.length ? "danger" : "default"} hint="Verified events, processing failed" />
        <Kpi label="Outgoing Failed Deliveries" value={failedDeliveries.length} tone={failedDeliveries.length ? "danger" : "default"} hint="Terminal failed state" />
        <Kpi label="Retry Scheduled" value={retryScheduled.length} tone={retryScheduled.length ? "warning" : "default"} hint="Automatic retry pending" />
        <Kpi label="Attempts Exhausted" value={exhausted.length} tone={exhausted.length ? "danger" : "default"} hint="No attempts remain" />
        <Kpi label="Manual Review Required" value={manualReview} tone={manualReview ? "warning" : "default"} hint="Uncertain, non-retryable or blocked" />
        <Kpi label="Recovery Requests Pending" value={pendingRequests.length} hint="Demo drafts and pending reviews" />
      </CardGrid>

      <Notice tone="warning" title="No bulk replay">
        Recovery is reviewed one record at a time. There is no retry-all or clear-errors action, because blind retries can duplicate downstream side effects and a replay never bypasses authenticity checks.
      </Notice>

      <SubNav<Section>
        label="Failure sections"
        value={section}
        onChange={go}
        items={[
          { value: "incoming", label: "Incoming Processing Failures", count: processingFailures.length },
          { value: "outgoing", label: "Outgoing Delivery Failures", count: failedDeliveries.length },
          { value: "retry", label: "Retry-Scheduled", count: retryScheduled.length },
          { value: "exhausted", label: "Attempts Exhausted", count: exhausted.length },
          { value: "requests", label: "Recovery Requests", count: snapshot.recoveryRequests.length },
        ]}
      />

      {section === "incoming" ? (
        <div className="space-y-1">
          {table("Incoming Processing Failures", "Verified events whose processing failed. Unverified or rejected events cannot be processed by retry.", processingFailures, incomingColumns, (r) => r.id, "No incoming processing failures")}
          <SectionCard title="Rejected & Unverified Events" description="Not eligible for processing retry. Shown for investigation only.">
            {verificationFailures.length === 0 ? <EmptyRows title="No rejected or unverified events" /> : (
              <ul className="divide-y divide-border">
                {verificationFailures.slice(0, 8).map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0"><span className="font-mono text-[0.75rem] font-semibold">{event.id}</span><p className="text-2xs text-muted-foreground">{event.providerName} · {event.verification.failureReason}</p></div>
                    <div className="flex items-center gap-2"><State registry={VERIFICATION_STATE} status={event.verification.state} /><OpenLink href={WEBHOOK_ROUTES.incomingEvent(event.id)} label="Open event" /></div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      ) : null}
      {section === "outgoing" ? table("Outgoing Delivery Failures", "Terminal failures. Not every non-2xx response is safe to retry.", failedDeliveries, deliveryColumns("failed"), (r) => r.id, "No failed deliveries") : null}
      {section === "retry" ? table("Retry-Scheduled Deliveries", "Automatic retries pending under the endpoint's retry policy.", retryScheduled, deliveryColumns("retry"), (r) => r.id, "No retries scheduled") : null}
      {section === "exhausted" ? table("Attempts Exhausted", "Only a governed redelivery can add another attempt.", exhausted, deliveryColumns("exhausted"), (r) => r.id, "No exhausted deliveries") : null}
      {section === "requests" ? table("Recovery Requests", "Demo requests. None has been sent to or executed by a backend, and none changes delivery history.", snapshot.recoveryRequests, requestColumns, (r) => r.id, "No recovery requests") : null}

      <RecoverySheet open={Boolean(recovery)} onOpenChange={(open) => { if (!open) setRecovery(null); }} direction={recovery?.direction ?? "outgoing"} targetId={recovery?.id ?? null} />
    </div>
  );
}

