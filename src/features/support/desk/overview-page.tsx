"use client";

import Link from "next/link";
import { AlertOctagon, ArrowRight, CalendarPlus, CheckCircle2, Clock, Hourglass, Inbox, Star, Timer, UserX, Zap } from "lucide-react";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "../labels";
import { BarList, SegmentBar, TrendChart } from "../charts";
import { errorMessage, useDeskOverview } from "../hooks";
import { hoursLabel } from "../time";
import { TICKET_STATUSES } from "../types";
import { btn, EmptyState, ListSkeleton, Notice, Section, Skeleton, StatTile } from "../ui";
import { DeskTicketRow } from "./desk-ticket-row";

const STATUS_COLOR: Record<string, string> = { open: "bg-blue-500", in_progress: "bg-violet-500", waiting_on_customer: "bg-amber-500", resolved: "bg-emerald-500", closed: "bg-slate-400" };

export function DeskOverviewPage() {
  const overview = useDeskOverview();
  const data = overview.data;
  const inbox = "/super-admin/support/inbox";

  if (overview.isError) {
    return (
      <Notice tone="red" title="The desk overview could not be loaded" action={<button type="button" className={btn} onClick={() => void overview.refetch()}>Try again</button>}>
        {errorMessage(overview.error)}
      </Notice>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-8">
        {!data ? (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)
        ) : (
          <>
            <StatTile label="Open tickets" value={data.counts.open} sub="Not solved or closed" icon={Inbox} href={inbox} />
            <StatTile label="Unassigned" value={data.counts.unassigned} sub="Nobody owns these" icon={UserX} tone={data.counts.unassigned > 0 ? "amber" : undefined} href={`${inbox}?queue=unassigned`} />
            <StatTile label="Urgent" value={data.counts.urgent} sub="Highest priority" icon={Zap} tone={data.counts.urgent > 0 ? "red" : undefined} href={`${inbox}?queue=urgent`} />
            <StatTile label="SLA breached" value={data.counts.breached} sub="Past a deadline" icon={AlertOctagon} tone={data.counts.breached > 0 ? "red" : "green"} href={`${inbox}?queue=breached`} />
            <StatTile label="SLA at risk" value={data.counts.atRisk} sub="Deadline close" icon={Timer} tone={data.counts.atRisk > 0 ? "amber" : undefined} href={`${inbox}?queue=at_risk`} />
            <StatTile label="Waiting on customer" value={data.counts.waiting} sub="Clock paused" icon={Hourglass} href={`${inbox}?queue=waiting`} />
            <StatTile label="Raised today" value={data.counts.createdToday} sub="Since 00:00 UTC" icon={CalendarPlus} tone="blue" />
            <StatTile label="Resolved today" value={data.counts.resolvedToday} sub="Since 00:00 UTC" icon={CheckCircle2} tone="green" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        <StatTile label="Avg first response · 30 days" value={data ? hoursLabel(data.averages.firstResponseHours) : "…"} sub="From raised to first public reply" icon={Clock} />
        <StatTile label="Avg time to resolve · 30 days" value={data ? hoursLabel(data.averages.resolutionHours) : "…"} sub="From raised to resolved" icon={CheckCircle2} />
        <StatTile label="Customer rating · 30 days" value={data ? (data.averages.satisfaction ? `${data.averages.satisfaction.toFixed(1)} / 5` : "—") : "…"} sub={data ? `${data.averages.ratings} rating${data.averages.ratings === 1 ? "" : "s"}` : undefined} icon={Star} tone={data?.averages.satisfaction && data.averages.satisfaction < 3.5 ? "amber" : undefined} />
      </div>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-2">
          <Section title="Needs attention now" description="Tickets past an SLA deadline, most urgent first." flush action={<Link href={`${inbox}?queue=breached`} className={btn}>Open queue<ArrowRight className="size-3.5" /></Link>}>
            {!data ? (
              <ListSkeleton rows={3} />
            ) : data.attention.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing is overdue" description="Every open ticket is inside its SLA. Good work." />
            ) : (
              <ul className="divide-y divide-slate-100">{data.attention.map((ticket) => <DeskTicketRow key={ticket.id} ticket={ticket} />)}</ul>
            )}
          </Section>
          <Section title="Raised vs resolved" description="Last 14 days">
            {data ? <TrendChart data={data.trend} /> : <Skeleton className="h-44" />}
          </Section>
        </div>

        <div className="space-y-2">
          <Section title="All tickets by status">
            {data ? <SegmentBar segments={TICKET_STATUSES.map((status) => ({ key: status, label: STATUS_LABEL[status], value: data.byStatus.find((s) => s.status === status)?.count ?? 0, className: STATUS_COLOR[status]! }))} /> : <Skeleton className="h-24" />}
          </Section>
          <Section title="Open by priority">
            {data ? <BarList color="bg-orange-500" rows={data.byPriority.map((p) => ({ key: p.priority, label: PRIORITY_LABEL[p.priority], value: p.count }))} empty="No open tickets." /> : <Skeleton className="h-24" />}
          </Section>
          <Section title="Open by category">
            {data ? <BarList rows={data.byCategory.map((c) => ({ key: c.category, label: CATEGORY_LABEL[c.category], value: c.count }))} empty="No open tickets." /> : <Skeleton className="h-32" />}
          </Section>
          <Section title="Companies with the most open tickets" flush>
            {!data ? (
              <ListSkeleton rows={3} />
            ) : data.topCompanies.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs font-medium text-slate-500">No open tickets.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.topCompanies.map((company) => (
                  <li key={company.companyId}>
                    <Link href={`${inbox}?companyId=${company.companyId}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs transition hover:bg-slate-50">
                      <span className="truncate font-semibold text-slate-800">{company.name}</span>
                      <span className="shrink-0 rounded-sm bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{company.open} open</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
