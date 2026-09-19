"use client";

import {
  ActivityIcon,
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowUpDownIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  EyeIcon,
  FilterIcon,
  GlobeIcon,
  LayersIcon,
  RefreshCwIcon,
  SearchIcon,
  ServerIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  UserIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { AUDIT_LOG } from "@/mocks/data/control";
import {
  AUDIT_CATEGORY,
  AUDIT_OUTCOME,
  type AuditCategory,
  type AuditLogEntry,
  type AuditOutcome,
} from "@/types/domain/audit-log";
import { formatDate, formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedOutcome, setSelectedOutcome] = useState<string>("all");
  const [selectedActorType, setSelectedActorType] = useState<string>("all");
  const [sortField, setSortField] = useState<"createdAt" | "actor" | "action">("createdAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Selected event for detail drawer
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntry | null>(null);

  // KPIs calculation
  const stats = useMemo(() => {
    const total = AUDIT_LOG.length;
    const securityCount = AUDIT_LOG.filter((e) => e.category === "security").length;
    const failureCount = AUDIT_LOG.filter((e) => e.outcome === "failure" || e.outcome === "denied").length;
    const internalCount = AUDIT_LOG.filter((e) => e.actor.type === "internal").length;
    const systemCount = AUDIT_LOG.filter((e) => e.actor.type === "system").length;
    return { total, securityCount, failureCount, internalCount, systemCount };
  }, []);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return AUDIT_LOG.filter((entry) => {
      if (selectedCategory !== "all" && entry.category !== selectedCategory) {
        return false;
      }
      if (selectedOutcome !== "all" && entry.outcome !== selectedOutcome) {
        return false;
      }
      if (selectedActorType !== "all" && entry.actor.type !== selectedActorType) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const actorMatch =
          entry.actor.name.toLowerCase().includes(query) ||
          entry.actor.email.toLowerCase().includes(query);
        const actionMatch = entry.action.toLowerCase().includes(query);
        const resourceMatch =
          entry.resource.label.toLowerCase().includes(query) ||
          entry.resource.id.toLowerCase().includes(query);
        const companyMatch = entry.company?.name.toLowerCase().includes(query);
        const ipMatch = entry.ipAddress.toLowerCase().includes(query);
        if (!actorMatch && !actionMatch && !resourceMatch && !companyMatch && !ipMatch) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === "createdAt") {
        comparison = Date.parse(a.createdAt) - Date.parse(b.createdAt);
      } else if (sortField === "actor") {
        comparison = a.actor.name.localeCompare(b.actor.name);
      } else if (sortField === "action") {
        comparison = a.action.localeCompare(b.action);
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });
  }, [search, selectedCategory, selectedOutcome, selectedActorType, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedOutcome("all");
    setSelectedActorType("all");
    setPage(1);
  };

  const handleExportCsv = () => {
    const headers = ["ID", "Timestamp", "Actor Name", "Actor Email", "Actor Type", "Category", "Action", "Outcome", "Target Resource", "Company", "IP Address", "User Agent"];
    const rows = filteredEntries.map((e) => [
      e.id,
      e.createdAt,
      `"${e.actor.name.replace(/"/g, '""')}"`,
      `"${e.actor.email.replace(/"/g, '""')}"`,
      e.actor.type,
      e.category,
      `"${e.action.replace(/"/g, '""')}"`,
      e.outcome,
      `"${e.resource.label.replace(/"/g, '""')}"`,
      `"${(e.company?.name ?? "").replace(/"/g, '""')}"`,
      e.ipAddress,
      `"${e.userAgent.replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit-logs-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredEntries.length} audit records to CSV`);
  };

  const toggleSort = (field: "createdAt" | "actor" | "action") => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Breadcrumbs and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            <Link href={ROUTES.superAdmin.dashboard} className="hover:text-blue-600 transition-colors">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Audit Logs</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheckIcon className="size-5 text-blue-600" />
            <span>Platform Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable platform-wide audit trail for administrative governance, tenant changes, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs font-semibold gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <DownloadIcon className="size-3.5 text-slate-500" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => toast.success("Audit stream is synchronized in real-time.")}
            className="h-8 text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
          >
            <RefreshCwIcon className="size-3.5" />
            <span>Sync Live</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Cards (strictly gap-1 and equal height with h-full) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 items-stretch">
        <div className="rounded-lg border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Audit Events</span>
            <ActivityIcon className="size-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{stats.total}</div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Platform activity ledger</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Security Events</span>
            <ShieldAlertIcon className="size-4 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-600">{stats.securityCount}</div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Auth, tokens & policies</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Anomalies / Failures</span>
            <AlertCircleIcon className="size-4 text-rose-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-600">{stats.failureCount}</div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Failed or denied requests</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Staff Operations</span>
            <UserCheckIcon className="size-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{stats.internalCount}</div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Super Admin & internal ops</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3 h-full min-h-[92px] text-left flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Automated Jobs</span>
            <ServerIcon className="size-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600">{stats.systemCount}</div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Platform worker routines</p>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <Card className="shadow-2xs border-slate-200 bg-white">
        <CardContent className="p-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                placeholder="Search action, actor, company, IP or resource..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-8.5 text-xs bg-slate-50/50 border-slate-200 focus-visible:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>

            {/* Select Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8.5 text-xs w-[140px] bg-white border-slate-200">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(AUDIT_CATEGORY).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Outcome Filter */}
              <Select
                value={selectedOutcome}
                onValueChange={(val) => {
                  setSelectedOutcome(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8.5 text-xs w-[130px] bg-white border-slate-200">
                  <SelectValue placeholder="Outcome" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>

              {/* Actor Type */}
              <Select
                value={selectedActorType}
                onValueChange={(val) => {
                  setSelectedActorType(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8.5 text-xs w-[135px] bg-white border-slate-200">
                  <SelectValue placeholder="Actor Type" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="all">All Actors</SelectItem>
                  <SelectItem value="internal">Staff (Internal)</SelectItem>
                  <SelectItem value="customer">Tenant User</SelectItem>
                  <SelectItem value="system">System Worker</SelectItem>
                </SelectContent>
              </Select>

              {(search || selectedCategory !== "all" || selectedOutcome !== "all" || selectedActorType !== "all") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8.5 text-xs text-slate-500 hover:text-slate-900 gap-1 px-2.5"
                >
                  <XIcon className="size-3.5" />
                  <span>Clear</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Main Audit Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[150px] cursor-pointer" onClick={() => toggleSort("createdAt")}>
                <div className="flex items-center gap-1">
                  <span>Timestamp</span>
                  <ArrowUpDownIcon className="size-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="min-w-[180px] cursor-pointer" onClick={() => toggleSort("actor")}>
                <div className="flex items-center gap-1">
                  <span>Actor / Identity</span>
                  <ArrowUpDownIcon className="size-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="min-w-[130px]">Category</TableHead>
              <TableHead className="min-w-[200px] cursor-pointer" onClick={() => toggleSort("action")}>
                <div className="flex items-center gap-1">
                  <span>Action</span>
                  <ArrowUpDownIcon className="size-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="min-w-[160px]">Target Resource</TableHead>
              <TableHead className="min-w-[140px]">Company</TableHead>
              <TableHead className="min-w-[100px]">Outcome</TableHead>
              <TableHead className="w-16 text-right pr-3">View</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-slate-100">
            {pagedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                  <AlertCircleIcon className="size-6 mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-600">No matching audit events</p>
                  <p className="text-xs text-slate-400 mt-0.5">Try relaxing your search terms or filter criteria.</p>
                </TableCell>
              </TableRow>
            ) : (
              pagedEntries.map((entry) => (
                <TableRow
                  key={entry.id}
                  onClick={() => setSelectedEvent(entry)}
                  className="group text-xs cursor-pointer transition-colors hover:bg-slate-50/70"
                >
                  <TableCell className="py-2.5 whitespace-nowrap text-slate-500 font-mono">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-bold border border-slate-200 text-xs">
                        {entry.actor.type === "system" ? "SYS" : entry.actor.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {entry.actor.name}
                        </p>
                        <p className="text-slate-400 text-xs truncate">
                          {entry.actor.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                      {entry.category}
                    </span>
                  </TableCell>

                  <TableCell className="py-2.5">
                    <div className="font-medium text-slate-900 max-w-[240px] truncate" title={entry.action}>
                      {entry.action}
                    </div>
                    <div className="text-slate-400 text-xs font-mono truncate">
                      IP: {entry.ipAddress}
                    </div>
                  </TableCell>

                  <TableCell className="py-2.5">
                    <div className="max-w-[180px] truncate text-slate-700 font-medium" title={entry.resource.label}>
                      {entry.resource.label}
                    </div>
                    <div className="text-slate-400 text-xs font-mono truncate">
                      {entry.resource.id}
                    </div>
                  </TableCell>

                  <TableCell className="py-2.5">
                    {entry.company ? (
                      <span className="font-medium text-slate-800 truncate block max-w-[140px]" title={entry.company.name}>
                        {entry.company.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Platform-wide</span>
                    )}
                  </TableCell>

                  <TableCell className="py-2.5 whitespace-nowrap">
                    {entry.outcome === "success" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2Icon className="size-3 text-emerald-600" />
                        Success
                      </span>
                    ) : entry.outcome === "failure" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircleIcon className="size-3 text-rose-600" />
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangleIcon className="size-3 text-amber-600" />
                        Denied
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="py-2.5 text-right pr-3" onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEvent(entry)}
                      className="size-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      title="Inspect Event"
                    >
                      <EyeIcon className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Strip */}
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredEntries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filteredEntries.length)}
            </span>{" "}
            of <span className="font-semibold text-slate-800">{filteredEntries.length}</span> records
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs px-2.5 border-slate-200"
            >
              Previous
            </Button>
            <span className="px-2 font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 text-xs px-2.5 border-slate-200"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Detail Sheet Drawer */}
      <Sheet open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-white">
          <SheetHeader className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                AUD
              </span>
              <SheetTitle className="text-sm font-bold text-slate-900">
                Audit Event Inspector
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-slate-500">
              Immutable forensic transaction record for {selectedEvent?.id}.
            </SheetDescription>
          </SheetHeader>

          {selectedEvent && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Event Summary Card */}
              <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/40 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-xs">{selectedEvent.action}</span>
                  {selectedEvent.outcome === "success" ? (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                      SUCCESS
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 uppercase">
                      {selectedEvent.outcome}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 font-mono text-xs">{selectedEvent.id}</p>
                <div className="text-slate-600 text-xs flex items-center gap-1.5">
                  <ClockIcon className="size-3 text-slate-400" />
                  <span>{new Date(selectedEvent.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Actor Information */}
              <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Actor Information</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Name:</span>
                    <span className="font-semibold text-slate-800">{selectedEvent.actor.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Type:</span>
                    <span className="font-semibold text-slate-800 capitalize">{selectedEvent.actor.type}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block">Email:</span>
                    <span className="font-mono text-slate-700">{selectedEvent.actor.email}</span>
                  </div>
                </div>
              </div>

              {/* Target Resource & Company */}
              <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Target Resource & Scope</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resource Label:</span>
                    <span className="font-semibold text-slate-800">{selectedEvent.resource.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resource ID:</span>
                    <span className="font-mono text-slate-700">{selectedEvent.resource.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Resource Type:</span>
                    <span className="capitalize font-semibold text-slate-800">{selectedEvent.resource.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Associated Tenant:</span>
                    <span className="font-semibold text-slate-800">{selectedEvent.company?.name || "Global"}</span>
                  </div>
                </div>
              </div>

              {/* Network Context */}
              <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Network & Client Context</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">IP Address:</span>
                    <span className="font-mono font-semibold text-slate-800">{selectedEvent.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">User Agent:</span>
                    <span className="font-mono text-slate-600 block bg-slate-50 p-1.5 rounded border border-slate-200 break-all text-xs">
                      {selectedEvent.userAgent}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata JSON */}
              <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Payload Metadata</h4>
                <pre className="p-2 rounded bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto">
                  {JSON.stringify(selectedEvent.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedEvent(null)}
              className="h-8 text-xs"
            >
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
