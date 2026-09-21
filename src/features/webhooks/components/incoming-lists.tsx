/**
 * EnCodency OmniPlatform - Super Admin Webhooks Module
 * Incoming workspace: Sources & Receivers directory and Incoming Events directory.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { DefinitionList } from "@/components/shared/definition-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PROCESSING_STATE, RECEIVER_STATUS, SOURCE_CONFIGURATION_STATE, VERIFICATION_METHOD_LABEL, VERIFICATION_STATE, WEBHOOK_ROUTES, ENVIRONMENT_LABEL } from "../data/config";
import { incomingInWindow, sourceStats, type SourceStat } from "../data/selectors";
import type { IncomingEvent } from "../data/types";
import { CompanyCell, OpenLink, TablePanel } from "./cells";
import { EnvironmentFilter, FilterControls, optionsFrom, useFilterState, DATE_FILTER_OPTIONS } from "./filters";
import { CardGrid, Chip, EmptyRows, ExportButton, FilterBar, IdCell, JobReference, Kpi, Mono, Notice, State, SubNav, Timestamp, humanize, usePaged } from "./kit";
import { MonitoringChip } from "./overview-page";
import { useWebhookData, useWebhooks } from "./webhooks-context";

function IncomingNav({ view }: { view: "sources" | "events" }) {
  const router = useRouter();
  const { snapshot, window } = useWebhookData();
  return (
    <SubNav
      label="Incoming sections"
      value={view}
      onChange={(next) => router.push(next === "sources" ? WEBHOOK_ROUTES.incoming : WEBHOOK_ROUTES.incomingEvents)}
      items={[
        { value: "sources", label: "Sources & Receivers", count: snapshot.sources.length },
        { value: "events", label: "Incoming Events", count: incomingInWindow(snapshot, window).length },
      ]}
    />
  );
}

function IncomingSummary() {
  const { snapshot, window } = useWebhookData();
  const events = incomingInWindow(snapshot, window);
  const verificationIssues = events.filter((event) => event.verification.state === "rejected" || event.verification.state === "unavailable").length;
  const failed = events.filter((event) => event.verification.state === "verified" && event.processing.state === "failed").length;
  return (
    <CardGrid cols={4}>
      <Kpi label="Registered Sources" value={snapshot.sources.length} hint={`${snapshot.sources.filter((s) => s.configurationState === "configured").length} configured. 0 receivers connected`} />
      <Kpi label="Incoming Events" value={events.length} hint="In the selected period" />
      <Kpi label="Verification Issues" value={verificationIssues} tone={verificationIssues ? "danger" : "default"} hint="Rejected or not verified" href={`${WEBHOOK_ROUTES.incomingEvents}?verification=rejected`} />
      <Kpi label="Processing Failures" value={failed} tone={failed ? "danger" : "default"} hint="Verified, processing failed" href={`${WEBHOOK_ROUTES.incomingEvents}?processing=failed`} />
    </CardGrid>
  );
}

/* ------------------------------------------------------------------ */
/* Sources directory                                                   */
/* ------------------------------------------------------------------ */

export function IncomingSourcesPage() {
  const { snapshot, window } = useWebhookData();
  const router = useRouter();
  const filters = useFilterState(["provider", "config", "method", "last"] as const);
  const stats = useMemo(() => sourceStats(snapshot, window), [snapshot, window]);

  const rows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return stats.filter((row) => {
      const s = row.source;
      if (q && !`${s.name} ${s.providerName} ${s.receiverId} ${s.id}`.toLowerCase().includes(q)) return false;
      if (filters.values.provider && s.providerId !== filters.values.provider) return false;
      if (filters.values.config && s.configurationState !== filters.values.config) return false;
      if (filters.values.method && s.verificationMethod !== filters.values.method) return false;
      if (filters.values.last) {
        const hours = Number(filters.values.last);
        const ageH = row.lastReceivedAt ? (Date.parse(snapshot.generatedAt) - Date.parse(row.lastReceivedAt)) / 3_600_000 : Infinity;
        if (ageH > hours) return false;
      }
      return true;
    });
  }, [stats, filters.query, filters.values, snapshot.generatedAt]);

  const paged = usePaged(rows, 10);

  const columns: Array<DataTableColumn<SourceStat>> = [
    { id: "source", header: "Source", cell: (row) => <IdCell id={row.source.name} sub={row.source.id} /> },
    { id: "provider", header: "Provider", hideBelow: "xl", cell: (row) => <span className="text-[0.8125rem]">{row.source.providerName}</span> },
    { id: "receiver", header: "Receiver Reference", hideBelow: "lg", cell: (row) => (<div className="space-y-1"><Mono className="block">{row.source.receiverId}</Mono><State registry={RECEIVER_STATUS} status={row.source.receiverStatus} /></div>) },
    { id: "env", header: "Environment", hideBelow: "2xl", cell: (row) => <span className="text-[0.8125rem]">{ENVIRONMENT_LABEL[row.source.environment]}</span> },
    { id: "config", header: "Configuration", cell: (row) => <State registry={SOURCE_CONFIGURATION_STATE} status={row.source.configurationState} /> },
    { id: "method", header: "Verification Method", hideBelow: "md", cell: (row) => (<div className="space-y-1"><span className="block text-[0.8125rem]">{VERIFICATION_METHOD_LABEL[row.source.verificationMethod]}</span>{!row.source.verificationConfigured ? <Chip tone="warning">Not configured</Chip> : null}</div>) },
    { id: "events", header: "Received", align: "right", cell: (row) => <span className="tabular">{row.events}</span> },
    { id: "vf", header: "Verif. Failures", align: "right", hideBelow: "lg", cell: (row) => <span className="tabular">{row.verificationFailures}</span> },
    { id: "last", header: "Last Received", hideBelow: "md", cell: (row) => (<div className="space-y-1"><Timestamp iso={row.lastReceivedAt} /><MonitoringChip state={row.monitoring} /></div>) },
    { id: "act", header: "Actions", align: "right", cell: (row) => (<div className="flex justify-end gap-1"><OpenLink href={WEBHOOK_ROUTES.incomingSource(row.source.id)} label="Details" /><Button asChild variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}><Link href={row.source.integrationHref}>Integration</Link></Button></div>) },
  ];

  return (
    <div className="space-y-1">
      <IncomingNav view="sources" />
      <IncomingSummary />
      <TablePanel
        title="Sources & Receivers"
        description="Providers that may send events to OmniPlatform. Receiver URLs are not shown because no receiver is connected."
        action={<ExportButton filename="webhook-incoming-sources.csv" rows={rows.map((r) => ({ id: r.source.id, provider: r.source.providerName, receiverId: r.source.receiverId, configuration: r.source.configurationState, verificationMethod: r.source.verificationMethod, events: r.events, verificationFailures: r.verificationFailures }))} />}
        filters={
          <FilterBar>
            <FilterControls
              state={filters}
              searchPlaceholder="Search source name, provider or receiver ID..."
              filters={[
                { key: "provider", label: "Provider", options: optionsFrom(snapshot.sources.map((s) => s.providerId), (v) => snapshot.sources.find((s) => s.providerId === v)?.providerName ?? v) },
                { key: "config", label: "Configuration", options: Object.entries(SOURCE_CONFIGURATION_STATE).map(([value, meta]) => ({ value, label: meta.label })) },
                { key: "method", label: "Verification", options: Object.entries(VERIFICATION_METHOD_LABEL).map(([value, label]) => ({ value, label })) },
                { key: "last", label: "Last received", options: DATE_FILTER_OPTIONS },
              ]}
            />
            <EnvironmentFilter />
          </FilterBar>
        }
        scroll={false}
      >
        <DataTable
          columns={columns}
          rows={paged.pageRows}
          getRowId={(row) => row.source.id}
          isLoading={false}
          caption="Incoming sources"
          pagination={paged.pagination}
          onPageChange={paged.setPage}
          onPageSizeChange={paged.setPageSize}
          onRowClick={(row) => router.push(WEBHOOK_ROUTES.incomingSource(row.source.id))}
          emptyState={<EmptyRows title="No sources match" description="No registered source matches these filters in this environment." />}
        />
      </TablePanel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Events directory                                                    */
/* ------------------------------------------------------------------ */

export function IncomingEventsPage() {
  const { snapshot, window } = useWebhookData();
  const filters = useFilterState(["provider", "source", "type", "verification", "processing", "company", "hours"] as const);
  const [preview, setPreview] = useState<IncomingEvent | null>(null);

  const rows = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const fromMs = filters.values.hours ? Date.parse(snapshot.generatedAt) - Number(filters.values.hours) * 3_600_000 : window.fromMs;
    return snapshot.incomingEvents.filter((event) => {
      if (Date.parse(event.receivedAt) < fromMs) return false;
      if (q && !`${event.id} ${event.providerEventRef} ${event.eventType} ${event.relatedResource?.id ?? ""} ${event.relatedResource?.label ?? ""}`.toLowerCase().includes(q)) return false;
      if (filters.values.provider && event.providerId !== filters.values.provider) return false;
      if (filters.values.source && event.sourceId !== filters.values.source) return false;
      if (filters.values.type && event.eventType !== filters.values.type) return false;
      if (filters.values.verification && event.verification.state !== filters.values.verification) return false;
      if (filters.values.processing && event.processing.state !== filters.values.processing) return false;
      if (filters.values.company && (event.companyId ?? "none") !== filters.values.company) return false;
      return true;
    });
  }, [snapshot, window.fromMs, filters.query, filters.values]);

  const paged = usePaged(rows, 10);

  const columns: Array<DataTableColumn<IncomingEvent>> = [
    { id: "at", header: "Received At", cell: (row) => <Timestamp iso={row.receivedAt} /> },
    { id: "id", header: "Event ID", cell: (row) => <IdCell id={row.id} sub={row.providerEventRef} /> },
    { id: "provider", header: "Provider / Source", hideBelow: "lg", cell: (row) => <span className="block max-w-[11rem] truncate text-[0.8125rem]">{row.providerName}</span> },
    { id: "type", header: "Event Type", cell: (row) => <Mono>{row.eventType}</Mono> },
    { id: "company", header: "Company / Account", hideBelow: "xl", cell: (row) => (<div className="min-w-0"><CompanyCell id={row.companyId} name={row.companyName} />{row.accountMapping !== "mapped" ? <span className="text-2xs text-muted-foreground">Mapping: {humanize(row.accountMapping)}</span> : null}</div>) },
    { id: "verification", header: "Verification", cell: (row) => <State registry={VERIFICATION_STATE} status={row.verification.state} /> },
    { id: "processing", header: "Processing", cell: (row) => <State registry={PROCESSING_STATE} status={row.processing.state} /> },
    { id: "resource", header: "Related Resource", hideBelow: "2xl", cell: (row) => (row.relatedResource ? <span className="text-[0.8125rem]">{row.relatedResource.label}<Mono className="block text-muted-foreground">{row.relatedResource.id}</Mono></span> : <span className="text-muted-foreground">None</span>) },
    { id: "act", header: "", align: "right", cell: (row) => <OpenLink href={WEBHOOK_ROUTES.incomingEvent(row.id)} /> },
  ];

  return (
    <div className="space-y-1">
      <IncomingNav view="events" />
      <IncomingSummary />
      <TablePanel
        title="Incoming Events"
        description="Events recorded from registered sources. Verification and processing are separate states."
        action={<ExportButton filename="webhook-incoming-events.csv" rows={rows.map((e) => ({ id: e.id, receivedAt: e.receivedAt, provider: e.providerName, eventType: e.eventType, company: e.companyName, verification: e.verification.state, processing: e.processing.state }))} />}
        filters={
          <FilterBar>
            <FilterControls
              state={filters}
              searchPlaceholder="Search event ID, provider event ID, type or resource..."
              filters={[
                { key: "provider", label: "Provider", options: optionsFrom(snapshot.incomingEvents.map((e) => e.providerId), (v) => snapshot.sources.find((s) => s.providerId === v)?.providerName ?? v) },
                { key: "source", label: "Source", options: snapshot.sources.map((s) => ({ value: s.id, label: s.name })) },
                { key: "type", label: "Event type", options: optionsFrom(snapshot.incomingEvents.map((e) => e.eventType)) },
                { key: "verification", label: "Verification", options: Object.entries(VERIFICATION_STATE).map(([value, meta]) => ({ value, label: meta.label })) },
                { key: "processing", label: "Processing", options: Object.entries(PROCESSING_STATE).map(([value, meta]) => ({ value, label: meta.label })) },
                { key: "company", label: "Company", options: [...snapshot.companies.filter((c) => snapshot.incomingEvents.some((e) => e.companyId === c.id)).map((c) => ({ value: c.id, label: c.name })), { value: "none", label: "Not mapped" }] },
                { key: "hours", label: "Date range", options: DATE_FILTER_OPTIONS },
              ]}
            />
            <EnvironmentFilter />
          </FilterBar>
        }
        scroll={false}
      >
        <DataTable
          columns={columns}
          rows={paged.pageRows}
          getRowId={(row) => row.id}
          isLoading={false}
          caption="Incoming events"
          pagination={paged.pagination}
          onPageChange={paged.setPage}
          onPageSizeChange={paged.setPageSize}
          onRowClick={setPreview}
          emptyState={<EmptyRows title="No incoming events match" description="Nothing was recorded for these filters. This is not evidence that a provider sent nothing." />}
        />
      </TablePanel>
      <IncomingEventPreview event={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick preview                                                       */
/* ------------------------------------------------------------------ */

export function IncomingEventPreview({ event, onClose }: { event: IncomingEvent | null; onClose: () => void }) {
  const { snapshot } = useWebhooks();
  const source = event && snapshot ? snapshot.sources.find((s) => s.id === event.sourceId) : undefined;
  return (
    <Sheet open={Boolean(event)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {event ? (
          <>
            <SheetHeader>
              <SheetTitle>{event.eventType}</SheetTitle>
              <SheetDescription><Mono>{event.id}</Mono> from {event.providerName}</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                <State registry={VERIFICATION_STATE} status={event.verification.state} />
                <State registry={PROCESSING_STATE} status={event.processing.state} />
              </div>
              {event.verification.state !== "verified" ? <Notice tone="warning" title="Not authentic">This event is not verified, so it cannot be processed by a retry. {event.verification.failureReason}</Notice> : <Notice tone="info">Verification shown is a demo record. No cryptographic check ran in this frontend.</Notice>}
              <DefinitionList columns={1} items={[
                { label: "Incoming event ID", value: <Mono>{event.id}</Mono> },
                { label: "Provider event reference", value: <Mono>{event.providerEventRef}</Mono> },
                { label: "Source", value: source?.name ?? event.sourceId },
                { label: "Received at", value: <Timestamp iso={event.receivedAt} /> },
                { label: "Company / account mapping", value: `${event.companyName ?? "Not mapped"} (${humanize(event.accountMapping)})` },
                { label: "Related resource", value: event.relatedResource ? `${event.relatedResource.label} (${event.relatedResource.id})` : "None" },
                { label: "Latest processing result", value: event.processing.errorSummary ?? (event.processing.state === "processed" ? "Processed. Related resource updated." : humanize(event.processing.state)) },
                { label: "Related job", value: <JobReference jobId={event.processing.jobId} /> },
              ]} />
            </SheetBody>
            <SheetFooter className="flex-wrap justify-between">
              <Button asChild variant="outline" size="sm"><Link href={source?.integrationHref ?? "#"}>Open Related Integration</Link></Button>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm"><Link href={`${WEBHOOK_ROUTES.incomingEvent(event.id)}?tab=processing`}>View Processing</Link></Button>
                <Button asChild size="sm"><Link href={WEBHOOK_ROUTES.incomingEvent(event.id)}>Open Full Event</Link></Button>
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
