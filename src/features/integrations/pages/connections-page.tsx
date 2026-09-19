/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Connections Directory Page Component
 */

"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { exportConnectionsToCsv } from "../data/export-utils";
import { useConnections, useConnectionResources } from "../data/hooks";
import {
  ConnectionsTable,
  IntegrationsNav,
  ConnectionsDirectorySkeleton,
} from "../components";

export function ConnectionsPage() {
  const { data: connections = [], isLoading: connectionsLoading } = useConnections();
  const { data: allResources = [], isLoading: resourcesLoading } = useConnectionResources();

  const totalAuthorizations = connections.length;
  const activeAuthorizations = connections.filter((c) => c.status === "active").length;
  const connectedResourcesCount = allResources.length;
  const healthyCount = connections.filter((c) => c.healthStatus === "healthy").length;
  const reconnectCount = connections.filter((c) => c.healthStatus === "needs_reconnect").length;
  const permissionCount = connections.filter((c) => c.healthStatus === "permission_issue").length;
  const disconnectedCount = connections.filter((c) => c.status === "revoked" || c.healthStatus === "disconnected").length;

  const handleExport = () => {
    exportConnectionsToCsv(connections);
  };

  if ((connectionsLoading && connections.length === 0) || (resourcesLoading && allResources.length === 0)) {
    return <ConnectionsDirectorySkeleton />;
  }

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Connections Directory
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {totalAuthorizations} Authorizations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Platform-wide inventory of tenant OAuth authorizations, granted scopes, and mapped resources.
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
          <span>Export All Connections</span>
        </Button>
      </div>

      {/* Navigation */}
      <IntegrationsNav />

      {/* KPI Cards Strip with gap-1 and equal height */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 items-stretch">
        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            TOTAL AUTHS
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {totalAuthorizations}
          </div>
          <span className="text-xs text-slate-400 truncate">Records</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            ACTIVE AUTHS
          </span>
          <div className="text-lg font-extrabold text-indigo-700">
            {activeAuthorizations}
          </div>
          <span className="text-xs text-slate-400 truncate">Active sessions</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            CONNECTED RESOURCES
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {connectedResourcesCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Pages / Locations</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            HEALTHY
          </span>
          <div className="text-lg font-extrabold text-emerald-700">
            {healthyCount}
          </div>
          <span className="text-xs text-slate-400 truncate">In good standing</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            NEEDS RECONNECT
          </span>
          <div
            className={cn(
              "text-lg font-extrabold",
              reconnectCount > 0 ? "text-amber-700" : "text-slate-700"
            )}
          >
            {reconnectCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Expired tokens</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            SCOPE ISSUES
          </span>
          <div
            className={cn(
              "text-lg font-extrabold",
              permissionCount > 0 ? "text-amber-700" : "text-slate-700"
            )}
          >
            {permissionCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Missing permissions</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            DISCONNECTED
          </span>
          <div className="text-lg font-extrabold text-slate-600">
            {disconnectedCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Revoked access</span>
        </div>
      </div>

      {/* Main Interactive Table */}
      <ConnectionsTable connections={connections} />
    </div>
  );
}
