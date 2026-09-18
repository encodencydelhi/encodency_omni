"use client";

import { useMemo, useState } from "react";
import { isToday, parseISO, subDays } from "date-fns";
import { Activity, CheckCircle2, Download, Filter, KeyRound, ShieldCheck, XCircle } from "lucide-react";
import { EVENT_LABEL } from "../integrations-data/config";
import { useClientScope, useQueryState, useScopedData } from "../integrations-data/hooks";
import { downloadFile, toCsv } from "../integrations-data/selectors";
import { useIntegrations } from "../store/integrations-store";
import type { ActivityEvent } from "../integrations-data/types";
import { ActivityTable, PageSkeleton, RunDialog } from "../components/blocks";
import { Button, Card, EmptyState, KpiTile, Pagination, SearchField, SelectMenu, useDebounced } from "../components/ui";

const DEFAULTS = { q: "", integration: "all", event: "all", result: "all", user: "all", range: "all", page: "1" };
const PAGE_SIZE = 15;

const EVENT_GROUPS: { value: string; label: string; events: ActivityEvent[] }[] = [
  { value: "sync", label: "Syncs", events: ["sync_completed", "sync_partial", "sync_failed", "sync_started"] },
  { value: "connection", label: "Connect & disconnect", events: ["connected", "disconnected"] },
  { value: "reconnect", label: "Reconnects", events: ["reconnected", "reconnect_required"] },
  { value: "permission", label: "Permission changes", events: ["permission_changed"] },
  { value: "mapping", label: "Mapping changes", events: ["mapping_changed", "primary_changed", "resource_removed"] },
  { value: "settings", label: "Settings", events: ["settings_updated"] },
  { value: "rate", label: "Rate limits", events: ["rate_limited"] },
];

export function ActivityPage() {
  const { ready } = useIntegrations();
  if (!ready) return <PageSkeleton variant="table" />;
  return <ActivityView />;
}

function ActivityView() {
  const { data } = useIntegrations();
  const { label } = useClientScope();
  const { activity, connections } = useScopedData();
  const { values, set, reset } = useQueryState(useMemo(() => DEFAULTS, []));
  const { value: search } = useDebounced(values.q, 200);
  const [runId, setRunId] = useState<string | null>(null);

  const today = activity.filter((item) => isToday(parseISO(item.at)));
  const kpi = {
    events: today.length,
    success: activity.filter((item) => item.event === "sync_completed").length,
    failed: activity.filter((item) => item.event === "sync_failed").length,
    reconnects: activity.filter((item) => item.event === "reconnected" || item.event === "reconnect_required").length,
    permissions: activity.filter((item) => item.event === "permission_changed").length,
  };

  const users = [...new Set(activity.map((item) => item.actor))].sort();
  const providers = [...new Set(connections.map((connection) => connection.providerId))];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const cutoff = values.range === "all" ? null : subDays(new Date(), Number(values.range));
    const group = EVENT_GROUPS.find((item) => item.value === values.event);
    return activity
      .filter((item) => values.integration === "all" || item.providerId === values.integration)
      .filter((item) => !group || group.events.includes(item.event))
      .filter((item) => values.result === "all" || item.result === values.result)
      .filter((item) => values.user === "all" || item.actor === values.user)
      .filter((item) => !cutoff || parseISO(item.at) >= cutoff)
      .filter((item) => !needle || `${item.summary} ${EVENT_LABEL[item.event]} ${item.actor}`.toLowerCase().includes(needle))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [activity, search, values]);

  const page = Math.max(1, Number(values.page) || 1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeFilters = ["integration", "event", "result", "user", "range"].filter((key) => values[key as keyof typeof values] !== "all").length + (values.q ? 1 : 0);

  const exportCsv = () =>
    downloadFile(
      `integration-activity-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        filtered.map((item) => ({
          time: item.at,
          integration: data.providers.find((provider) => provider.id === item.providerId)?.name ?? "Workspace",
          event: EVENT_LABEL[item.event],
          summary: item.summary,
          client: data.clients.find((client) => client.id === item.clientId)?.name ?? "Organization-wide",
          result: item.result,
          user: item.actor,
        })),
      ),
      "text/csv;charset=utf-8",
    );

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile label="Events today" value={kpi.events} detail={label} icon={Activity} tone="blue" onClick={() => set({ range: "1", event: "all", result: "all", page: "1" })} active={values.range === "1"} />
        <KpiTile label="Successful syncs" value={kpi.success} icon={CheckCircle2} tone="green" onClick={() => set({ event: "sync", result: "success", page: "1" })} active={values.event === "sync" && values.result === "success"} />
        <KpiTile label="Failed syncs" value={kpi.failed} icon={XCircle} tone={kpi.failed ? "red" : "neutral"} onClick={() => set({ event: "sync", result: "failed", page: "1" })} active={values.event === "sync" && values.result === "failed"} />
        <KpiTile label="Reconnect events" value={kpi.reconnects} icon={KeyRound} tone="amber" onClick={() => set({ event: "reconnect", result: "all", page: "1" })} active={values.event === "reconnect"} />
        <KpiTile label="Permission changes" value={kpi.permissions} icon={ShieldCheck} tone="violet" onClick={() => set({ event: "permission", result: "all", page: "1" })} active={values.event === "permission"} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#EEF1F5] px-3 py-2.5">
          <SearchField value={values.q} onChange={(value) => set({ q: value, page: "1" })} placeholder="Search activity" className="min-w-[180px] flex-1 lg:max-w-[240px]" />
          <SelectMenu label="Integration" prefix="Integration:" value={values.integration} onChange={(value) => set({ integration: value, page: "1" })} options={[{ value: "all", label: "All" }, ...providers.map((id) => ({ value: id, label: data.providers.find((provider) => provider.id === id)?.name ?? id }))]} />
          <SelectMenu label="Event" prefix="Event:" value={values.event} onChange={(value) => set({ event: value, page: "1" })} options={[{ value: "all", label: "All events" }, ...EVENT_GROUPS.map((group) => ({ value: group.value, label: group.label }))]} />
          <SelectMenu
            label="Result"
            prefix="Result:"
            value={values.result}
            onChange={(value) => set({ result: value, page: "1" })}
            options={[
              { value: "all", label: "Any" },
              { value: "success", label: "Success" },
              { value: "warning", label: "Warning" },
              { value: "failed", label: "Failed" },
              { value: "info", label: "Info" },
            ]}
          />
          <SelectMenu label="User" prefix="User:" value={values.user} onChange={(value) => set({ user: value, page: "1" })} options={[{ value: "all", label: "Anyone" }, ...users.map((user) => ({ value: user, label: user }))]} />
          <SelectMenu
            label="Date"
            prefix="Date:"
            value={values.range}
            onChange={(value) => set({ range: value, page: "1" })}
            options={[
              { value: "all", label: "All time" },
              { value: "1", label: "Last 24 hours" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
            ]}
          />
          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" icon={Filter} onClick={() => reset(["client"])}>
              Clear ({activeFilters})
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={Download} className="ml-auto" disabled={!filtered.length} disabledReason="Nothing to export." onClick={exportCsv}>
            Export
          </Button>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={activity.length ? "No activity matches these filters" : "No activity"}
            description={activity.length ? "Try a wider date range or clear the filters." : "Syncs, reconnects and connection changes will appear here as they happen."}
            action={activity.length ? <Button variant="primary" onClick={() => reset(["client"])}>Clear filters</Button> : undefined}
          />
        ) : (
          <>
            <ActivityTable items={rows} onOpenRun={setRunId} />
            <div className="border-t border-[#EEF1F5]">
              <Pagination page={safePage} pageCount={pageCount} total={filtered.length} pageSize={PAGE_SIZE} noun="events" onPage={(next) => set({ page: String(next) })} />
            </div>
          </>
        )}
      </Card>

      <RunDialog runId={runId} onOpenChange={(open) => !open && setRunId(null)} />
    </div>
  );
}
