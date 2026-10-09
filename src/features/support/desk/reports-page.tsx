"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Download, RotateCcw, ShieldCheck, Star, Ticket, TrendingUp } from "lucide-react";
import { BarList, TrendChart } from "../charts";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "../labels";
import { errorMessage, useDeskReports } from "../hooks";
import { hoursLabel } from "../time";
import type { DeskReports } from "../types";
import { btn, CountTabs, Notice, Section, Skeleton, StatTile } from "../ui";

type Range = "7d" | "30d" | "90d";

const percent = (value: number | null) => (value === null ? "—" : `${value}%`);

/** The report as a CSV a spreadsheet opens directly (no server round trip). */
function toCsv(report: DeskReports): string {
  const rows: Array<Array<string | number>> = [
    ["Support report", `last ${report.range}`],
    [],
    ["Metric", "Value"],
    ["Tickets raised", report.totals.created],
    ["Tickets resolved", report.totals.resolved],
    ["Reopened", report.totals.reopened],
    ["Still open", report.totals.stillOpen],
    ["Resolution rate %", report.totals.resolutionRate ?? ""],
    ["Avg first response (h)", report.averages.firstResponseHours?.toFixed(2) ?? ""],
    ["Avg resolution (h)", report.averages.resolutionHours?.toFixed(2) ?? ""],
    ["First response SLA met %", report.sla.firstResponseMetPercent ?? ""],
    ["Resolution SLA met %", report.sla.resolutionMetPercent ?? ""],
    ["Customer rating", report.satisfaction.average?.toFixed(2) ?? ""],
    [],
    ["Day", "Raised", "Resolved"],
    ...report.trend.map((d) => [d.day, d.created, d.resolved]),
    [],
    ["Category", "Tickets"],
    ...report.byCategory.map((c) => [CATEGORY_LABEL[c.key], c.count]),
    [],
    ["Priority", "Tickets"],
    ...report.byPriority.map((p) => [PRIORITY_LABEL[p.key], p.count]),
    [],
    ["Company", "Tickets"],
    ...report.topCompanies.map((c) => [c.name, c.tickets]),
  ];
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  return rows.map((row) => row.map(cell).join(",")).join("\r\n");
}

function download(report: DeskReports) {
  const blob = new Blob(["﻿" + toCsv(report)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `support-report-${report.range}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DeskReportsPage() {
  const [range, setRange] = useState<Range>("30d");
  const report = useDeskReports(range);
  const data = report.data;

  if (report.isError) {
    return (
      <Notice tone="red" title="Reports could not be loaded" action={<button type="button" className={btn} onClick={() => void report.refetch()}>Try again</button>}>
        {errorMessage(report.error)}
      </Notice>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CountTabs<Range>
          label="Report period"
          value={range}
          onChange={setRange}
          tabs={[
            { id: "7d", label: "Last 7 days" },
            { id: "30d", label: "Last 30 days" },
            { id: "90d", label: "Last 90 days" },
          ]}
        />
        <button type="button" className={btn} disabled={!data} onClick={() => data && download(data)}>
          <Download className="size-3.5" />
          Download CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
        {!data ? (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)
        ) : (
          <>
            <StatTile label="Tickets raised" value={data.totals.created} sub={`${data.totals.stillOpen} still open`} icon={Ticket} tone="blue" />
            <StatTile label="Tickets resolved" value={data.totals.resolved} sub={`Resolution rate ${percent(data.totals.resolutionRate)}`} icon={CheckCircle2} tone="green" />
            <StatTile label="Reopened" value={data.totals.reopened} sub="Raised in this period, reopened later" icon={RotateCcw} tone={data.totals.reopened > 0 ? "amber" : undefined} />
            <StatTile label="Customer rating" value={data.satisfaction.average ? `${data.satisfaction.average.toFixed(1)} / 5` : "—"} sub={`${data.satisfaction.ratings} rating${data.satisfaction.ratings === 1 ? "" : "s"}`} icon={Star} />
            <StatTile label="Avg first response" value={hoursLabel(data.averages.firstResponseHours)} sub="Raised to first public reply" icon={Clock} />
            <StatTile label="Avg time to resolve" value={hoursLabel(data.averages.resolutionHours)} sub="Raised to resolved" icon={TrendingUp} />
            <StatTile label="First-response SLA met" value={percent(data.sla.firstResponseMetPercent)} sub="Of tickets whose deadline passed" icon={ShieldCheck} tone={data.sla.firstResponseMetPercent !== null && data.sla.firstResponseMetPercent < 90 ? "amber" : "green"} />
            <StatTile label="Resolution SLA met" value={percent(data.sla.resolutionMetPercent)} sub="Of tickets resolved" icon={ShieldCheck} tone={data.sla.resolutionMetPercent !== null && data.sla.resolutionMetPercent < 90 ? "amber" : "green"} />
          </>
        )}
      </div>

      <Section title="Raised vs resolved" description={`Per day, last ${range === "7d" ? "7" : range === "30d" ? "30" : "90"} days`}>
        {data ? <TrendChart data={data.trend} /> : <Skeleton className="h-44" />}
      </Section>

      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
        <Section title="By category">{data ? <BarList rows={data.byCategory.map((c) => ({ key: c.key, label: CATEGORY_LABEL[c.key], value: c.count }))} empty="No tickets in this period." /> : <Skeleton className="h-40" />}</Section>
        <Section title="By priority">{data ? <BarList color="bg-orange-500" rows={data.byPriority.map((p) => ({ key: p.key, label: PRIORITY_LABEL[p.key], value: p.count }))} empty="No tickets in this period." /> : <Skeleton className="h-40" />}</Section>
        <Section title="Customer ratings" description="How customers rated solved tickets">
          {data ? <BarList color="bg-amber-400" rows={[5, 4, 3, 2, 1].map((rating) => ({ key: String(rating), label: `${rating} star${rating === 1 ? "" : "s"}`, value: data.satisfaction.distribution.find((d) => d.rating === rating)?.count ?? 0 }))} empty="No ratings yet." /> : <Skeleton className="h-40" />}
        </Section>
      </div>

      <Section title="Companies raising the most tickets" description="Where the support load comes from" flush>
        {!data ? (
          <Skeleton className="m-4 h-28" />
        ) : data.topCompanies.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs font-medium text-slate-500">No tickets in this period.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.topCompanies.map((company, index) => (
              <li key={company.companyId}>
                <Link href={`/super-admin/support/inbox?queue=everything&companyId=${company.companyId}`} className="flex items-center gap-3 px-4 py-2.5 text-xs transition hover:bg-slate-50">
                  <span className="w-5 text-right font-semibold tabular-nums text-slate-400">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{company.name}</span>
                  <span className="rounded-sm bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{company.tickets} ticket{company.tickets === 1 ? "" : "s"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
