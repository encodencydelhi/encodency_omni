"use client";

import { ActivityIcon, EyeIcon, SearchXIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { DataTable } from "@/components/shared/data-table/data-table";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/utils/format";
import { KeyValue, Panel } from "../components/primitives";
import { ModuleLinkButton } from "../components/module-link";
import { SectionError, TableSkeleton } from "../components/states";
import { ResultBadge, SeverityBadge } from "../components/status-badges";
import { relativeTime } from "../data/clock";
import { DASHBOARD_ROUTE_LABEL, SEVERITY_META } from "../data/config";
import { useCompanyActivity } from "../data/hooks";
import type { ActivityModule, CompanyActivity } from "../data/types";
import { useDebouncedText, useUrlParams } from "../hooks/use-url-params";
import { toStatusOptions } from "@/types/common";
import { useCompanyId } from "./company-shell";

const URL_KEYS = ["q", "actor", "module", "event", "severity", "from", "to"] as const;
const MODULE_OPTIONS = (Object.keys(DASHBOARD_ROUTE_LABEL) as ActivityModule[]).map((value) => ({ value, label: DASHBOARD_ROUTE_LABEL[value] }));
const SEVERITY_OPTIONS = toStatusOptions(SEVERITY_META);

function humanise(action: string): string {
  return action.replace(/[._]/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

export function CompanyActivityPage() {
  const companyId = useCompanyId();
  const url = useUrlParams(URL_KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, useCallback((value: string) => url.set({ q: value }), [url]));
  const [selected, setSelected] = useState<CompanyActivity | null>(null);

  const filter = useMemo(
    () => ({
      search: url.values.q || undefined,
      actor: url.values.actor || undefined,
      module: url.values.module || undefined,
      event: url.values.event || undefined,
      severity: url.values.severity || undefined,
      from: url.values.from || undefined,
      to: url.values.to || undefined,
    }),
    [url.values],
  );
  const query = useCompanyActivity(companyId, filter);

  if (query.error && !query.data) {
    return <SectionError subject="Activity" error={query.error} onRetry={() => void query.refetch()} module={{ key: "auditLogs", label: "Audit Logs" }} />;
  }
  if (!query.data) return <TableSkeleton rows={8} columns={6} />;

  const { entries, total, actors, events } = query.data;

  const columns: Array<DataTableColumn<CompanyActivity>> = [
    {
      id: "time",
      header: "Timestamp",
      hideable: false,
      cell: (entry) => (
        <span className="block whitespace-nowrap text-[0.8125rem] text-foreground" title={formatDateTime(entry.at)}>
          {relativeTime(entry.at)}
          <span className="block text-2xs text-muted-foreground">{formatDateTime(entry.at)}</span>
        </span>
      ),
    },
    {
      id: "actor",
      header: "Actor",
      cell: (entry) => (
        <span className="text-[0.8125rem] text-foreground">
          {entry.actor.name}
          <span className="block text-2xs capitalize text-muted-foreground">{entry.actor.type}</span>
        </span>
      ),
    },
    {
      id: "action",
      header: "Action",
      width: "min-w-56",
      cell: (entry) => (
        <span className="flex items-start gap-1.5">
          <span className="min-w-0">
            <span className="block truncate text-[0.8125rem] font-medium text-foreground">{entry.summary}</span>
            <span className="block truncate font-mono text-2xs text-muted-foreground">{entry.action}</span>
          </span>
          {entry.severity !== "info" ? <SeverityBadge severity={entry.severity} /> : null}
        </span>
      ),
    },
    { id: "entity", header: "Entity", cell: (entry) => <span className="block max-w-44 truncate text-[0.8125rem] text-foreground">{entry.entity.label}</span> },
    { id: "module", header: "Module", cell: (entry) => <span className="text-[0.8125rem] text-foreground">{DASHBOARD_ROUTE_LABEL[entry.module]}</span> },
    { id: "result", header: "Result", cell: (entry) => <ResultBadge result={entry.result} /> },
    { id: "actions", header: <span className="sr-only">Actions</span>, hideable: false, align: "right", width: "w-12", cell: (entry) => <ActionMenu items={[{ id: "view", label: "View details", icon: EyeIcon, onSelect: () => setSelected(entry) }]} label="Event actions" /> },
  ];

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search activity..." aria-label="Search activity" className="w-full sm:w-64" />
        <FilterSelect label="User" value={url.values.actor || undefined} options={actors.map((name) => ({ value: name, label: name }))} onChange={(value) => url.set({ actor: value })} />
        <FilterSelect label="Module" value={url.values.module || undefined} options={MODULE_OPTIONS} onChange={(value) => url.set({ module: value })} />
        <FilterSelect label="Event" value={url.values.event || undefined} options={events.map((event) => ({ value: event, label: humanise(event) }))} onChange={(value) => url.set({ event: value })} />
        <FilterSelect label="Severity" value={url.values.severity || undefined} options={SEVERITY_OPTIONS} onChange={(value) => url.set({ severity: value })} />
        <div className="flex items-center gap-1">
          <Input type="date" value={url.values.from} max={url.values.to || undefined} onChange={(event) => url.set({ from: event.target.value })} aria-label="From date" className="h-8 w-36" />
          <span className="text-2xs text-muted-foreground">to</span>
          <Input type="date" value={url.values.to} min={url.values.from || undefined} onChange={(event) => url.set({ to: event.target.value })} aria-label="To date" className="h-8 w-36" />
        </div>
        {url.activeCount > 0 ? <Button variant="ghost" size="sm" onClick={url.clear}>Clear filters</Button> : null}
        <span className="ml-auto text-2xs text-muted-foreground">
          {entries.length === total ? `${total} events` : `${entries.length} of ${total} events`}
        </span>
      </div>

      <DataTable
        columns={columns}
        rows={entries}
        getRowId={(entry) => entry.id}
        isLoading={false}
        isFetching={query.isFetching}
        caption="Company activity"
        onRowClick={setSelected}
        emptyState={
          total === 0 ? (
            <EmptyState icon={ActivityIcon} title="No activity" description="Administrative and operational events for this company appear here." />
          ) : (
            <EmptyState icon={SearchXIcon} title="No events match" description="Try a wider date range or clear the filters." action={<Button variant="outline" onClick={url.clear}>Clear filters</Button>} />
          )
        }
      />

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Event details</SheetTitle>
            <SheetDescription>{selected?.action}</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-3">
            {selected ? (
              <>
                <Panel title="Summary">
                  <p className="text-[0.8125rem] text-foreground">{selected.summary}</p>
                </Panel>
                <Panel>
                  <dl className="divide-y divide-border">
                    <KeyValue label="Actor">{selected.actor.name} <span className="capitalize text-muted-foreground">({selected.actor.type})</span></KeyValue>
                    <KeyValue label="Timestamp">{formatDateTime(selected.at)}</KeyValue>
                    <KeyValue label="Affected entity">{selected.entity.label}</KeyValue>
                    <KeyValue label="Module">{DASHBOARD_ROUTE_LABEL[selected.module]}</KeyValue>
                    <KeyValue label="Previous value">{selected.previousValue ?? "-"}</KeyValue>
                    <KeyValue label="New value">{selected.newValue ?? "-"}</KeyValue>
                    <KeyValue label="Result"><ResultBadge result={selected.result} /></KeyValue>
                    <KeyValue label="Correlation ID"><span className="font-mono text-2xs">{selected.correlationId ?? "-"}</span></KeyValue>
                  </dl>
                </Panel>
                <Panel title="Reason">
                  <p className="text-[0.8125rem] text-muted-foreground">{selected.reason ?? "No reason was recorded."}</p>
                </Panel>
              </>
            ) : null}
          </SheetBody>
          <SheetFooter>
            <ModuleLinkButton module="auditLogs" query={selected?.correlationId ? { search: selected.correlationId } : undefined}>
              Open Global Audit Log
            </ModuleLinkButton>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
