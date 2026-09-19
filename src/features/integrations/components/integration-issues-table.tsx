/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Issues & Health Incident Operations Queue Component
 */

"use client";

import { useState, useMemo } from "react";
import { DownloadIcon, EyeIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { exportIssuesToCsv } from "../data/export-utils";
import { filterIssues } from "../data/selectors";
import type {
  IntegrationIssue,
  IssueSeverity,
  IssueStatus,
} from "../data/types";
import { IssueDetailDrawer } from "./issue-detail-drawer";
import { IssueSeverityBadge, IssueStatusBadge } from "./status-badges";
import { ProviderLogo } from "./provider-logo";

interface IntegrationIssuesTableProps {
  issues: IntegrationIssue[];
  className?: string;
}

const STATUS_TABS: { id: IssueStatus | "all"; label: string }[] = [
  { id: "all", label: "All Issues" },
  { id: "open", label: "Open" },
  { id: "investigating", label: "Investigating" },
  { id: "mitigated", label: "Mitigated" },
  { id: "resolved", label: "Resolved" },
];

export function IntegrationIssuesTable({
  issues,
  className,
}: IntegrationIssuesTableProps) {
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IssueStatus | "all">("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [selectedIssue, setSelectedIssue] = useState<IntegrationIssue | null>(null);

  // Distinct providers
  const providers = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((i) => set.add(i.providerId));
    return Array.from(set);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return filterIssues(issues, {
      query,
      severity: severityFilter,
      status: statusFilter,
      providerId: providerFilter,
    });
  }, [issues, query, severityFilter, statusFilter, providerFilter]);

  const handleExport = () => {
    exportIssuesToCsv(filteredIssues);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search issue number, title, provider..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 text-xs bg-white h-9 border-slate-200"
            />
          </div>

          {/* Severity Filter */}
          <Select
            value={severityFilter}
            onValueChange={(val: IssueSeverity | "all") => setSeverityFilter(val)}
          >
            <SelectTrigger className="w-[130px] text-xs h-9 bg-white">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>

          {/* Provider Filter */}
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[130px] text-xs h-9 bg-white">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="text-xs h-9 font-semibold text-slate-700 bg-white shrink-0"
        >
          <DownloadIcon className="size-3.5 mr-1.5" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Status Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border",
                isSelected
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Issue Details</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4 text-center">Affected Tenants</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Detected</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No active integration issues found for this filter.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((iss) => {
                  return (
                    <tr
                      key={iss.id}
                      onClick={() => setSelectedIssue(iss)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      {/* Severity */}
                      <td className="py-3 px-4">
                        <IssueSeverityBadge value={iss.severity} />
                      </td>

                      {/* Issue Details */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-400 font-bold">
                            {iss.issueNumber}
                          </span>
                          <span className="font-bold text-slate-900 group-hover:text-blue-600">
                            {iss.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {iss.summary}
                        </p>
                      </td>

                      {/* Scope */}
                      <td className="py-3 px-4 capitalize font-medium text-slate-600">
                        {iss.scope.replace("_", " ")}
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <ProviderLogo providerId={iss.providerId} size="sm" />
                          <span className="capitalize font-bold text-slate-800">
                            {iss.providerId}
                          </span>
                        </div>
                      </td>

                      {/* Affected Tenants */}
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {iss.affectedCompanyIds.length}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <IssueStatusBadge value={iss.status} />
                      </td>

                      {/* Detected */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(iss.detectedAt)}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedIssue(iss)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          <EyeIcon className="size-3.5 mr-1" />
                          <span>Investigate</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <IssueDetailDrawer
        issue={selectedIssue}
        isOpen={Boolean(selectedIssue)}
        onClose={() => setSelectedIssue(null)}
      />
    </div>
  );
}
