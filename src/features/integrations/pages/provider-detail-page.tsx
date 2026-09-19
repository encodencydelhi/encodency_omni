/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Provider Detail Command Center Page Component
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BanIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  LayersIcon,
  MoreVerticalIcon,
  RadioIcon,
  ServerIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import {
  useConnections,
  useIntegrationActivities,
  useIntegrationIssues,
  useProvider,
  useProviderCapabilities,
  useProviderConfig,
} from "../data/hooks";
import {
  ApiAccessBadge,
  AvailabilityBadge,
  ConnectionsTable,
  IntegrationActivityTable,
  IntegrationIssuesTable,
  OperationalHealthBadge,
  ProviderCapabilityMatrix,
  ProviderConfigModal,
  ProviderImpactDialog,
  ProviderLogo,
  ProviderDetailSkeleton,
} from "../components";

import { useParams } from "next/navigation";

interface ProviderDetailPageProps {
  providerId?: string;
}

export function ProviderDetailPage({ providerId }: ProviderDetailPageProps) {
  const params = useParams();
  const effectiveId = providerId || (params?.providerId as string) || "";
  const { data: provider, isLoading: providerLoading } = useProvider(effectiveId);
  const { data: config } = useProviderConfig(effectiveId);
  const { data: capabilities = [] } = useProviderCapabilities(effectiveId);
  const { data: connections = [] } = useConnections(effectiveId);
  const { data: issues = [] } = useIntegrationIssues();
  const { data: activities = [] } = useIntegrationActivities();

  const [activeTab, setActiveTab] = useState("overview");

  // Modals
  const [isImpactOpen, setIsImpactOpen] = useState(false);
  const [impactAction, setImpactAction] = useState<"disable_connections" | "enable_connections">("disable_connections");
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  if (providerLoading && !provider) {
    return <ProviderDetailSkeleton />;
  }

  if (!provider) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
        <AlertTriangleIcon className="size-10 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Provider Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested integration provider ID &apos;{providerId}&apos; does not exist in the catalogue.
        </p>
        <Button asChild size="sm" variant="outline" className="text-xs">
          <Link href="/super-admin/integrations/providers">
            Back to Provider Catalogue
          </Link>
        </Button>
      </div>
    );
  }

  const providerIssues = issues.filter((i) => i.providerId === provider.id);
  const providerActivities = activities.filter((a) => a.providerId === provider.id);

  // Configuration Readiness Checklist
  const readinessChecklist = [
    { label: "Provider Definition Complete", status: true },
    { label: "OAuth 2.0 Redirect URI Configured", status: Boolean(config?.redirectUri) },
    { label: "Required Scopes Declared", status: (config?.requiredScopes.length ?? 0) > 0 },
    { label: "Backend Credentials in Secure Vault", status: config?.credentialConfigured ?? true },
    { label: "External Developer App Approved", status: provider.externalApiAccess === "approved" },
    { label: "Connector Implementation Available", status: true },
    { label: "Operational Telemetry Active", status: provider.operationalHealth !== "unknown" },
  ];

  const completedReadinessCount = readinessChecklist.filter((c) => c.status).length;

  return (
    <div className="space-y-4 max-w-full">
      {/* Top Breadcrumb / Back Link */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href="/super-admin/integrations/providers"
          className="hover:text-blue-600 flex items-center gap-1 font-medium"
        >
          <ArrowLeftIcon className="size-3" />
          <span>Provider Catalogue</span>
        </Link>
        <span>/</span>
        <span className="font-bold text-slate-800">{provider.name}</span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
        <div className="flex items-center gap-3">
          <ProviderLogo providerId={provider.id} size="xl" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                {provider.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-100 text-slate-600">
                {provider.id}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <AvailabilityBadge value={provider.platformAvailability} />
              <ApiAccessBadge value={provider.externalApiAccess} />
              <OperationalHealthBadge value={provider.operationalHealth} />
              <span className="text-xs text-slate-400">
                Updated {formatDate(provider.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsConfigModalOpen(true)}
            className="text-xs h-8 font-semibold text-slate-700 bg-white"
          >
            <SlidersHorizontalIcon className="size-3.5 mr-1.5" />
            <span>Configure</span>
          </Button>

          {provider.platformAvailability !== "disabled" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setImpactAction("disable_connections");
                setIsImpactOpen(true);
              }}
              className="text-xs h-8 font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <BanIcon className="size-3.5 mr-1.5" />
              <span>Disable New Conns</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setImpactAction("enable_connections");
                setIsImpactOpen(true);
              }}
              className="text-xs h-8 font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <CheckCircle2Icon className="size-3.5 mr-1.5" />
              <span>Restore Availability</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-8 text-slate-500 hover:text-slate-800 bg-white"
              >
                <MoreVerticalIcon className="size-4" />
                <span className="sr-only">More provider actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuItem
                onClick={() => setActiveTab("capabilities")}
                className="cursor-pointer"
              >
                <LayersIcon className="size-3.5 mr-2 text-slate-500" />
                <span>Capability Matrix</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveTab("health")}
                className="cursor-pointer"
              >
                <RadioIcon className="size-3.5 mr-2 text-slate-500" />
                <span>Review Incidents ({providerIssues.length})</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/super-admin/api-monitoring" className="cursor-pointer">
                  <ServerIcon className="size-3.5 mr-2 text-slate-500" />
                  <span>Open API Monitoring</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  <ExternalLinkIcon className="size-3.5 mr-2 text-slate-500" />
                  <span>External API Docs</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Metrics Strip with gap-1 and equal height */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 items-stretch">
        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            ACTIVE CONNS
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {provider.activeConnectionsCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Authorizations</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            RESOURCES
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {provider.connectedResourcesCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Pages & Accounts</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            AFFECTED TENANTS
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {provider.affectedCompaniesCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Companies</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            HEALTHY
          </span>
          <div className="text-lg font-extrabold text-emerald-700">
            {provider.healthyConnectionsCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Operational</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            NEEDS REAUTH
          </span>
          <div
            className={cn(
              "text-lg font-extrabold",
              provider.reconnectRequiredCount > 0 ? "text-amber-700" : "text-slate-700"
            )}
          >
            {provider.reconnectRequiredCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Expired Tokens</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            FAILURES (24H)
          </span>
          <div className="text-lg font-extrabold text-slate-900">
            {provider.recentFailuresCount}
          </div>
          <span className="text-xs text-slate-400 truncate">Sync Exceptions</span>
        </div>

        <div className="p-3 rounded-xl border border-slate-200/90 bg-white text-left h-full min-h-[86px] flex flex-col justify-between">
          <span className="text-xs font-bold uppercase text-slate-500 truncate">
            LAST SUCCESS
          </span>
          <div className="text-xs font-bold text-slate-800 truncate">
            {provider.lastSuccessfulOperationAt
              ? formatDateTime(provider.lastSuccessfulOperationAt)
              : "None Recorded"}
          </div>
          <span className="text-xs text-slate-400 truncate">Live API ping</span>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent border-b border-slate-200/90 w-full justify-start rounded-none h-auto p-0 gap-1 overflow-x-auto scrollbar-none">
          <TabsTrigger
            value="overview"
            className="relative py-2.5 px-3.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-none"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="configuration"
            className="relative py-2.5 px-3.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-none"
          >
            Configuration
          </TabsTrigger>
          <TabsTrigger
            value="capabilities"
            className="relative py-2.5 px-3.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-none"
          >
            Capabilities ({capabilities.length})
          </TabsTrigger>
          <TabsTrigger
            value="connections"
            className="relative py-2.5 px-3.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-none"
          >
            Connections ({connections.length})
          </TabsTrigger>
          <TabsTrigger
            value="health"
            className="relative py-2.5 px-3.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-none"
          >
            Health & Usage ({providerIssues.length})
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="relative py-2.5 px-3.5 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all shadow-none"
          >
            Activity Log ({providerActivities.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4 pt-3 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Identity & Technical Metadata */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Provider Identity & Connector Architecture
                </h2>
                <p className="text-xs text-slate-500">
                  Technical specifications, authorization protocol, and developer portal verification.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70">
                  <span className="text-slate-500 font-medium block">Internal Key</span>
                  <span className="font-mono font-bold text-slate-900">{provider.id}</span>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70">
                  <span className="text-slate-500 font-medium block">Category</span>
                  <span className="capitalize font-bold text-slate-900">{provider.category}</span>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70">
                  <span className="text-slate-500 font-medium block">Auth Protocol</span>
                  <span className="uppercase font-bold text-slate-900">{provider.authMethod}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-700 block">Description:</span>
                <p className="text-slate-600 leading-relaxed">{provider.description}</p>
              </div>

              {provider.appReviewNotes && (
                <div className="p-3 rounded-lg border border-blue-100 bg-blue-50/50 space-y-1 text-blue-900">
                  <span className="font-bold block">Developer Portal Review Notes:</span>
                  <p className="text-xs leading-relaxed">{provider.appReviewNotes}</p>
                </div>
              )}
            </div>

            {/* Configuration Readiness Checklist */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Readiness Score
                  </h2>
                  <p className="text-xs text-slate-500">Operational checklist</p>
                </div>
                <span className="text-xs font-bold text-blue-600">
                  {completedReadinessCount}/{readinessChecklist.length}
                </span>
              </div>

              <div className="space-y-2">
                {readinessChecklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0"
                  >
                    <span className="text-slate-700">{item.label}</span>
                    {item.status ? (
                      <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangleIcon className="size-4 text-amber-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Configuration */}
        <TabsContent value="configuration" className="pt-3">
          {config ? (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Provider Configuration Workspace
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Platform-wide authorization parameters, scopes, vault secret status, and operational controls.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <SlidersHorizontalIcon className="size-3.5 mr-1.5" />
                  <span>Edit Configuration</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* General Parameters */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      General Parameters
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Provider Code</span>
                      <span className="font-mono font-bold text-slate-800">{config.providerCode}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Environment</span>
                      <span className="capitalize font-semibold text-slate-800">{config.environment}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Platform Availability</span>
                      <AvailabilityBadge value={config.platformAvailability} />
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 font-medium">API Approval Status</span>
                      <ApiAccessBadge value={config.externalApiApprovalStatus} />
                    </div>
                  </div>
                </div>

                {/* Authorization & Scopes */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      Authorization & Scopes
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Auth Method</span>
                      <span className="capitalize font-mono font-bold text-slate-800">{config.authMethod}</span>
                    </div>
                    <div className="py-1 border-b border-slate-50">
                      <span className="text-slate-500 block mb-1 font-medium">Redirect URI Reference:</span>
                      <span className="font-mono text-xs text-slate-700 bg-slate-50 p-1.5 rounded block truncate border border-slate-100">
                        {config.redirectUri}
                      </span>
                    </div>
                    <div className="py-1">
                      <span className="text-slate-500 block mb-1 font-medium">
                        Required Scopes ({config.requiredScopes.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {config.requiredScopes.map((sc) => (
                          <span
                            key={sc}
                            className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-mono text-xs"
                          >
                            {sc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Secure Credential Status */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      Secure Credential Vault Status
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Secret Reference</span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {config.secretReferenceStatus.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Safe Public App ID</span>
                      <span className="font-mono font-bold text-slate-800">{config.publicAppId}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 font-medium">Last Rotated</span>
                      <span className="text-slate-700 font-medium">
                        {config.lastRotatedAt ? formatDate(config.lastRotatedAt) : "Never"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operational Controls */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
                  <div className="border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      Operational Controls
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600 font-medium">Allow New Tenant Connections</span>
                      <span className={cn("px-2 py-0.5 rounded font-bold", config.allowNewConnections ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50")}>
                        {config.allowNewConnections ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600 font-medium">Allow Existing Publishing Operations</span>
                      <span className={cn("px-2 py-0.5 rounded font-bold", config.allowExistingPublishing ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50")}>
                        {config.allowExistingPublishing ? "Enabled" : "Paused"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600 font-medium">Allow Existing Sync Operations</span>
                      <span className={cn("px-2 py-0.5 rounded font-bold", config.allowExistingSync ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50")}>
                        {config.allowExistingSync ? "Enabled" : "Paused"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-600 font-medium">Webhook Ingestion Engine</span>
                      <span className={cn("px-2 py-0.5 rounded font-bold", config.enableWebhooks ? "text-emerald-700 bg-emerald-50" : "text-slate-600 bg-slate-100")}>
                        {config.enableWebhooks ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              Provider configuration not available.
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Capabilities */}
        <TabsContent value="capabilities" className="pt-3">
          <ProviderCapabilityMatrix
            capabilities={capabilities}
            provider={provider}
            config={config ?? undefined}
          />
        </TabsContent>

        {/* Tab 4: Connections */}
        <TabsContent value="connections" className="pt-3">
          <ConnectionsTable
            connections={connections}
            initialProviderId={provider.id}
          />
        </TabsContent>

        {/* Tab 5: Health & Usage */}
        <TabsContent value="health" className="space-y-4 pt-3 text-xs">
          {/* Health Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 items-stretch">
            <div className="p-3 rounded-xl border border-slate-200/90 bg-white h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
              <span className="text-xs font-bold uppercase text-slate-500 truncate">
                Operational Health
              </span>
              <div className="mt-1">
                <OperationalHealthBadge value={provider.operationalHealth} />
              </div>
              <span className="text-xs text-slate-400 truncate mt-1">Provider status</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/90 bg-white h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
              <span className="text-xs font-bold uppercase text-slate-500 truncate">
                Connection Failures (24H)
              </span>
              <div className={cn("text-lg font-extrabold", provider.recentFailuresCount > 0 ? "text-rose-700" : "text-slate-800")}>
                {provider.recentFailuresCount}
              </div>
              <span className="text-xs text-slate-400 truncate">Sync exceptions</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/90 bg-white h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
              <span className="text-xs font-bold uppercase text-slate-500 truncate">
                Rate Limit State
              </span>
              <div className="text-xs font-bold text-emerald-700 mt-1">Normal</div>
              <span className="text-xs text-slate-400 truncate">No active throttling</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/90 bg-white h-full min-h-[86px] flex flex-col justify-between shadow-2xs">
              <span className="text-xs font-bold uppercase text-slate-500 truncate">
                Last Successful Op
              </span>
              <div className="text-xs font-bold text-slate-800 truncate mt-1">
                {provider.lastSuccessfulOperationAt
                  ? new Date(provider.lastSuccessfulOperationAt).toLocaleString()
                  : "None Recorded"}
              </div>
              <span className="text-xs text-slate-400 truncate">Latest API response</span>
            </div>
          </div>

          {/* Provider Issues */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Provider Incidents & Connection Issues
              </h3>
              <p className="text-xs text-slate-500">
                Active and recent issues affecting this provider&apos;s tenant connections.
              </p>
            </div>
            <IntegrationIssuesTable issues={providerIssues} />
          </div>
        </TabsContent>

        {/* Tab 6: Activity */}
        <TabsContent value="activity" className="pt-3">
          <IntegrationActivityTable
            activities={providerActivities}
            initialProviderId={provider.id}
          />
        </TabsContent>
      </Tabs>

      {/* Impact Dialog */}
      <ProviderImpactDialog
        provider={provider}
        action={isImpactOpen ? impactAction : null}
        isOpen={isImpactOpen}
        onClose={() => setIsImpactOpen(false)}
      />

      {/* Configuration Modal */}
      {config && (
        <ProviderConfigModal
          config={config}
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
        />
      )}
    </div>
  );
}
