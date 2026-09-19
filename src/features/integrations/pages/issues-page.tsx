/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Issues & Incident Operations Page Component
 */

"use client";

import { useMemo } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { exportIssuesToCsv } from "../data/export-utils";
import { useIntegrationIssues, useProviders } from "../data/hooks";
import {
  IntegrationIssuesTable,
  IntegrationsNav,
  IssuesQueueSkeleton,
} from "../components";

export function IssuesPage() {
  const { data: issues = [], isLoading: issuesLoading } = useIntegrationIssues();
  const { data: providers = [], isLoading: providersLoading } = useProviders();

  const openProviderIncidents = issues.filter(
    (i) => i.scope === "provider_incident" && i.status !== "resolved"
  ).length;

  const openConnectionIssues = issues.filter(
    (i) => i.scope !== "provider_incident" && i.status !== "resolved"
  ).length;

  const criticalCount = issues.filter(
    (i) => i.severity === "critical" && i.status !== "resolved"
  ).length;

  const degradedProvidersCount = providers.filter(
    (p) => p.operationalHealth !== "operational"
  ).length;

  const affectedCompaniesCount = useMemo(() => {
    const set = new Set<string>();
    issues
      .filter((i) => i.status !== "resolved")
      .forEach((i) => i.affectedCompanyIds.forEach((id) => set.add(id)));
    return set.size;
  }, [issues]);

  const resolvedCount = issues.filter((i) => i.status === "resolved").length;

  const handleExport = () => {
    exportIssuesToCsv(issues);
  };

  if ((issuesLoading && issues.length === 0) || (providersLoading && providers.length === 0)) {
    return <IssuesQueueSkeleton />;
  }

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Issues & Health
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-amber-50 text-amber-800 rounded-full border border-amber-200">
              Operations Queue
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Platform-wide integration incident investigation, upstream API degradation, and authorization failures.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="text-xs h-8 font-semibold bg-white text-slate-700 shrink-0"
        >
          <DownloadIcon className="size-3.5 mr-1.5" />
          <span>Export Issues CSV</span>
        </Button>
      </div>

      {/* Navigation */}
      <IntegrationsNav />

      {/* Top Incident KPI Cards with gap-1 and equal height */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 items-stretch">
        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            PROVIDER INCIDENTS
          </span>
          <div
            className={cn(
              "text-lg font-extrabold",
              openProviderIncidents > 0 ? "text-amber-700" : "text-slate-800"
            )}
          >
            {openProviderIncidents}
          </div>
          <span className="text-xs text-slate-400 truncate">Upstream API</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            CONNECTION ISSUES
          </span>
          <div
            className={cn(
              "text-lg font-extrabold",
              openConnectionIssues > 0 ? "text-amber-700" : "text-slate-800"
            )}
          >
            {openConnectionIssues}
          </div>
          <span className="text-xs text-slate-400 truncate">Token & Scope</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            CRITICAL SEVERITY
          </span>
          <div
            className={cn(
              "text-lg font-extrabold",
              criticalCount > 0 ? "text-rose-700" : "text-slate-800"
            )}
          >
            {criticalCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Immediate action</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            DEGRADED PROVIDERS
          </span>
          <div
            className={cn(
              "text-lg font-extrabold",
              degradedProvidersCount > 0 ? "text-amber-700" : "text-slate-800"
            )}
          >
            {degradedProvidersCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Service warnings</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            AFFECTED TENANTS
          </span>
          <div
            className={cn(
              "text-lg font-extrabold",
              affectedCompaniesCount > 0 ? "text-purple-700" : "text-slate-800"
            )}
          >
            {affectedCompaniesCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Unique companies</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            RESOLVED ISSUES
          </span>
          <div className="text-lg font-extrabold text-emerald-700">
            {resolvedCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Closed items</span>
        </div>
      </div>

      {/* Main Interactive Issues Queue */}
      <IntegrationIssuesTable issues={issues} />
    </div>
  );
}
