"use client";

import {
  ActivityIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldAlertIcon,
  UserCheckIcon,
  UsersIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/config/routes";
import { useCompanyRefs } from "@/features/companies/hooks/use-companies";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import { UsersNav } from "../components/users-nav";
import { useUserActivities, useUserKpis } from "../data/hooks";
import type { UserActivity } from "../data/types";
import { UserCapabilitiesProvider } from "../data/capability-provider";
import { ErrorState } from "@/components/shared/error-state";

export function UserActivityPage() {
  return (
    <UserCapabilitiesProvider>
      <UserActivityContent />
    </UserCapabilitiesProvider>
  );
}

function UserActivityContent() {
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  const [selectedEvent, setSelectedEvent] = useState<UserActivity | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: companies } = useCompanyRefs();
  const { data: kpis } = useUserKpis();
  const { data: activities = [], isLoading, error: activityError, refetch } = useUserActivities({
    search: search.trim() || undefined,
    companyId,
  });

  const companyOptions = (companies ?? []).map((c) => ({ id: c.id, name: c.name }));

  const filteredActivities = activities.filter((act) => {
    if (resultFilter !== "all" && act.result !== resultFilter) return false;
    return true;
  });

  // Activity KPIs (Section 48, gap-1)
  const totalActions = activities.length;
  const accessChanges = activities.filter((a) => a.module === "Team" || a.module === "Company Access").length;
  const failedActions = activities.filter((a) => a.result === "failed").length;
  const securityEvents = activities.filter((a) => a.module === "Security" || a.module === "Authentication").length;

  const handleRowClick = (act: UserActivity) => {
    setSelectedEvent(act);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ActivityIcon className="size-5 text-blue-600" />
            <span>User Activity</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational and security events performed by or affecting company-user identities.
          </p>
        </div>

        <Link
          href={ROUTES.superAdmin.auditLogs}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Platform Audit Logs</span>
          <ExternalLinkIcon className="size-3" />
        </Link>
      </div>

      {/* KPI row (gap-1, items-stretch for equal height) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-1 items-stretch">
        <div className="p-3 rounded-lg border border-border bg-white h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Actions Recorded</span>
            <ActivityIcon className="size-3.5 text-blue-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalActions}</div>
            <div className="text-xs text-slate-400">User operations</div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border bg-white h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Active Users</span>
            <UsersIcon className="size-3.5 text-emerald-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600">
              {kpis?.activeUsers ?? 0}
            </div>
            <div className="text-xs text-slate-400">Performing actions</div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border bg-white h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Access Changes</span>
            <UserCheckIcon className="size-3.5 text-indigo-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-indigo-600">{accessChanges}</div>
            <div className="text-xs text-slate-400">Role & membership updates</div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border bg-white h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-slate-500">
            <span>Security Events</span>
            <ShieldAlertIcon className="size-3.5 text-amber-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-600">{securityEvents}</div>
            <div className="text-xs text-slate-400">Auth & session triggers</div>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/30 h-full min-h-[92px] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-rose-700">
            <span>Failed Actions</span>
            <XCircleIcon className="size-3.5 text-rose-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-700">{failedActions}</div>
            <div className="text-xs text-rose-800/80">Declined or error events</div>
          </div>
        </div>
      </div>

      {activityError ? (
        <ErrorState error={activityError} onRetry={() => refetch()} />
      ) : (
      <>
      {/* Module Navigation */}
      <UsersNav />

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, user, company or summary..."
            className="h-8.5 pl-8 text-xs bg-white border-border"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="h-8.5 text-xs w-[140px] bg-white">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companyOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="h-8.5 text-xs w-[120px] bg-white">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {(search || companyId !== "all" || resultFilter !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setCompanyId("all");
                setResultFilter("all");
              }}
              className="h-8.5 text-xs gap-1"
            >
              <RotateCcwIcon className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* User Activity Table (Section 49) */}
      <div className="rounded-md border border-border bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-slate-50/75 border-b border-border text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <TableRow>
              <TableHead className="min-w-[120px]">Timestamp</TableHead>
              <TableHead className="min-w-[180px]">User</TableHead>
              <TableHead className="min-w-[160px]">Action</TableHead>
              <TableHead className="min-w-[140px]">Company</TableHead>
              <TableHead className="min-w-[120px]">Client</TableHead>
              <TableHead className="min-w-[100px]">Module</TableHead>
              <TableHead className="min-w-[90px]">Result</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx} className="animate-pulse h-12">
                  <TableCell colSpan={7} className="py-3 px-4">
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-400 text-xs italic">
                  No activity events match the current search or filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredActivities.map((act) => {
                return (
                  <TableRow
                    key={act.id}
                    onClick={() => handleRowClick(act)}
                    className="group text-xs cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Timestamp */}
                    <TableCell className="py-2.5 text-slate-500 whitespace-nowrap">
                      {formatRelativeTime(act.timestamp)}
                    </TableCell>

                    {/* User */}
                    <TableCell className="py-2.5">
                      <Link
                        href={ROUTES.superAdmin.user(act.userId)}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-slate-800 hover:text-blue-600 hover:underline"
                      >
                        {act.userName}
                      </Link>
                      <div className="text-xs text-slate-400">{act.userEmail}</div>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="py-2.5">
                      <div className="font-medium text-slate-800">{act.action}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">{act.summary}</div>
                    </TableCell>

                    {/* Company */}
                    <TableCell className="py-2.5 text-slate-700 font-medium">
                      {act.companyName}
                    </TableCell>

                    {/* Client */}
                    <TableCell className="py-2.5 text-slate-500">
                      {act.clientName ?? "—"}
                    </TableCell>

                    {/* Module */}
                    <TableCell className="py-2.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                        {act.module}
                      </span>
                    </TableCell>

                    {/* Result */}
                    <TableCell className="py-2.5">
                      {act.result === "successful" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle2Icon className="size-3" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                          <XCircleIcon className="size-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Activity Detail Drawer (Section 51) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border bg-slate-50/60">
            <SheetTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ActivityIcon className="size-4.5 text-blue-600" />
              <span>Activity Event Detail</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500">
              Technical details and context for event {selectedEvent?.id}.
            </SheetDescription>
          </SheetHeader>

          {selectedEvent && (
            <SheetBody className="p-4 space-y-4 flex-1 overflow-y-auto text-xs">
              <div className="rounded border border-border p-3.5 bg-slate-50/70 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Action</span>
                  <span className="font-semibold text-slate-800">{selectedEvent.action}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Affected User</span>
                  <Link
                    href={ROUTES.superAdmin.user(selectedEvent.userId)}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {selectedEvent.userName}
                  </Link>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Actor</span>
                  <span className="font-semibold text-slate-800">{selectedEvent.actor.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Organization</span>
                  <span className="font-semibold text-slate-800">{selectedEvent.companyName}</span>
                </div>
                {selectedEvent.clientName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Client Scope</span>
                    <span className="font-semibold text-slate-800">{selectedEvent.clientName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Module & Entity</span>
                  <span className="font-semibold text-slate-800">
                    {selectedEvent.module} • {selectedEvent.entity}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Timestamp</span>
                  <span className="text-slate-700">{formatDate(selectedEvent.timestamp)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Result</span>
                  <span className="font-semibold capitalize text-emerald-600">{selectedEvent.result}</span>
                </div>
              </div>

              <div className="p-3 rounded border border-border bg-white space-y-1">
                <span className="font-semibold text-slate-700">Operational Summary</span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {selectedEvent.summary}
                </p>
              </div>

              {(selectedEvent.previousValue || selectedEvent.newValue) && (
                <div className="rounded border border-border p-3 space-y-2 bg-slate-50/50">
                  <span className="font-semibold text-slate-700">State Delta</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-white border">
                      <div className="text-xs text-slate-400 uppercase">Previous</div>
                      <div className="font-medium text-slate-700 mt-0.5">
                        {selectedEvent.previousValue ?? "None"}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-white border">
                      <div className="text-xs text-slate-400 uppercase">New</div>
                      <div className="font-medium text-slate-700 mt-0.5">
                        {selectedEvent.newValue ?? "None"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </SheetBody>
          )}

          <div className="p-3 border-t border-border bg-slate-50 flex items-center justify-between">
            <Link
              href={ROUTES.superAdmin.auditLogs}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Open Audit Logs</span>
              <ExternalLinkIcon className="size-3" />
            </Link>

            <Button type="button" variant="outline" size="sm" onClick={() => setDrawerOpen(false)} className="text-xs">
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      </>
      )}
    </div>
  );
}
