/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Provider configuration: what the platform team decides about a provider, next to the facts the server knows.
 *
 * Every control here is saved to the server and enforced there: a disabled provider (or one in maintenance) cannot start a new
 * or a reconnect login, and "allow new connections" stops brand-new logins. The facts (callback URL, scopes, whether the
 * server holds the credentials) are read-only because they come from the server's own environment.
 */

"use client";

import { useState } from "react";
import { CheckCircle2Icon, ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EXTERNAL_API_ACCESS_META } from "../data/config";
import type { ExternalApiAccess, ProviderConfiguration } from "../data/types";
import { useUpdateProviderConfig } from "../data/hooks";
import { ProviderLogo, getPlatformName } from "./provider-logo";

interface ProviderConfigModalProps {
  config: ProviderConfiguration | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const API_ACCESS_OPTIONS = Object.keys(EXTERNAL_API_ACCESS_META) as ExternalApiAccess[];

export function ProviderConfigModal({ config, isOpen, onClose, onSuccess }: ProviderConfigModalProps) {
  const [formData, setFormData] = useState<ProviderConfiguration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateConfig = useUpdateProviderConfig();

  // The form starts from the provider's saved configuration and follows it when its content changes.
  const configKey = config ? JSON.stringify(config) : null;
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (config && configKey !== syncedKey) {
    setSyncedKey(configKey);
    setFormData({ ...config, platformAvailability: config.platformAvailability === "disabled" ? "disabled" : "live" });
  }

  if (!formData || !config) return null;

  const set = (patch: Partial<ProviderConfiguration>) => setFormData((current) => (current ? { ...current, ...patch } : current));
  const dirty = JSON.stringify(formData) !== JSON.stringify({ ...config, platformAvailability: config.platformAvailability === "disabled" ? "disabled" : "live" });

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateConfig.mutateAsync({
        providerId: formData.providerId,
        updates: {
          platformAvailability: formData.platformAvailability,
          allowNewConnections: formData.allowNewConnections,
          maintenanceMode: formData.maintenanceMode,
          maintenanceNote: formData.maintenanceNote,
          externalApiApprovalStatus: formData.externalApiApprovalStatus,
          appReviewNotes: formData.appReviewNotes,
          internalNotes: formData.internalNotes,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The change was not saved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <ProviderLogo providerId={formData.providerId} size="md" />
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">Configure provider: {getPlatformName(formData.providerId)}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">What companies can do with this provider, and what the server already knows about it.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Facts from the server */}
          <section className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-700">From the server</span>
              {formData.credentialConfigured ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2Icon className="size-3.5" /> OAuth credentials are set</span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-rose-700"><ShieldAlertIcon className="size-3.5" /> OAuth credentials are missing, so nobody can connect it</span>
              )}
            </div>
            <div>
              <span className="block text-slate-500 font-medium mb-0.5">Callback URL to register with the provider</span>
              <code className="block break-all rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700">{formData.redirectUri || "The server could not work out its callback URL. Check APP_BASE_URL."}</code>
            </div>
            <div>
              <span className="block text-slate-500 font-medium mb-0.5">Permissions it asks for ({formData.requiredScopes.length})</span>
              <div className="flex flex-wrap gap-1">
                {formData.requiredScopes.length === 0 ? <span className="text-slate-400">None: there is no connector yet.</span> : formData.requiredScopes.map((scope) => <code key={scope} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-700">{scope.split("/").pop()}</code>)}
              </div>
            </div>
          </section>

          {/* Controls */}
          <section className="space-y-3">
            <span className="font-bold uppercase tracking-wider text-slate-700">Controls</span>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Availability</Label>
                <Select value={formData.platformAvailability} onValueChange={(value) => set({ platformAvailability: value as ProviderConfiguration["platformAvailability"] })}>
                  <SelectTrigger className="text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <span className="block text-slate-400">Disabled: nobody can connect or reconnect it. Existing connections stay as they are.</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Provider-side API approval</Label>
                <Select value={formData.externalApiApprovalStatus} onValueChange={(value) => set({ externalApiApprovalStatus: value as ExternalApiAccess })}>
                  <SelectTrigger className="text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="text-xs">
                    {API_ACCESS_OPTIONS.map((value) => <SelectItem key={value} value={value}>{EXTERNAL_API_ACCESS_META[value].label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="block text-slate-400">A record kept by your team (for example Meta app review). The server cannot check it.</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <div>
                <p className="font-semibold text-slate-800">Allow new connections</p>
                <p className="text-slate-500">When off, companies cannot add a new login. Existing logins can still be reconnected.</p>
              </div>
              <Switch checked={formData.allowNewConnections} onCheckedChange={(allowNewConnections) => set({ allowNewConnections })} aria-label="Allow new connections" />
            </div>

            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">Maintenance mode</p>
                  <p className="text-slate-500">Pauses new and reconnect logins and connection checks for this provider. Posts and reports are not stopped.</p>
                </div>
                <Switch checked={formData.maintenanceMode} onCheckedChange={(maintenanceMode) => set({ maintenanceMode })} aria-label="Maintenance mode" />
              </div>
              {formData.maintenanceMode && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Message companies see</Label>
                  <Textarea value={formData.maintenanceNote} onChange={(event) => set({ maintenanceNote: event.target.value })} maxLength={300} rows={2} className="text-xs bg-white" placeholder="Meta is down for maintenance until 6 pm. Try again then." />
                </div>
              )}
            </div>
          </section>

          {/* Notes */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">App review notes</Label>
              <Textarea value={formData.appReviewNotes} onChange={(event) => set({ appReviewNotes: event.target.value })} maxLength={2000} rows={4} className="text-xs bg-white" placeholder="Status of the provider's review, permissions requested, contacts." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Internal notes (staff only)</Label>
              <Textarea value={formData.internalNotes} onChange={(event) => set({ internalNotes: event.target.value })} maxLength={2000} rows={4} className="text-xs bg-white" placeholder="Anything the team should know. Companies never see this." />
            </div>
          </section>

          {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 font-medium text-rose-700">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" size="sm" className="text-xs bg-[#EB0711] hover:bg-[#EB0711]/90 text-white" onClick={() => void handleSave()} disabled={isSubmitting || !dirty}>
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
