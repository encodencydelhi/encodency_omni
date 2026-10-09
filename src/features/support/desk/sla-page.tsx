"use client";

import Link from "next/link";
import { AlertOctagon, CheckCircle2, Flame, Hourglass, Timer } from "lucide-react";
import { PRIORITY_LABEL } from "../labels";
import { errorMessage, useDeskPriority, useDeskSla } from "../hooks";
import type { DeskItem } from "../types";
import { Avatar, Badge, btn, ConfirmButton, EmptyState, ListSkeleton, Notice, PriorityBadge, Section, Skeleton, SlaBadge, StatTile, StatusBadge } from "../ui";
import { timeAgo } from "../time";

function SlaTable({ rows, empty }: { rows: DeskItem[]; empty: string }) {
  const priority = useDeskPriority();
  if (rows.length === 0) return <EmptyState icon={CheckCircle2} title={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <th className="w-16 px-4 py-2.5">#</th>
            <th className="px-2 py-2.5">Ticket</th>
            <th className="px-2 py-2.5">Priority</th>
            <th className="px-2 py-2.5">Status</th>
            <th className="px-2 py-2.5">SLA</th>
            <th className="px-2 py-2.5">Owner</th>
            <th className="px-4 py-2.5 text-right">Escalate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((ticket) => (
            <tr key={ticket.id} className="transition hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold tabular-nums text-slate-500">#{ticket.number}</td>
              <td className="max-w-[380px] px-2 py-3">
                <Link href={`/super-admin/support/tickets/${ticket.number}`} className="block truncate text-[13px] font-semibold text-slate-900 hover:text-red-700">
                  {ticket.subject}
                </Link>
                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                  {ticket.company.name} · raised {timeAgo(ticket.createdAt)}
                </p>
              </td>
              <td className="px-2 py-3">
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td className="px-2 py-3">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="px-2 py-3">
                <SlaBadge sla={ticket.sla} />
              </td>
              <td className="px-2 py-3">
                {ticket.assignee ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                    <Avatar name={ticket.assignee.name} size={22} />
                    {ticket.assignee.name}
                  </span>
                ) : (
                  <Badge tone="amber">Unassigned</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {ticket.priority === "urgent" ? (
                  <span className="text-[11px] font-semibold text-slate-400">Already urgent</span>
                ) : (
                  <ConfirmButton label={<><Flame className="size-3.5 text-red-600" />Urgent</>} confirmLabel="Make urgent" disabled={priority.isPending} onConfirm={() => priority.mutate({ number: ticket.number, priority: "urgent" })} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DeskSlaPage() {
  const sla = useDeskSla();
  const data = sla.data;

  if (sla.isError) {
    return (
      <Notice tone="red" title="SLA data could not be loaded" action={<button type="button" className={btn} onClick={() => void sla.refetch()}>Try again</button>}>
        {errorMessage(sla.error)}
      </Notice>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {!data ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)
        ) : (
          <>
            <StatTile label="Breached" value={data.counts.breached} sub="Past a deadline: act now" icon={AlertOctagon} tone={data.counts.breached > 0 ? "red" : "green"} />
            <StatTile label="At risk" value={data.counts.atRisk} sub="Less than 25% of the time left" icon={Timer} tone={data.counts.atRisk > 0 ? "amber" : undefined} />
            <StatTile label="Paused" value={data.counts.paused} sub="Waiting for the customer" icon={Hourglass} />
          </>
        )}
      </div>

      <Section title="SLA policy" description="The targets every ticket is measured against, by priority. They run from the moment the ticket is raised." flush>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Priority</th>
              <th className="px-2 py-2.5">First response within</th>
              <th className="px-2 py-2.5">Resolution within</th>
              <th className="px-4 py-2.5">What it means</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.policy ?? []).map((row) => (
              <tr key={row.priority}>
                <td className="px-4 py-3">
                  <PriorityBadge priority={row.priority} />
                </td>
                <td className="px-2 py-3 font-semibold text-slate-800">{row.firstResponseHours} h</td>
                <td className="px-2 py-3 font-semibold text-slate-800">{row.resolutionHours >= 48 ? `${row.resolutionHours / 24} days` : `${row.resolutionHours} h`}</td>
                <td className="px-4 py-3 font-medium text-slate-500">{PRIORITY_LABEL[row.priority]}: {row.priority === "urgent" ? "all hands" : row.priority === "high" ? "same working day" : row.priority === "normal" ? "next business day" : "when capacity allows"}</td>
              </tr>
            ))}
            {!data && (
              <tr>
                <td colSpan={4} className="p-4">
                  <Skeleton className="h-20" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] font-medium text-slate-500">While a ticket waits for the customer the resolution clock is paused. Changing a ticket&apos;s priority recalculates both deadlines from the time it was raised. Escalating means raising a ticket to Urgent.</p>
      </Section>

      <Section title={`Breached${data ? ` (${data.counts.breached})` : ""}`} description="Past a deadline. Sorted by the oldest deadline first." flush>
        {!data ? <ListSkeleton rows={3} /> : <SlaTable rows={data.breached} empty="No breached tickets" />}
      </Section>
      <Section title={`At risk${data ? ` (${data.counts.atRisk})` : ""}`} description="Close to a deadline." flush>
        {!data ? <ListSkeleton rows={3} /> : <SlaTable rows={data.atRisk} empty="Nothing is close to its deadline" />}
      </Section>
    </div>
  );
}
