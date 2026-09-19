/**
 * EnCodency OmniPlatform - Super Admin API Monitoring Module
 * API Monitoring Overview Page Component
 */

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ActivityIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  ServerIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useApiMonitoringKpis,
  useApiEndpoints,
  useProviderApiHealth,
  useApiErrorBreakdown,
  useRequestTrends,
  useApiActivities,
  useApiErrorLogs,
  useResetApiMonitoringDemo,
} from "../data/hooks";
import type { ApiEndpoint } from "../data/types";
import {
  ApiMonitoringKpiCards,
  ProviderHealthTable,
  EndpointsTable,
  ErrorBreakdownPanel,
  RequestTrendsChart,
  ActivityFeed,
  EndpointDetailDrawer,
} from "../components";

export function ApiMonitoringPage() {
  const { data: kpis } = useApiMonitoringKpis();
  const { data: endpoints = [] } = useApiEndpoints();
  const { data: providerHealth = [] } = useProviderApiHealth();
  const { data: errorBreakdown = [] } = useApiErrorBreakdown();
  const { data: trends = [] } = useRequestTrends();
  const { data: activities = [] } = useApiActivities();
  const { data: allErrorLogs = [] } = useApiErrorLogs();
  const resetDemo = useResetApiMonitoringDemo();

  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleOpenEndpoint = (ep: ApiEndpoint) => {
    setSelectedEndpoint(ep);
    setDrawerOpen(true);
  };

  const failingEndpoints = useMemo(
    () => endpoints.filter((e) => e.status === "failing" || e.status === "degraded"),
    [endpoints]
  );

  return (
    <div className="space-y-4 max-w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              API Monitoring
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              Platform
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor API request volumes, response times, error rates, and rate limits across all platform integrations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="text-xs h-8 font-semibold bg-white text-slate-700"
          >
            <Link href="/super-admin/integrations">
              <ServerIcon className="size-3.5 mr-1.5 text-slate-500" />
              <span>View Integrations</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8 font-semibold bg-white text-slate-700"
            onClick={() => resetDemo.mutate()}
            disabled={resetDemo.isPending}
          >
            <RefreshCwIcon className={`size-3.5 mr-1.5 text-slate-500 ${resetDemo.isPending ? "animate-spin" : ""}`} />
            Reset Demo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && <ApiMonitoringKpiCards kpis={kpis} />}

      {/* Failing Endpoints Alert */}
      {failingEndpoints.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded bg-red-100">
              <ActivityIcon className="size-3 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-red-800">
                {failingEndpoints.length} endpoint{failingEndpoints.length !== 1 ? "s" : ""} need attention
              </p>
              <p className="text-xs text-red-600 truncate font-medium">
                {failingEndpoints.map((e) => e.displayName).join(", ")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-semibold text-red-700 hover:text-red-800 shrink-0"
              asChild
            >
              <Link href="#endpoints">
                View All
                <ArrowRightIcon className="size-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Provider Health Table */}
      <ProviderHealthTable providers={providerHealth} />

      {/* Request Trends + Error Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 items-stretch">
        <div className="lg:col-span-3 flex flex-col">
          <RequestTrendsChart trends={trends} className="h-full" />
        </div>
        <div className="lg:col-span-2 flex flex-col">
          <ErrorBreakdownPanel errors={errorBreakdown} className="h-full" />
        </div>
      </div>

      {/* Endpoints Table */}
      <div id="endpoints" className="space-y-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            API Endpoints
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            All monitored platform API endpoints with request metrics and rate limit status.
          </p>
        </div>
        <EndpointsTable endpoints={endpoints} onOpenEndpoint={handleOpenEndpoint} />
      </div>

      {/* Activity Feed */}
      <ActivityFeed activities={activities} />

      {/* Endpoint Detail Drawer */}
      <EndpointDetailDrawer
        endpoint={selectedEndpoint}
        errorLogs={allErrorLogs}
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedEndpoint(null); }}
      />
    </div>
  );
}
