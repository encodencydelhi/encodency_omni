"use client";

import Link from "next/link";
import { AlertOctagon, UserX, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { errorMessage, useDeskWorkload } from "../hooks";
import { hoursLabel } from "../time";
import { Avatar, Badge, btn, EmptyState, ListSkeleton, Notice, Section, Skeleton, StatTile, Stars } from "../ui";

export function DeskWorkloadPage() {
  const workload = useDeskWorkload();
  const data = workload.data;

  if (workload.isError) {
    return (
      <Notice tone="red" title="Workload could not be loaded" action={<button type="button" className={btn} onClick={() => void workload.refetch()}>Try again</button>}>
        {errorMessage(workload.error)}
      </Notice>
    );
  }

  const totalOpen = data?.staff.reduce((sum, s) => sum + s.open, 0) ?? 0;
  const peak = Math.max(1, ...(data?.staff.map((s) => s.open) ?? [1]));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {!data ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[92px]" />)
        ) : (
          <>
            <StatTile label="Support staff" value={data.staff.length} sub="Active Super Admins who can take tickets" icon={UsersRound} />
            <StatTile label="Assigned open tickets" value={totalOpen} sub={data.staff.length ? `${(totalOpen / data.staff.length).toFixed(1)} per person on average` : undefined} icon={UsersRound} />
            <StatTile label="Unassigned" value={data.unassigned} sub="Waiting for an owner" icon={UserX} tone={data.unassigned > 0 ? "amber" : "green"} href="/super-admin/support/inbox?queue=unassigned" />
          </>
        )}
      </div>

      <Section title="Team workload" description="Open tickets per person, with how fast they respond and solve (last 30 days)." flush>
        {!data ? (
          <ListSkeleton rows={4} />
        ) : data.staff.length === 0 ? (
          <EmptyState icon={UsersRound} title="No support staff" description="Tickets can be assigned to active Super Admin users. None exist yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Person</th>
                  <th className="w-56 px-2 py-2.5">Open load</th>
                  <th className="px-2 py-2.5 text-right">In progress</th>
                  <th className="px-2 py-2.5 text-right">Waiting</th>
                  <th className="px-2 py-2.5 text-right">Breached</th>
                  <th className="px-2 py-2.5 text-right">Solved 7d</th>
                  <th className="px-2 py-2.5 text-right">Solved 30d</th>
                  <th className="px-2 py-2.5 text-right">First reply</th>
                  <th className="px-2 py-2.5 text-right">Time to solve</th>
                  <th className="px-4 py-2.5 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.staff.map((person) => (
                  <tr key={person.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/super-admin/support/inbox?assignee=${person.id}`} className="flex items-center gap-2.5">
                        <Avatar name={person.name} size={30} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-900">{person.name}</span>
                          <span className="block truncate text-[11px] font-medium text-slate-500">{person.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-sm bg-slate-100">
                          <div className={cn("h-full rounded-sm", person.open >= 10 ? "bg-rose-500" : person.open >= 5 ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${(person.open / peak) * 100}%` }} />
                        </div>
                        <span className="w-6 text-right font-semibold tabular-nums text-slate-900">{person.open}</span>
                        {person.urgent > 0 && <Badge tone="red">{person.urgent} urgent</Badge>}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-700">{person.inProgress}</td>
                    <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-700">{person.waiting}</td>
                    <td className={cn("px-2 py-3 text-right font-semibold tabular-nums", person.breached > 0 ? "text-rose-600" : "text-slate-700")}>
                      {person.breached > 0 && <AlertOctagon className="mr-1 inline size-3" />}
                      {person.breached}
                    </td>
                    <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-700">{person.resolvedLast7Days}</td>
                    <td className="px-2 py-3 text-right font-semibold tabular-nums text-slate-700">{person.resolvedLast30Days}</td>
                    <td className="px-2 py-3 text-right font-semibold text-slate-700">{hoursLabel(person.avgFirstResponseHours)}</td>
                    <td className="px-2 py-3 text-right font-semibold text-slate-700">{hoursLabel(person.avgResolutionHours)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex justify-end">
                        <Stars value={person.satisfaction} size={12} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
