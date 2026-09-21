/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Provider Card Component
 * Compact, equal height (h-full), font-size >= 12px
 */

"use client";

import Link from "next/link";
import {
  ExternalLinkIcon,
  MoreVerticalIcon,
  SlidersHorizontalIcon,
  LayersIcon,
  ActivityIcon,
  BanIcon,
  CheckCircle2Icon,
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
import { formatDate } from "@/lib/utils/format";
import type { IntegrationProvider } from "../data/types";
import {
  ApiAccessBadge,
  AvailabilityBadge,
  OperationalHealthBadge,
} from "./status-badges";
import { ProviderLogo } from "./provider-logo";

interface ProviderCardProps {
  provider: IntegrationProvider;
  onOpenImpactModal?: (provider: IntegrationProvider, action: "disable_connections" | "enable_connections") => void;
  onEditConfig?: (provider: IntegrationProvider) => void;
}

export function ProviderCard({
  provider,
  onOpenImpactModal,
  onEditConfig,
}: ProviderCardProps) {
  const isNewConnectionsAllowed = provider.platformAvailability !== "disabled" && provider.platformAvailability !== "retired";

  return (
    <div className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 h-full min-h-[260px]">
      {/* Top Header: Identity & Status */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <ProviderLogo providerId={provider.id} size="md" />
            <div className="min-w-0">
              <Link
                href={`/super-admin/integrations/providers/${provider.id}`}
                className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block"
              >
                {provider.name}
              </Link>
              <div className="flex items-center gap-1 text-xs text-slate-500 capitalize">
                <span>{provider.category}</span>
                <span>•</span>
                <span className="font-mono text-slate-400">{provider.id}</span>
              </div>
              {provider.id === "meta" && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                    <ProviderLogo providerId="facebook" size="xs" />
                    Facebook
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-50 border border-pink-200 text-pink-700 text-xs font-semibold">
                    <ProviderLogo providerId="instagram" size="xs" />
                    Instagram
                  </span>
                </div>
              )}
              {provider.id === "google_business" && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                    <ProviderLogo providerId="google" size="xs" />
                    Maps & Search
                  </span>
                </div>
              )}
              {provider.id === "whatsapp" && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <ProviderLogo providerId="whatsapp" size="xs" />
                    Cloud API
                  </span>
                </div>
              )}
              {provider.id === "youtube" && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    <ProviderLogo providerId="youtube" size="xs" />
                    Channels
                  </span>
                </div>
              )}
              {provider.id === "linkedin" && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold">
                    <ProviderLogo providerId="linkedin" size="xs" />
                    Pages
                  </span>
                </div>
              )}
              {provider.id === "x_twitter" && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold">
                    <ProviderLogo providerId="x" size="xs" />
                    v2 Feeds
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
              >
                <MoreVerticalIcon className="size-4" />
                <span className="sr-only">Provider actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-xs">
              <DropdownMenuItem asChild>
                <Link
                  href={`/super-admin/integrations/providers/${provider.id}`}
                  className="cursor-pointer"
                >
                  <ExternalLinkIcon className="size-3.5 mr-2 text-slate-500" />
                  <span>Open Command Center</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/super-admin/integrations/connections?provider=${provider.id}`}
                  className="cursor-pointer"
                >
                  <LayersIcon className="size-3.5 mr-2 text-slate-500" />
                  <span>View Connections ({provider.activeConnectionsCount})</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEditConfig?.(provider)}
                className="cursor-pointer"
              >
                <SlidersHorizontalIcon className="size-3.5 mr-2 text-slate-500" />
                <span>Configure Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/super-admin/integrations/activity?provider=${provider.id}`}
                  className="cursor-pointer"
                >
                  <ActivityIcon className="size-3.5 mr-2 text-slate-500" />
                  <span>View Provider Activity</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isNewConnectionsAllowed ? (
                <DropdownMenuItem
                  onClick={() => onOpenImpactModal?.(provider, "disable_connections")}
                  className="cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                >
                  <BanIcon className="size-3.5 mr-2" />
                  <span>Disable New Connections</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onOpenImpactModal?.(provider, "enable_connections")}
                  className="cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                >
                  <CheckCircle2Icon className="size-3.5 mr-2" />
                  <span>Restore Availability (Live)</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Short Description */}
        <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
          {provider.shortDescription}
        </p>

        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <AvailabilityBadge value={provider.platformAvailability} />
          <ApiAccessBadge value={provider.externalApiAccess} />
          <OperationalHealthBadge value={provider.operationalHealth} />
        </div>
      </div>

      {/* Bottom Metrics & Actions */}
      <div className="pt-3 border-t border-slate-100">
        <div className="grid grid-cols-3 gap-1 mb-3 text-center bg-slate-50/70 p-2 rounded-lg border border-slate-100">
          <div>
            <div className="text-xs font-bold text-slate-900">
              {provider.activeConnectionsCount}
            </div>
            <div className="text-xs text-slate-500 font-medium truncate">
              Conns
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {provider.connectedResourcesCount}
            </div>
            <div className="text-xs text-slate-500 font-medium truncate">
              Resources
            </div>
          </div>
          <div>
            <div
              className={cn(
                "text-xs font-bold",
                provider.reconnectRequiredCount > 0 ? "text-amber-700" : "text-slate-900"
              )}
            >
              {provider.reconnectRequiredCount}
            </div>
            <div className="text-xs text-slate-500 font-medium truncate">
              Needs Reauth
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">
            Updated {formatDate(provider.updatedAt)}
          </span>
          <Link
            href={`/super-admin/integrations/providers/${provider.id}`}
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
          >
            <span>Details</span>
            <ExternalLinkIcon className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
