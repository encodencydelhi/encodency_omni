/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Provider Capability Matrix Component
 * Filterable, categorized capability list with interactive detail drawer
 */

"use client";

import { useState, useMemo } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";
import { resolveCapabilityEffectiveAvailability } from "../data/capability-resolver";
import type {
  CapabilityCategory,
  IntegrationProvider,
  ProviderCapability,
  ProviderConfiguration,
} from "../data/types";
import { useToggleCapability } from "../data/hooks";
import { CapabilityDetailDrawer } from "./capability-detail-drawer";
import { ApiAccessBadge } from "./status-badges";

interface ProviderCapabilityMatrixProps {
  capabilities: ProviderCapability[];
  provider?: IntegrationProvider;
  config?: ProviderConfiguration;
  className?: string;
}

const CATEGORIES: { id: CapabilityCategory | "all"; label: string }[] = [
  { id: "all", label: "All Capabilities" },
  { id: "connection", label: "Connection" },
  { id: "publishing", label: "Publishing" },
  { id: "engagement", label: "Engagement" },
  { id: "analytics", label: "Analytics" },
  { id: "webhooks", label: "Webhooks" },
];

export function ProviderCapabilityMatrix({
  capabilities,
  provider,
  config,
  className,
}: ProviderCapabilityMatrixProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CapabilityCategory | "all">("all");
  const [selectedCapability, setSelectedCapability] = useState<ProviderCapability | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleCapability = useToggleCapability();

  const filteredCapabilities = useMemo(() => {
    return capabilities.filter((c) => {
      if (selectedCategory !== "all" && c.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.requiredScopes.some((s) => s.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [capabilities, selectedCategory, searchQuery]);

  const handleRowClick = (cap: ProviderCapability) => {
    setSelectedCapability(cap);
    setIsDrawerOpen(true);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Search capability or scope..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-white h-9 border-slate-200"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border",
                  isSelected
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Capability List / Table */}
      <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Capability Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">API Approval</th>
                <th className="py-3 px-4">Connector</th>
                <th className="py-3 px-4">Effective Status</th>
                <th className="py-3 px-4 text-center">Platform Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCapabilities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No capabilities match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCapabilities.map((cap) => {
                  const resolution = resolveCapabilityEffectiveAvailability(
                    cap,
                    provider,
                    config
                  );

                  return (
                    <tr
                      key={cap.id}
                      onClick={() => handleRowClick(cap)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600">
                          {cap.name}
                        </div>
                        <div className="text-xs text-slate-500 line-clamp-1 max-w-md mt-0.5">
                          {cap.description}
                        </div>
                      </td>

                      <td className="py-3 px-4 capitalize text-slate-600 font-medium">
                        {cap.category}
                      </td>

                      <td className="py-3 px-4">
                        <ApiAccessBadge value={cap.externalApprovalStatus} />
                      </td>

                      <td className="py-3 px-4 capitalize font-mono text-slate-700">
                        {cap.connectorStatus.replace("_", " ")}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold",
                            resolution.isAvailable
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full shrink-0",
                              resolution.isAvailable ? "bg-emerald-500" : "bg-amber-500"
                            )}
                          />
                          {resolution.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={cap.platformEnabled}
                          onCheckedChange={() =>
                            toggleCapability.mutate({
                              capabilityId: cap.id,
                              enabled: !cap.platformEnabled,
                            })
                          }
                          aria-label={`Toggle ${cap.name}`}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <CapabilityDetailDrawer
        capability={selectedCapability}
        provider={provider}
        config={config}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onTogglePlatformEnablement={(cap) => {
          toggleCapability.mutate({
            capabilityId: cap.id,
            enabled: !cap.platformEnabled,
          });
          setSelectedCapability({ ...cap, platformEnabled: !cap.platformEnabled });
        }}
      />
    </div>
  );
}
