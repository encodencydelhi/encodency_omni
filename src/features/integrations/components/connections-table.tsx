/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Connections Directory Table Component
 * Compact, interactive, with search, filters, quick preview drawer and CSV export
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  MailIcon,
  MoreVerticalIcon,
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
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { exportConnectionsToCsv } from "../data/export-utils";
import { filterConnections, type ConnectionFilters } from "../data/selectors";
import { ConnectionHealthBadge } from "./status-badges";
import { ConnectionPreviewDrawer } from "./connection-preview-drawer";
import { ReauthorizationRequestModal } from "./reauthorization-request-modal";
import { ProviderLogo, getPlatformName } from "./provider-logo";
import type { ProviderAuthorization, ConnectionHealthStatus } from "../data/types";

interface ConnectionsTableProps {
  connections: ProviderAuthorization[];
  initialProviderId?: string;
  className?: string;
}

const QUICK_FILTERS: { id: ConnectionHealthStatus | "all" | "expiring_soon"; label: string }[] = [
  { id: "all", label: "All Connections" },
  { id: "healthy", label: "Healthy" },
  { id: "needs_reconnect", label: "Reconnect Req" },
  { id: "permission_issue", label: "Permission Issues" },
  { id: "disconnected", label: "Disconnected" },
];

export function ConnectionsTable({
  connections,
  initialProviderId,
  className,
}: ConnectionsTableProps) {
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>(initialProviderId ?? "all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<ConnectionHealthStatus | "all">("all");
  const [sortBy, setSortBy] = useState<ConnectionFilters["sortBy"]>("recent");

  // Drawers & Modals
  const [previewAuth, setPreviewAuth] = useState<ProviderAuthorization | null>(null);
  const [reauthAuth, setReauthAuth] = useState<ProviderAuthorization | null>(null);

  // Extract distinct companies for the company filter dropdown
  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    connections.forEach((c) => {
      map.set(c.companyId, c.companyName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [connections]);

  // Extract distinct providers
  const providerOptions = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => set.add(c.providerId));
    return Array.from(set);
  }, [connections]);

  const filteredConnections = useMemo(() => {
    return filterConnections(connections, {
      query,
      providerId: providerFilter,
      companyId: companyFilter,
      healthStatus: healthFilter,
      sortBy,
    });
  }, [connections, query, providerFilter, companyFilter, healthFilter, sortBy]);

  const handleExport = () => {
    exportConnectionsToCsv(filteredConnections);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search provider, account, company..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 text-xs bg-white h-9 border-slate-200"
            />
          </div>

          {/* Provider Filter */}
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[140px] text-xs h-9 bg-white">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Providers</SelectItem>
              {providerOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  <div className="flex items-center gap-1.5">
                    <ProviderLogo providerId={p} size="xs" />
                    <span>{getPlatformName(p)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Company Filter */}
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[160px] text-xs h-9 bg-white">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Companies</SelectItem>
              {companyOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select
            value={sortBy}
            onValueChange={(val) => setSortBy(val as ConnectionFilters["sortBy"])}
          >
            <SelectTrigger className="w-[140px] text-xs h-9 bg-white">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="recent">Recently Connected</SelectItem>
              <SelectItem value="company">Company Name</SelectItem>
              <SelectItem value="last_sync">Latest Sync</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs h-9 font-semibold text-slate-700 bg-white"
          >
            <DownloadIcon className="size-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {QUICK_FILTERS.map((qf) => {
          const isSelected = healthFilter === qf.id;
          return (
            <button
              key={qf.id}
              type="button"
              onClick={() => setHealthFilter(qf.id as ConnectionHealthStatus | "all")}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border",
                isSelected
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {qf.label}
            </button>
          );
        })}
      </div>

      {/* Table Surface */}
      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">External Account</th>
                <th className="py-3 px-4">Parent Company</th>
                <th className="py-3 px-4">Auth Status</th>
                <th className="py-3 px-4">Health Status</th>
                <th className="py-3 px-4">Last Sync</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConnections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No connections match the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredConnections.map((c) => {
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setPreviewAuth(c)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      {/* Provider */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <ProviderLogo providerId={c.providerId} size="sm" />
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {getPlatformName(c.providerId)}
                            </span>
                            {c.providerId === "meta" && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                                  <ProviderLogo providerId="facebook" size="xs" />
                                  FB
                                </span>
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-pink-50 text-pink-700 text-xs font-semibold">
                                  <ProviderLogo providerId="instagram" size="xs" />
                                  IG
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* External Account Label */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600">
                          {c.authorizationLabel}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {c.id}
                        </div>
                      </td>

                      {/* Parent Company */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/super-admin/companies/${c.companyId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-slate-800 hover:text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Building2Icon className="size-3 text-slate-400" />
                          <span>{c.companyName}</span>
                        </Link>
                      </td>

                      {/* Auth Status */}
                      <td className="py-3 px-4 capitalize">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                            c.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* Health Status */}
                      <td className="py-3 px-4">
                        <ConnectionHealthBadge value={c.healthStatus} />
                      </td>

                      {/* Last Sync */}
                      <td className="py-3 px-4 text-slate-500">
                        {c.lastSuccessfulSyncAt
                          ? formatDateTime(c.lastSuccessfulSyncAt)
                          : "Never"}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                              <MoreVerticalIcon className="size-4" />
                              <span className="sr-only">Connection actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 text-xs">
                            <DropdownMenuItem
                              onClick={() => setPreviewAuth(c)}
                              className="cursor-pointer"
                            >
                              <EyeIcon className="size-3.5 mr-2 text-slate-500" />
                              <span>Quick Preview</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/super-admin/integrations/connections/${c.id}`}
                                className="cursor-pointer"
                              >
                                <ExternalLinkIcon className="size-3.5 mr-2 text-slate-500" />
                                <span>Open Full Detail</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/super-admin/companies/${c.companyId}`}
                                className="cursor-pointer"
                              >
                                <Building2Icon className="size-3.5 mr-2 text-slate-500" />
                                <span>Open Company</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setReauthAuth(c)}
                              className="cursor-pointer text-amber-700 focus:text-amber-800 focus:bg-amber-50"
                            >
                              <MailIcon className="size-3.5 mr-2" />
                              <span>Request Reauthorization</span>
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

      {/* Quick Preview Drawer */}
      <ConnectionPreviewDrawer
        authorization={previewAuth}
        isOpen={Boolean(previewAuth)}
        onClose={() => setPreviewAuth(null)}
        onRequestReauth={(auth) => {
          setPreviewAuth(null);
          setReauthAuth(auth);
        }}
      />

      {/* Reauthorization Request Modal */}
      <ReauthorizationRequestModal
        authorization={reauthAuth}
        isOpen={Boolean(reauthAuth)}
        onClose={() => setReauthAuth(null)}
      />
    </div>
  );
}
