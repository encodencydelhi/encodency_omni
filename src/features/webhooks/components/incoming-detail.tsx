/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Incoming Source Detail and Incoming Event Detail routes.
 */

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Button } from "@/components/ui/button";
import {
  CHECK_RESULT, DEDUP_RESULT, ACCOUNT_MAPPING, ENVIRONMENT_LABEL, MODULE_LINKS, PROCESSING_STATE, READINESS,
  RECEIVER_STATUS, RESOURCE_UPDATE, SOURCE_CONFIGURATION_STATE, VERIFICATION_METHOD_LABEL, VERIFICATION_STATE, WEBHOOK_ROUTES,
} from "../data/config";
import { evaluateIncomingReprocess, recoveryRequestsFor } from "../data/selectors";
import type { IncomingEvent } from "../data/types";
import { OpenLink, TablePanel, CompanyCell, SectionCard } from "./cells";
import { DetailHeader, InfoCard, TabBar, TechnicalContext, useUrlTab, type TabItem } from "./detail";
import { CardGrid, Chip, EmptyRows, IdCell, JobReference, Kpi, Mono, NotFoundPanel, Notice, State, Timestamp, humanize } from "./kit";
import { EligibilityBadge, EligibilityFactors, RecoverySheet } from "./recovery-sheet";
import { useWebhookData } from "./webhooks-context";

/* ------------------------------------------------------------------ */
/* Source detail                                                       */
/* ------------------------------------------------------------------ */

export function IncomingSourceDetailPage({ sourceId }: { sourceId: string }) {
  const { snapshot } = useWebhookData();
  const source = snapshot.sources.find((item) => item.id === sourceId);

  const events = useMemo(() => snapshot.incomingEvents.filter((event) => event.sourceId === sourceId), [snapshot, sourceId]);
  if (!source) return <NotFoundPanel title="Source not found" description="No incoming source with this ID exists in the selected environment." href={WEBHOOK_ROUTES.incoming} action="Back to sources" />;

  const failures = events.filter((event) => event.verification.state === "rejected" || event.verification.state === "unavailable");
  const columns: Array<DataTableColumn<IncomingEvent>> = [
    { id: "at", header: "Received", cell: (row) => <Timestamp iso={row.receivedAt} /> },
    { id: "id", header: "Event", cell: (row) => <IdCell id={row.id} sub={row.eventType} /> },
    { id: "ver", header: "Verification", cell: (row) => <State registry={VERIFICATION_STATE} status={row.verification.state} /> },
    { id: "proc", header: "Processing", cell: (row) => <State registry={PROCESSING_STATE} status={row.processing.state} /> },
    { id: "act", header: "", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.incomingEvent(row.id)} /> },
  ];

  return (
    <div className="space-y-1">
      <DetailHeader
        backHref={WEBHOOK_ROUTES.incoming}
        backLabel="Back to Sources & Receivers"
        title={source.name}
        subtitle={<><Mono>{source.id}</Mono> · {source.providerName} · {ENVIRONMENT_LABEL[source.environment]}</>}
        badges={<><State registry={SOURCE_CONFIGURATION_STATE} status={source.configurationState} /><State registry={RECEIVER_STATUS} status={source.receiverStatus} /><State registry={READINESS} status={source.readiness} /></>}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href={`${WEBHOOK_ROUTES.incomingEvents}?source=${source.id}`}>View Incoming Events</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={source.integrationHref}>Open Integration</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`${WEBHOOK_ROUTES.security}#incoming-verification`}>View Verification Policy</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.apiRequests}>Open API Monitoring</Link></Button>
          </>
        }
      />

      <CardGrid cols={4}>
        <Kpi label="Recorded Events" value={events.length} hint="All recorded demo events for this source" />
        <Kpi label="Verification Problems" value={failures.length} tone={failures.length ? "danger" : "default"} hint="Rejected or not verified" />
        <Kpi label="Supported Event Types" value={source.supportedEventTypes.length} hint="Registered for this source" />
        <Kpi label="Receiver" value="Not connected" hint="No live receiver exists yet" />
      </CardGrid>

      {!source.verificationConfigured ? <Notice tone="warning" title="No verification policy defined">Events from this source cannot be treated as authentic and are never processed.</Notice> : null}

      <div className="grid gap-1 lg:grid-cols-2">
        <InfoCard title="Source & Receiver" description="Configuration references. No public callback URL is shown." items={[
          { label: "Source name", value: source.name },
          { label: "Source ID", value: <Mono>{source.id}</Mono> },
          { label: "Provider", value: source.providerName },
          { label: "Environment", value: ENVIRONMENT_LABEL[source.environment] },
          { label: "Receiver name", value: source.receiverName },
          { label: "Receiver ID", value: <Mono>{source.receiverId}</Mono> },
          { label: "Receiver status", value: <State registry={RECEIVER_STATUS} status={source.receiverStatus} /> },
          { label: "Implementation readiness", value: <State registry={READINESS} status={source.readiness} /> },
        ]} />
        <InfoCard title="Verification, Mapping & Processing" description={source.notes} columns={1} items={[
          { label: "Verification method", value: VERIFICATION_METHOD_LABEL[source.verificationMethod] },
          { label: "Verification policy reference", value: <Mono>{source.verificationPolicyRef}</Mono> },
          { label: "Account-mapping strategy", value: <span className="whitespace-normal">{source.accountMappingStrategy}</span> },
          { label: "Deduplication strategy reference", value: <Mono>{source.dedupStrategyRef}</Mono> },
          { label: "Processing queue reference", value: <Mono>{source.queueRef}</Mono> },
        ]} />
      </div>

      <SectionCard title="Supported Event Types" description="Events outside this list are recorded as unsupported and never processed.">
        <div className="flex flex-wrap gap-1.5">{source.supportedEventTypes.map((type) => <Chip key={type}><span className="font-mono">{type}</span></Chip>)}</div>
      </SectionCard>

      <div className="grid gap-1 xl:grid-cols-[1.3fr_1fr]">
        <TablePanel title="Recent Incoming Events" action={<Button asChild variant="outline" size="sm"><Link href={`${WEBHOOK_ROUTES.incomingEvents}?source=${source.id}`}>All events</Link></Button>}>
          <DataTable columns={columns} rows={events.slice(0, 8)} getRowId={(row) => row.id} isLoading={false} caption="Recent events for this source" emptyState={<EmptyRows title="No events recorded" description="No demo events exist for this source." />} />
        </TablePanel>
        <SectionCard title="Recent Verification Failures" description="Safe failure reasons only.">
          {failures.length === 0 ? <EmptyRows title="No verification failures" description="None recorded for this source." /> : (
            <ul className="divide-y divide-border">
              {failures.slice(0, 5).map((event) => (
                <li key={event.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link href={WEBHOOK_ROUTES.incomingEvent(event.id)} className="text-[0.8125rem] font-medium hover:underline">{event.id}</Link>
                  <p className="text-2xs text-muted-foreground">{event.verification.failureReason}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Related Integration" description="Provider authorization, connected accounts and approval state are owned by Integrations.">
        <Button asChild variant="outline" size="sm"><Link href={source.integrationHref}>Open {source.providerName} in Integrations</Link></Button>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Event detail                                                        */
/* ------------------------------------------------------------------ */

const EVENT_TABS: ReadonlyArray<TabItem<"overview" | "verification" | "processing" | "related" | "technical">> = [
  { value: "overview", label: "Overview" },
  { value: "verification", label: "Verification" },
  { value: "processing", label: "Processing" },
  { value: "related", label: "Related Resources" },
  { value: "technical", label: "Technical Context" },
];

export function IncomingEventDetailPage({ eventId }: { eventId: string }) {
  const { snapshot } = useWebhookData();
  const [tab, setTab] = useUrlTab(EVENT_TABS);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const event = snapshot.incomingEvents.find((item) => item.id === eventId);

  if (!event) return <NotFoundPanel title="Incoming event not found" description="This event ID does not exist in the selected environment. Try another environment." href={WEBHOOK_ROUTES.incomingEvents} action="Back to incoming events" />;

  const source = snapshot.sources.find((item) => item.id === event.sourceId);
  const v = event.verification;
  const p = event.processing;
  const assessment = evaluateIncomingReprocess(event, source);
  const requests = recoveryRequestsFor(snapshot.recoveryRequests, event.id);

  return (
    <div className="space-y-1">
      <DetailHeader
        backHref={WEBHOOK_ROUTES.incomingEvents}
        backLabel="Back to Incoming Events"
        title={event.eventType}
        subtitle={<><Mono>{event.id}</Mono> · {event.providerName} · received <Timestamp iso={event.receivedAt} relative={false} /></>}
        badges={<><State registry={VERIFICATION_STATE} status={v.state} /><State registry={PROCESSING_STATE} status={p.state} /></>}
        actions={<Button variant="outline" size="sm" onClick={() => setRecoveryOpen(true)}>Review Reprocessing Eligibility</Button>}
      />
      <TabBar items={EVENT_TABS} value={tab} onChange={setTab} label="Incoming event sections" />

      {tab === "overview" ? (
        <div className="space-y-1">
          <Notice tone="info">Verification and processing states are demo records. Company identity comes from the trusted account mapping, never from an untrusted payload field.</Notice>
          <div className="grid gap-1 lg:grid-cols-2">
            <InfoCard title="Event Identity" items={[
              { label: "Incoming event ID", value: <Mono>{event.id}</Mono> },
              { label: "Provider event reference", value: <Mono>{event.providerEventRef}</Mono> },
              { label: "Event type", value: <Mono>{event.eventType}</Mono> },
              { label: "Received at", value: <Timestamp iso={event.receivedAt} /> },
              { label: "Provider / Source", value: `${event.providerName}` },
              { label: "Environment", value: ENVIRONMENT_LABEL[event.environment] },
            ]} />
            <InfoCard title="Mapping & Results" items={[
              { label: "Mapped company", value: <CompanyCell id={event.companyId} name={event.companyName} /> },
              { label: "Connected account", value: event.accountRef ? <Mono>{event.accountRef}</Mono> : "Not mapped" },
              { label: "Account mapping", value: <State registry={ACCOUNT_MAPPING} status={event.accountMapping} /> },
              { label: "Verification result", value: <State registry={VERIFICATION_STATE} status={v.state} /> },
              { label: "Processing result", value: <State registry={PROCESSING_STATE} status={p.state} /> },
              { label: "Related business resource", value: event.relatedResource ? `${event.relatedResource.label} (${event.relatedResource.id})` : "None" },
            ]} />
          </div>
        </div>
      ) : null}

      {tab === "verification" ? (
        <div className="space-y-1">
          <Notice tone="warning" title="Demo verification record">No cryptographic verification occurred in this frontend. Nothing here proves the event came from the provider. Secrets, full signatures and provider credentials are never shown.</Notice>
          <InfoCard title="Verification" items={[
            { label: "Verification method", value: VERIFICATION_METHOD_LABEL[v.method] },
            { label: "Verification state", value: <State registry={VERIFICATION_STATE} status={v.state} /> },
            { label: v.state === "rejected" ? "Rejected at" : "Verified at", value: <Timestamp iso={v.recordedAt} /> },
            { label: "Safe failure reason", value: <span className="whitespace-normal">{v.failureReason ?? "None recorded"}</span> },
            { label: "Signature header present", value: v.signatureHeaderPresent === null ? "Not recorded" : v.signatureHeaderPresent ? "Yes" : "No" },
            { label: "Timestamp validation", value: <State registry={CHECK_RESULT} status={v.timestampCheck} /> },
            { label: "Replay-window validation", value: <State registry={CHECK_RESULT} status={v.replayWindowCheck} /> },
            { label: "Verification policy reference", value: <Mono>{v.policyRef}</Mono> },
          ]} />
        </div>
      ) : null}

      {tab === "processing" ? (
        <div className="space-y-1">
          <Notice tone="info" title="Receipt is not business success">The receiver answered HTTP {p.receiptHttpStatus}. That confirms receipt only. It is not proof that downstream business processing succeeded.</Notice>
          <div className="grid gap-1 lg:grid-cols-2">
            <InfoCard title="Processing Record" items={[
              { label: "Processing record ID", value: <Mono>{p.recordId}</Mono> },
              { label: "Current state", value: <State registry={PROCESSING_STATE} status={p.state} /> },
              { label: "Queue reference", value: <Mono>{p.queueRef}</Mono> },
              { label: "Related job", value: <JobReference jobId={p.jobId} /> },
              { label: "Processing attempts", value: p.attemptsUsed },
              { label: "Started", value: <Timestamp iso={p.startedAt} /> },
              { label: "Completed", value: <Timestamp iso={p.completedAt} /> },
              { label: "Related resource update", value: <State registry={RESOURCE_UPDATE} status={p.resourceUpdate} /> },
              { label: "Sanitized error summary", value: <span className="whitespace-normal">{p.errorSummary ?? "None"}</span> },
            ]} />
            <InfoCard title="Duplicate Handling" description="A duplicate HTTP delivery differs from a new event with a similar payload." items={[
              { label: "Provider event ID", value: <Mono>{event.dedup.providerEventId}</Mono> },
              { label: "Deduplication key reference", value: <Mono>{event.dedup.keyRef}</Mono> },
              { label: "First seen", value: <Timestamp iso={event.dedup.firstSeenAt} /> },
              { label: "Occurrences", value: event.dedup.occurrenceCount },
              { label: "Original event", value: event.dedup.originalEventId ? <Link className="font-mono text-2xs text-primary hover:underline" href={WEBHOOK_ROUTES.incomingEvent(event.dedup.originalEventId)}>{event.dedup.originalEventId}</Link> : "This is the original" },
              { label: "Deduplication result", value: <State registry={DEDUP_RESULT} status={event.dedup.result} /> },
            ]} />
          </div>
          <SectionCard title="Reprocessing Eligibility" description="Replay never bypasses original signature or authenticity requirements." action={<EligibilityBadge level={assessment.level} />}>
            <p className="mb-3 text-[0.8125rem] text-muted-foreground">{assessment.summary}</p>
            <EligibilityFactors assessment={assessment} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setRecoveryOpen(true)}>Review Reprocessing Eligibility</Button>
              {requests.length ? <Chip tone="brand">{requests.length} demo recovery request{requests.length === 1 ? "" : "s"} on this event</Chip> : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "related" ? (
        <div className="grid gap-1 lg:grid-cols-2">
          <InfoCard title="Related Resources" columns={1} items={[
            { label: "Mapped company", value: <CompanyCell id={event.companyId} name={event.companyName} /> },
            { label: "Connected account", value: event.accountRef ? <Mono>{event.accountRef}</Mono> : "Not mapped" },
            { label: "Related business resource", value: event.relatedResource ? `${event.relatedResource.label} (${event.relatedResource.id})` : "None" },
            { label: "Processing job", value: <JobReference jobId={p.jobId} /> },
          ]} />
          <SectionCard title="Related Modules" description="Owned by other modules. Opened here for context only.">
            <div className="flex flex-col items-start gap-2">
              {source ? <Button asChild variant="outline" size="sm"><Link href={source.integrationHref}>Open {source.providerName} in Integrations</Link></Button> : null}
              {source ? <Button asChild variant="outline" size="sm"><Link href={WEBHOOK_ROUTES.incomingSource(source.id)}>Open source: {source.name}</Link></Button> : null}
              <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.apiRequests}>Open API Monitoring requests</Link></Button>
              {event.companyId ? <Button asChild variant="outline" size="sm"><Link href={MODULE_LINKS.company(event.companyId)}>Open company</Link></Button> : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {tab === "technical" ? (
        <div className="space-y-1">
          <TechnicalContext fields={{
            "Internal event ID": event.id,
            "Provider event reference": event.providerEventRef,
            "Receiver ID": event.technical.receiverId,
            "Request ID": event.technical.requestId,
            "Correlation ID": event.technical.correlationId,
            "Payload schema version": event.technical.payloadSchemaVersion,
            "Processing queue reference": p.queueRef,
            ...Object.fromEntries(Object.entries(event.technical.safeHeaders).map(([k, val]) => [`Header: ${k}`, val])),
            ...Object.fromEntries(Object.entries(event.technical.sanitizedPayloadSummary).map(([k, val]) => [`Payload summary: ${humanize(k)}`, val])),
          }} note="Sanitized. Raw customer payloads and provider secrets are never shown." />
        </div>
      ) : null}

      <RecoverySheet open={recoveryOpen} onOpenChange={setRecoveryOpen} direction="incoming" targetId={event.id} />
    </div>
  );
}
