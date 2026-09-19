/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Provider Catalogue Page Component
 */

"use client";

import { useState, useMemo } from "react";
import {
  DownloadIcon,
  SearchIcon,
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
import { exportProvidersToCsv } from "../data/export-utils";
import { useProviders } from "../data/hooks";
import { filterProviders, type ProviderFilters } from "../data/selectors";
import type {
  ExternalApiAccess,
  IntegrationProvider,
  OperationalHealth,
  PlatformAvailability,
} from "../data/types";
import {
  IntegrationsNav,
  ProviderCard,
  ProviderConfigModal,
  ProviderImpactDialog,
} from "../components";

export function ProvidersPage() {
  const { data: providers = [] } = useProviders();

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<PlatformAvailability | "all">("all");
  const [apiAccessFilter, setApiAccessFilter] = useState<ExternalApiAccess | "all">("all");
  const [healthFilter] = useState<OperationalHealth | "all">("all");
  const [sortBy, setSortBy] = useState<ProviderFilters["sortBy"]>("connections");

  // Dialog States
  const [impactProvider, setImpactProvider] = useState<IntegrationProvider | null>(null);
  const [impactAction, setImpactAction] = useState<"disable_connections" | "enable_connections" | null>(null);
  const [configProvider, setConfigProvider] = useState<IntegrationProvider | null>(null);

  const filteredProviders = useMemo(() => {
    return filterProviders(providers, {
      query,
      category: categoryFilter,
      availability: availabilityFilter,
      apiAccess: apiAccessFilter,
      health: healthFilter,
      sortBy,
      sortDirection: "desc",
    });
  }, [
    providers,
    query,
    categoryFilter,
    availabilityFilter,
    apiAccessFilter,
    healthFilter,
    sortBy,
  ]);

  const handleExport = () => {
    exportProvidersToCsv(filteredProviders);
  };

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Provider Catalogue
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
              {filteredProviders.length} Configured
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            OmniPlatform upstream connectors, developer portal credentials, and operational controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs h-8 font-semibold bg-white text-slate-700"
          >
            <DownloadIcon className="size-3.5 mr-1.5" />
            <span>Export Catalogue</span>
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <IntegrationsNav />

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search provider name or code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs bg-slate-50/60 h-9 border-slate-200"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px] text-xs h-9 bg-white">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="social">Social Media</SelectItem>
            <SelectItem value="local">Local SEO</SelectItem>
            <SelectItem value="messaging">Messaging</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="analytics">Analytics</SelectItem>
            <SelectItem value="seo">SEO</SelectItem>
            <SelectItem value="media">Media & CDN</SelectItem>
          </SelectContent>
        </Select>

        {/* Availability Filter */}
        <Select
          value={availabilityFilter}
          onValueChange={(val) => setAvailabilityFilter(val === "all" ? "all" : val as PlatformAvailability)}
        >
          <SelectTrigger className="w-[130px] text-xs h-9 bg-white">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All Availability</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="restricted">Restricted</SelectItem>
            <SelectItem value="testing">Testing</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>

        {/* API Access Filter */}
        <Select
          value={apiAccessFilter}
          onValueChange={(val) => setApiAccessFilter(val === "all" ? "all" : val as ExternalApiAccess)}
        >
          <SelectTrigger className="w-[140px] text-xs h-9 bg-white">
            <SelectValue placeholder="API Approval" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="all">All API Access</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending_approval">Pending Review</SelectItem>
            <SelectItem value="limited_access">Limited Access</SelectItem>
            <SelectItem value="not_applicable">Not Applicable</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select
          value={sortBy}
          onValueChange={(val) => setSortBy(val as ProviderFilters["sortBy"])}
        >
          <SelectTrigger className="w-[140px] text-xs h-9 bg-white">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="connections">Most Connections</SelectItem>
            <SelectItem value="name">Provider Name</SelectItem>
            <SelectItem value="updated">Recently Updated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Provider Cards Grid with gap-1 and equal height */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 items-stretch">
        {filteredProviders.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            No providers found matching your filter criteria.
          </div>
        ) : (
          filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onOpenImpactModal={(prov, act) => {
                setImpactProvider(prov);
                setImpactAction(act);
              }}
              onEditConfig={(prov) => setConfigProvider(prov)}
            />
          ))
        )}
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

      {/* Configuration Modal */}
      {configProvider && (
        <ProviderConfigModal
          config={{
            providerId: configProvider.id,
            providerCode: configProvider.id,
            category: configProvider.category,
            environment: "production",
            platformAvailability: configProvider.platformAvailability,
            description: configProvider.description,
            supportedResourceTypes: configProvider.supportedResourceTypes,
            internalNotes: `Platform connector notes for ${configProvider.name}`,
            authMethod: configProvider.authMethod,
            redirectUri: `https://app.encodency.com/api/v1/auth/callback/${configProvider.id}`,
            requiredScopes: ["read_insights", "publish_posts"],
            supportedAccountTypes: ["Standard Business Account"],
            externalApiApprovalStatus: configProvider.externalApiAccess,
            appReviewNotes: configProvider.appReviewNotes || "Verified.",
            credentialConfigured: true,
            credentialEnv: "production",
            lastRotatedAt: "2026-07-01T00:00:00Z",
            secretReferenceStatus: "active_in_vault",
            publicAppId: `encodency-${configProvider.id}-prod`,
            allowNewConnections: configProvider.platformAvailability === "live",
            allowExistingPublishing: true,
            allowExistingSync: true,
            enableWebhooks: true,
            maintenanceMode: false,
            visibilityInCompanyAdmin: true,
          }}
          isOpen={Boolean(configProvider)}
          onClose={() => setConfigProvider(null)}
        />
      )}
    </div>
  );
}
