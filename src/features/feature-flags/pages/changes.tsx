"use client";

import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AlertBanner } from "@/components/shared/alert-banner";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Panel, StatCard, StatGrid } from "@/features/companies/components/primitives";
import { TableSkeleton } from "@/features/companies/components/states";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { cn } from "@/lib/utils/cn";
import { CHANGE_STATUS, CHANGE_TYPE, CHANGES_TABS, FLAGS_MOCK_MODE, flagRoutes, type ChangesTab } from "../data/config";
import { useActivity, useChanges, useFlagCapabilities, useFlagList } from "../data/hooks";
import type { FlagChange } from "../data/types";
import { exportActivity, exportChanges } from "../lib/export";
import { ago } from "../lib/format";
import { DemoTag, ResultBadge } from "../components/badges";
import { ChangeDrawer, ChangesTable, VersionsPanel } from "../components/change-views";
import { EnvironmentSwitch, useEnvironment } from "../components/environment";
import { FlagsError } from "../components/states";

const KEYS = ["tab", "q", "flag", "type", "actor", "status", "page", "apage"] as const;

function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between border-t border-border px-3 py-2 text-2xs text-muted-foreground">
      <span>{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeftIcon /></Button>
        <span className="tabular">Page {page} of {pages}</span>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}><ChevronRightIcon /></Button>
      </div>
    </div>
  );
}

/** Pending requests, planned changes, the full history and configuration versions, one tab each. */
export function ChangesPage() {
  const capabilities = useFlagCapabilities();
  const { environment, set: setEnvironment } = useEnvironment();
  const url = useUrlParams(KEYS);
  const requested = url.values.tab;
  const tab: ChangesTab = CHANGES_TABS.find((item) => item.key === requested)?.key ?? "pending";
  const [search, setSearch] = useDebouncedText(url.values.q, (value) => url.set({ q: value, page: null, apage: null }));
  const [selected, setSelected] = useState<FlagChange | null>(null);
  const page = Math.max(1, Number(url.values.page) || 1);
  const apage = Math.max(1, Number(url.values.apage) || 1);

  const flags = useFlagList({ environment, includeArchived: true });
  const pending = useChanges({ environment, status: ["pending_approval", "draft"], pageSize: 50 });
  const scheduled = useChanges({ environment, status: ["scheduled"], pageSize: 50 });
  const history = useChanges({ environment, flagKey: url.values.flag || undefined, type: url.values.type || undefined, actor: url.values.actor || undefined, result: url.values.status || undefined, search: url.values.q || undefined, page, pageSize: 10 });
  const activity = useActivity({ environment, flagKey: url.values.flag || undefined, type: url.values.type || undefined, actor: url.values.actor || undefined, search: url.values.q || undefined, page: apage, pageSize: 8 });

  const anyFilter = Boolean(url.values.q || url.values.flag || url.values.type || url.values.actor || url.values.status);
  const clear = () => { url.set({ q: null, flag: null, type: null, actor: null, status: null, page: null, apage: null }); setSearch(""); };
  const drop = (patch: Partial<Record<(typeof KEYS)[number], string | null>>) => url.set({ ...patch, page: null, apage: null });

  return (
    <div className="space-y-3">
      <PageHeader
        title="Changes & Activity"
        description="Requests waiting for approval, planned changes, the history of every flag change and the configuration versions behind them."
        meta={FLAGS_MOCK_MODE ? <DemoTag>Demo change records</DemoTag> : undefined}
        actions={tab === "history" && history.data && capabilities.canExportFlags ? <Button variant="outline" size="sm" onClick={() => exportChanges(history.data.rows)} disabled={history.data.rows.length === 0}><DownloadIcon />Export Changes</Button> : undefined}
      />

      <StatGrid className="grid-cols-2 sm:grid-cols-4">
        <StatCard compact label="Pending Approval" value={pending.data?.rows.filter((row) => row.status === "pending_approval").length ?? "-"} hint="Demo requests" tone="warning" href={flagRoutes.changes(environment, "pending")} />
        <StatCard compact label="Drafts" value={pending.data?.rows.filter((row) => row.status === "draft").length ?? "-"} hint="Not submitted" href={flagRoutes.changes(environment, "pending")} />
        <StatCard compact label="Scheduled" value={scheduled.data?.total ?? "-"} hint="Planned, not applied" href={flagRoutes.changes(environment, "scheduled")} />
        <StatCard compact label="Recorded Changes" value={history.data?.total ?? "-"} hint="All statuses" href={flagRoutes.changes(environment, "history")} />
      </StatGrid>

      <div className="flex flex-wrap items-center gap-1.5">
        <EnvironmentSwitch environment={environment} onChange={setEnvironment} />
        <nav aria-label="Change views" className="flex flex-wrap gap-1">
          {CHANGES_TABS.map((item) => (
            <Link key={item.key} href={flagRoutes.changes(environment, item.key)} aria-current={item.key === tab ? "page" : undefined} className={cn("rounded-sm border px-2.5 py-1 text-2xs font-medium transition-colors", item.key === tab ? "border-primary/40 bg-primary-subtle text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent")}>{item.label}</Link>
          ))}
        </nav>
      </div>

      {tab === "pending" ? (
        <>
          <AlertBanner tone="info" title="No Approval Service Is Connected">Changes that governance says need approval are recorded here as pending. They are never approved or applied automatically, and nothing on this screen simulates an approval. Cancel one to withdraw it.</AlertBanner>
          <Panel title="Pending Changes" description="Requests waiting for approval and drafts that were saved without submitting." flush>
            {pending.error && !pending.data ? <FlagsError subject="Pending Changes" error={pending.error} onRetry={() => void pending.refetch()} /> : !pending.data ? <TableSkeleton rows={4} columns={6} /> : <ChangesTable rows={pending.data.rows} onOpen={setSelected} empty={{ title: "Nothing Pending", description: "No change is waiting for approval and there are no drafts in this environment." }} />}
          </Panel>
        </>
      ) : null}

      {tab === "scheduled" ? (
        <>
          <AlertBanner tone="info" title="Planned, Not Applied">A scheduled change records when someone intends a change to happen. No scheduler runs in this frontend phase, so nothing here applies on its own.</AlertBanner>
          <Panel title="Scheduled Changes" description="Changes planned for a later time, in UTC." flush>
            {scheduled.error && !scheduled.data ? <FlagsError subject="Scheduled Changes" error={scheduled.error} onRetry={() => void scheduled.refetch()} /> : !scheduled.data ? <TableSkeleton rows={3} columns={6} /> : <ChangesTable rows={scheduled.data.rows} onOpen={setSelected} empty={{ title: "Nothing Scheduled", description: "No change is planned for a later time in this environment." }} />}
          </Panel>
        </>
      ) : null}

      {tab === "history" || tab === "versions" ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {tab === "history" ? <SearchInput value={search} onChange={setSearch} placeholder="Search feature, person or ID..." aria-label="Search changes" className="w-full sm:w-64" /> : null}
          <FilterSelect label="Feature" value={url.values.flag || undefined} options={(flags.data?.rows ?? []).map((row) => ({ value: row.flag.key, label: row.flag.name }))} onChange={(value) => drop({ flag: value })} />
          {tab === "history" ? (
            <>
              <FilterSelect label="Type" value={url.values.type || undefined} options={Object.entries(CHANGE_TYPE).map(([value, label]) => ({ value, label }))} onChange={(value) => drop({ type: value })} />
              <FilterSelect label="Status" value={url.values.status || undefined} options={Object.entries(CHANGE_STATUS).map(([value, meta]) => ({ value, label: meta.label }))} onChange={(value) => drop({ status: value })} />
              <FilterSelect label="Person" value={url.values.actor || undefined} options={(history.data?.actors ?? []).map((item) => ({ value: item, label: item }))} onChange={(value) => drop({ actor: value })} />
            </>
          ) : null}
          {anyFilter ? <Button variant="ghost" size="sm" onClick={clear}>Clear Filters</Button> : null}
        </div>
      ) : null}

      {tab === "history" ? (
        <>
          <Panel title="Change History" description="Every change recorded for this environment, newest first." flush>
            {history.error && !history.data ? <FlagsError subject="Change History" error={history.error} onRetry={() => void history.refetch()} /> : !history.data ? <TableSkeleton rows={6} columns={6} /> : (
              <>
                <ChangesTable rows={history.data.rows} onOpen={setSelected} empty={{ title: anyFilter ? "No Matching Changes" : "No Changes Yet", description: anyFilter ? "No change matches these filters." : "Changes to flags will be recorded here." }} />
                <Pager page={history.data.page} pageSize={history.data.pageSize} total={history.data.total} onPage={(next) => url.set({ page: next === 1 ? null : String(next) })} />
              </>
            )}
          </Panel>
          <Panel title="Activity Log" description="Requests, applications, cancellations and lifecycle events as they were recorded." action={activity.data && capabilities.canExportFlags ? <Button variant="outline" size="sm" onClick={() => exportActivity(activity.data.rows)} disabled={activity.data.rows.length === 0}><DownloadIcon />Export Log</Button> : undefined} flush>
            {activity.error && !activity.data ? <FlagsError subject="Activity Log" error={activity.error} onRetry={() => void activity.refetch()} /> : !activity.data ? <TableSkeleton rows={4} columns={3} /> : (
              <>
                {activity.data.rows.length === 0 ? <p className="px-3 pb-3 text-[0.8125rem] text-muted-foreground">No activity matches.</p> : (
                  <ul className="divide-y divide-border">
                    {activity.data.rows.map((item) => (
                      <li key={item.id} className="flex items-start gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.8125rem] text-foreground"><Link href={flagRoutes.flag(item.flagKey, environment)} className="font-medium hover:text-primary hover:underline">{item.flagName}</Link><span className="text-muted-foreground"> - {CHANGE_TYPE[item.type]}</span></p>
                          <p className="text-2xs text-muted-foreground">{item.summary}</p>
                        </div>
                        <div className="shrink-0 text-right"><ResultBadge result={item.result} /><p className="mt-0.5 text-2xs text-muted-foreground">{item.actor} - {ago(item.at)}</p></div>
                      </li>
                    ))}
                  </ul>
                )}
                <Pager page={activity.data.page} pageSize={activity.data.pageSize} total={activity.data.total} onPage={(next) => url.set({ apage: next === 1 ? null : String(next) })} />
              </>
            )}
          </Panel>
        </>
      ) : null}

      {tab === "versions" ? <VersionsPanel flagKey={url.values.flag || null} environment={environment} /> : null}

      <ChangeDrawer change={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
