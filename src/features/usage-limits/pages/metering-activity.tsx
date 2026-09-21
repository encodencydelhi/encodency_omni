"use client";

import { ActivityIcon, DownloadIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KeyValue, Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { StatGridSkeleton, TableSkeleton } from "@/features/companies/components/states";
import { relativeTime } from "@/features/companies/data/clock";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { formatDateTime } from "@/lib/utils/format";
import { RESOURCE_BY_KEY, RESOURCE_DEFINITIONS } from "../data/catalogue";
import { EVENT_RANGES, PROCESSING_STATUS, USAGE_MOCK_MODE, usageRoutes } from "../data/config";
import { useEvents, useMetering, useUsageCapabilities } from "../data/hooks";
import type { MeteringSource } from "../data/types";
import { exportEvents } from "../lib/export";
import { number } from "../lib/format";
import { DemoTag, ProcessingBadge, SourceBadge } from "../components/badges";
import { EventDrawer } from "../components/event-drawer";
import { UsageError } from "../components/states";

const KEYS = ["q", "company", "client", "resource", "source", "status", "range", "page", "event"] as const;

function minutesText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} d`;
}

function IssueDrawer({ source, onClose }: { source: MeteringSource | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(source)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{source?.name ?? "Metering Source"}</SheetTitle>
          <SheetDescription>{source ? `Feeds ${source.resources.map((key) => RESOURCE_BY_KEY[key].name).join(", ")}` : ""}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {source ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1"><SourceBadge status={source.status} /></div>
              {source.failureReason ? <p className="rounded-sm border border-border bg-muted/40 px-3 py-2 text-[0.8125rem] text-foreground">{source.failureReason}</p> : null}
              <dl className="divide-y divide-border">
                <KeyValue label="Source service">{source.name}</KeyValue>
                <KeyValue label="Affected resources">{source.resources.map((key) => RESOURCE_BY_KEY[key].name).join(", ")}</KeyValue>
                <KeyValue label="Affected companies">{source.affectedCompanies}</KeyValue>
                <KeyValue label="Last successful update">{formatDateTime(source.lastSuccessAt)} ({relativeTime(source.lastSuccessAt)})</KeyValue>
                <KeyValue label="Expected frequency">Every {minutesText(source.expectedEveryMinutes)}</KeyValue>
                <KeyValue label="Current delay">{minutesText(source.delayMinutes)}</KeyValue>
                <KeyValue label="Related job">{source.relatedJob ? <code className="text-[11px]">{source.relatedJob}</code> : "None"}</KeyValue>
              </dl>
              {source.relatedJob ? <p className="text-2xs text-muted-foreground">Jobs &amp; Queues and API Monitoring are not available yet, so the job cannot be opened from here.</p> : null}
              <div className="flex flex-wrap gap-1.5">
                {source.resources.map((key) => <Button key={key} asChild variant="outline" size="sm"><Link href={`${usageRoutes.companies}?resource=${key}`}>Review {RESOURCE_BY_KEY[key].name} Usage</Link></Button>)}
              </div>
            </div>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function MeteringActivityPage() {
  const capabilities = useUsageCapabilities();
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value, page: null }));
  const [issue, setIssue] = useState<MeteringSource | null>(null);
  const metering = useMetering();
  const page = Math.max(1, Number(url.values.page) || 1);
  const events = useEvents({ search: url.values.q || undefined, company: url.values.company || undefined, client: url.values.client || undefined, resource: url.values.resource || undefined, source: url.values.source || undefined, status: url.values.status || undefined, range: url.values.range || "30d", page, pageSize: 12 });
  const health = metering.data?.health;
  const data = events.data;
  const anyFilter = KEYS.filter((key) => key !== "page" && key !== "event" && key !== "range").some((key) => url.values[key]);
  const clear = () => { url.set({ q: null, company: null, client: null, resource: null, source: null, status: null, page: null }); setSearch(""); };

  if (!capabilities.canViewMeteringDiagnostics) return <UsageError subject="Metering Diagnostics" error={new Error("You do not have access to metering diagnostics.")} />;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Metering & Activity"
        description="Where usage numbers come from, whether they arrived on time, and what has happened operationally. Service monitoring, job execution and the audit trail live in their own modules."
        meta={USAGE_MOCK_MODE ? <DemoTag>Demo operational data</DemoTag> : undefined}
      />

      {health ? (
        <StatGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard compact label="Healthy Meters" value={health.healthy} hint={`of ${health.sources.length} sources`} tone="success" />
          <StatCard compact label="Delayed Meters" value={health.delayed} hint="Behind schedule" tone={health.delayed > 0 ? "warning" : "neutral"} />
          <StatCard compact label="Failed Meters" value={health.failed} hint="Not reporting" tone={health.failed > 0 ? "danger" : "neutral"} />
          <StatCard compact label="Missing Usage Windows" value={health.missingWindows} hint="Company readings missing" tone={health.missingWindows > 0 ? "warning" : "neutral"} />
          <StatCard compact label="Duplicate Events" value={health.duplicates} hint="Detected and ignored" />
          <StatCard compact label="Last Reconciliation" value={<span className="text-[0.8125rem]">{relativeTime(health.lastReconciliationAt)}</span>} hint={formatDateTime(health.lastReconciliationAt)} />
        </StatGrid>
      ) : metering.error ? null : (
        <StatGridSkeleton count={6} className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6" />
      )}

      {metering.error && !metering.data ? (
        <UsageError subject="Metering Health" error={metering.error} onRetry={() => void metering.refetch()} />
      ) : health ? (
        <div className="grid grid-cols-1 gap-1 xl:grid-cols-3">
          <Panel className="xl:col-span-2" title="Metering Sources" description="Each service that reports usage. Select a source that is not healthy for its issue detail." flush>
            <MiniTable
              caption="Metering sources"
              rows={health.sources}
              getKey={(source) => source.id}
              onRowClick={(source) => setIssue(source)}
              columns={[
                { id: "name", header: "Source", cell: (source) => (<div><p className="font-medium text-foreground">{source.name}</p><p className="text-2xs text-muted-foreground">{source.resources.map((key) => RESOURCE_BY_KEY[key].name).join(", ")}</p></div>) },
                { id: "status", header: "Status", cell: (source) => <SourceBadge status={source.status} /> },
                { id: "last", header: "Last Success", hideBelow: "md", cell: (source) => <span className="whitespace-nowrap text-2xs text-muted-foreground">{relativeTime(source.lastSuccessAt)}</span> },
                { id: "expected", header: "Expected", hideBelow: "lg", cell: (source) => <span className="text-2xs text-muted-foreground">Every {minutesText(source.expectedEveryMinutes)}</span> },
                { id: "delay", header: "Delay", align: "right", cell: (source) => <span className="tabular">{minutesText(source.delayMinutes)}</span> },
                { id: "action", header: <span className="sr-only">Action</span>, align: "right", cell: (source) => (source.status === "healthy" ? null : <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); setIssue(source); }}>Inspect</Button>) },
              ]}
            />
          </Panel>
          <Panel title="Missing Usage Windows" description="Companies whose reading is missing. Their state is Unknown Data, not healthy." flush>
            {health.gaps.length === 0 ? (
              <EmptyState icon={ActivityIcon} size="sm" title="No Metering Issues" description="Every company has a reading for the current window." />
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {health.gaps.map((gap) => (
                  <li key={`${gap.companyId}:${gap.resource}`} className="flex items-center justify-between gap-2 px-3 py-2 text-[0.8125rem]">
                    <div className="min-w-0"><p className="truncate font-medium text-foreground">{gap.companyName}</p><p className="text-2xs text-muted-foreground">{RESOURCE_BY_KEY[gap.resource].name} - since {relativeTime(gap.sinceAt)}</p></div>
                    <Button asChild variant="ghost" size="sm"><Link href={usageRoutes.companyUsage(gap.companyId, gap.resource)}>Review</Link></Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : (
        <TableSkeleton rows={5} columns={5} />
      )}

      <div className="space-y-1.5">
        <p className="text-[13px] font-semibold text-foreground">Usage Events</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search event ID, company or resource..." aria-label="Search events" className="w-full sm:w-72" />
          <FilterSelect label="Company" value={url.values.company || undefined} options={(data?.facets.companies ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => url.set({ company: value, page: null })} />
          <FilterSelect label="Client" value={url.values.client || undefined} options={(data?.facets.clients ?? []).map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => url.set({ client: value, page: null })} />
          <FilterSelect label="Resource" value={url.values.resource || undefined} options={RESOURCE_DEFINITIONS.filter((item) => item.measurement === "metered_period").map((item) => ({ value: item.key, label: item.name }))} onChange={(value) => url.set({ resource: value, page: null })} />
          <FilterSelect label="Source" value={url.values.source || undefined} options={(data?.facets.sources ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => url.set({ source: value, page: null })} />
          <FilterSelect label="Status" value={url.values.status || undefined} options={Object.entries(PROCESSING_STATUS).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => url.set({ status: value, page: null })} />
          <FilterSelect label="Range" value={url.values.range || undefined} options={EVENT_RANGES.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => url.set({ range: value, page: null })} />
          {anyFilter ? <Button variant="ghost" size="sm" onClick={clear}>Clear Filters</Button> : null}
          {capabilities.canExportUsage && data ? <Button variant="outline" size="sm" className="ml-auto" onClick={() => exportEvents(data.rows)}><DownloadIcon />Export</Button> : null}
        </div>
      </div>

      {events.error && !data ? (
        <UsageError subject="Usage Events" error={events.error} onRetry={() => void events.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={8} columns={9} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Usage events"
            rows={data.rows}
            getKey={(event) => event.id}
            onRowClick={(event) => url.set({ event: event.id })}
            empty={<EmptyState icon={SearchXIcon} title="No Metering Events" description={anyFilter ? "No event matches these filters." : "No events in this range."} action={anyFilter ? <Button variant="outline" onClick={clear}>Clear Filters</Button> : undefined} />}
            columns={[
              { id: "at", header: "Timestamp", cell: (event) => <span className="whitespace-nowrap text-2xs tabular">{formatDateTime(event.occurredAt)}</span> },
              { id: "company", header: "Company", cell: (event) => <span className="font-medium text-foreground">{event.companyName}</span> },
              { id: "client", header: "Client", hideBelow: "lg", cell: (event) => (event.clientName ? <span className="text-2xs">{event.clientName}</span> : <span className="text-2xs text-muted-foreground">Company-level</span>) },
              { id: "resource", header: "Resource", hideBelow: "md", cell: (event) => RESOURCE_BY_KEY[event.resource].name },
              { id: "qty", header: "Quantity", align: "right", cell: (event) => <span className="tabular">+{number(event.quantity)} <span className="text-2xs text-muted-foreground">{event.unit}</span></span> },
              { id: "source", header: "Source", hideBelow: "lg", cell: (event) => <span className="text-2xs">{event.source}</span> },
              { id: "status", header: "Status", cell: (event) => <ProcessingBadge status={event.status} /> },
              { id: "ref", header: "Reference", hideBelow: "lg", cell: (event) => <code className="text-[11px] text-muted-foreground">{event.reference}</code> },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (event) => <Button variant="ghost" size="sm" onClick={(click) => { click.stopPropagation(); url.set({ event: event.id }); }}>Details</Button> },
            ]}
          />
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-2xs text-muted-foreground">
            <span>{data.total} event{data.total === 1 ? "" : "s"}. Only concurrent-capacity resources such as seats are not events.</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => url.set({ page: String(page - 1) })}>Previous</Button>
              <span className="tabular">Page {page} of {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(data.total / data.pageSize)} onClick={() => url.set({ page: String(page + 1) })}>Next</Button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Operational Activity" description="Administrative and system events, kept apart from the raw consumption records above. The audit trail is in Audit Logs." flush>
        {!metering.data ? (
          <div className="p-3"><TableSkeleton rows={4} columns={2} /></div>
        ) : metering.data.activity.length === 0 ? (
          <EmptyState icon={ActivityIcon} size="sm" title="No Recent Activity" description="Operational events appear here as they happen." />
        ) : (
          <ul className="divide-y divide-border border-t border-border">
            {metering.data.activity.slice(0, 14).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-1.5 text-[0.8125rem]">
                <span className="text-foreground">{entry.text}</span>
                <span className="whitespace-nowrap text-2xs text-muted-foreground">{formatDateTime(entry.at)}{entry.actor ? ` - ${entry.actor}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {USAGE_MOCK_MODE ? <AlertBanner tone="info" title="Demo Operational Data">Sources, delays, duplicates and events are generated deterministically from the shared company records so they reconcile with usage totals. Nothing is ingested or reconciled by a real service.</AlertBanner> : null}

      <EventDrawer eventId={url.values.event || null} onClose={() => url.set({ event: null })} />
      <IssueDrawer source={issue} onClose={() => setIssue(null)} />
    </div>
  );
}
