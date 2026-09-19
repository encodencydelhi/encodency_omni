/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Capability Detail Drawer
 * Deep dive into technical support, connector readiness, required scopes, and restrictions
 */

"use client";

import { CheckCircle2Icon, LayersIcon, ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { resolveCapabilityEffectiveAvailability } from "../data/capability-resolver";
import type {
  IntegrationProvider,
  ProviderCapability,
  ProviderConfiguration,
} from "../data/types";
import { ApiAccessBadge } from "./status-badges";

interface CapabilityDetailDrawerProps {
  capability: ProviderCapability | null;
  provider?: IntegrationProvider;
  config?: ProviderConfiguration;
  isOpen: boolean;
  onClose: () => void;
  onTogglePlatformEnablement?: (cap: ProviderCapability) => void;
}

export function CapabilityDetailDrawer({
  capability,
  provider,
  config,
  isOpen,
  onClose,
  onTogglePlatformEnablement,
}: CapabilityDetailDrawerProps) {
  if (!capability) return null;

  const resolution = resolveCapabilityEffectiveAvailability(
    capability,
    provider,
    config
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-white border-l border-slate-200 p-0 flex flex-col justify-between"
      >
        <div className="p-5 overflow-y-auto space-y-4">
          <SheetHeader className="text-left space-y-1 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wider font-bold">
              <span>{capability.category}</span>
              <span>•</span>
              <span className="font-mono text-slate-400">{capability.id}</span>
            </div>
            <SheetTitle className="text-base font-bold text-slate-900">
              {capability.name}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-600 leading-relaxed">
              {capability.description}
            </SheetDescription>
          </SheetHeader>

          {/* Effective Status Banner */}
          <div
            className={cn(
              "p-3 rounded-xl border flex items-start gap-2.5",
              resolution.isAvailable
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                : "bg-amber-50/70 border-amber-200 text-amber-900"
            )}
          >
            {resolution.isAvailable ? (
              <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlertIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-xs">
                Effective Availability: {resolution.label}
              </div>
              <div className="text-xs mt-0.5 leading-relaxed">
                {resolution.reason}
              </div>
            </div>
          </div>

          {/* Technical Diagnostics */}
          <div className="space-y-3 text-xs">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Implementation & Readiness
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/80">
                <span className="text-slate-500 block mb-0.5 font-medium">
                  Provider Support
                </span>
                <span className="font-bold text-slate-900">
                  {capability.providerSupported ? "Native API Support" : "Unsupported by API"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/80">
                <span className="text-slate-500 block mb-0.5 font-medium">
                  Connector Code
                </span>
                <span className="font-bold capitalize text-slate-900">
                  {capability.connectorStatus.replace("_", " ")}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/80">
                <span className="text-slate-500 block mb-0.5 font-medium">
                  External App Review
                </span>
                <ApiAccessBadge value={capability.externalApprovalStatus} />
              </div>

              <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/80">
                <span className="text-slate-500 block mb-0.5 font-medium">
                  Platform Flag
                </span>
                <span
                  className={cn(
                    "font-bold",
                    capability.platformEnabled ? "text-emerald-700" : "text-slate-500"
                  )}
                >
                  {capability.platformEnabled ? "Enabled by Admin" : "Disabled"}
                </span>
              </div>
            </div>
          </div>

          {/* Required Permission Scopes */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Required Permission Scopes
            </div>
            <div className="flex flex-wrap gap-1">
              {capability.requiredScopes.map((scope) => (
                <span
                  key={scope}
                  className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs"
                >
                  {scope}
                </span>
              ))}
            </div>
          </div>

          {/* Affected OmniPlatform Modules */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Dependent Platform Modules
            </div>
            <div className="flex flex-wrap gap-1.5">
              {capability.affectedModules.map((mod) => (
                <span
                  key={mod}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-800 font-medium text-xs"
                >
                  <LayersIcon className="size-3 text-blue-600" />
                  <span>{mod}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Restrictions / Notes if any */}
          {capability.knownRestrictions && (
            <div className="space-y-1 text-xs">
              <div className="font-bold text-amber-800 uppercase tracking-wider">
                Known Restrictions
              </div>
              <div className="p-2.5 rounded-lg border border-amber-200/80 bg-amber-50/40 text-amber-900 leading-relaxed">
                {capability.knownRestrictions}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close Drawer
          </Button>

          {onTogglePlatformEnablement && (
            <Button
              type="button"
              size="sm"
              onClick={() => onTogglePlatformEnablement(capability)}
              className={cn(
                "text-xs font-semibold",
                capability.platformEnabled
                  ? "bg-slate-700 hover:bg-slate-800 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {capability.platformEnabled ? "Disable in Platform" : "Enable in Platform"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
