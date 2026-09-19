/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Endpoints Data Table with Filters and Scrollable Container
 */

"use client";

import { useState, useMemo } from "react";
import {
  ExternalLinkIcon,
  MoreVerticalIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatPercent, formatDuration, formatDateTime } from "@/lib/utils/format";
import { ENDPOINT_STATUS_META, RATE_LIMIT_STATE_META } from "../data/config";
import { filterEndpoints, DEFAULT_ENDPOINT_FILTERS, type EndpointFilters } from "../data/selectors";
import type { ApiEndpoint, EndpointStatus } from "../data/types";
import { ProviderLogo } from "@/features/integrations/components/provider-logo";

interface EndpointsTableProps {
  endpoints: ApiEndpoint[];
  onOpenEndpoint?: (endpoint: ApiEndpoint) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-blue-50 text-blue-700 border-blue-200",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  PATCH: "bg-orange-50 text-orange-700 border-orange-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
};

const QUICK_FILTERS: { id: EndpointStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "healthy", label: "Healthy" },
  { id: "degraded", label: "Degraded" },
  { id: "failing", label: "Failing" },
  { id: "inactive", label: "Inactive" },
];

export function EndpointsTable({ endpoints, onOpenEndpoint }: EndpointsTableProps) {
  const [filters, setFilters] = useState<EndpointFilters>(DEFAULT_ENDPOINT_FILTERS);

  // Extract distinct providers and categories
  const providers = useMemo(() => {
    const set = new Set<string>();
    endpoints.forEach((e) => set.add(e.provider));
    return Array.from(set).sort();
  }, [endpoints]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    endpoints.forEach((e) => set.add(e.category));
    return Array.from(set).sort();
  }, [endpoints]);

  const filtered = useMemo(() => filterEndpoints(endpoints, filters), [endpoints, filters]);

  return (
    <div className="space-y-3">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
          <Input
            placeholder="Search endpoint, path, or provider..."
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            className="pl-8 h-8 text-xs bg-white border-slate-200"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={filters.provider} onValueChange={(v) => setFilters((f) => ({ ...f, provider: v }))}>
            <SelectTrigger className="h-8 text-xs w-[120px] bg-white border-slate-200">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.category} onValueChange={(v) => setFilters((f) => ({ ...f, category: v }))}>
            <SelectTrigger className="h-8 text-xs w-[120px] bg-white border-slate-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.method} onValueChange={(v) => setFilters((f) => ({ ...f, method: v }))}>
            <SelectTrigger className="h-8 text-xs w-[100px] bg-white border-slate-200">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Methods</SelectItem>
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.sortBy} onValueChange={(v) => setFilters((f) => ({ ...f, sortBy: v as EndpointFilters["sortBy"] }))}>
            <SelectTrigger className="h-8 text-xs w-[130px] bg-white border-slate-200">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="requests">Most Requests</SelectItem>
              <SelectItem value="errors">Most Errors</SelectItem>
              <SelectItem value="latency">Highest Latency</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="recent">Recently Called</SelectItem>
            </SelectContent>
          </Select>
          {(filters.query || filters.provider !== "all" || filters.category !== "all" || filters.method !== "all" || filters.sortBy !== "requests") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-500"
              onClick={() => setFilters(DEFAULT_ENDPOINT_FILTERS)}
            >
              <RefreshCwIcon className="size-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {QUICK_FILTERS.map((qf) => (
          <button
            key={qf.id}
            type="button"
            onClick={() => setFilters((f) => ({ ...f, status: qf.id }))}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border shadow-2xs",
              filters.status === qf.id
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {qf.label}
          </button>
        ))}
      </div>

      {/* Table with fixed max-height and vertical scroll */}
      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/95 backdrop-blur-xs sticky top-0 z-10 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500 shadow-2xs">
              <tr>
                <th className="py-2.5 px-3">Endpoint</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Requests</th>
                <th className="py-2.5 px-3 text-right">Success</th>
                <th className="py-2.5 px-3 text-right">Avg</th>
                <th className="py-2.5 px-3 text-right">P95</th>
                <th className="py-2.5 px-3 text-right">Errors</th>
                <th className="py-2.5 px-3">Rate Limit</th>
                <th className="py-2.5 px-3 text-right">Last Call</th>
                <th className="py-2.5 px-3 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                    No endpoints match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((ep) => {
                  const statusMeta = ENDPOINT_STATUS_META[ep.status];
                  const rlMeta = RATE_LIMIT_STATE_META[ep.rateLimitState];
                  return (
                    <tr
                      key={ep.id}
                      onClick={() => onOpenEndpoint?.(ep)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <ProviderLogo providerId={ep.provider} size="sm" />
                          <span
                            className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-bold border",
                              METHOD_COLORS[ep.method]
                            )}
                          >
                            {ep.method}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[200px]">{ep.displayName}</p>
                            <p className="text-xs text-slate-400 font-mono truncate max-w-[200px]">{ep.path}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                            statusMeta.tone === "success" && "bg-emerald-50 text-emerald-700",
                            statusMeta.tone === "warning" && "bg-amber-50 text-amber-700",
                            statusMeta.tone === "danger" && "bg-red-50 text-red-700",
                            statusMeta.tone === "neutral" && "bg-slate-100 text-slate-600"
                          )}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-800">{formatNumber(ep.totalRequests24h)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium text-slate-700">{formatPercent(ep.successRate, 1)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-medium text-slate-700">{formatDuration(ep.avgResponseMs)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-slate-500">{formatDuration(ep.p95ResponseMs)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={cn(
                            "tabular-nums font-bold",
                            ep.errorCount24h > 20 ? "text-red-600" : ep.errorCount24h > 5 ? "text-amber-600" : "text-slate-600"
                          )}
                        >
                          {formatNumber(ep.errorCount24h)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold cursor-default",
                                rlMeta.tone === "success" && "bg-emerald-50 text-emerald-700",
                                rlMeta.tone === "warning" && "bg-amber-50 text-amber-700",
                                rlMeta.tone === "danger" && "bg-red-50 text-red-700"
                              )}
                            >
                              {rlMeta.label}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-[220px]">
                            {ep.rateLimitRemaining}/{ep.rateLimitMax} remaining. Resets at {formatDateTime(ep.rateLimitResetsAt)}.
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(ep.lastCalledAt)}
                      </td>
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-6 text-slate-400 hover:text-slate-700">
                              <MoreVerticalIcon className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            <DropdownMenuItem className="text-xs" onClick={() => onOpenEndpoint?.(ep)}>
                              <ExternalLinkIcon className="size-3.5 mr-2 text-slate-400" />
                              View Endpoint Detail
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs text-blue-600"
                              onClick={() => {
                                window.location.href = `/super-admin/integrations/providers/${ep.provider}`;
                              }}
                            >
                              <ExternalLinkIcon className="size-3.5 mr-2" />
                              Open Provider
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
