/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Integration Activity Feed Component
 */

"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2Icon,
  DownloadIcon,
  InfoIcon,
  SearchIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
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
import { exportActivitiesToCsv } from "../data/export-utils";
import { filterActivities } from "../data/selectors";
import type { IntegrationActivity } from "../data/types";
import { ProviderLogo, getPlatformName } from "./provider-logo";

interface IntegrationActivityTableProps {
  activities: IntegrationActivity[];
  initialProviderId?: string;
  className?: string;
}

export function IntegrationActivityTable({
  activities,
  initialProviderId,
  className,
}: IntegrationActivityTableProps) {
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>(initialProviderId ?? "all");
  const [resultFilter, setResultFilter] = useState<"all" | "success" | "warning" | "failure" | "info">("all");

  const providers = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => set.add(a.providerId));
    return Array.from(set);
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return filterActivities(activities, {
      query,
      providerId: providerFilter,
      result: resultFilter,
    });
  }, [activities, query, providerFilter, resultFilter]);

  const handleExport = () => {
    exportActivitiesToCsv(filteredActivities);
  };

  const getResultBadge = (result: IntegrationActivity["result"]) => {
    switch (result) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2Icon className="size-3" />
            <span>Success</span>
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldAlertIcon className="size-3" />
            <span>Warning</span>
          </span>
        );
      case "failure":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircleIcon className="size-3" />
            <span>Failure</span>
          </span>
        );
      case "info":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <InfoIcon className="size-3" />
            <span>Info</span>
          </span>
        );
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Search activity description, actor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 text-xs bg-white h-9 border-slate-200"
            />
          </div>

          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[130px] text-xs h-9 bg-white">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Providers</SelectItem>
              {providers.map((p) => (
                <SelectItem key={p} value={p}>
                  <div className="flex items-center gap-1.5">
                    <ProviderLogo providerId={p} size="xs" />
                    <span>{getPlatformName(p)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={resultFilter}
            onValueChange={(val: any) => setResultFilter(val)}
          >
            <SelectTrigger className="w-[130px] text-xs h-9 bg-white">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="info">Info</SelectItem>
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

      {/* Table */}
      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Organization / Client</th>
                <th className="py-3 px-4">Action & Details</th>
                <th className="py-3 px-4 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No integration activities recorded for this filter.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => {
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(act.timestamp)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">
                          {act.actor.name}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          {act.actor.type.replace("_", " ")}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {(() => {
                          const channelId = act.description.toLowerCase().includes("instagram")
                            ? "instagram"
                            : act.description.toLowerCase().includes("facebook")
                            ? "facebook"
                            : act.providerId;
                          const channelLabel = act.description.toLowerCase().includes("instagram")
                            ? "Instagram"
                            : act.description.toLowerCase().includes("facebook")
                            ? "Facebook"
                            : getPlatformName(act.providerId);
                          return (
                            <div className="flex items-center gap-2">
                              <ProviderLogo providerId={channelId} size="sm" />
                              <span className="font-bold text-slate-800">
                                {channelLabel}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {act.companyName || "—"}
                        {act.clientName && (
                          <span className="text-slate-400 block text-xs">
                            ↳ {act.clientName}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="font-semibold text-slate-900">
                          {act.eventType.replace(/_/g, " ").toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {act.description}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {getResultBadge(act.result)}
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
