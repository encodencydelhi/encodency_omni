/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Delivery Detail: Overview, Attempts & Responses, Event Payload, Retry & Recovery, Timeline, Technical Context.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { DefinitionList } from "@/components/shared/definition-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/format";
import { ATTEMPT_RESULT, DELIVERY_STATE, ENDPOINT_STATE, ENVIRONMENT_LABEL, FAILURE_CLASS, MODULE_LINKS, NOT_LIVE_NOTICE, RECOVERY_STATE, WEBHOOK_ROUTES } from "../data/config";
import { attemptsFor, buildDeliveryTimeline, recoveryRequestsFor } from "../data/selectors";
import type { DeliveryAttempt } from "../data/types";
import { CompanyCell, EventKeyCell, HttpStatus, TablePanel, SectionCard } from "./cells";
import { assessDelivery } from "./deliveries-list";
import { DetailHeader, InfoCard, TabBar, TechnicalContext, useUrlTab, type TabItem } from "./detail";
import { CardGrid, Chip, EmptyRows, JobReference, Kpi, Mono, NotFoundPanel, Notice, State, Timestamp, humanize } from "./kit";
import { EligibilityBadge, EligibilityFactors, RecoverySheet } from "./recovery-sheet";
import { useWebhookData } from "./webhooks-context";

const TABS: ReadonlyArray<TabItem<"overview" | "attempts" | "payload" | "recovery" | "timeline" | "technical">> = [
  { value: "overview", label: "Overview" },
  { value: "attempts", label: "Attempts & Responses" },
  { value: "payload", label: "Event Payload" },
  { value: "recovery", label: "Retry & Recovery" },
  { value: "timeline", label: "Timeline" },
  { value: "technical", label: "Technical Context" },
];

const TONE_DOT = { success: "bg-success", danger: "bg-danger", warning: "bg-warning", info: "bg-info", neutral: "bg-neutral" } as const;

export function DeliveryDetailPage({ deliveryId }: { deliveryId: string }) {
  const { snapshot } = useWebhookData();
  const [tab, setTab] = useUrlTab(TABS);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [attempt, setAttempt] = useState<DeliveryAttempt | null>(null);

  const delivery = snapshot.deliveries.find((item) => item.id === deliveryId);

  if (!delivery) return <NotFoundPanel title="Delivery not found" description="No delivery with this ID exists in the selected environment. Try another environment." href={WEBHOOK_ROUTES.deliveries} action="Back to deliveries" />;

  const endpoint = snapshot.endpoints.find((item) => item.id === delivery.endpointId);
  const event = snapshot.outgoingEvents.find((item) => item.id === delivery.eventId);
  const type = snapshot.eventTypes.find((item) => item.key === delivery.eventKey);
  const attempts = attemptsFor(snapshot, delivery.id);
  const assessment = assessDelivery(snapshot, delivery);
  const requests = recoveryRequestsFor(snapshot.recoveryRequests, delivery.id);
  const timeline = buildDeliveryTimeline({ delivery, eventOccurredAt: event?.occurredAt ?? null, attempts, recoveryRequests: requests });
  const latest = attempts[attempts.length - 1];
  const integrationRelated = delivery.eventKey.startsWith("integration.");

  const attemptColumns: Array<DataTableColumn<DeliveryAttempt>> = [
    { id: "n", header: "Attempt", cell: (row) => <span className="font-semibold tabular">#{row.number}</span> },
    { id: "start", header: "Started", cell: (row) => <Timestamp iso={row.startedAt} /> },
    { id: "end", header: "Completed", hideBelow: "md", cell: (row) => (row.completedAt ? <Timestamp iso={row.completedAt} relative={false} /> : <span className="text-muted-foreground">In flight</span>) },
    { id: "dur", header: "Duration", align: "right", hideBelow: "md", cell: (row) => (row.durationMs === null ? <span className="text-muted-foreground">n/a</span> : <span className="tabular">{formatDuration(row.durationMs)}</span>) },
    { id: "http", header: "HTTP", cell: (row) => <HttpStatus status={row.httpStatus} /> },
    { id: "result", header: "Result", cell: (row) => (row.result ? <State registry={ATTEMPT_RESULT} status={row.result} /> : <Chip tone="info">In flight</Chip>) },
    { id: "class", header: "Error Classification", hideBelow: "lg", cell: (row) => (row.failureClass ? <span className="text-[0.8125rem]">{FAILURE_CLASS[row.failureClass].label}</span> : <span className="text-muted-foreground">None</span>) },
    { id: "job", header: "Worker / Job", hideBelow: "xl", cell: (row) => <Mono>{row.workerJobRef ?? "None"}</Mono> },
    { id: "act", header: "", align: "right", cell: (row) => <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setAttempt(row); }}>Details</Button> },
  ];

  return (
    <div className="space-y-1">
      <DetailHeader
        backHref={WEBHOOK_ROUTES.deliveries}
        backLabel="Back to Deliveries"
        title={<span className="font-mono">{delivery.id}</span>}
        subtitle={<>{delivery.eventKey} → {endpoint?.name ?? delivery.endpointId} · {delivery.companyName ?? "Platform"} · last attempt <Timestamp iso={delivery.latestAttemptAt} relative={false} /></>}
        badges={<><State registry={DELIVERY_STATE} status={delivery.state} />{delivery.unknownOutcome ? <Chip tone="warning">Unknown external outcome</Chip> : null}</>}
        actions={<Button variant="outline" size="sm" onClick={() => setRecoveryOpen(true)}>Review Retry / Redelivery</Button>}
      />
      <TabBar items={TABS.map((item) => item.value === "attempts" ? { ...item, count: attempts.length } : item)} value={tab} onChange={setTab} label="Delivery sections" />

      {tab === "overview" ? (
        <div className="space-y-1">
          <CardGrid cols={6}>
            <Kpi label="Delivery State" value={DELIVERY_STATE[delivery.state].label} />
            <Kpi label="Attempts Used" value={`${delivery.attemptsUsed} / ${delivery.maxAttempts}`} hint="This delivery only" />
            <Kpi label="Latest HTTP" value={delivery.latestHttpStatus ?? "None"} hint={delivery.latestHttpStatus ? undefined : "No response recorded"} />
            <Kpi label="Last Attempt" value={delivery.latestAttemptAt ? <span className="text-sm"><Timestamp iso={delivery.latestAttemptAt} relative={false} /></span> : "None"} />
            <Kpi label="Next Retry" value={delivery.nextRetryAt ? <span className="text-sm"><Timestamp iso={delivery.nextRetryAt} relative={false} /></span> : "None"} hint="From the retry policy" />
            <Kpi label="Retry Eligibility" value={assessment.level === "eligible" ? "Open" : assessment.level === "review_required" ? "Review" : "Blocked"} tone={assessment.level === "not_eligible" ? "danger" : assessment.level === "review_required" ? "warning" : "default"} hint="Not a recommendation" />
          </CardGrid>
          {delivery.state === "delivered" ? <Notice tone="info" title="Delivered means accepted by the endpoint">This does not prove the recipient processed the event or completed downstream business actions.</Notice> : null}
          <div className="grid gap-1 lg:grid-cols-2">
            <InfoCard title="Delivery Information" items={[
              { label: "Delivery ID", value: <Mono>{delivery.id}</Mono> },
              { label: "Outgoing event ID", value: <Mono>{delivery.eventId}</Mono> },
              { label: "Event type", value: <EventKeyCell eventKey={delivery.eventKey} version={event?.schemaVersion} /> },
              { label: "Company / scope", value: <CompanyCell id={delivery.companyId} name={delivery.companyName} /> },
              { label: "Created", value: <Timestamp iso={delivery.createdAt} /> },
              { label: "Environment", value: ENVIRONMENT_LABEL[delivery.environment] },
            ]} />
            <InfoCard title="Latest Result" items={[
              { label: "Latest result", value: delivery.latestResult ? <State registry={ATTEMPT_RESULT} status={delivery.latestResult} /> : "No attempt result" },
              { label: "HTTP status", value: <HttpStatus status={delivery.latestHttpStatus} /> },
              { label: "Failure class", value: delivery.latestFailureClass ? FAILURE_CLASS[delivery.latestFailureClass].label : "None" },
              { label: "Summary", value: <span className="whitespace-normal">{latest?.responseSummary ?? delivery.failureSummary ?? "None"}</span> },
            ]} />
            <InfoCard title="Endpoint Summary" items={[
              { label: "Endpoint", value: endpoint ? <Link className="hover:underline" href={WEBHOOK_ROUTES.endpoint(endpoint.id)}>{endpoint.name}</Link> : delivery.endpointId },
              { label: "Endpoint state", value: endpoint ? <State registry={ENDPOINT_STATE} status={endpoint.state} /> : "Missing" },
              { label: "Destination host", value: <Mono>{endpoint?.destinationHost ?? "Unknown"}</Mono> },
              { label: "Retry policy", value: <Mono>{delivery.retryPolicyRef}</Mono> },
            ]} />
            <SectionCard title="Retry Eligibility" description={assessment.summary} action={<EligibilityBadge level={assessment.level} />}>
              <Button variant="outline" size="sm" onClick={() => setTab("recovery")}>Open Retry & Recovery</Button>
            </SectionCard>
          </div>
          <div className="grid gap-1 lg:grid-cols-2">
            <SectionCard title="Attempt Timeline" description="Every attempt stays independently visible." action={<Button variant="outline" size="sm" onClick={() => setTab("attempts")}>All attempts</Button>}>
              {attempts.length === 0 ? <EmptyRows title="No attempts yet" description="No HTTP attempt has been recorded for this delivery." /> : (
                <ol className="space-y-2">
                  {attempts.map((a) => (<li key={a.id} className="flex items-center justify-between gap-2 text-[0.8125rem]"><span className="font-medium">Attempt {a.number}</span><HttpStatus status={a.httpStatus} />{a.result ? <State registry={ATTEMPT_RESULT} status={a.result} /> : <Chip tone="info">In flight</Chip>}</li>))}
                </ol>
              )}
            </SectionCard>
            <SectionCard title="Related Resources" description="Owned by other modules.">
              <div className="flex flex-col items-start gap-2">
                <Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.endpoint(delivery.endpointId)}>Open endpoint</Link></Button>
                {delivery.companyId ? <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.company(delivery.companyId)}>Open company</Link></Button> : null}
                <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.apiRequests}>Open API Monitoring requests</Link></Button>
                <p className="text-2xs text-muted-foreground">Related job: <JobReference jobId={delivery.relatedJobId} /></p>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === "attempts" ? (
        <TablePanel title="Attempts & Responses" description="Attempt 1 is never overwritten by Attempt 2. No secrets, authorization headers or private payloads are recorded.">
          <DataTable columns={attemptColumns} rows={attempts} getRowId={(row) => row.id} isLoading={false} caption="Delivery attempts" onRowClick={setAttempt} emptyState={<EmptyRows title="No attempts recorded" description={delivery.state === "cancelled" ? "This delivery was cancelled before any attempt." : "No HTTP attempt has been recorded yet."} />} />
        </TablePanel>
      ) : null}

      {tab === "payload" ? <PayloadTab deliveryId={delivery.id} /> : null}

      {tab === "recovery" ? (
        <div className="space-y-1">
          <Notice tone="warning" title="Retry, redelivery and replay are different things">
            A timeout may occur after the recipient accepted the event. Blind redelivery can duplicate downstream side effects. {NOT_LIVE_NOTICE}
          </Notice>
          <div className="grid gap-1 lg:grid-cols-2">
            <InfoCard title="Recovery Facts" columns={1} items={[
              { label: "Current delivery state", value: <State registry={DELIVERY_STATE} status={delivery.state} /> },
              { label: "Latest failure", value: delivery.latestFailureClass ? `${FAILURE_CLASS[delivery.latestFailureClass].label}. ${FAILURE_CLASS[delivery.latestFailureClass].note}` : "None" },
              { label: "Attempts used / maximum", value: `${delivery.attemptsUsed} / ${delivery.maxAttempts}` },
              { label: "Next scheduled retry", value: delivery.nextRetryAt ? <Timestamp iso={delivery.nextRetryAt} /> : "None scheduled" },
              { label: "Retry policy", value: <Mono>{delivery.retryPolicyRef}</Mono> },
              { label: "Idempotency / event ID reference", value: <Mono>{delivery.idempotencyRef}</Mono> },
              { label: "Endpoint current state", value: endpoint ? <State registry={ENDPOINT_STATE} status={endpoint.state} /> : "Missing" },
              { label: "Potential duplicate delivery risk", value: assessment.duplicateRisk === "none" ? "None identified" : assessment.duplicateRisk === "possible" ? "Possible: outcome unknown" : "High: already accepted" },
            ]} />
            <SectionCard title="Eligibility" description={assessment.summary} action={<EligibilityBadge level={assessment.level} />}>
              <EligibilityFactors assessment={assessment} />
            </SectionCard>
          </div>
          <SectionCard title="Actions">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setRecoveryOpen(true)}>Review Retry Request</Button>
              <Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.endpoint(delivery.endpointId)}>Open Endpoint</Link></Button>
              {integrationRelated ? <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.integrations}>Open Related Integration</Link></Button> : null}
              <span className="text-2xs text-muted-foreground">Related job: <JobReference jobId={delivery.relatedJobId} /></span>
            </div>
          </SectionCard>
          <SectionCard title="Demo Recovery Requests" description="Requests are demo records. History above is unchanged by them.">
            {requests.length === 0 ? <EmptyRows title="No recovery requests" description="None have been created for this delivery." /> : (
              <ul className="divide-y divide-border">
                {requests.map((request) => (
                  <li key={request.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0"><p className="text-[0.8125rem] font-medium">{humanize(request.kind)} <Mono className="text-muted-foreground">{request.id}</Mono></p><p className="text-2xs text-muted-foreground">{request.reason}</p></div>
                    <div className="flex items-center gap-2"><State registry={RECOVERY_STATE} status={request.state} /><Timestamp iso={request.updatedAt} /></div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      ) : null}

      {tab === "timeline" ? (
        <SectionCard title="Delivery Timeline" description="Derived from recorded events and attempts. A demo recovery request is never shown as a successful delivery.">
          <ol className="relative space-y-4 border-l border-border pl-5">
            {timeline.map((entry) => (
              <li key={entry.id} className="relative">
                <span className={cn("absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full ring-4 ring-card", TONE_DOT[entry.tone])} aria-hidden />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="text-[0.8125rem] font-medium text-foreground">{entry.title}</p><p className="text-2xs text-muted-foreground">{entry.actor}{entry.attemptNumber ? ` · attempt ${entry.attemptNumber}` : ""}{entry.result ? ` · ${entry.result}` : ""}</p></div>
                  <Timestamp iso={entry.at} />
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      ) : null}

      {tab === "technical" ? (
        <TechnicalContext fields={{
          "Delivery ID": delivery.id,
          "Outgoing event ID": delivery.eventId,
          "Endpoint ID": delivery.endpointId,
          "Request ID": delivery.requestId,
          "Correlation ID": delivery.correlationId,
          "Related job ID": delivery.relatedJobId,
          "Schema version": event?.schemaVersion ?? type?.schemaVersion,
          "Signing version reference": delivery.signingVersionRef,
          "Retry policy reference": delivery.retryPolicyRef,
          "Idempotency reference": delivery.idempotencyRef,
          "Safe HTTP metadata": latest ? `${latest.httpMethod} ${latest.destinationHost}` : null,
          "Sanitized failure code": delivery.latestFailureClass,
        }} />
      ) : null}

      <RecoverySheet open={recoveryOpen} onOpenChange={setRecoveryOpen} direction="outgoing" targetId={delivery.id} />
      <AttemptSheet attempt={attempt} onClose={() => setAttempt(null)} />
    </div>
  );
}

function PayloadTab({ deliveryId }: { deliveryId: string }) {
  const { snapshot } = useWebhookData();
  const delivery = snapshot.deliveries.find((item) => item.id === deliveryId)!;
  const event = snapshot.outgoingEvents.find((item) => item.id === delivery.eventId);
  const [showJson, setShowJson] = useState(false);
  if (!event) return <EmptyRows title="Event record unavailable" description="The outgoing event for this delivery is not in the selected environment." />;
  return (
    <div className="space-y-1">
      <Notice tone="info">OAuth tokens, payment credentials, private customer data, signing secrets and session tokens are never shown. A backend must sanitize payloads before persistence or export.</Notice>
      <div className="grid gap-1 lg:grid-cols-2">
        <InfoCard title="Event" items={[
          { label: "Event type", value: <Mono>{event.eventKey}</Mono> },
          { label: "Schema version", value: event.schemaVersion },
          { label: "Event ID", value: <Mono>{event.id}</Mono> },
          { label: "Occurred at", value: <Timestamp iso={event.occurredAt} /> },
          { label: "Scope", value: event.scope === "platform" ? "Platform" : event.companyName ?? "Company" },
          { label: "Payload size", value: event.payloadSizeBytes ? `${event.payloadSizeBytes} bytes` : "Not recorded" },
        ]} />
        <SectionCard title="Safe Payload Summary">
          <p className="text-[0.8125rem]">{event.payloadSummary}</p>
          <p className="mt-3 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Included resource references</p>
          <ul className="mt-1 space-y-1 text-[0.8125rem]">{event.resourceRefs.map((ref) => <li key={ref.id}>{ref.label} <Mono className="text-muted-foreground">{ref.id}</Mono></li>)}</ul>
          <p className="mt-3 text-2xs font-medium uppercase tracking-wider text-muted-foreground">Redacted fields</p>
          <div className="mt-1 flex flex-wrap gap-1">{event.redactedFields.length ? event.redactedFields.map((f) => <Chip key={f}><span className="font-mono">{f}</span></Chip>) : <span className="text-[0.8125rem] text-muted-foreground">None declared</span>}</div>
        </SectionCard>
      </div>
      {snapshot.settings.payloadPreviewEnabled ? (
        <SectionCard title="Sanitized JSON Preview" description="Optional and collapsed by default. Fields are limited to sanitized values." action={<Button variant="outline" size="sm" onClick={() => setShowJson((v) => !v)}>{showJson ? "Hide preview" : "Show preview"}</Button>}>
          {showJson ? <pre className="max-h-72 overflow-auto rounded-sm border border-border bg-surface-sunken p-3 font-mono text-2xs leading-relaxed">{JSON.stringify(event.sanitizedPreview, null, 2)}</pre> : <p className="text-2xs text-muted-foreground">Preview hidden.</p>}
        </SectionCard>
      ) : <Notice tone="warning">Payload preview is turned off in webhook settings.</Notice>}
    </div>
  );
}

export function AttemptSheet({ attempt, onClose }: { attempt: DeliveryAttempt | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(attempt)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {attempt ? (
          <>
            <SheetHeader>
              <SheetTitle>Attempt {attempt.number}</SheetTitle>
              <SheetDescription><Mono>{attempt.id}</Mono></SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <div className="flex flex-wrap gap-1.5">{attempt.result ? <State registry={ATTEMPT_RESULT} status={attempt.result} /> : <Chip tone="info">In flight</Chip>}<HttpStatus status={attempt.httpStatus} /></div>
              <DefinitionList columns={1} items={[
                { label: "Attempt ID", value: <Mono>{attempt.id}</Mono> },
                { label: "Delivery ID", value: <Mono>{attempt.deliveryId}</Mono> },
                { label: "Attempt number", value: attempt.number },
                { label: "Started", value: <Timestamp iso={attempt.startedAt} /> },
                { label: "Completed", value: attempt.completedAt ? <Timestamp iso={attempt.completedAt} /> : "In flight" },
                { label: "Duration", value: attempt.durationMs === null ? "Not recorded" : formatDuration(attempt.durationMs) },
                { label: "HTTP method", value: attempt.httpMethod },
                { label: "Destination host", value: <Mono>{attempt.destinationHost}</Mono> },
                { label: "Sanitized response summary", value: <span className="whitespace-normal">{attempt.responseSummary}</span> },
                { label: "Retry-After", value: attempt.retryAfterSeconds === null ? "Not recorded" : `${attempt.retryAfterSeconds} seconds` },
                { label: "Failure classification", value: attempt.failureClass ? FAILURE_CLASS[attempt.failureClass].label : "None" },
                { label: "Related job attempt", value: <JobReference jobId={attempt.workerJobRef} /> },
                { label: "Related API request", value: attempt.apiRequestRef ? <Link className="font-mono text-2xs text-primary hover:underline" href={MODULE_LINKS.apiRequests}>{attempt.apiRequestRef}</Link> : "None (no HTTP response)" },
              ]} />
              <p className="text-2xs text-muted-foreground">Signing secrets, authorization headers and private payloads are never recorded here.</p>
            </SheetBody>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
