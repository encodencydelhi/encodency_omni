/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Reauthorization Request Modal
 * Generates an administrative re-auth dispatch to company owner/admins
 */

"use client";

import { useState } from "react";
import { CheckCircle2Icon, MailIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ProviderAuthorization } from "../data/types";
import { useCreateReauthorizationRequest } from "../data/hooks";

interface ReauthorizationRequestModalProps {
  authorization: ProviderAuthorization | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReauthorizationRequestModal({
  authorization,
  isOpen,
  onClose,
  onSuccess,
}: ReauthorizationRequestModalProps) {
  const [targetRole, setTargetRole] = useState<"owner" | "admin">("owner");
  const [reason, setReason] = useState(
    authorization?.healthStatus === "permission_issue"
      ? "Missing required scopes for social post publishing. Re-authorization required to restore automated scheduled posting."
      : "Access token has expired or is nearing expiration. Please re-authenticate via company settings."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRequest = useCreateReauthorizationRequest();

  if (!authorization) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setIsSubmitting(true);
    try {
      await createRequest.mutateAsync({
        providerId: authorization.providerId,
        authorizationId: authorization.id,
        companyId: authorization.companyId,
        companyName: authorization.companyName,
        affectedAccount: authorization.authorizationLabel,
        affectedClients: [authorization.companyName],
        missingScopes: authorization.missingScopes,
        reason: reason.trim(),
        targetRole,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to dispatch reauthorization request", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <MailIcon className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Request Tenant Reauthorization
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Notify the organization owner/admin to grant missing scopes or refresh expired tokens.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Affected Context Summary */}
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs my-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block font-medium">Provider & Account</span>
              <span className="font-bold text-slate-900 truncate block">
                {authorization.authorizationLabel}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Tenant Organization</span>
              <span className="font-bold text-slate-900 truncate block">
                {authorization.companyName}
              </span>
            </div>
          </div>

          {authorization.missingScopes.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-amber-800 font-semibold block mb-1">
                Missing Required Scopes:
              </span>
              <div className="flex flex-wrap gap-1">
                {authorization.missingScopes.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded bg-amber-100/70 border border-amber-200 text-amber-900 font-mono text-xs"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Target Tenant Role
            </Label>
            <Select
              value={targetRole}
              onValueChange={(val: "owner" | "admin") => setTargetRole(val)}
            >
              <SelectTrigger className="text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="owner">Organization Owner Only</SelectItem>
                <SelectItem value="admin">Organization Admins & Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Reauthorization Justification & Instructions *
            </Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs bg-white resize-none"
              placeholder="Explain why re-authorization is needed..."
            />
          </div>
        </div>

        {/* Demo Mode Notice */}
        <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-blue-900 text-xs flex items-start gap-2">
          <CheckCircle2Icon className="size-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            In frontend mock mode, a persistent request record is created in the Reauthorization Queue and tracked in platform activity.
          </span>
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
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {isSubmitting ? "Dispatching..." : "Dispatch Reauthorization Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
