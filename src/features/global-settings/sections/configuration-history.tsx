"use client";

import { ArrowRightIcon, ClockIcon, GitCompareArrowsIcon, HistoryIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/config/routes";
import { AlertBanner } from "@/components/shared/alert-banner";
import { KeyValue, Panel } from "@/features/companies/components/primitives";
import { TableSkeleton } from "@/features/companies/components/states";
import { useDebouncedText, useUrlParams } from "@/features/companies/hooks/use-url-params";
import { MiniTable } from "@/features/plans-subscriptions/components/mini-table";
import { formatDateTime } from "@/lib/utils/format";
import { HISTORY_VIEWS, SCOPE_LABEL, SECTIONS, SECTION_BY_KEY, TIMING_LABEL, type HistoryView } from "../data/config";
import { formatKeyedValue, relativeLabel } from "../data/formatting";
import {
  describeError,
  useChange,
  useChanges,
  useConfiguration,
  useGlobalSettingsCapabilities,
  usePendingChanges,
  useSettingsMutations,
  useVersionComparison,
  useVersions,
} from "../data/hooks";
import { getDefinition } from "../data/registry";
import type { ConfigurationChange, ConfigurationVersion, VersionComparison } from "../data/types";
import { ResultBadge, ScopeBadge, SensitivityBadge, VersionBadge } from "../components/badges";
import { SubTabs, useTab } from "../components/section-parts";
import { SettingsError } from "../components/states";

const TABS = HISTORY_VIEWS.map((view) => ({ key: view.key, label: view.label }));
const RANGES = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
];
const TYPES = [
  { value: "update", label: "Setting Update" },
  { value: "asset", label: "Branding Asset" },
  { value: "reference", label: "Legal Reference" },
];
const RESULTS = [
  { value: "applied", label: "Applied" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "scheduled", label: "Planned" },
  { value: "withdrawn", label: "Withdrawn" },
];

const truncated = (text: string, max = 34) => (text.length > max ? `${text.slice(0, max - 1)}...` : text);

/* ------------------------------------------------------------------ */
/* Change detail                                                       */
/* ------------------------------------------------------------------ */

function ChangeDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const query = useChange(id);
  const change = query.data;
  const definition = change ? getDefinition(change.key) : undefined;
  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{change?.settingName ?? "Configuration Change"}</SheetTitle>
          <SheetDescription>{change ? `${SECTION_BY_KEY[change.section].label} - ${change.id}` : "Loading the change..."}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {query.error && !change ? (
            <SettingsError subject="Change" error={query.error} onRetry={() => void query.refetch()} />
          ) : !change ? (
            <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" role="status"><Loader2Icon className="size-4 animate-spin" />Loading...</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1"><ResultBadge result={change.result} /><ScopeBadge scope={change.scope} />{change.sensitivity !== "low" ? <SensitivityBadge sensitivity={change.sensitivity} /> : null}</div>
              <div className="space-y-1.5 rounded-sm border border-border p-3">
                <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Previous Value</p>
                <p className="break-words text-[0.8125rem] text-foreground">{formatKeyedValue(change.key, change.previous)}</p>
                <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground"><ArrowRightIcon className="size-3" aria-hidden />New Value</p>
                <p className="break-words text-[0.8125rem] font-medium text-foreground">{formatKeyedValue(change.key, change.next)}</p>
              </div>
              <dl className="divide-y divide-border">
                <KeyValue label="Change ID"><code className="text-[11px]">{change.id}</code></KeyValue>
                <KeyValue label="Actor">{change.actorName}</KeyValue>
                <KeyValue label="Timestamp">{formatDateTime(change.at)}</KeyValue>
                <KeyValue label="Category">{SECTION_BY_KEY[change.section].label}</KeyValue>
                <KeyValue label="Setting key"><code className="break-all text-[11px]">{change.key}</code></KeyValue>
                <KeyValue label="Affected scope">{SCOPE_LABEL[change.scope].label}</KeyValue>
                <KeyValue label="Takes effect">{change.effectiveAt ? formatDateTime(change.effectiveAt) : "On Approval"}{definition && change.result === "applied" ? <span className="block text-2xs text-muted-foreground">{TIMING_LABEL[definition.timing].label}</span> : null}</KeyValue>
                <KeyValue label="Reason">{change.reason || <span className="text-muted-foreground">Not Required</span>}</KeyValue>
                <KeyValue label="Approval">{change.approvalNote}</KeyValue>
                <KeyValue label="Audit event">
                  {change.auditRef ? <Link href={ROUTES.superAdmin.auditLogs} className="font-medium text-primary hover:underline">{change.auditRef}</Link> : <span className="text-muted-foreground">Written by the backend once connected</span>}
                </KeyValue>
              </dl>
              <p className="text-2xs text-muted-foreground">{change.demo ? "Recorded in the demo configuration only. No real account or service was changed. " : ""}Secrets, keys and image data are never stored in history.</p>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Change history                                                      */
/* ------------------------------------------------------------------ */

const KEYS = ["hq", "hsec", "hactor", "hrange", "htype", "hres", "hpage", "open"] as const;

function ChangeHistory() {
  const url = useUrlParams(KEYS);
  const [search, setSearch] = useDebouncedText(url.values.hq, (value) => url.set({ hq: value, hpage: null }));
  const page = Math.max(1, Number(url.values.hpage) || 1);
  const query = useChanges({ search: url.values.hq || undefined, section: url.values.hsec || undefined, actor: url.values.hactor || undefined, range: url.values.hrange || undefined, changeType: url.values.htype || undefined, result: url.values.hres || undefined, page, pageSize: 10 });
  const filtered = ["hq", "hsec", "hactor", "hrange", "htype", "hres"].some((key) => url.values[key as (typeof KEYS)[number]]);
  const clear = () => { url.set({ hq: null, hsec: null, hactor: null, hrange: null, htype: null, hres: null, hpage: null }); setSearch(""); };
  const data = query.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search setting, actor or reason..." aria-label="Search history" className="w-full sm:w-64" />
        <FilterSelect label="Category" value={url.values.hsec || undefined} options={SECTIONS.filter((item) => item.key !== "history").map((item) => ({ value: item.key, label: item.label }))} onChange={(value) => url.set({ hsec: value, hpage: null })} />
        <FilterSelect label="Actor" value={url.values.hactor || undefined} options={(data?.actors ?? []).map((actor) => ({ value: actor.id, label: actor.name }))} onChange={(value) => url.set({ hactor: value, hpage: null })} />
        <FilterSelect label="Date" value={url.values.hrange || undefined} options={RANGES} onChange={(value) => url.set({ hrange: value, hpage: null })} />
        <FilterSelect label="Type" value={url.values.htype || undefined} options={TYPES} onChange={(value) => url.set({ htype: value, hpage: null })} />
        <FilterSelect label="Result" value={url.values.hres || undefined} options={RESULTS} onChange={(value) => url.set({ hres: value, hpage: null })} />
        {filtered ? <Button variant="ghost" size="sm" onClick={clear}>Clear Filters</Button> : null}
      </div>

      {query.error && !data ? (
        <SettingsError subject="History" error={query.error} onRetry={() => void query.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={8} columns={7} />
      ) : (
        <Panel flush>
          <MiniTable
            caption="Configuration change history"
            rows={data.rows}
            getKey={(row) => row.id}
            onRowClick={(row) => url.set({ open: row.id })}
            empty={<EmptyState icon={HistoryIcon} title={filtered ? "No Changes Match These Filters" : "No Configuration Changes Yet"} description={filtered ? "Try a wider date range or fewer filters." : "Changes appear here when a section is saved."} action={filtered ? <Button variant="outline" onClick={clear}>Clear Filters</Button> : undefined} />}
            columns={[
              { id: "at", header: "Timestamp", cell: (row) => <span className="whitespace-nowrap text-2xs tabular">{formatDateTime(row.at)}</span> },
              { id: "actor", header: "Actor", hideBelow: "md", cell: (row) => <span className="text-2xs">{row.actorName}</span> },
              { id: "category", header: "Category", hideBelow: "lg", cell: (row) => <span className="text-2xs text-muted-foreground">{SECTION_BY_KEY[row.section].label}</span> },
              { id: "setting", header: "Setting", cell: (row) => <span className="font-medium text-foreground">{row.settingName}</span> },
              { id: "prev", header: "Previous", hideBelow: "md", cell: (row) => <span className="text-2xs text-muted-foreground" title={formatKeyedValue(row.key, row.previous)}>{truncated(formatKeyedValue(row.key, row.previous))}</span> },
              { id: "next", header: "New", cell: (row) => <span className="text-2xs" title={formatKeyedValue(row.key, row.next)}>{truncated(formatKeyedValue(row.key, row.next))}</span> },
              { id: "result", header: "Result", cell: (row) => <ResultBadge result={row.result} /> },
              { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (row) => <Button variant="ghost" size="sm" onClick={(event) => { event.stopPropagation(); url.set({ open: row.id }); }}>Details</Button> },
            ]}
          />
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-2xs text-muted-foreground">
            <span>{data.total} change{data.total === 1 ? "" : "s"}</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => url.set({ hpage: String(page - 1) })}>Previous</Button>
              <span className="tabular">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => url.set({ hpage: String(page + 1) })}>Next</Button>
            </div>
          </div>
        </Panel>
      )}
      <p className="text-2xs text-muted-foreground">This is configuration history only. For platform-wide investigation see <Link href={ROUTES.superAdmin.auditLogs} className="font-medium text-primary hover:underline">Audit Logs</Link>.</p>
      <ChangeDrawer id={url.values.open || null} onClose={() => url.set({ open: null })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pending changes                                                     */
/* ------------------------------------------------------------------ */

function WithdrawDialog({ change, onClose }: { change: ConfigurationChange; onClose: () => void }) {
  const mutations = useSettingsMutations();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw this change?</DialogTitle>
          <DialogDescription>{change.settingName}: {formatKeyedValue(change.key, change.previous)} to {formatKeyedValue(change.key, change.next)}. Withdrawing removes it from the pending list; the effective configuration is untouched.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="withdraw-reason" className="text-[0.8125rem]">Reason<span className="ml-0.5 text-danger" aria-hidden>*</span></Label>
          <Textarea id="withdraw-reason" rows={2} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(error) || undefined} />
          {error ? <p role="alert" className="text-2xs text-danger">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Keep Pending</Button>
          <Button
            variant="destructive"
            disabled={busy || !reason.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await mutations.withdrawPending(change.id, reason);
                onClose();
              } catch (failure) {
                setError(describeError(failure).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? <Loader2Icon className="animate-spin" /> : null}
            Withdraw Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingChanges() {
  const pending = usePendingChanges();
  const config = useConfiguration();
  const capabilities = useGlobalSettingsCapabilities();
  const [details, setDetails] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<ConfigurationChange | null>(null);

  if (pending.error && !pending.data) return <SettingsError subject="Pending changes" error={pending.error} onRetry={() => void pending.refetch()} />;
  if (!pending.data) return <TableSkeleton rows={4} columns={7} />;

  return (
    <div className="space-y-2">
      <AlertBanner tone="info" title="Demo Drafts and Planned Records">
        Nothing here is part of the effective configuration. No approval workflow or scheduler runs in this frontend phase, so these stay pending until they are withdrawn.
      </AlertBanner>
      <Panel flush>
        <MiniTable
          caption="Pending and planned changes"
          rows={pending.data}
          getKey={(row) => row.id}
          empty={<EmptyState icon={ClockIcon} title="No Pending Changes" description="Security-critical changes and planned records wait here." />}
          columns={[
            { id: "setting", header: "Setting", cell: (row) => (<div><p className="font-medium text-foreground">{row.settingName}</p><p className="text-2xs text-muted-foreground">{SECTION_BY_KEY[row.section].label}</p></div>) },
            { id: "current", header: "Current", hideBelow: "md", cell: (row) => <span className="text-2xs text-muted-foreground">{truncated(formatKeyedValue(row.key, config.data?.values[row.key]))}</span> },
            { id: "proposed", header: "Proposed", cell: (row) => <span className="text-2xs font-medium">{truncated(formatKeyedValue(row.key, row.next))}</span> },
            { id: "scope", header: "Scope", hideBelow: "lg", cell: (row) => <ScopeBadge scope={row.scope} /> },
            { id: "effective", header: "Effective", hideBelow: "md", cell: (row) => <span className="whitespace-nowrap text-2xs">{row.effectiveAt ? formatDateTime(row.effectiveAt) : "On Approval"}</span> },
            { id: "by", header: "Requested by", hideBelow: "lg", cell: (row) => (<div><p className="text-2xs">{row.actorName}</p><p className="text-2xs text-muted-foreground">{relativeLabel(row.at)}</p></div>) },
            { id: "status", header: "Status", cell: (row) => <ResultBadge result={row.result} /> },
            {
              id: "actions",
              header: <span className="sr-only">Actions</span>,
              align: "right",
              cell: (row) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setDetails(row.id)}>Details</Button>
                  {capabilities.canWithdrawPendingChanges ? <Button variant="ghost" size="sm" onClick={() => setWithdrawing(row)}>Withdraw</Button> : null}
                </div>
              ),
            },
          ]}
        />
      </Panel>
      <p className="text-2xs text-muted-foreground">{pending.data[0] ? pending.data[0].approvalNote : ""}</p>
      <ChangeDrawer id={details} onClose={() => setDetails(null)} />
      {withdrawing ? <WithdrawDialog change={withdrawing} onClose={() => setWithdrawing(null)} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Versions                                                            */
/* ------------------------------------------------------------------ */

const DIRECTION_TONE = { stricter: "success", weaker: "warning", neutral: "neutral" } as const;

function ComparisonTable({ comparison }: { comparison: VersionComparison }) {
  return (
    <MiniTable
      caption={`Changes from ${comparison.from.label} to ${comparison.to.label}`}
      rows={comparison.rows}
      getKey={(row) => row.key}
      empty={<p className="px-3 py-6 text-center text-[0.8125rem] text-muted-foreground">No settings differ between these versions.</p>}
      columns={[
        { id: "setting", header: "Setting", cell: (row) => (<div><p className="font-medium text-foreground">{row.name}</p><p className="text-2xs text-muted-foreground">{SECTION_BY_KEY[row.section].label}</p></div>) },
        { id: "prev", header: comparison.from.label, cell: (row) => <span className="text-2xs text-muted-foreground line-through decoration-muted-foreground/40">{truncated(row.previousText, 40)}</span> },
        { id: "next", header: comparison.to.label, cell: (row) => <span className="text-2xs font-medium text-foreground">{truncated(row.nextText, 40)}</span> },
        { id: "dir", header: "Direction", hideBelow: "md", cell: (row) => (row.direction === "neutral" ? <span className="text-2xs text-muted-foreground">-</span> : <Badge tone={DIRECTION_TONE[row.direction]}>{row.direction === "stricter" ? "Stricter" : "Weaker"}</Badge>) },
        { id: "impact", header: "Scope and Impact", hideBelow: "lg", cell: (row) => <span className="text-2xs text-muted-foreground">{row.impact}</span> },
      ]}
    />
  );
}

function VersionDrawer({ version, previous, onClose }: { version: ConfigurationVersion | null; previous: ConfigurationVersion | null; onClose: () => void }) {
  const comparison = useVersionComparison(previous?.id ?? null, version?.id ?? null);
  return (
    <Sheet open={Boolean(version)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Configuration {version?.label}</SheetTitle>
          <SheetDescription>{version?.summary}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {version ? (
            <div className="space-y-3">
              <dl className="divide-y divide-border">
                <KeyValue label="Status"><VersionBadge status={version.status} /></KeyValue>
                <KeyValue label="Created by">{version.createdBy}</KeyValue>
                <KeyValue label="Created">{formatDateTime(version.createdAt)}</KeyValue>
                <KeyValue label="Effective">{formatDateTime(version.effectiveAt)}</KeyValue>
                <KeyValue label="Categories">{version.sections.length ? version.sections.map((section) => SECTION_BY_KEY[section].label).join(", ") : "Baseline"}</KeyValue>
              </dl>
              <div>
                <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{previous ? `Changes from ${previous.label}` : "Baseline Version"}</p>
                {!previous ? (
                  <p className="text-[0.8125rem] text-muted-foreground">This is the first recorded configuration.</p>
                ) : comparison.error && !comparison.data ? (
                  <SettingsError subject="Comparison" error={comparison.error} onRetry={() => void comparison.refetch()} />
                ) : !comparison.data ? (
                  <TableSkeleton rows={3} columns={3} />
                ) : (
                  <div className="rounded-sm border border-border"><ComparisonTable comparison={comparison.data} /></div>
                )}
              </div>
            </div>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Versions() {
  const versions = useVersions();
  const url = useUrlParams(["vfrom", "vto", "vopen"] as const);
  const list = versions.data ?? [];
  const to = url.values.vto || list[0]?.id || null;
  const from = url.values.vfrom || list[1]?.id || null;
  const comparison = useVersionComparison(from, to);
  const opened = list.find((item) => item.id === url.values.vopen) ?? null;
  const previousOf = (version: ConfigurationVersion | null) => (version ? (list.find((item) => item.number === version.number - 1) ?? null) : null);

  if (versions.error && !versions.data) return <SettingsError subject="Versions" error={versions.error} onRetry={() => void versions.refetch()} />;
  if (!versions.data) return <TableSkeleton rows={6} columns={6} />;

  const picker = (id: string, label: string, value: string | null, key: "vfrom" | "vto") => (
    <div className="min-w-[10rem] space-y-1">
      <Label htmlFor={id} className="text-2xs">{label}</Label>
      <Select value={value ?? undefined} onValueChange={(next) => url.set({ [key]: next })}>
        <SelectTrigger id={id} size="sm"><SelectValue placeholder="Choose a version" /></SelectTrigger>
        <SelectContent>{list.map((item) => <SelectItem key={item.id} value={item.id}>{item.label} - {formatDateTime(item.createdAt)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-3">
      <Panel flush>
        <MiniTable
          caption="Configuration versions"
          rows={list}
          getKey={(row) => row.id}
          columns={[
            { id: "version", header: "Version", cell: (row) => <span className="font-semibold tabular text-foreground">{row.label}</span> },
            { id: "by", header: "Created by", hideBelow: "md", cell: (row) => <span className="text-2xs">{row.createdBy}</span> },
            { id: "at", header: "Created", cell: (row) => <span className="whitespace-nowrap text-2xs tabular">{formatDateTime(row.createdAt)}</span> },
            { id: "sections", header: "Categories", hideBelow: "lg", cell: (row) => <span className="text-2xs text-muted-foreground">{row.sections.length ? row.sections.map((section) => SECTION_BY_KEY[section].label).join(", ") : "Baseline"}</span> },
            { id: "summary", header: "Summary", hideBelow: "md", cell: (row) => <span className="line-clamp-2 max-w-xs text-2xs text-muted-foreground">{row.summary}</span> },
            { id: "status", header: "Status", cell: (row) => <VersionBadge status={row.status} /> },
            {
              id: "actions",
              header: <span className="sr-only">Actions</span>,
              align: "right",
              cell: (row) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => url.set({ vopen: row.id })}>View</Button>
                  {previousOf(row) ? <Button variant="ghost" size="sm" onClick={() => url.set({ vfrom: previousOf(row)?.id ?? null, vto: row.id })}><GitCompareArrowsIcon />Compare</Button> : null}
                </div>
              ),
            },
          ]}
        />
        <p className="border-t border-border px-3 py-2 text-2xs text-muted-foreground">Draft versions are not supported in this phase; a change is either applied as a new version or held as a pending change.</p>
      </Panel>

      <Panel title="Compare Versions" description="A side-by-side view of what differs. Nothing is changed by comparing.">
        <div className="mb-2 flex flex-wrap items-end gap-2">
          {picker("compare-from", "From", from, "vfrom")}
          <ArrowRightIcon className="mb-2.5 size-4 text-muted-foreground" aria-hidden />
          {picker("compare-to", "To", to, "vto")}
        </div>
        {comparison.error && !comparison.data ? (
          <SettingsError subject="Comparison" error={comparison.error} onRetry={() => void comparison.refetch()} />
        ) : !comparison.data ? (
          <TableSkeleton rows={3} columns={4} />
        ) : (
          <div className="rounded-sm border border-border"><ComparisonTable comparison={comparison.data} /></div>
        )}
        <p className="mt-2 text-2xs text-muted-foreground">Reverting to an earlier version is not a one-click action. An earlier value may no longer be valid under current policy, so it needs its own validation, impact review, authorisation and audit. Preparing a reversion draft is not available in this version.</p>
      </Panel>
      <VersionDrawer version={opened} previous={previousOf(opened)} onClose={() => url.set({ vopen: null })} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function ConfigurationHistorySection() {
  const view = useTab<HistoryView>(TABS);
  const config = useConfiguration();
  const capabilities = useGlobalSettingsCapabilities();

  if (!capabilities.canViewConfigurationHistory) {
    return <SettingsError subject="Configuration history" error={new Error("You do not have access to configuration history.")} />;
  }
  return (
    <div className="space-y-3">
      <SubTabs
        tabs={TABS.map((tab) => (tab.key === "pending" && config.data?.pendingCount ? { ...tab, label: `${tab.label} (${config.data.pendingCount})` } : tab))}
        current={view}
        label="Configuration history"
      />
      {view === "changes" ? <ChangeHistory /> : view === "pending" ? <PendingChanges /> : <Versions />}
    </div>
  );
}
