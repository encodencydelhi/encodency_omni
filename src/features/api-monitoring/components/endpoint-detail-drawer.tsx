/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * Endpoint Detail Drawer
 */

"use client";

import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  ShieldAlertIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatPercent, formatDuration, formatDateTime } from "@/lib/utils/format";
import { ENDPOINT_STATUS_META, RATE_LIMIT_STATE_META, ERROR_CATEGORY_META } from "../data/config";
import type { ApiEndpoint, ApiErrorLog } from "../data/types";
import { ProviderLogo } from "@/features/integrations/components/provider-logo";

interface EndpointDetailDrawerProps {
  endpoint: ApiEndpoint | null;
  errorLogs: ApiErrorLog[];
  isOpen: boolean;
  onClose: () => void;
}

export function EndpointDetailDrawer({
  endpoint,
  errorLogs,
  isOpen,
  onClose,
}: EndpointDetailDrawerProps) {
  if (!endpoint) return null;

  const statusMeta = ENDPOINT_STATUS_META[endpoint.status];
  const rlMeta = RATE_LIMIT_STATE_META[endpoint.rateLimitState];
  const endpointErrors = errorLogs.filter((e) => e.endpointId === endpoint.id).slice(0, 10);
  const rlPercent = endpoint.rateLimitMax > 0
    ? Math.round(((endpoint.rateLimitMax - endpoint.rateLimitRemaining) / endpoint.rateLimitMax) * 100)
    : 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0 text-xs">
        <SheetHeader className="p-4 border-b border-slate-200/80 bg-slate-50/60 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ProviderLogo providerId={endpoint.provider} size="sm" />
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-200 text-slate-800">
                {endpoint.method}
              </span>
              <SheetTitle className="text-sm font-bold text-slate-900">
                {endpoint.displayName}
              </SheetTitle>
            </div>
            <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
              <XIcon className="size-4" />
            </Button>
          </div>
          <SheetDescription className="text-xs font-mono text-slate-500 mt-1">
            {endpoint.path}
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* Status Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                statusMeta.tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                statusMeta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
                statusMeta.tone === "danger" && "bg-red-50 text-red-700 border border-red-200",
                statusMeta.tone === "neutral" && "bg-slate-100 text-slate-600 border border-slate-200"
              )}
            >
              Status: {statusMeta.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                rlMeta.tone === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                rlMeta.tone === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
                rlMeta.tone === "danger" && "bg-red-50 text-red-700 border border-red-200"
              )}
            >
              Rate Limit: {rlMeta.label}
            </span>
            <span className="px-2 py-0.5 rounded border border-slate-200 text-xs font-mono font-semibold text-slate-700 bg-slate-50">
              {endpoint.provider}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: "Requests (24h)", value: formatNumber(endpoint.totalRequests24h) },
              { label: "Success Rate", value: formatPercent(endpoint.successRate, 1) },
              { label: "Avg Response", value: formatDuration(endpoint.avgResponseMs) },
              { label: "P95 Response", value: formatDuration(endpoint.p95ResponseMs) },
              { label: "P99 Response", value: formatDuration(endpoint.p99ResponseMs) },
              { label: "Errors (24h)", value: formatNumber(endpoint.errorCount24h) },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{m.label}</p>
                <p className="text-sm font-extrabold tabular-nums text-slate-900 mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Rate Limit */}
          <div className="rounded-xl border border-slate-200/90 p-3.5 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Rate Limit Consumption</span>
              <span className="text-xs text-slate-500 tabular-nums">
                {formatNumber(endpoint.rateLimitRemaining)} / {formatNumber(endpoint.rateLimitMax)} remaining
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  rlPercent > 90 ? "bg-red-500" : rlPercent > 70 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${rlPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              Resets at {formatDateTime(endpoint.rateLimitResetsAt)}
            </p>
          </div>

          {/* Last Error */}
          {endpoint.lastError && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
              <div className="flex items-center gap-1.5 text-red-800 font-bold text-xs mb-1">
                <AlertTriangleIcon className="size-3.5 text-red-600" />
                <span>Last Error</span>
              </div>
              <p className="text-xs text-red-700 font-mono">{endpoint.lastError}</p>
              <p className="text-xs text-red-400 mt-1">{formatDateTime(endpoint.lastErrorAt!)}</p>
            </div>
          )}

          {/* Recent Error Logs */}
          {endpointErrors.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                Recent Error Logs
              </h4>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                {endpointErrors.map((err) => {
                  const catMeta = ERROR_CATEGORY_META[err.category];
                  return (
                    <div key={err.id} className="rounded-lg border border-slate-100 p-2.5 text-xs bg-slate-50/60">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded font-bold font-mono text-xs",
                              err.statusCode >= 500 ? "bg-red-50 text-red-700 border border-red-200" :
                              err.statusCode >= 400 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                              "bg-slate-100 text-slate-600"
                            )}
                          >
                            {err.statusCode}
                          </span>
                          <span className="text-slate-800 font-medium truncate max-w-[180px]">{err.message}</span>
                          <span className="text-xs text-slate-400">({catMeta?.label || err.category})</span>
                        </div>
                        <span className="text-slate-400 tabular-nums shrink-0 whitespace-nowrap">{formatDateTime(err.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 font-semibold text-blue-600"
              onClick={() => {
                window.location.href = `/super-admin/integrations/providers/${endpoint.provider}`;
              }}
            >
              <ExternalLinkIcon className="size-3.5 mr-1.5" />
              View Provider Detail
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 font-semibold text-slate-700"
              onClick={() => {
                window.location.href = "/super-admin/integrations/issues";
              }}
            >
              <ShieldAlertIcon className="size-3.5 mr-1.5" />
              Integration Issues
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
