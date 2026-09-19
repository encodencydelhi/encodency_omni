"use client";

import { EyeIcon, HistoryIcon, SearchXIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionMenu } from "@/components/shared/action-menu";
import { DataTable } from "@/components/shared/data-table/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import type { DataTableColumn } from "@/components/shared/data-table/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { ModuleLinkButton } from "@/features/companies/components/module-link";
import { relativeTime } from "@/features/companies/data/clock";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { formatDateTime } from "@/lib/utils/format";
import { ClientError, TableSkeleton } from "../components/states";
import { ResultBadge, SeverityBadge } from "../components/status-badges";
import { useClientActivity } from "../data/hooks";
import type { ClientActivity, ClientActivityData } from "../data/types";
import { useClientId } from "./client-shell";

const KEYS = ["q", "actor", "module", "event", "severity", "result", "from", "to"] as const;
const PAGE_SIZE = 15;

const MODULE_OPTIONS = [
  { value: "client", label: "Client" },
  { value: "team", label: "Team" },
  { value: "channels", label: "Channels" },
  { value: "website", label: "Website" },
  { value: "jobs", label: "Jobs" },
  { value: "settings", label: "Settings" },
  { value: "onboarding", label: "Onboarding" },
];
const SEVERITY_OPTIONS = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];
const RESULT_OPTIONS = [
  { value: "success", label: "Success" },
  { value: "failure", label: "Failed" },
  { value: "denied", label: "Denied" },
];

/** "team.member_assigned" -> "Team member assigned" */
function eventLabel(action: string): string {
  const text = action.replace(/[._]/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function DetailDrawer({ entry, clientId, companyId, onClose }: { entry: ClientActivity | null; clientId: string; companyId: string; onClose: () => void }) {
  return (
    <Sheet open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        {entry ? (
          <>
            <SheetHeader>
              <SheetTitle>{eventLabel(entry.action)}</SheetTitle>
              <SheetDescription>{formatDateTime(entry.at)}</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <ResultBadge result={entry.result} />
                <SeverityBadge severity={entry.severity} />
              </div>
              <p className="text-[0.8125rem] text-foreground">{entry.summary}</p>
              <Panel title="Details">
                <dl className="divide-y divide-border">
                  <KeyValue label="Actor">{entry.actor.name} <span className="text-2xs capitalize text-muted-foreground">({entry.actor.type})</span></KeyValue>
                  <KeyValue label="Module"><span className="capitalize">{entry.module}</span></KeyValue>
                  <KeyValue label="Entity">{entry.entity.label} <span className="text-2xs text-muted-foreground">({entry.entity.type})</span></KeyValue>
                  <KeyValue label="Event"><span className="font-mono text-2xs">{entry.action}</span></KeyValue>
                  {entry.reason ? <KeyValue label="Reason">{entry.reason}</KeyValue> : null}
                  {entry.correlationId ? <KeyValue label="Request ID"><span className="font-mono text-2xs">{entry.correlationId}</span></KeyValue> : null}
                </dl>
              </Panel>
              {entry.previousValue !== null || entry.newValue !== null ? (
                <Panel title="Change">
                  <div className="grid grid-cols-2 gap-2 text-[0.8125rem]">
                    <div className="rounded-sm border border-border bg-surface-sunken px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Previous</p>
                      <p className="mt-0.5 break-words text-foreground">{entry.previousValue ?? "-"}</p>
                    </div>
                    <div className="rounded-sm border border-border bg-surface-sunken px-2.5 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">New</p>
                      <p className="mt-0.5 break-words text-foreground">{entry.newValue ?? "-"}</p>
                    </div>
                  </div>
                </Panel>
              ) : null}
            </SheetBody>
            <SheetFooter>
              <ModuleLinkButton module="auditLogs" query={{ client: clientId, company: companyId }}>Open Audit Logs</ModuleLinkButton>
              <Button onClick={onClose}>Close</Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function ClientActivityPage() {
  const clientId = useClientId();
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value }));
  const [page, setPage] = useState({ key: "", value: 1 });
  const [selected, setSelected] = useState<ClientActivity | null>(null);

  const filter = useMemo(
    () => ({
      search: url.values.q || undefined,
      actor: url.values.actor || undefined,
      module: url.values.module || undefined,
      event: url.values.event || undefined,
      severity: url.values.severity || undefined,
      result: url.values.result || undefined,
      from: url.values.from || undefined,
      to: url.values.to || undefined,
    }),
    [url.values],
  );
  const query = useClientActivity(clientId, filter);
  const filterKey = JSON.stringify(filter);
  const currentPage = page.key === filterKey ? page.value : 1;

  if (query.error && !query.data) return <ClientError subject="Activity" error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) return <TableSkeleton rows={8} columns={6} />;

  return <ActivityBody data={query.data} url={url} search={search} onSearch={setSearch} page={currentPage} onPage={(value) => setPage({ key: filterKey, value })} selected={selected} onSelect={setSelected} />;
}

function ActivityBody({
  data,
  url,
  search,
  onSearch,
  page,
  onPage,
  selected,
  onSelect,
}: {
  data: ClientActivityData;
  url: ReturnType<typeof useUrlParams<(typeof KEYS)[number]>>;
  search: string;
  onSearch: (value: string) => void;
  page: number;
  onPage: (page: number) => void;
  selected: ClientActivity | null;
  onSelect: (entry: ClientActivity | null) => void;
}) {
  const { summary, entries, total } = data;
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = entries.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const filtered = url.activeCount > 0;

  const columns: Array<DataTableColumn<ClientActivity>> = [
    { id: "time", header: "Timestamp", hideable: false, cell: (entry) => <span className="whitespace-nowrap text-2xs text-muted-foreground" title={formatDateTime(entry.at)}>{relativeTime(entry.at)}<span className="block">{formatDateTime(entry.at)}</span></span> },
    { id: "actor", header: "Actor", hideBelow: "md", cell: (entry) => <span className="text-[0.8125rem]">{entry.actor.name}<span className="block text-2xs capitalize text-muted-foreground">{entry.actor.type}</span></span> },
    { id: "event", header: "Event", cell: (entry) => <div className="min-w-0 max-w-md"><p className="truncate text-[0.8125rem] font-medium text-foreground">{eventLabel(entry.action)}</p><p className="truncate text-2xs text-muted-foreground">{entry.summary}</p></div> },
    { id: "module", header: "Module", hideBelow: "md", cell: (entry) => <span className="text-[0.8125rem] capitalize">{entry.module}</span> },
    { id: "result", header: "Result", cell: (entry) => <ResultBadge result={entry.result} /> },
    { id: "actions", header: <span className="sr-only">Actions</span>, hideable: false, align: "right", width: "w-12", cell: (entry) => <ActionMenu label="Event actions" items={[{ id: "view", label: "View details", icon: EyeIcon, onSelect: () => onSelect(entry) }]} /> },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput value={search} onChange={onSearch} placeholder="Search activity..." aria-label="Search activity" className="w-full sm:w-72" />
        <FilterSelect label="Actor" value={url.values.actor || undefined} options={data.actors.map((actor) => ({ value: actor, label: actor }))} onChange={(value) => url.set({ actor: value })} />
        <FilterSelect label="Module" value={url.values.module || undefined} options={MODULE_OPTIONS} onChange={(value) => url.set({ module: value })} />
        <FilterSelect label="Event" value={url.values.event || undefined} options={data.events.map((event) => ({ value: event, label: eventLabel(event) }))} onChange={(value) => url.set({ event: value })} />
        <FilterSelect label="Severity" value={url.values.severity || undefined} options={SEVERITY_OPTIONS} onChange={(value) => url.set({ severity: value })} />
        <FilterSelect label="Result" value={url.values.result || undefined} options={RESULT_OPTIONS} onChange={(value) => url.set({ result: value })} />
        <div className="flex items-center gap-1.5">
          <Input type="date" aria-label="From date" value={url.values.from} onChange={(event) => url.set({ from: event.target.value })} className="h-8 w-[9.25rem]" />
          <span className="text-2xs text-muted-foreground">to</span>
          <Input type="date" aria-label="To date" value={url.values.to} onChange={(event) => url.set({ to: event.target.value })} className="h-8 w-[9.25rem]" />
        </div>
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={url.clear}>
            Clear Filters
          </Button>
        ) : null}
      </div>

      <p className="text-2xs text-muted-foreground" aria-live="polite">
        {filtered ? `${entries.length} of ${total} events` : `${total} ${total === 1 ? "event" : "events"}`}
      </p>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(entry) => entry.id}
        isLoading={false}
        isFetching={false}
        caption={`Activity for ${summary.client.name}`}
        onRowClick={(entry) => onSelect(entry)}
        pagination={entries.length > PAGE_SIZE ? { page: current, pageSize: PAGE_SIZE, total: entries.length, totalPages, hasNextPage: current < totalPages, hasPreviousPage: current > 1 } : undefined}
        onPageChange={onPage}
        emptyState={
          filtered ? (
            <EmptyState icon={SearchXIcon} title="No activity matches these filters" description="Try a wider date range or clear the filters." action={<Button variant="outline" onClick={url.clear}>Clear Filters</Button>} />
          ) : (
            <EmptyState icon={HistoryIcon} title="No activity yet" description="Changes to this client, its team, channels and website are recorded here." />
          )
        }
      />

      <DetailDrawer entry={selected} clientId={summary.client.id} companyId={summary.company.id} onClose={() => onSelect(null)} />
    </div>
  );
}
