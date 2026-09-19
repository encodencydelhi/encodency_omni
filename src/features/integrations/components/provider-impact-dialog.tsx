/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Provider High-Impact Confirmation Dialog
 * Shows exact blast radius: Affected Companies, Clients, Connections, Operations
 */

"use client";

import { useState } from "react";
import { BanIcon, CheckCircle2Icon, ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { IntegrationProvider, PlatformAvailability } from "../data/types";
import { useUpdateProviderAvailability } from "../data/hooks";

interface ProviderImpactDialogProps {
  provider: IntegrationProvider | null;
  action: "disable_connections" | "enable_connections" | "maintenance_mode" | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProviderImpactDialog({
  provider,
  action,
  isOpen,
  onClose,
  onSuccess,
}: ProviderImpactDialogProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateAvailability = useUpdateProviderAvailability();

  if (!provider || !action) return null;

  const isDisabling = action === "disable_connections";
  const targetAvailability: PlatformAvailability = isDisabling ? "disabled" : "live";

  const title = isDisabling
    ? `Disable New ${provider.name} Connections`
    : `Restore ${provider.name} Availability to Live`;

  const description = isDisabling
    ? "Temporarily or permanently prevent tenant organizations from establishing new OAuth or API authorizations with this provider."
    : "Re-enable public tenant onboarding and authorization flows for this provider across all eligible companies.";

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await updateAvailability.mutateAsync({
        providerId: provider.id,
        newAvailability: targetAvailability,
        reason: reason.trim(),
      });
      setReason("");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to update provider availability", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`size-8 rounded-lg flex items-center justify-center ${
                isDisabling
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isDisabling ? (
                <BanIcon className="size-4" />
              ) : (
                <CheckCircle2Icon className="size-4" />
              )}
            </div>
            <DialogTitle className="text-sm font-bold text-slate-900">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-600">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Operational Blast Radius Impact Preview */}
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 my-2 space-y-2.5 text-xs">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldAlertIcon className="size-3.5 text-slate-500" />
            <span>Operational Impact Assessment</span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-center bg-white p-2 rounded-lg border border-slate-200/70">
            <div>
              <div className="text-xs font-bold text-slate-900">
                {provider.affectedCompaniesCount}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Companies
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                {provider.activeConnectionsCount}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Active Conns
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                {provider.connectedResourcesCount}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Resources
              </div>
            </div>
          </div>

          <ul className="space-y-1 text-slate-600 list-disc list-inside">
            {isDisabling ? (
              <>
                <li>
                  <strong>Company Admin UI:</strong> Connect button for {provider.name} will be marked unavailable.
                </li>
                <li>
                  <strong>Existing Authorizations:</strong> Will remain active and continue background publishing/sync.
                </li>
                <li>
                  <strong>Audit Log:</strong> Change is logged with your platform administrative identity.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Company Admin UI:</strong> New connections will immediately become available.
                </li>
                <li>
                  <strong>Existing Connections:</strong> Unaffected; normal operation verified.
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Mandatory Reason Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="change-reason"
            className="text-xs font-semibold text-slate-700 flex items-center justify-between"
          >
            <span>Administrative Reason & Justification *</span>
            <span className="text-xs text-slate-400">Required for platform audit</span>
          </label>
          <Textarea
            id="change-reason"
            rows={3}
            placeholder={
              isDisabling
                ? "e.g. Upstream API deprecation under investigation; temporarily preventing new tenant authorizations."
                : "e.g. Completed developer review and verified OAuth redirect flows in production."
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs bg-white resize-none"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={!reason.trim() || isSubmitting}
            className={`text-xs ${
              isDisabling
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            {isSubmitting ? "Updating..." : "Confirm & Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
