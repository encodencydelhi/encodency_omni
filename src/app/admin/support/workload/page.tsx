"use client";

import Link from "next/link";
import { Users, Gauge, Inbox, UserPlus, AlertTriangle, Layers, Activity, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAdminSupport } from "@/features/admin/support/data/provider";
import {
  TERMINAL_TICKETS,
  getActiveTickets,
  getPriorityDistribution,
  getTeamWorkload,
  getUnassignedTickets,
} from "@/features/admin/support/data/selectors";

const STAFF_CAPACITY = 5;

export default function AdminSupportWorkloadPage() {
  const { tickets, teams, activity } = useAdminSupport();
  const workload = getTeamWorkload(tickets);
  const activeTickets = getActiveTickets(tickets);
  const unassigned = getUnassignedTickets(tickets);
  const priorities = getPriorityDistribution(tickets);

  const teamNameById = (id?: string) => teams.find((team) => team.id === id)?.name ?? "Unassigned";

  const staffRows = workload.map((row) => {
    const owned = tickets.filter((ticket) => ticket.ownerName === row.name);
    const team = teamNameById(owned.find((ticket) => ticket.assignedTeamId)?.assignedTeamId);
    const resolved = owned.filter((ticket) => TERMINAL_TICKETS.has(ticket.status)).length;
    const high = owned.filter((ticket) => ticket.priority === "High").length;
    const reopens = owned.reduce((sum, ticket) => sum + ticket.reopenCount, 0);
    const utilization = Math.min(100, Math.round((row.active / STAFF_CAPACITY) * 100));
    const loadState = row.active >= 3 ? "Overloaded" : row.active === 2 ? "Balanced" : "Light";
    const loadTint =
      loadState === "Overloaded"
        ? "bg-red-50 text-red-700"
        : loadState === "Balanced"
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700";

    return { ...row, team, resolved, high, reopens, utilization, loadState, loadTint };
  });

  const totalActive = activeTickets.length;
  const avgLoad = staffRows.length > 0 ? (totalActive / staffRows.length).toFixed(1) : "0";
  const overloaded = staffRows.filter((row) => row.loadState === "Overloaded").length;
  const totalSlaRisk = tickets.filter((ticket) => ticket.sla?.state === "At Risk" || ticket.sla?.state === "Breached").length;

  const metrics = [
    { label: "Active Agents", value: staffRows.length, icon: Users, color: "#2563EB", bg: "#EFF6FF" },
    { label: "Active Tickets", value: totalActive, icon: Gauge, color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Unassigned Queue", value: unassigned.length, icon: UserPlus, color: "#D97706", bg: "#FFFBEB" },
    { label: "Avg Load / Agent", value: avgLoad, icon: Layers, color: "#059669", bg: "#ECFDF5" },
  ];

  const teamWorkload = teams.map((team) => {
    const teamTickets = tickets.filter((ticket) => ticket.assignedTeamId === team.id);
    const teamActive = teamTickets.filter((ticket) => !TERMINAL_TICKETS.has(ticket.status)).length;
    const staffCount = new Set(teamTickets.map((ticket) => ticket.ownerName).filter(Boolean)).size;
    const capacity = Math.min(100, Math.round((teamActive / (STAFF_CAPACITY * Math.max(staffCount, 1))) * 100));
    return { ...team, total: teamTickets.length, active: teamActive, staffCount, capacity };
  });

  const needsAttention = tickets
    .filter(
      (ticket) =>
        !TERMINAL_TICKETS.has(ticket.status) &&
        (ticket.sla?.state === "At Risk" || ticket.sla?.state === "Breached" || ticket.priority === "Urgent"),
    )
    .slice(0, 5);

  const staffActivity = activity.filter((item) => item.actorType === "Support Agent").slice(0, 6);

  const maxPriorityCount = Math.max(1, ...priorities.map((item) => item.count));

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-3">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Team Workload</p>
        <div className="inline-flex items-center gap-1 rounded-sm border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600">
          <Users className="size-3" />
          {staffRows.length} agents · {totalActive} active tickets
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="group rounded-sm border border-slate-200/80 bg-white p-3 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{item.label}</span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm" style={{ backgroundColor: item.bg, color: item.color }}>
                  <Icon className="size-3.5" />
                </span>
              </div>
              <div className="mt-2 text-[22px] font-bold tracking-[-0.04em] text-slate-900">{item.value}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                {item.label === "Active Agents"
                  ? `${overloaded} overloaded`
                  : item.label === "Active Tickets"
                    ? `${totalSlaRisk} at SLA risk`
                    : item.label === "Unassigned Queue"
                      ? "Needs assignment"
                      : `Capacity ${STAFF_CAPACITY}/agent`}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-slate-900">Agent Workload</h2>
          <Link href="/admin/support/inbox" className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
            Open inbox
          </Link>
        </div>
        <div className="overflow-hidden rounded-sm border border-slate-200/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead className="bg-slate-50/80 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Staff Member</th>
                  <th className="px-4 py-2.5 font-medium">Team</th>
                  <th className="px-4 py-2.5 font-medium">Active</th>
                  <th className="px-4 py-2.5 font-medium">Urgent</th>
                  <th className="px-4 py-2.5 font-medium">High</th>
                  <th className="px-4 py-2.5 font-medium">SLA Risk</th>
                  <th className="px-4 py-2.5 font-medium">Waiting Customer</th>
                  <th className="px-4 py-2.5 font-medium">Resolved</th>
                  <th className="px-4 py-2.5 font-medium">Reopens</th>
                  <th className="px-4 py-2.5 font-medium">Utilization</th>
                  <th className="px-4 py-2.5 font-medium">Load</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-6 text-center text-[12px] text-slate-500">
                      No staff workload data available.
                    </td>
                  </tr>
                )}
                {staffRows.map((row) => (
                  <tr key={row.name} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.team}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.active}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.urgent}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.high}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-sm px-2 py-1 text-[10px] font-medium ${row.slaRisk > 0 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                        {row.slaRisk}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{row.waitingCustomer}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.resolved}</td>
                    <td className="px-4 py-3.5 text-slate-700">{row.reopens}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-sm bg-slate-100">
                          <div
                            className={`h-full rounded-sm ${row.utilization >= 80 ? "bg-red-500" : row.utilization >= 50 ? "bg-amber-500" : "bg-blue-500"}`}
                            style={{ width: `${row.utilization}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500">{row.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-sm px-2 py-1 text-[10px] font-medium ${row.loadTint}`}>{row.loadState}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr]">
        <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-sm bg-blue-50 text-blue-600">
                <Gauge className="size-3.5" />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-900">Staff Capacity &amp; Load</h2>
            </div>
            <span className="text-[11px] text-slate-500">Capacity {STAFF_CAPACITY} active / agent</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {staffRows.map((row) => (
              <div key={row.name} className="rounded-sm border border-slate-100 p-3 transition hover:border-slate-200 hover:bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-sm bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {row.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </span>
                    <div>
                      <div className="text-[12px] font-semibold text-slate-800">{row.name}</div>
                      <div className="text-[10px] text-slate-500">{row.team}</div>
                    </div>
                  </div>
                  <span className={`rounded-sm px-2 py-1 text-[10px] font-medium ${row.loadTint}`}>{row.loadState}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
                  <span>
                    {row.active} active · {row.resolved} resolved
                  </span>
                  <span className="font-medium text-slate-800">{row.utilization}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-slate-100">
                  <div
                    className={`h-full rounded-sm ${row.utilization >= 80 ? "bg-red-500" : row.utilization >= 50 ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${row.utilization}%` }}
                  />
                </div>
                <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
                  <span>Urgent: {row.urgent}</span>
                  <span>SLA risk: {row.slaRisk}</span>
                  <span>Waiting: {row.waitingCustomer}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-sm bg-amber-50 text-amber-600">
                  <UserPlus className="size-3.5" />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-900">Unassigned Queue</h2>
              </div>
              <span className="rounded-sm bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
                {unassigned.length} pending
              </span>
            </div>
            <div className="space-y-2">
              {unassigned.length === 0 && (
                <div className="rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[12px] text-slate-500">
                  Every ticket has an owner.
                </div>
              )}
              {unassigned.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between rounded-sm border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <div className="min-w-0">
                    <Link href={`/admin/support/tickets/${ticket.id}`} className="text-[12px] font-medium text-blue-600 hover:text-blue-700">
                      {ticket.id}
                    </Link>
                    <div className="truncate text-[11px] text-slate-500">{ticket.subject}</div>
                  </div>
                  <span className="ml-2 shrink-0 rounded-sm bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                    {ticket.priority}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-sm bg-red-50 text-red-600">
                  <AlertTriangle className="size-3.5" />
                </div>
                <h2 className="text-[14px] font-semibold text-slate-900">Needs Attention Now</h2>
              </div>
              <span className="rounded-sm bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">
                {needsAttention.length} tickets
              </span>
            </div>
            <div className="space-y-2">
              {needsAttention.length === 0 && (
                <div className="rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[12px] text-slate-500">
                  Nothing urgent right now.
                </div>
              )}
              {needsAttention.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between gap-2 rounded-sm border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/support/tickets/${ticket.id}`} className="text-[12px] font-medium text-blue-600 hover:text-blue-700">
                        {ticket.id}
                      </Link>
                      <span className="text-[10px] text-slate-500">{ticket.ownerName ?? "Unassigned"}</span>
                    </div>
                    <div className="truncate text-[11px] text-slate-500">{ticket.subject}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm px-2 py-1 text-[10px] font-medium ${
                      ticket.sla?.state === "Breached" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {ticket.sla?.state === "Breached" ? "Breached" : ticket.priority}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-sm bg-violet-50 text-violet-600">
              <Layers className="size-3.5" />
            </div>
            <h2 className="text-[13px] font-semibold text-slate-900">Team Workload</h2>
          </div>
          <div className="space-y-3 text-[12px]">
            {teamWorkload.map((team) => (
              <div key={team.id}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{team.name}</span>
                  <span className="font-medium text-slate-800">{team.active} active</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-slate-100">
                  <div
                    className={`h-full rounded-sm ${team.capacity >= 80 ? "bg-red-500" : team.capacity >= 50 ? "bg-amber-500" : "bg-blue-500"}`}
                    style={{ width: `${team.capacity}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                  <span>{team.staffCount} agents · {team.total} total tickets</span>
                  <span>{team.capacity}% capacity</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-sm bg-amber-50 text-amber-600">
              <Inbox className="size-3.5" />
            </div>
            <h2 className="text-[13px] font-semibold text-slate-900">Priority Load</h2>
          </div>
          <div className="space-y-3 text-[12px]">
            {priorities.map((item) => (
              <div key={item.priority}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{item.priority}</span>
                  <span className="font-medium text-slate-800">{item.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-slate-100">
                  <div
                    className={`h-full rounded-sm ${
                      item.priority === "Urgent"
                        ? "bg-red-500"
                        : item.priority === "High"
                          ? "bg-amber-500"
                          : item.priority === "Normal"
                            ? "bg-blue-500"
                            : "bg-slate-400"
                    }`}
                    style={{ width: `${(item.count / maxPriorityCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-2 text-[10px] text-slate-500">
              Distribution across all {tickets.length} tickets in queue
            </div>
          </div>
        </Card>

        <Card className="rounded-sm border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-sm bg-emerald-50 text-emerald-600">
                <Activity className="size-3.5" />
              </div>
              <h2 className="text-[13px] font-semibold text-slate-900">Recent Staff Activity</h2>
            </div>
            <Link href="/admin/support/activity" className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {staffActivity.length === 0 && (
              <div className="rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[12px] text-slate-500">
                No recent staff activity.
              </div>
            )}
            {staffActivity.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2 rounded-sm border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-200 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-slate-700">{item.actorName}</div>
                  <div className="truncate text-[11px] text-slate-500">
                    {item.actionType}
                    {item.newValue ? ` → ${item.newValue}` : ""}
                  </div>
                </div>
                <Link
                  href={`/admin/support/tickets/${item.ticketId}`}
                  className="shrink-0 text-[10px] font-medium text-blue-600 hover:text-blue-700"
                >
                  {item.ticketId}
                </Link>
              </div>
            ))}
          </div>
          <Link
            href="/admin/support/inbox"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
          >
            Review queue <ArrowUpRight className="size-3" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
