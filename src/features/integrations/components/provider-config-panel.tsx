/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Provider Configuration Inline Panel (for detail page tab)
 * Structured sections: General, Authorization, Credentials, Operational Controls
 */

"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2Icon,
  ShieldCheckIcon,
  SaveIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import type {
  ExternalApiAccess,
  PlatformAvailability,
  ProviderConfiguration,
} from "../data/types";
import { useUpdateProviderConfig } from "../data/hooks";

interface ProviderConfigPanelProps {
  config: ProviderConfiguration;
  className?: string;
}

export function ProviderConfigPanel({
  config,
  className,
}: ProviderConfigPanelProps) {
  const [formData, setFormData] = useState<ProviderConfiguration>({ ...config });
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const updateConfig = useUpdateProviderConfig();

  useEffect(() => {
    setFormData({ ...config });
    setIsDirty(false);
  }, [config]);

  const handleChange = (updater: (prev: ProviderConfiguration) => ProviderConfiguration) => {
    setFormData((prev) => {
      const next = updater(prev);
      setIsDirty(true);
      setSaveSuccess(false);
      return next;
    });
  };

  const handleDiscard = () => {
    setFormData({ ...config });
    setIsDirty(false);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    await updateConfig.mutateAsync({
      providerId: formData.providerId,
      updates: formData,
    });
    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className={cn("space-y-4 text-xs", className)}>
      {/* Section 1: General */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            General Configuration
          </h3>
          <p className="text-xs text-slate-500">
            Core provider identity, environment, and platform availability.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Internal Provider Code
            </Label>
            <Input
              value={formData.providerCode}
              disabled
              className="text-xs bg-slate-50 font-mono text-slate-500"
            />
            <span className="text-xs text-slate-400">
              Read-only identifier referenced by database records.
            </span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Environment
            </Label>
            <Select
              value={formData.environment}
              onValueChange={(val) =>
                handleChange((prev) => ({ ...prev, environment: val as "production" | "sandbox" }))
              }
            >
              <SelectTrigger className="text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="sandbox">Sandbox / Dev</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700">
            Platform Availability
          </Label>
          <Select
            value={formData.platformAvailability}
            onValueChange={(val) =>
              handleChange((prev) => ({ ...prev, platformAvailability: val as PlatformAvailability }))
            }
          >
            <SelectTrigger className="text-xs bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="live">Live (All Tenants)</SelectItem>
              <SelectItem value="restricted">Restricted (Beta / Plan)</SelectItem>
              <SelectItem value="testing">Testing (Sandbox Only)</SelectItem>
              <SelectItem value="draft">Draft (Scaffolded)</SelectItem>
              <SelectItem value="disabled">Disabled (Operations Paused)</SelectItem>
              <SelectItem value="retired">Retired (Deprecated)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700">
            Configuration Description
          </Label>
          <Textarea
            rows={2}
            value={formData.description}
            onChange={(e) =>
              handleChange((prev) => ({ ...prev, description: e.target.value }))
            }
            className="text-xs bg-white resize-none"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700">
            Internal Engineering Notes
          </Label>
          <Textarea
            rows={2}
            value={formData.internalNotes}
            onChange={(e) =>
              handleChange((prev) => ({ ...prev, internalNotes: e.target.value }))
            }
            className="text-xs bg-white resize-none font-mono"
          />
        </div>
      </div>

      {/* Section 2: Authorization Setup */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Authorization Setup
          </h3>
          <p className="text-xs text-slate-500">
            OAuth endpoints, required scopes, and external developer portal approval.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700">
            OAuth 2.0 Redirect URI
          </Label>
          <Input
            value={formData.redirectUri}
            onChange={(e) =>
              handleChange((prev) => ({ ...prev, redirectUri: e.target.value }))
            }
            className="text-xs font-mono bg-white"
          />
          <span className="text-xs text-slate-500">
            Must match authorized redirect URI in external developer console.
          </span>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700">
            Required Permission Scopes (Comma-separated)
          </Label>
          <Textarea
            rows={3}
            value={formData.requiredScopes.join(", ")}
            onChange={(e) =>
              handleChange((prev) => ({
                ...prev,
                requiredScopes: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
            className="text-xs font-mono bg-white resize-none"
          />
          <span className="text-xs text-slate-500">
            Scopes requested during tenant OAuth consent screen.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              External Developer App Approval Status
            </Label>
            <Select
              value={formData.externalApiApprovalStatus}
              onValueChange={(val) =>
                handleChange((prev) => ({ ...prev, externalApiApprovalStatus: val as ExternalApiAccess }))
              }
            >
              <SelectTrigger className="text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="approved">Approved (Production Quota)</SelectItem>
                <SelectItem value="pending_approval">Pending Approval</SelectItem>
                <SelectItem value="limited_access">Limited Access (Sandbox)</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="not_requested">Not Requested</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="not_applicable">Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Supported Account Types
            </Label>
            <div className="flex flex-wrap gap-1 pt-1">
              {formData.supportedAccountTypes.map((type) => (
                <span
                  key={type}
                  className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700">
            App Review & Compliance Notes
          </Label>
          <Textarea
            rows={2}
            value={formData.appReviewNotes}
            onChange={(e) =>
              handleChange((prev) => ({ ...prev, appReviewNotes: e.target.value }))
            }
            className="text-xs bg-white resize-none"
          />
        </div>
      </div>

      {/* Section 3: Secure Credential Status */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Secure Credential Status
          </h3>
          <p className="text-xs text-slate-500">
            Safe metadata only. Raw secrets are never exposed via the frontend.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 flex items-start gap-2.5">
          <ShieldCheckIcon className="size-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-emerald-800 text-xs">
              Zero-Knowledge Security Architecture
            </div>
            <div className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              Raw client secrets, private keys, and webhook signing tokens are encrypted and managed
              in platform secure vaults (HashiCorp Vault / AWS KMS). They are never transmitted to or
              editable via the web frontend.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Public App Identifier
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 block truncate">
              {formData.publicAppId || "Not Configured"}
            </span>
            <span className="text-xs text-slate-500 block">
              Client ID safe for frontend OAuth popups.
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Vault Secret Reference
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <CheckCircle2Icon className="size-3.5" />
              <span>Active in Vault (AES-256)</span>
            </span>
            <span className="text-xs text-slate-500 block">
              Last rotated:{" "}
              {formData.lastRotatedAt
                ? new Date(formData.lastRotatedAt).toLocaleDateString()
                : "Never"}
            </span>
          </div>
        </div>
      </div>

      {/* Section 4: Operational Controls */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Operational Controls
          </h3>
          <p className="text-xs text-slate-500">
            Fine-grained controls for connections, publishing, sync, and webhook processing.
          </p>
        </div>

        <div className="space-y-2 border rounded-xl p-3 border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 text-xs">Allow New Connections</div>
              <div className="text-xs text-slate-500">
                Tenants can connect new accounts via Company Admin.
              </div>
            </div>
            <Switch
              checked={formData.allowNewConnections}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({ ...prev, allowNewConnections: checked }))
              }
            />
          </div>

          <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 text-xs">
                Allow Existing Publishing Operations
              </div>
              <div className="text-xs text-slate-500">
                Execute background publishing jobs and post schedules.
              </div>
            </div>
            <Switch
              checked={formData.allowExistingPublishing}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({ ...prev, allowExistingPublishing: checked }))
              }
            />
          </div>

          <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 text-xs">
                Allow Existing Sync Operations
              </div>
              <div className="text-xs text-slate-500">
                Pull follower counts, comments, and analytics telemetry.
              </div>
            </div>
            <Switch
              checked={formData.allowExistingSync}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({ ...prev, allowExistingSync: checked }))
              }
            />
          </div>

          <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 text-xs">
                Enable Webhook Processing
              </div>
              <div className="text-xs text-slate-500">
                Process incoming real-time webhooks from provider.
              </div>
            </div>
            <Switch
              checked={formData.enableWebhooks}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({ ...prev, enableWebhooks: checked }))
              }
            />
          </div>

          <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
            <div>
              <div className="font-bold text-amber-900 text-xs">Maintenance Mode</div>
              <div className="text-xs text-slate-500">
                Pauses all automated workers for this provider.
              </div>
            </div>
            <Switch
              checked={formData.maintenanceMode}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({ ...prev, maintenanceMode: checked }))
              }
            />
          </div>

          <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 text-xs">
                Company Admin Visibility
              </div>
              <div className="text-xs text-slate-500">
                Show provider in Company Admin integration catalogue.
              </div>
            </div>
            <Switch
              checked={formData.visibilityInCompanyAdmin}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({ ...prev, visibilityInCompanyAdmin: checked }))
              }
            />
          </div>
        </div>
      </div>

      {/* Save success */}
      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
          <CheckCircle2Icon className="size-4 text-emerald-600" />
          <span>Provider configuration saved to shared platform state.</span>
        </div>
      )}

      {/* Floating save bar */}
      {isDirty && (
        <div className="fixed bottom-4 inset-x-0 mx-auto max-w-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-3 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-medium">You have unsaved config changes.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                className="text-xs text-slate-300 hover:text-white hover:bg-slate-800 h-8"
              >
                Discard
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={updateConfig.isPending}
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold h-8"
              >
                <SaveIcon className="size-3.5 mr-1" />
                <span>{updateConfig.isPending ? "Saving..." : "Save Config"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
