/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Connection Quick Preview Drawer
 */

"use client";

import Link from "next/link";
import {
  AlertTriangleIcon,
  Building2Icon,
  ExternalLinkIcon,
  MailIcon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { ConnectionHealthBadge } from "./status-badges";
import { ProviderLogo, getPlatformName } from "./provider-logo";
import type { ProviderAuthorization } from "../data/types";

interface ConnectionPreviewDrawerProps {
  authorization: ProviderAuthorization | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestReauth?: (auth: ProviderAuthorization) => void;
}

export function ConnectionPreviewDrawer({
  authorization,
  isOpen,
  onClose,
  onRequestReauth,
}: ConnectionPreviewDrawerProps) {
  if (!authorization) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-white border-l border-slate-200 p-0 flex flex-col justify-between"
      >
        <div className="p-5 overflow-y-auto space-y-4">
          <SheetHeader className="text-left space-y-1 pb-3 border-b border-slate-100">
            <div className="flex items-start gap-2.5 mb-1">
              <ProviderLogo providerId={authorization.providerId} size="md" className="mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
                  <span>{getPlatformName(authorization.providerId)}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-400 font-normal">{authorization.id}</span>
                </div>
                {authorization.providerId === "meta" && (
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
              </div>
            </div>
            <SheetTitle className="text-base font-bold text-slate-900">
              {authorization.authorizationLabel}
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-600">
              Authorized connection owned by{" "}
              <strong className="text-slate-800">{authorization.companyName}</strong>.
            </SheetDescription>
          </SheetHeader>

          {/* Operational Health Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200/90 bg-slate-50/70">
            <span className="text-xs font-semibold text-slate-600">
              Operational Status:
            </span>
            <ConnectionHealthBadge value={authorization.healthStatus} />
          </div>

          {/* Error Message Alert if present */}
          {authorization.latestErrorMessage && (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangleIcon className="size-3.5 text-amber-600" />
                <span>Diagnostic Telemetry</span>
              </div>
              <p className="leading-relaxed">{authorization.latestErrorMessage}</p>
            </div>
          )}

          {/* Entity Hierarchy Details */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Tenant & Identity Hierarchy
            </div>

            <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Parent Company:</span>
                <Link
                  href={`/super-admin/companies/${authorization.companyId}`}
                  className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Building2Icon className="size-3" />
                  <span>{authorization.companyName}</span>
                </Link>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Authorized By:</span>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  <UserIcon className="size-3 text-slate-400" />
                  <span>
                    {authorization.connectedBy.name} ({authorization.connectedBy.role})
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Connected Date:</span>
                <span className="font-medium text-slate-800">
                  {formatDate(authorization.connectedAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Token Expiry:</span>
                <span className="font-medium text-slate-800">
                  {authorization.tokenExpiresAt
                    ? formatDate(authorization.tokenExpiresAt)
                    : "No Expiration / Permanent"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Verified Sync:</span>
                <span className="font-medium text-slate-800">
                  {authorization.lastSuccessfulSyncAt
                    ? formatDateTime(authorization.lastSuccessfulSyncAt)
                    : "None Recorded"}
                </span>
              </div>
            </div>
          </div>

          {/* Granted vs Missing Scopes */}
          <div className="space-y-2 text-xs">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Permission Scopes
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-slate-500 block mb-1 font-medium">
                  Granted Scopes ({authorization.grantedScopes.length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {authorization.grantedScopes.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {authorization.missingScopes.length > 0 && (
                <div>
                  <span className="text-amber-700 block mb-1 font-medium">
                    Missing Required Scopes ({authorization.missingScopes.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {authorization.missingScopes.map((s: string) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-mono text-xs"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 text-xs"
            >
              Close
            </Button>
            <Button
              type="button"
              asChild
              size="sm"
              className="flex-1 text-xs bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Link
                href={`/super-admin/integrations/connections/${authorization.id}`}
              >
                <span>Full Connection</span>
                <ExternalLinkIcon className="size-3 ml-1" />
              </Link>
            </Button>
          </div>

          {(authorization.healthStatus === "needs_reconnect" ||
            authorization.healthStatus === "permission_issue") &&
            onRequestReauth && (
              <Button
                type="button"
                size="sm"
                onClick={() => onRequestReauth(authorization)}
                className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <MailIcon className="size-3.5 mr-1.5" />
                <span>Request Company Reauthorization</span>
              </Button>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
