/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Integrations Overview Page Component
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  LayersIcon,
  MoreVerticalIcon,
  PlugIcon,
  RotateCcwIcon,
  ServerIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/utils/format";
import {
  useIntegrationActivities,
  useIntegrationIssues,
  useIntegrationsKpis,
  useProviders,
  useResetIntegrationsDemo,
} from "../data/hooks";
import type { IntegrationProvider } from "../data/types";
import {
  IntegrationsKpiCards,
  IntegrationsNav,
  ProviderImpactDialog,
  ApiAccessBadge,
  AvailabilityBadge,
  OperationalHealthBadge,
  IssueSeverityBadge,
  IssueStatusBadge,
  ProviderLogo,
  IntegrationsOverviewSkeleton,
} from "../components";

export function IntegrationsOverviewPage() {
  const router = useRouter();
  const { data: kpis, isLoading: kpisLoading } = useIntegrationsKpis();
  const { data: providers } = useProviders();
  const { data: issues } = useIntegrationIssues();
  const { data: activities } = useIntegrationActivities();
  const resetDemo = useResetIntegrationsDemo();

  // Dialog states
  const [impactProvider, setImpactProvider] = useState<IntegrationProvider | null>(null);
  const [impactAction, setImpactAction] = useState<"disable_connections" | "enable_connections" | null>(null);
  const openIssues = issues?.filter((i) => i.status !== "resolved") ?? [];
  const recentActivities = activities?.slice(0, 5) ?? [];

  if (kpisLoading && !kpis) {
    return <IntegrationsOverviewSkeleton />;
  }

  return (
    <div className="space-y-4 max-w-full">
      {/* 1. Header with Title, Subtitle, and Primary Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Integrations
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              Platform Control Center
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage platform providers, connection health, capabilities and external service availability.
          </p>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="text-xs h-8 font-semibold bg-white text-slate-700"
          >
            <Link href="/super-admin/integrations/providers">
              <PlugIcon className="size-3.5 mr-1.5 text-slate-500" />
              <span>View Providers</span>
            </Link>
          </Button>

          <Button
            type="button"
            size="sm"
            asChild
            className="text-xs h-8 font-semibold bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Link href="/super-admin/integrations/connections">
              <LayersIcon className="size-3.5 mr-1.5" />
              <span>View Connections</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-8 text-slate-500 hover:text-slate-800 bg-white"
              >
                <MoreVerticalIcon className="size-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 text-xs">
              <DropdownMenuItem asChild>
                <Link
                  href="/super-admin/integrations/issues"
                  className="cursor-pointer"
                >
                  <AlertTriangleIcon className="size-3.5 mr-2 text-slate-500" />
                  <span>Review Integration Issues ({openIssues.length})</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/super-admin/integrations/activity"
                  className="cursor-pointer"
                >
                  <ClockIcon className="size-3.5 mr-2 text-slate-500" />
                  <span>View Provider Activity</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/super-admin/api-monitoring" className="cursor-pointer">
                  <ServerIcon className="size-3.5 mr-2 text-slate-500" />
                  <span>Open API Monitoring</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => resetDemo.mutate()}
                className="cursor-pointer text-slate-600 focus:text-slate-900"
              >
                <RotateCcwIcon className="size-3.5 mr-2" />
                <span>Reset Demo Workspace Data</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Internal Nav Tabs */}
      <IntegrationsNav />

      {/* 3. Top KPI Cards with gap-1 and equal height */}
      {kpis ? (
        <IntegrationsKpiCards
          kpis={kpis}
          onSelectFilter={(filterKey) => {
            if (filterKey === "total_providers" || filterKey === "live_providers" || filterKey === "approval_pending" || filterKey === "degraded_providers") {
              router.push("/super-admin/integrations/providers");
            } else if (filterKey === "active_connections" || filterKey === "healthy_connections" || filterKey === "reconnect_required") {
              router.push("/super-admin/integrations/connections");
            } else if (filterKey === "affected_companies") {
              router.push("/super-admin/integrations/issues");
            }
          }}
        />
      ) : (
        <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
      )}

      {/* 4. Provider Status Overview Grid & Needs Attention Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Left 2 Cols: Compact Provider Status Table */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Provider Status Overview
              </h2>
              <p className="text-xs text-slate-500">
                Core supported platform connectors, availability states, and developer access.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              asChild
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <Link href="/super-admin/integrations/providers">
                <span>View Full Catalogue</span>
                <ArrowRightIcon className="size-3 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/70 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Availability</th>
                  <th className="py-2.5 px-3">External API Access</th>
                  <th className="py-2.5 px-3 text-center">Active Conns</th>
                  <th className="py-2.5 px-3">Operational Health</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers?.slice(0, 6).map((provider) => (
                  <tr
                    key={provider.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <ProviderLogo providerId={provider.id} size="sm" />
                        <div>
                          <Link
                            href={`/super-admin/integrations/providers/${provider.id}`}
                            className="font-bold text-slate-900 hover:text-blue-600 block"
                          >
                            {provider.name}
                          </Link>
                          <span className="text-xs text-slate-400 capitalize">
                            {provider.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <AvailabilityBadge value={provider.platformAvailability} />
                    </td>
                    <td className="py-2.5 px-3">
                      <ApiAccessBadge value={provider.externalApiAccess} />
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                      {provider.activeConnectionsCount}
                    </td>
                    <td className="py-2.5 px-3">
                      <OperationalHealthBadge value={provider.operationalHealth} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-xs h-7 font-medium text-slate-600 hover:text-blue-600"
                      >
                        <Link
                          href={`/super-admin/integrations/providers/${provider.id}`}
                        >
                          Manage
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Operational Attention Queue */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div className="flex items-center gap-1.5">
                <AlertTriangleIcon className="size-4 text-amber-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Needs Attention ({openIssues.length})
                </h2>
              </div>
              <Link
                href="/super-admin/integrations/issues"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {openIssues.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-slate-100">
                  <CheckCircle2Icon className="size-5 text-emerald-500 mx-auto mb-1" />
                  <span>No urgent integration issues or outages detected.</span>
                </div>
              ) : (
                openIssues.slice(0, 4).map((iss) => (
                  <Link
                    key={iss.id}
                    href="/super-admin/integrations/issues"
                    className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-300 transition-all block space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <IssueSeverityBadge value={iss.severity} />
                        <span className="font-bold text-slate-800 text-xs truncate max-w-[140px]">
                          {iss.providerId.toUpperCase()}
                        </span>
                      </div>
                      <IssueStatusBadge value={iss.status} />
                    </div>
                    <div className="font-semibold text-slate-900 text-xs line-clamp-1">
                      {iss.title}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center justify-between">
                      <span>{iss.affectedCompanyIds.length} companies impacted</span>
                      <span>{formatDateTime(iss.detectedAt)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2">
            <Link
              href="/super-admin/integrations/issues"
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            >
              <span>Open Issue Command Queue</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Recent Platform Activity Feed Strip */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Recent Integration Telemetry & Events
            </h2>
            <p className="text-xs text-slate-500">
              Audit trails for tenant connections, credential verifications, and background sync jobs.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            asChild
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Link href="/super-admin/integrations/activity">
              <span>View All Activity ({activities?.length ?? 0})</span>
              <ArrowRightIcon className="size-3 ml-1" />
            </Link>
          </Button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {recentActivities.map((act) => (
            <div
              key={act.id}
              className="py-2.5 flex items-start justify-between gap-2 hover:bg-slate-50/60 px-1 rounded transition-colors"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="size-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {act.eventType.replace(/_/g, " ").toUpperCase()} •{" "}
                    <span className="capitalize font-bold text-slate-700">
                      {act.providerId}
                    </span>
                    {act.companyName && (
                      <span className="text-slate-500 font-normal">
                        {" "}
                        ({act.companyName})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 line-clamp-1 mt-0.5">
                    {act.description}
                  </p>
                </div>
              </div>
              <span className="text-slate-400 whitespace-nowrap shrink-0 text-xs">
                {formatDateTime(act.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Impact Dialog */}
      <ProviderImpactDialog
        provider={impactProvider}
        action={impactAction}
        isOpen={Boolean(impactProvider && impactAction)}
        onClose={() => {
          setImpactProvider(null);
          setImpactAction(null);
        }}
      />
    </div>
  );
}
