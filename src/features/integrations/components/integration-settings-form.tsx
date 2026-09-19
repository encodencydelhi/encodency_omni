/**
 * EnCodency OmniPlatform - Super Admin Integrations Module
 * Integration Settings Form Component
 * Platform-wide governance, health monitoring intervals, sync retry defaults, and access policies
 */

"use client";

import { useState, useEffect } from "react";
import { CheckCircle2Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIntegrationSettings, useUpdateIntegrationSettings } from "../data/hooks";
import type { IntegrationSettings } from "../data/types";

export function IntegrationSettingsForm() {
  const { data: settings } = useIntegrationSettings();
  const updateSettings = useUpdateIntegrationSettings();

  const [formState, setFormState] = useState<IntegrationSettings | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormState({ ...settings });
      setIsDirty(false);
    }
  }, [settings]);

  if (!formState) return null;

  const handleChange = (updater: (prev: IntegrationSettings) => IntegrationSettings) => {
    setFormState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      setIsDirty(true);
      setSaveSuccess(false);
      return next;
    });
  };

  const handleDiscard = () => {
    if (settings) {
      setFormState({ ...settings });
      setIsDirty(false);
      setSaveSuccess(false);
    }
  };

  const handleSave = async () => {
    if (!formState) return;
    await updateSettings.mutateAsync(formState);
    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 w-full max-w-full text-xs relative pb-16">
      {/* Section 1: Connection Governance */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Connection Governance & Ownership
          </div>
          <div className="text-slate-500 text-xs">
            Global policies governing tenant account authorizations and re-authentications.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              New Connection Approval Policy
            </Label>
            <Select
              value={formState.newConnectionApprovalPolicy}
              onValueChange={(val: any) =>
                handleChange((prev) => ({ ...prev, newConnectionApprovalPolicy: val }))
              }
            >
              <SelectTrigger className="text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="automatic">Automatic (Direct OAuth)</SelectItem>
                <SelectItem value="admin_review">Platform Admin Review Required</SelectItem>
                <SelectItem value="restricted_tier">Growth / Agency Tiers Only</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-slate-400 text-xs">
              Whether company connections connect immediately or queue for platform review.
            </span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Inactive Connection Review Window (Days)
            </Label>
            <Input
              type="number"
              value={formState.inactiveConnectionReviewDays}
              onChange={(e) =>
                handleChange((prev) => ({
                  ...prev,
                  inactiveConnectionReviewDays: parseInt(e.target.value) || 30,
                }))
              }
              className="text-xs bg-white"
            />
            <span className="text-slate-400 text-xs">
              Connections without publish or sync operations are flagged for review.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Connection Ownership Model
            </Label>
            <Select
              value={formState.connectionOwnershipPolicy}
              onValueChange={(val: any) =>
                handleChange((prev) => ({ ...prev, connectionOwnershipPolicy: val }))
              }
            >
              <SelectTrigger className="text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="strict_company_silo">Strict Company Silo (Isolated)</SelectItem>
                <SelectItem value="agency_delegated">Agency Delegated (Cross-Client Mapping)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Reauthorization Reminder Schedule (Days)
            </Label>
            <Input
              type="number"
              value={formState.reauthorizationRequestDefaults.reminderDays}
              onChange={(e) =>
                handleChange((prev) => ({
                  ...prev,
                  reauthorizationRequestDefaults: {
                    ...prev.reauthorizationRequestDefaults,
                    reminderDays: parseInt(e.target.value) || 7,
                  },
                }))
              }
              className="text-xs bg-white"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Health Monitoring & Telemetry */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Health Monitoring & Diagnostic Intervals
          </div>
          <div className="text-slate-500 text-xs">
            Frequency of automated health probes and token expiration warnings.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Token Expiry Warning (Days)
            </Label>
            <Input
              type="number"
              value={formState.tokenExpiryWarningDays}
              onChange={(e) =>
                handleChange((prev) => ({
                  ...prev,
                  tokenExpiryWarningDays: parseInt(e.target.value) || 14,
                }))
              }
              className="text-xs bg-white"
            />
            <span className="text-slate-400 text-xs">Warn before token expires.</span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Health Check Probe Interval (Min)
            </Label>
            <Input
              type="number"
              value={formState.connectionHealthCheckIntervalMinutes}
              onChange={(e) =>
                handleChange((prev) => ({
                  ...prev,
                  connectionHealthCheckIntervalMinutes: parseInt(e.target.value) || 15,
                }))
              }
              className="text-xs bg-white"
            />
            <span className="text-slate-400 text-xs">Scheduled background worker.</span>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Repeated Failure Escalation
            </Label>
            <Input
              type="number"
              value={formState.repeatedFailureThreshold}
              onChange={(e) =>
                handleChange((prev) => ({
                  ...prev,
                  repeatedFailureThreshold: parseInt(e.target.value) || 5,
                }))
              }
              className="text-xs bg-white"
            />
            <span className="text-slate-400 text-xs">Consecutive errors to open incident.</span>
          </div>
        </div>
      </div>

      {/* Section 3: Sync & Retry Defaults */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Synchronization & Worker Retry Backoff
          </div>
          <div className="text-slate-500 text-xs">
            Queue policies for automated content publishing and analytics pulling.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Default Sync Interval (Minutes)
            </Label>
            <Input
              type="number"
              value={formState.defaultSyncIntervalMinutes}
              onChange={(e) =>
                handleChange((prev) => ({
                  ...prev,
                  defaultSyncIntervalMinutes: parseInt(e.target.value) || 30,
                }))
              }
              className="text-xs bg-white"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Retry Backoff Strategy
            </Label>
            <Select
              value={formState.retryPolicy}
              onValueChange={(val: any) =>
                handleChange((prev) => ({ ...prev, retryPolicy: val }))
              }
            >
              <SelectTrigger className="text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="exponential_backoff">Exponential Backoff (Recommended)</SelectItem>
                <SelectItem value="fixed_interval">Fixed Interval (5 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Max Retry Attempts
            </Label>
            <Input
              type="number"
              value={formState.backoffMaxRetries}
              onChange={(e) =>
                handleChange((prev) => ({
                  ...prev,
                  backoffMaxRetries: parseInt(e.target.value) || 4,
                }))
              }
              className="text-xs bg-white"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Notification Alerts */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
        <div className="border-b border-slate-100 pb-2">
          <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Operational Notification Policies
          </div>
          <div className="text-slate-500 text-xs">
            Automated alerts dispatched to administrators during service anomalies.
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">
                Provider Outage Alerts
              </div>
              <div className="text-slate-500 text-xs">
                Send high-priority notification when an upstream provider experiences API degradation.
              </div>
            </div>
            <Switch
              checked={formState.notificationPolicies.providerOutageAlerts}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({
                  ...prev,
                  notificationPolicies: {
                    ...prev.notificationPolicies,
                    providerOutageAlerts: checked,
                  },
                }))
              }
            />
          </div>

          <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">
                Connection Token Expiry Alerts
              </div>
              <div className="text-slate-500 text-xs">
                Alert company admins 14 days before OAuth tokens expire.
              </div>
            </div>
            <Switch
              checked={formState.notificationPolicies.connectionExpiryAlerts}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({
                  ...prev,
                  notificationPolicies: {
                    ...prev.notificationPolicies,
                    connectionExpiryAlerts: checked,
                  },
                }))
              }
            />
          </div>

          <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">
                Permission Revocation Alerts
              </div>
              <div className="text-slate-500 text-xs">
                Alert when social networks report revoked publishing permissions.
              </div>
            </div>
            <Switch
              checked={formState.notificationPolicies.permissionRevocationAlerts}
              onCheckedChange={(checked) =>
                handleChange((prev) => ({
                  ...prev,
                  notificationPolicies: {
                    ...prev.notificationPolicies,
                    permissionRevocationAlerts: checked,
                  },
                }))
              }
            />
          </div>
        </div>
      </div>

      {/* Floating Action Bar when unsaved */}
      {isDirty && (
        <div className="fixed bottom-4 inset-x-0 mx-auto max-w-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-3 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-medium">
                You have unsaved policy changes.
              </span>
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
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold h-8"
              >
                <SaveIcon className="size-3.5 mr-1" />
                <span>Save Changes</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
          <CheckCircle2Icon className="size-4 text-emerald-600" />
          <span>Integration governance settings successfully saved to shared platform state.</span>
        </div>
      )}
    </div>
  );
}
