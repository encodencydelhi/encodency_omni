/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Connection Detail Command Center Page Component
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  Building2Icon,
  CheckCircle2Icon,
  MailIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import {
  useConnection,
  useConnectionResources,
  useIntegrationActivities,
} from "../data/hooks";
import {
  ConnectionHealthBadge,
  IntegrationActivityTable,
  ReauthorizationRequestModal,
  ResourceMappingTable,
  ProviderLogo,
  ConnectionDetailSkeleton,
} from "../components";

import { useParams } from "next/navigation";

interface ConnectionDetailPageProps {
  connectionId?: string;
}

export function ConnectionDetailPage({
  connectionId,
}: ConnectionDetailPageProps) {
  const params = useParams();
  const effectiveId = connectionId || (params?.connectionId as string) || "";
  const { data: connection, isLoading: connectionLoading } = useConnection(effectiveId);
  const { data: resources = [] } = useConnectionResources(effectiveId);
  const { data: activities = [] } = useIntegrationActivities();

  const [activeTab, setActiveTab] = useState("overview");
  const [isReauthModalOpen, setIsReauthModalOpen] = useState(false);

  if (connectionLoading && !connection) {
    return <ConnectionDetailSkeleton />;
  }

  if (!connection) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
        <AlertTriangleIcon className="size-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Connection Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested authorization record &apos;{connectionId}&apos; does not exist.
        </p>
        <Button asChild size="sm" variant="outline" className="text-xs">
          <Link href="/super-admin/integrations/connections">
            Back to Connections Directory
          </Link>
        </Button>
      </div>
    );
  }

  const connectionActivities = activities.filter(
    (a) => a.companyId === connection.companyId && a.providerId === connection.providerId
  );

  return (
    <div className="space-y-4 max-w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/super-admin/integrations/connections"
          className="hover:text-blue-600 flex items-center gap-1 font-medium"
        >
          <ArrowLeftIcon className="size-3" />
          <span>Connections Directory</span>
        </Link>
        <span>/</span>
        <span className="font-bold text-slate-800 truncate max-w-sm">
          {connection.authorizationLabel}
        </span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <ProviderLogo providerId={connection.providerId} size="md" />
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
              {connection.authorizationLabel}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
            <Link
              href={`/super-admin/companies/${connection.companyId}`}
              className="font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Building2Icon className="size-3.5" />
              <span>{connection.companyName}</span>
            </Link>
            <span>•</span>
            <ConnectionHealthBadge value={connection.healthStatus} />
            <span>•</span>
            <span>
              Connected by {connection.connectedBy.name} on{" "}
              {formatDate(connection.connectedAt)}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsReauthModalOpen(true)}
            className="text-xs h-8 font-semibold text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100"
          >
            <MailIcon className="size-3.5 mr-1.5" />
            <span>Request Reauthorization</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            asChild
            className="text-xs h-8 font-semibold text-slate-700 bg-white"
          >
            <Link href={`/super-admin/companies/${connection.companyId}`}>
              <Building2Icon className="size-3.5 mr-1.5 text-slate-400" />
              <span>Company Profile</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Metrics Strip with gap-1 and equal height */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 items-stretch">
        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            AUTHORIZATION ID
          </span>
          <div className="text-xs font-mono font-bold text-slate-800 truncate">
            {connection.id}
          </div>
          <span className="text-xs text-slate-400 truncate">Platform Ref</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            DISCOVERED RESOURCES
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {resources.length}
          </div>
          <span className="text-xs text-slate-400 truncate">Pages / Locations</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            AUTH STATUS
          </span>
          <div className="text-xs font-bold capitalize text-emerald-700">
            {connection.status}
          </div>
          <span className="text-xs text-slate-400 truncate">OAuth Session</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            TOKEN EXPIRATION
          </span>
          <div className="text-xs font-bold text-slate-800 truncate">
            {connection.tokenExpiresAt
              ? formatDate(connection.tokenExpiresAt)
              : "No Expiration"}
          </div>
          <span className="text-xs text-slate-400 truncate">Refresh cycle</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            LAST SUCCESSFUL SYNC
          </span>
          <div className="text-xs font-bold text-slate-800 truncate">
            {connection.lastSuccessfulSyncAt
              ? formatDateTime(connection.lastSuccessfulSyncAt)
              : "None Recorded"}
          </div>
          <span className="text-xs text-slate-400 truncate">Sync Engine</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            RECENT FAILURES
          </span>
          <div
            className={cn(
              "text-lg font-extrabold",
              connection.recentFailureCount > 0 ? "text-rose-700" : "text-slate-800"
            )}
          >
            {connection.recentFailureCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Error count</span>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-slate-200 p-0 h-auto rounded-none text-xs flex items-center gap-2 overflow-x-auto w-full justify-start">
          <TabsTrigger
            value="overview"
            className="text-xs font-semibold py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent shadow-none"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="resources"
            className="text-xs font-semibold py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent shadow-none"
          >
            Resources & Client Mapping ({resources.length})
          </TabsTrigger>
          <TabsTrigger
            value="permissions"
            className="text-xs font-semibold py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent shadow-none"
          >
            Permissions ({connection.grantedScopes.length})
          </TabsTrigger>
          <TabsTrigger
            value="sync"
            className="text-xs font-semibold py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent shadow-none"
          >
            Sync & Health Telemetry
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="text-xs font-semibold py-2.5 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent shadow-none"
          >
            Connection Activity ({connectionActivities.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4 pt-3 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Identity & Ownership */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Connection Identity & Tenant Silo
                </h2>
                <p className="text-xs text-slate-500">
                  Company ownership boundary and authorization parameters.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Tenant Organization:</span>
                  <Link
                    href={`/super-admin/companies/${connection.companyId}`}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    {connection.companyName}
                  </Link>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Internal Company ID:</span>
                  <span className="font-mono text-slate-800">{connection.companyId}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Authorized User:</span>
                  <span className="font-semibold text-slate-800">
                    {connection.connectedBy.name} ({connection.connectedBy.email})
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">User Tenant Role:</span>
                  <span className="capitalize font-bold text-slate-700">
                    {connection.connectedBy.role}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Auth Protocol:</span>
                  <span className="uppercase font-mono font-bold text-slate-700">
                    {connection.authMethod}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnostic State & Errors */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Operational Health & Telemetry
                </h2>
                <p className="text-xs text-slate-500">
                  Current background synchronization and API response codes.
                </p>
              </div>

              {connection.latestErrorMessage ? (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangleIcon className="size-3.5 text-amber-600" />
                    <span>Active Issue Diagnostic:</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {connection.latestErrorMessage}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsReauthModalOpen(true)}
                    className="text-xs h-7 bg-amber-700 hover:bg-amber-800 text-white mt-1 font-semibold"
                  >
                    Request Tenant Reauthorization
                  </Button>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    All telemetry probes operational. No active rate limits or token exceptions.
                  </span>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Resources & Mapping */}
        <TabsContent value="resources" className="pt-3">
          <ResourceMappingTable resources={resources} />
        </TabsContent>

        {/* Tab 3: Permissions */}
        <TabsContent value="permissions" className="space-y-4 pt-3 text-xs">
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  OAuth Permission Scope Analysis
                </h2>
                <p className="text-xs text-slate-500">
                  Comparison between required platform capabilities and user-granted scopes.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsReauthModalOpen(true)}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <MailIcon className="size-3.5 mr-1" />
                <span>Request Scope Upgrade</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Granted Scopes */}
              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center justify-between">
                  <span>Granted Scopes ({connection.grantedScopes.length})</span>
                  <CheckCircle2Icon className="size-3.5 text-emerald-600" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {connection.grantedScopes.map((scope) => (
                    <span
                      key={scope}
                      className="px-2 py-0.5 rounded bg-emerald-100/70 border border-emerald-200 text-emerald-800 font-mono text-xs"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Scopes */}
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-2">
                <div className="font-bold text-amber-900 flex items-center justify-between">
                  <span>Missing Required Scopes ({connection.missingScopes.length})</span>
                  <AlertTriangleIcon className="size-3.5 text-amber-600" />
                </div>
                {connection.missingScopes.length === 0 ? (
                  <span className="text-slate-500 italic">
                    No missing scopes; all required permissions are satisfied.
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {connection.missingScopes.map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-0.5 rounded bg-amber-100/70 border border-amber-200 text-amber-900 font-mono text-xs"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Sync & Health */}
        <TabsContent value="sync" className="space-y-4 pt-3 text-xs">
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
            <div className="border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Synchronization Engine Diagnostics
              </h2>
              <p className="text-xs text-slate-500">
                Background polling cycles, rate limit allocations, and worker execution health.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                <span className="text-slate-500 font-medium block">Last Successful Sync</span>
                <span className="font-bold text-slate-900">
                  {connection.lastSuccessfulSyncAt
                    ? formatDateTime(connection.lastSuccessfulSyncAt)
                    : "None"}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                <span className="text-slate-500 font-medium block">Last Attempted Sync</span>
                <span className="font-bold text-slate-900">
                  {connection.lastAttemptedSyncAt
                    ? formatDateTime(connection.lastAttemptedSyncAt)
                    : "None"}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70">
                <span className="text-slate-500 font-medium block">Rate-Limit Backoff</span>
                <span className="font-bold text-slate-900">
                  {connection.rateLimitResetAt
                    ? `Reset in ${formatDate(connection.rateLimitResetAt)}`
                    : "Normal / Unrestricted"}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Activity */}
        <TabsContent value="activity" className="pt-3">
          <IntegrationActivityTable activities={connectionActivities} />
        </TabsContent>
      </Tabs>

      {/* Reauthorization Request Modal */}
      <ReauthorizationRequestModal
        authorization={connection}
        isOpen={isReauthModalOpen}
        onClose={() => setIsReauthModalOpen(false)}
      />
    </div>
  );
}
