"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { AlertOctagon, AlertTriangle, ArrowUpRight, CheckCircle2, Plug, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LIVE, useAdsData } from "@/features/admin/meta-ads/data-source";
import { dateTime, relative } from "@/features/admin/meta-ads/format";
import { useFilters, usePagination } from "@/features/admin/meta-ads/use-filters";
import {
  btn,
  btnPrimary,
  card,
  EmptyState,
  FilterBar,
  FilterSelect,
  KpiCard,
  LinkTabs,
  PagedFooter,
  SearchInput,
  SkeletonKpis,
  SkeletonTable,
  ToneChip,
} from "@/features/admin/meta-ads/components/ui";
import { ADS_ROOT, AdsWorkspace } from "@/features/admin/meta-ads/components/workspace";
import type { Issue } from "@/features/admin/meta-ads/types";
import type { StatusTone } from "@/features/admin/meta-ads/format";
import { DetailDialog, KeyValue } from "@/features/admin/meta/ui";

const ALL_KINDS = "All types";
const ALL_CAMPAIGNS = "All Campaigns";
const SORTS = ["Most urgent first", "Newest first", "Oldest first"] as const;

const DEFAULTS = {
  q: "",
  tab: "all",
  kind: ALL_KINDS,
  campaign: ALL_CAMPAIGNS,
  sort: SORTS[0] as string,
  issue: "",
};

const SEVERITY: Record<Issue["severity"], { label: string; tone: StatusTone; icon: typeof AlertTriangle; rank: number }> = {
  blocking: { label: "Blocking", tone: "red", icon: AlertOctagon, rank: 0 },
  policy: { label: "Policy", tone: "violet", icon: ShieldAlert, rank: 1 },
  connection: { label: "Connection", tone: "red", icon: Plug, rank: 2 },
  warning: { label: "Warning", tone: "amber", icon: AlertTriangle, rank: 3 },
};

const ICON_BOX: Record<Issue["severity"], string> = {
  blocking: "bg-[#fef3f2] text-[#b42318]",
  policy: "bg-[#f7f3ff] text-[#6d28d9]",
  connection: "bg-[#fef3f2] text-[#b42318]",
  warning: "bg-[#fffaeb] text-[#b45309]",
};

function IssuesView() {
  const { issues, accounts, accountId, syncedAt, refresh } = useAdsData();
  const { values, setFilter, reset, isFiltered } = useFilters(DEFAULTS);

  // Live data has no history of fixed problems, so a "Resolved" tab would always be empty: only demo data shows it.
  const tabs = useMemo(
    () => [
      { id: "all", label: "All open" },
      { id: "blocking", label: "Blocking" },
      { id: "policy", label: "Policy / Review" },
      { id: "connection", label: "Connections" },
      { id: "warning", label: "Warnings" },
      ...(LIVE ? [] : [{ id: "resolved", label: "Resolved" }]),
    ],
    [],
  );

  const open = useMemo(() => issues.filter((issue) => !issue.resolved), [issues]);
  const counts = {
    blocking: open.filter((i) => i.severity === "blocking").length,
    warning: open.filter((i) => i.severity === "warning").length,
    connection: open.filter((i) => i.severity === "connection").length,
    policy: open.filter((i) => i.severity === "policy").length,
  };

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    const list = issues.filter((i) => {
      if (q && ![i.title, i.detail, i.entityLabel, i.campaign ?? "", ...(i.reasons ?? []).map((r) => r.summary)].some((f) => f.toLowerCase().includes(q))) return false;
      if (values.tab === "resolved") {
        if (!i.resolved) return false;
      } else if (i.resolved) return false;
      else if (values.tab !== "all" && i.severity !== values.tab) return false;
      if (values.kind !== ALL_KINDS && (i.kind ?? "Other") !== values.kind) return false;
      if (values.campaign !== ALL_CAMPAIGNS && i.campaign !== values.campaign) return false;
      return true;
    });
    const time = (i: Issue) => Date.parse(i.detected) || 0;
    if (values.sort === "Newest first") list.sort((a, b) => time(b) - time(a));
    else if (values.sort === "Oldest first") list.sort((a, b) => time(a) - time(b));
    else list.sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank || time(b) - time(a));
    return list;
  }, [values, issues]);
  const paged = usePagination(rows, 8);

  const kindOptions = useMemo(() => [ALL_KINDS, ...Array.from(new Set(issues.map((i) => i.kind ?? "Other")))], [issues]);
  const campaignOptions = useMemo(() => [ALL_CAMPAIGNS, ...Array.from(new Set(issues.map((i) => i.campaign).filter((c): c is string => Boolean(c))))], [issues]);

  const selected = values.issue ? issues.find((i) => i.id === values.issue) ?? null : null;
  const accountName = accounts.find((a) => a.id === accountId)?.name;

  return (
    <AdsWorkspace>
      <section className="mb-1 grid grid-cols-2 gap-1 md:grid-cols-4">
        <KpiCard label="Blocking Issues" value={counts.blocking} icon={AlertOctagon} tone={counts.blocking > 0 ? "red" : "green"} sub="Stop ads from delivering" />
        <KpiCard label="Policy / Review" value={counts.policy} icon={ShieldAlert} tone={counts.policy > 0 ? "violet" : "green"} sub="Rejected or under review" />
        <KpiCard label="Connection Issues" value={counts.connection} icon={Plug} tone={counts.connection > 0 ? "red" : "green"} sub="Permissions and data sources" />
        <KpiCard label="Warnings" value={counts.warning} icon={AlertTriangle} tone={counts.warning > 0 ? "amber" : "green"} sub="Worth fixing, not blocking" />
      </section>

      <section className={cn(card, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-1">
          <LinkTabs
            tabs={tabs.map((t) => ({
              ...t,
              href: t.id === "all" ? `${ADS_ROOT}/issues` : `${ADS_ROOT}/issues?tab=${t.id}`,
              count: t.id === "all" ? open.length : t.id === "resolved" ? issues.filter((i) => i.resolved).length : open.filter((i) => i.severity === t.id).length,
            }))}
            current={values.tab}
            className="border-b-0"
          />
          {LIVE && (
            <span className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
              {accountName ? `${accountName} · ` : ""}checked {syncedAt ? relative(syncedAt) : "just now"}
              <button type="button" onClick={refresh} className={cn(btn, "h-7 px-2.5")}>
                Re-check
              </button>
            </span>
          )}
        </div>

        <FilterBar>
          <FilterSelect label="Type" value={values.kind} onChange={(v) => setFilter("kind", v)} options={kindOptions} minWidth={150} />
          <FilterSelect label="Campaign" value={values.campaign} onChange={(v) => setFilter("campaign", v)} options={campaignOptions} minWidth={220} />
          <FilterSelect label="Sort" value={values.sort} onChange={(v) => setFilter("sort", v)} options={[...SORTS]} minWidth={170} />
          <SearchInput placeholder="Search issues…" value={values.q} onChange={(v) => setFilter("q", v)} />
          {isFiltered && (
            <button type="button" onClick={reset} className={btn}>
              Clear
            </button>
          )}
        </FilterBar>

        {rows.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={values.tab === "resolved" ? "Nothing resolved yet" : isFiltered ? "No issues match these filters" : "No issues — everything is running"}
            description={
              values.tab === "resolved"
                ? "Issues you fix will be listed here with the date they were cleared."
                : isFiltered
                  ? "Try another tab, type or campaign, or clear the filters."
                  : LIVE
                    ? "Meta reports no delivery, review, account, audience, pixel or connection problems for this ad account right now."
                    : "Your campaigns, ad sets, ads and connections have no open problems right now."
            }
            secondary={{ label: "Go to Ads Manager", href: ADS_ROOT }}
            compact={isFiltered || values.tab === "resolved"}
          />
        ) : (
          <ul className="divide-y divide-[#eef2f7]">
            {paged.visible.map((issue) => {
              const severity = SEVERITY[issue.severity];
              const Icon = severity.icon;
              const reason = issue.reasons?.[0];
              return (
                <li key={issue.id} className="flex flex-wrap items-start gap-3 p-3.5">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-sm", issue.resolved ? "bg-[#eefaf3] text-[#087a50]" : ICON_BOX[issue.severity])}>
                    {issue.resolved ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
                  </span>

                  <div className="min-w-[260px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => setFilter("issue", issue.id)} className="text-left text-[12.5px] font-semibold text-slate-900 hover:text-blue-700 hover:underline">
                        {issue.title}
                      </button>
                      <ToneChip tone={issue.resolved ? "green" : severity.tone}>{issue.resolved ? "Resolved" : severity.label}</ToneChip>
                      {issue.kind && <ToneChip tone="slate">{issue.kind}</ToneChip>}
                      {issue.statusLabel && <span className="text-[10.5px] font-semibold text-slate-500">Meta status: {issue.statusLabel}</span>}
                    </div>
                    <p className="mt-1 max-w-[760px] text-[11.5px] font-medium leading-relaxed text-slate-600">{issue.detail}</p>
                    {reason && reason.summary !== issue.detail && (
                      <p className="mt-1 max-w-[760px] rounded-sm border-l-2 border-rose-300 bg-rose-50/50 px-2 py-1 text-[11px] font-medium text-rose-900">
                        {reason.summary}
                        {reason.message ? ` — ${reason.message}` : ""}
                        {(issue.reasons?.length ?? 0) > 1 ? ` (+${(issue.reasons?.length ?? 1) - 1} more)` : ""}
                      </p>
                    )}
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-medium text-slate-500">
                      <span>
                        Affected:{" "}
                        <Link href={issue.entityHref} className="font-semibold text-[#0671e9] hover:underline">
                          {issue.entityLabel}
                        </Link>
                      </span>
                      {issue.campaign && issue.campaign !== issue.entityLabel && (
                        <span>
                          Campaign:{" "}
                          <Link href={`${ADS_ROOT}/campaigns?q=${encodeURIComponent(issue.campaign)}`} className="font-semibold text-[#0671e9] hover:underline">
                            {issue.campaign}
                          </Link>
                        </span>
                      )}
                      <span title={dateTime(issue.detected)}>Detected {relative(issue.detected)}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <button type="button" onClick={() => setFilter("issue", issue.id)} className={btn}>
                      Details
                    </button>
                    {issue.externalHref && (
                      <a href={issue.externalHref} target="_blank" rel="noopener noreferrer" className={btn}>
                        Fix in Meta
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    )}
                    {!issue.resolved && (
                      <Link href={issue.actionHref} className={btnPrimary}>
                        {issue.actionLabel}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <PagedFooter paged={paged} noun="issues" />
      </section>

      <p className="mt-3 text-[10px] text-[#94a3b8]">
        {LIVE
          ? "Issues are read from Meta for the selected ad account: ad, ad set and campaign delivery and review status, account standing, audiences, the pixel and data connections. Fixing happens in Meta; use Re-check afterwards."
          : "Every issue links straight to the page and section where it can be fixed."}{" "}
        Connection problems are resolved in{" "}
        <Link href="/admin/meta/settings" className="font-semibold text-[#0671e9] hover:underline">
          Meta settings
        </Link>
        .
      </p>

      <DetailDialog
        open={Boolean(selected)}
        onOpenChange={(next) => !next && setFilter("issue", "")}
        title={selected?.title ?? "Issue"}
        description={selected ? `${selected.kind ?? "Issue"} · ${selected.entityLabel}` : undefined}
        wide
        footer={
          selected && (
            <>
              <button type="button" className={btn} onClick={() => setFilter("issue", "")}>
                Close
              </button>
              {selected.externalHref && (
                <a href={selected.externalHref} target="_blank" rel="noopener noreferrer" className={btn}>
                  Fix in Meta Ads Manager
                  <ArrowUpRight className="size-3.5" />
                </a>
              )}
              <Link href={selected.actionHref} className={btnPrimary}>
                {selected.actionLabel}
              </Link>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <ToneChip tone={selected.resolved ? "green" : SEVERITY[selected.severity].tone}>{selected.resolved ? "Resolved" : SEVERITY[selected.severity].label}</ToneChip>
              {selected.kind && <ToneChip tone="slate">{selected.kind}</ToneChip>}
              {selected.statusLabel && <ToneChip tone="amber">Meta status: {selected.statusLabel}</ToneChip>}
            </div>
            <p className="text-xs font-medium leading-relaxed text-slate-700">{selected.detail}</p>

            {(selected.reasons?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-900">What Meta reports</h3>
                <ul className="mt-1.5 space-y-1.5">
                  {selected.reasons!.map((reason, index) => (
                    <li key={`${reason.summary}-${index}`} className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900">
                      <span className="font-semibold">{reason.summary}</span>
                      {reason.message && <span className="mt-0.5 block text-rose-800">{reason.message}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.advice && (
              <div className="rounded-sm border border-blue-200 bg-blue-50 px-3 py-2.5">
                <h3 className="text-xs font-semibold text-blue-900">What to do</h3>
                <p className="mt-0.5 text-xs font-medium leading-relaxed text-blue-900">{selected.advice}</p>
              </div>
            )}

            <dl>
              <KeyValue label="Affected">
                <Link href={selected.entityHref} className="font-semibold text-[#0671e9] hover:underline">
                  {selected.entityLabel}
                </Link>
              </KeyValue>
              {selected.campaign && selected.campaign !== selected.entityLabel && <KeyValue label="Campaign">{selected.campaign}</KeyValue>}
              <KeyValue label="Detected">{dateTime(selected.detected)}</KeyValue>
            </dl>
          </div>
        )}
      </DetailDialog>
    </AdsWorkspace>
  );
}

export default function IssuesPage() {
  return (
    <Suspense
      fallback={
        <>
          <SkeletonKpis count={4} />
          <div className="mt-3">
            <SkeletonTable rows={5} columns={4} />
          </div>
        </>
      }
    >
      <IssuesView />
    </Suspense>
  );
}
