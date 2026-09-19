/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Provider Configuration Editor Drawer / Modal
 * Structured workspace with General, Authorization, Secure Credentials Status, and Operational Controls
 */

"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2Icon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ExternalApiAccess,
  PlatformAvailability,
  ProviderConfiguration,
} from "../data/types";
import { useUpdateProviderConfig } from "../data/hooks";

interface ProviderConfigModalProps {
  config: ProviderConfiguration | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProviderConfigModal({
  config,
  isOpen,
  onClose,
  onSuccess,
}: ProviderConfigModalProps) {
  const [formData, setFormData] = useState<ProviderConfiguration | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const updateConfig = useUpdateProviderConfig();

  useEffect(() => {
    if (config) {
      setFormData({ ...config });
    }
  }, [config]);

  if (!formData) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateConfig.mutateAsync({
        providerId: formData.providerId,
        updates: formData,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to save provider config", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <SlidersHorizontalIcon className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Configure Provider: {formData.providerCode.toUpperCase()}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Manage app credentials references, authorization endpoints and operational flags.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-2">
          <TabsList className="grid grid-cols-4 w-full bg-slate-100 p-1 text-xs">
            <TabsTrigger value="general" className="text-xs font-semibold">
              General
            </TabsTrigger>
            <TabsTrigger value="auth" className="text-xs font-semibold">
              Authorization
            </TabsTrigger>
            <TabsTrigger value="credentials" className="text-xs font-semibold">
              Vault Status
            </TabsTrigger>
            <TabsTrigger value="operations" className="text-xs font-semibold">
              Operational
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: General */}
          <TabsContent value="general" className="space-y-3 py-3 text-xs">
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
                  onValueChange={(val: "production" | "sandbox") =>
                    setFormData({ ...formData, environment: val })
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
                onValueChange={(val: PlatformAvailability) =>
                  setFormData({ ...formData, platformAvailability: val })
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
                  setFormData({ ...formData, description: e.target.value })
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
                  setFormData({ ...formData, internalNotes: e.target.value })
                }
                className="text-xs bg-white resize-none font-mono"
              />
            </div>
          </TabsContent>

          {/* Tab 2: Authorization */}
          <TabsContent value="auth" className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                OAuth 2.0 Redirect URI
              </Label>
              <Input
                value={formData.redirectUri}
                onChange={(e) =>
                  setFormData({ ...formData, redirectUri: e.target.value })
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
                  setFormData({
                    ...formData,
                    requiredScopes: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="text-xs font-mono bg-white resize-none"
              />
              <span className="text-xs text-slate-500">
                Scopes requested during tenant OAuth consent screen.
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                External Developer App Approval Status
              </Label>
              <Select
                value={formData.externalApiApprovalStatus}
                onValueChange={(val: ExternalApiAccess) =>
                  setFormData({ ...formData, externalApiApprovalStatus: val })
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
                App Review & Compliance Notes
              </Label>
              <Textarea
                rows={2}
                value={formData.appReviewNotes}
                onChange={(e) =>
                  setFormData({ ...formData, appReviewNotes: e.target.value })
                }
                className="text-xs bg-white resize-none"
              />
            </div>
          </TabsContent>

          {/* Tab 3: Secure Credential Status (Safe metadata only - NO RAW SECRETS) */}
          <TabsContent value="credentials" className="space-y-3 py-3 text-xs">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 flex items-start gap-2.5">
              <ShieldCheckIcon className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-800 text-xs">
                  Zero-Knowledge Security Architecture
                </div>
                <div className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                  Raw client secrets, private keys, and webhook signing tokens are encrypted and managed in platform secure vaults (HashiCorp Vault / AWS KMS). They are never transmitted to or editable via the web frontend.
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
                  Last rotated: {formData.lastRotatedAt ? new Date(formData.lastRotatedAt).toLocaleDateString() : "Never"}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Operational Controls */}
          <TabsContent value="operations" className="space-y-3 py-3 text-xs">
            <div className="space-y-2 border rounded-xl p-3 border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-xs">
                    Allow New Connections
                  </div>
                  <div className="text-xs text-slate-500">
                    Tenants can connect new accounts via Company Admin.
                  </div>
                </div>
                <Switch
                  checked={formData.allowNewConnections}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, allowNewConnections: checked })
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
                    setFormData({ ...formData, allowExistingPublishing: checked })
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
                    setFormData({ ...formData, allowExistingSync: checked })
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
                    setFormData({ ...formData, enableWebhooks: checked })
                  }
                />
              </div>

              <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-900 text-xs">
                    Maintenance Mode
                  </div>
                  <div className="text-xs text-slate-500">
                    Pauses all automated workers for this provider.
                  </div>
                </div>
                <Switch
                  checked={formData.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, maintenanceMode: checked })
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

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
            onClick={handleSave}
            disabled={isSubmitting}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {isSubmitting ? "Saving..." : "Save Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
