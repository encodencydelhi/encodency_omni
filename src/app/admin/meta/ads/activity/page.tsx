"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { Activity, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { activityLog } from "@/features/admin/meta-ads/data";
import { date, dateTime, time } from "@/features/admin/meta-ads/format";
import { useFilters } from "@/features/admin/meta-ads/use-filters";
import {
  Avatar,
  btn,
  card,
  EmptyState,
  FilterBar,
  FilterSelect,
  SearchInput,
  SkeletonTable,
  TableShell,
  Tag,
  Td,
  Th,
  ToneChip,
  Tr,
} from "@/features/admin/meta-ads/components/ui";
import { AdsWorkspace } from "@/features/admin/meta-ads/components/workspace";
import type { ActivityEntry } from "@/features/admin/meta-ads/types";

const DEFAULTS = {
  q: "",
  user: "All Users",
  action: "All Actions",
  entity: "All Entity Types",
  campaign: "All Campaigns",
  range: "Last 30 days",
};

const SOURCE_TONE = {
  "Ads Manager": "blue",
  Automation: "violet",
  API: "slate",
} as const;

function ActivityView() {
  const { values, setFilter, reset, isFiltered } = useFilters(DEFAULTS);

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    return activityLog.filter((a) => {
      if (
        q &&
        ![a.action, a.entityLabel, a.user].some((f) => f.toLowerCase().includes(q))
      )
        return false;
      if (values.user !== DEFAULTS.user && a.user !== values.user) return false;
      if (values.action !== DEFAULTS.action && a.action !== values.action) return false;
      if (values.entity !== DEFAULTS.entity && a.entityType !== values.entity) return false;
      if (values.campaign !== DEFAULTS.campaign && a.campaign !== values.campaign) return false;
      return true;
    });
  }, [values]);

  /** Group by calendar day so the log reads as a timeline. */
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    for (const entry of rows) {
      const day = entry.at.slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), entry]);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const options = useMemo(
    () => ({
      users: Array.from(new Set(activityLog.map((a) => a.user))).sort(),
      actions: Array.from(new Set(activityLog.map((a) => a.action))).sort(),
      entities: Array.from(new Set(activityLog.map((a) => a.entityType))).sort(),
      campaigns: Array.from(
        new Set(activityLog.map((a) => a.campaign).filter((c): c is string => Boolean(c))),
      ),
    }),
    [],
  );

  return (
    <AdsWorkspace
      actions={
        <button
          type="button"
          onClick={() => toast.success("Audit log export queued.")}
          className={cn(btn, "h-10")}
        >
          <Download className="size-3.5" />
          Export Log
        </button>
      }
    >
      <section className={cn(card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shadow-2xs ring-1 ring-blue-500/20">
              <Activity className="size-4" aria-hidden="true" />
            </div>
            <h2 className="text-sm font-extrabold text-slate-900">Activity Log</h2>
            <span className="rounded-full bg-blue-100/80 px-2.5 py-0.5 text-[10.5px] font-black text-blue-700 ring-1 ring-blue-500/20">
              {rows.length}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Audit history across campaigns, ad sets, ads and assets
          </p>
        </div>

        <FilterBar>
          <FilterSelect
            label="User"
            value={values.user}
            onChange={(v) => setFilter("user", v)}
            options={[DEFAULTS.user, ...options.users]}
            minWidth={160}
          />
          <FilterSelect
            label="Action"
            value={values.action}
            onChange={(v) => setFilter("action", v)}
            options={[DEFAULTS.action, ...options.actions]}
            minWidth={190}
          />
          <FilterSelect
            label="Entity type"
            value={values.entity}
            onChange={(v) => setFilter("entity", v)}
            options={[DEFAULTS.entity, ...options.entities]}
            minWidth={170}
          />
          <FilterSelect
            label="Campaign"
            value={values.campaign}
            onChange={(v) => setFilter("campaign", v)}
            options={[DEFAULTS.campaign, ...options.campaigns]}
            minWidth={210}
          />
          <FilterSelect
            label="Date range"
            value={values.range}
            onChange={(v) => setFilter("range", v)}
            options={["Last 30 days", "Last 7 days", "Last 90 days", "All time"]}
            minWidth={150}
          />
          <SearchInput
            placeholder="Search the log…"
            value={values.q}
            onChange={(v) => setFilter("q", v)}
          />
          {isFiltered && (
            <button type="button" onClick={reset} className={btn}>
              Clear
            </button>
          )}
        </FilterBar>

        {rows.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activity matches these filters"
            description="Try another user, action or entity type, or clear the filters."
            compact
          />
        ) : (
          <div>
            {grouped.map(([day, entries]) => (
              <div key={day}>
                <h3 className="border-y border-[#e8edf4] bg-[#f7f9fc] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                  {date(day)}
                </h3>
                <TableShell minWidth={1120}>
                  <thead className="sr-only">
                    <tr>
                      <Th>Timestamp</Th>
                      <Th>User</Th>
                      <Th>Action</Th>
                      <Th>Entity</Th>
                      <Th>Old Value</Th>
                      <Th>New Value</Th>
                      <Th>Source</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((a) => (
                      <Tr key={a.id}>
                        <Td className="w-[92px] text-[#64748b]" >
                          <span title={dateTime(a.at)}>{time(a.at)}</span>
                        </Td>
                        <Td className="w-[150px]">
                          <span className="flex items-center gap-1.5">
                            <Avatar name={a.user} />
                            {a.user}
                          </span>
                        </Td>
                        <Td className="w-[180px] font-semibold">{a.action}</Td>
                        <Td>
                          <Link
                            href={a.entityHref}
                            className="block max-w-[230px] truncate text-[#0671e9] hover:underline"
                            title={a.entityLabel}
                          >
                            {a.entityLabel}
                          </Link>
                          <span className="block text-[9px] text-[#64748b]">{a.entityType}</span>
                        </Td>
                        <Td className="text-[#64748b]">{a.oldValue ?? "—"}</Td>
                        <Td>
                          {a.newValue ? <Tag>{a.newValue}</Tag> : <span className="text-[#64748b]">—</span>}
                        </Td>
                        <Td className="w-[120px]">
                          <ToneChip tone={SOURCE_TONE[a.source]}>{a.source}</ToneChip>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableShell>
              </div>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="border-t border-[#dde5ee] px-3 py-2.5 text-[10px] text-[#64748b]">
            Showing {rows.length} of {activityLog.length} entries · click any entity to open it
          </div>
        )}
      </section>
    </AdsWorkspace>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={8} columns={7} />}>
      <ActivityView />
    </Suspense>
  );
}
