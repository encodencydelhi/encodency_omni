/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Provider Health Summary Table
 */

"use client";

import Link from "next/link";
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  MoreVerticalIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatPercent, formatDuration } from "@/lib/utils/format";
import { ENDPOINT_STATUS_META, RATE_LIMIT_STATE_META } from "../data/config";
import type { ProviderApiHealth } from "../data/types";
import { ProviderLogo } from "@/features/integrations/components/provider-logo";

interface ProviderHealthTableProps {
  providers: ProviderApiHealth[];
}

const STATUS_DOT: Record<string, string> = {
  healthy: "bg-emerald-500",
  degraded: "bg-amber-500",
  failing: "bg-red-500",
  inactive: "bg-slate-300",
};

export function ProviderHealthTable({ providers }: ProviderHealthTableProps) {
  if (providers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
        <p className="text-xs text-slate-500">No provider health data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
          Provider Health & Telemetry
        </h3>
        <span className="text-xs text-slate-400 font-medium">
          {providers.length} Active Providers
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-2.5 px-3">Provider</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Requests</th>
              <th className="py-2.5 px-3 text-right">Success</th>
              <th className="py-2.5 px-3 text-right">Avg Latency</th>
              <th className="py-2.5 px-3 text-right">Errors</th>
              <th className="py-2.5 px-3">Rate Limit</th>
              <th className="py-2.5 px-3 text-right">Endpoints</th>
              <th className="py-2.5 px-3 text-right w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {providers.map((p) => {
              const statusMeta = ENDPOINT_STATUS_META[p.status];
              const rlMeta = RATE_LIMIT_STATE_META[p.rateLimitState];
              return (
                <tr key={p.provider} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <ProviderLogo providerId={p.provider} size="sm" />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={cn("size-2 rounded-full shrink-0", STATUS_DOT[p.status])} />
                        <span className="font-bold text-slate-900 truncate max-w-[180px]">
                          {p.providerName}
                        </span>
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
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-800">{formatNumber(p.totalRequests24h)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-medium text-slate-700">{formatPercent(p.successRate, 1)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-medium text-slate-700">{formatDuration(p.avgResponseMs)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={cn(
                        "tabular-nums font-bold",
                        p.errorCount24h > 50 ? "text-red-600" : p.errorCount24h > 10 ? "text-amber-600" : "text-slate-600"
                      )}
                    >
                      {formatNumber(p.errorCount24h)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                        rlMeta.tone === "success" && "bg-emerald-50 text-emerald-700",
                        rlMeta.tone === "warning" && "bg-amber-50 text-amber-700",
                        rlMeta.tone === "danger" && "bg-red-50 text-red-700"
                      )}
                    >
                      {rlMeta.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-700">{p.endpointCount}</td>
                  <td className="py-2.5 px-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-6 text-slate-400 hover:text-slate-700">
                          <MoreVerticalIcon className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 text-xs">
                        <DropdownMenuItem asChild className="text-xs cursor-pointer">
                          <Link href={`/super-admin/integrations/providers/${p.provider}`}>
                            <ExternalLinkIcon className="size-3.5 mr-2 text-slate-400" />
                            View Provider Detail
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="text-xs cursor-pointer">
                          <Link href="#endpoints">
                            <AlertTriangleIcon className="size-3.5 mr-2 text-slate-400" />
                            View Endpoints
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="text-xs cursor-pointer text-blue-600">
                          <Link href="/super-admin/integrations/issues">
                            <ShieldAlertIcon className="size-3.5 mr-2" />
                            View Related Issues
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
