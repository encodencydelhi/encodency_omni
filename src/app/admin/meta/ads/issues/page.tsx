"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Plug,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { issues } from "@/features/admin/meta-ads/data";
import { dateTime, relative } from "@/features/admin/meta-ads/format";
import { useFilters } from "@/features/admin/meta-ads/use-filters";
import {
  btn,
  btnPrimary,
  card,
  EmptyState,
  FilterBar,
  FilterSelect,
  KpiCard,
  LinkTabs,
  SearchInput,
  SkeletonTable,
  SkeletonKpis,
  ToneChip,
} from "@/features/admin/meta-ads/components/ui";
import {
  ADS_ROOT,
  AdsWorkspace,
} from "@/features/admin/meta-ads/components/workspace";
import type { Issue } from "@/features/admin/meta-ads/types";
import type { StatusTone } from "@/features/admin/meta-ads/format";

const DEFAULTS = {
  q: "",
  tab: "all",
  campaign: "All Campaigns",
};

const TABS = [
  { id: "all", label: "All" },
  { id: "blocking", label: "Blocking" },
  { id: "warning", label: "Warnings" },
  { id: "connection", label: "Connections" },
  { id: "policy", label: "Policy / Review" },
  { id: "resolved", label: "Resolved" },
];

const SEVERITY: Record<
  Issue["severity"],
  { label: string; tone: StatusTone; icon: typeof AlertTriangle }
> = {
  blocking: { label: "Blocking", tone: "red", icon: AlertOctagon },
  warning: { label: "Warning", tone: "amber", icon: AlertTriangle },
  connection: { label: "Connection", tone: "red", icon: Plug },
  policy: { label: "Policy", tone: "violet", icon: ShieldAlert },
};

function IssuesView() {
  const { values, setFilter, reset, isFiltered } = useFilters(DEFAULTS);

  const rows = useMemo(() => {
    const q = values.q.trim().toLowerCase();
    return issues.filter((i) => {
      if (q && ![i.title, i.detail, i.entityLabel].some((f) => f.toLowerCase().includes(q)))
        return false;
      if (values.tab === "resolved") {
        if (!i.resolved) return false;
      } else if (values.tab === "all") {
        if (i.resolved) return false;
      } else if (i.severity !== values.tab || i.resolved) {
        return false;
      }
      if (values.campaign !== DEFAULTS.campaign && i.campaign !== values.campaign) return false;
      return true;
    });
  }, [values]);

  const open = issues.filter((i) => !i.resolved);
  const counts = {
    blocking: open.filter((i) => i.severity === "blocking").length,
    warning: open.filter((i) => i.severity === "warning").length,
    connection: open.filter((i) => i.severity === "connection").length,
    policy: open.filter((i) => i.severity === "policy").length,
  };

  const campaignOptions = useMemo(
    () => [
      DEFAULTS.campaign,
      ...Array.from(new Set(issues.map((i) => i.campaign).filter((c): c is string => Boolean(c)))),
    ],
    [],
  );

  return (
    <AdsWorkspace>
      <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard
          label="Blocking Issues"
          value={counts.blocking}
          icon={AlertOctagon}
          tone={counts.blocking > 0 ? "red" : "green"}
          sub="Stop campaigns from running"
        />
        <KpiCard
          label="Warnings"
          value={counts.warning}
          icon={AlertTriangle}
          tone={counts.warning > 0 ? "amber" : "green"}
          sub="Worth fixing, not blocking"
        />
        <KpiCard
          label="Connection Issues"
          value={counts.connection}
          icon={Plug}
          tone={counts.connection > 0 ? "red" : "green"}
          sub="Accounts and data sources"
        />
        <KpiCard
          label="Rejected Ads"
          value={counts.policy}
          icon={ShieldAlert}
          tone={counts.policy > 0 ? "violet" : "green"}
          sub="Policy or review problems"
        />
      </section>

      <section className={cn(card, "overflow-hidden")}>
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-slate-50/40 to-white px-4 py-1">
          <LinkTabs
            tabs={TABS.map((t) => ({
              ...t,
              href: t.id === "all" ? `${ADS_ROOT}/issues` : `${ADS_ROOT}/issues?tab=${t.id}`,
              count:
                t.id === "all"
                  ? open.length
                  : t.id === "resolved"
                    ? issues.filter((i) => i.resolved).length
                    : open.filter((i) => i.severity === t.id).length,
            }))}
            current={values.tab}
            className="border-b-0"
          />
        </div>

        <FilterBar>
          <FilterSelect
            label="Campaign"
            value={values.campaign}
            onChange={(v) => setFilter("campaign", v)}
            options={campaignOptions}
            minWidth={220}
          />
          <SearchInput
            placeholder="Search issues…"
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
            icon={CheckCircle2}
            title={
              values.tab === "resolved"
                ? "Nothing resolved yet"
                : isFiltered
                  ? "No issues match these filters"
                  : "No issues — everything is running"
            }
            description={
              values.tab === "resolved"
                ? "Issues you fix will be listed here with the date they were cleared."
                : isFiltered
                  ? "Try another tab or campaign, or clear the filters."
                  : "Your campaigns, ad sets, ads and connections have no open problems right now."
            }
            secondary={{ label: "Go to Ads Manager", href: ADS_ROOT }}
            compact={isFiltered || values.tab === "resolved"}
          />
        ) : (
          <ul className="divide-y divide-[#eef2f7]">
            {rows.map((issue) => {
              const severity = SEVERITY[issue.severity];
              const Icon = severity.icon;
              return (
                <li key={issue.id} className="flex flex-wrap items-start gap-3 p-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      issue.resolved
                        ? "bg-[#eefaf3] text-[#087a50]"
                        : issue.severity === "warning"
                          ? "bg-[#fffaeb] text-[#b45309]"
                          : issue.severity === "policy"
                            ? "bg-[#f7f3ff] text-[#6d28d9]"
                            : "bg-[#fef3f2] text-[#b42318]",
                    )}
                  >
                    {issue.resolved ? (
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    ) : (
                      <Icon className="size-4" aria-hidden="true" />
                    )}
                  </span>

                  <div className="min-w-[260px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[12px] font-bold">{issue.title}</h3>
                      <ToneChip tone={issue.resolved ? "green" : severity.tone}>
                        {issue.resolved ? "Resolved" : severity.label}
                      </ToneChip>
                    </div>
                    <p className="mt-1 max-w-[720px] text-[11px] leading-relaxed text-[#475569]">
                      {issue.detail}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#64748b]">
                      <span>
                        Affected:{" "}
                        <Link href={issue.entityHref} className="font-semibold text-[#0671e9] hover:underline">
                          {issue.entityLabel}
                        </Link>
                      </span>
                      {issue.campaign && (
                        <span>
                          Campaign:{" "}
                          <Link
                            href={`${ADS_ROOT}/campaigns?q=${encodeURIComponent(issue.campaign)}`}
                            className="font-semibold text-[#0671e9] hover:underline"
                          >
                            {issue.campaign}
                          </Link>
                        </span>
                      )}
                      <span title={dateTime(issue.detected)}>
                        Detected {relative(issue.detected)}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <Link href={issue.entityHref} className={btn}>
                      View entity
                    </Link>
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
      </section>

      <p className="mt-3 text-[10px] text-[#94a3b8]">
        Every issue links straight to the page and section where it can be fixed. Connection
        problems are resolved on{" "}
        <Link href={`${ADS_ROOT}/assets`} className="font-semibold text-[#0671e9] hover:underline">
          Assets &amp; Connections
        </Link>
        .
      </p>
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
