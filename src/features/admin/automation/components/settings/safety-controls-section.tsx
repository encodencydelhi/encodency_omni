"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, Zap, AlertTriangle, PauseCircle, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SafetySettings } from "../../data/settings-types";

interface SafetyControlsSectionProps {
  settings: SafetySettings;
  onChange: (updates: Partial<SafetySettings>) => void;
  onResetAllToDefaults: () => void;
}

export function SafetyControlsSection({ settings, onChange, onResetAllToDefaults }: SafetyControlsSectionProps) {
  const [showDangerModal, setShowDangerModal] = useState<"pause_all" | "purge_logs" | "reset_all" | null>(null);

  const handleConfirmAction = () => {
    if (showDangerModal === "pause_all") {
      onChange({ emergencyKillSwitchActive: !settings.emergencyKillSwitchActive });
      if (!settings.emergencyKillSwitchActive) {
        toast.warning("EMERGENCY KILL SWITCH ACTIVATED: All active workflows halted!", {
          description: "No webhooks or scheduled triggers will execute until deactivated.",
        });
      } else {
        toast.success("Kill switch deactivated. Normal automation resumed.");
      }
    } else if (showDangerModal === "purge_logs") {
      toast.success("Purged all historic completed logs older than 7 days.");
    } else if (showDangerModal === "reset_all") {
      onResetAllToDefaults();
    }
    setShowDangerModal(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4 flex items-start gap-3">
        <div className="size-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldAlert className="size-4" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">Safety Controls, Sandbox & Circuit Breakers</h3>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Prevent unintended message blasts, mask customer PII in execution traces, and configure automatic circuit breaker trip limits.
          </p>
        </div>
      </div>

      {/* Sandbox Dry-Run Mode Card */}
      <div className={`rounded-xl border p-5 transition-all space-y-3 ${
        settings.sandboxDryRunMode
          ? "bg-amber-50/70 border-amber-300 shadow-sm"
          : "bg-white border-[#E2E8F0] shadow-xs"
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2.5">
            <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              settings.sandboxDryRunMode ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-[#475569]"
            }`}>
              <Zap className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-[13px] font-bold text-[#111C3A]">Global Sandbox (Dry-Run Mode)</h4>
                {settings.sandboxDryRunMode && (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                    SANDBOX ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                When enabled, workflows evaluate real triggers, filters, and conditional branches, but <strong>mock all external API side-effects</strong> (no actual WhatsApp or SMS sent, no Meta budgets changed).
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
            <input
              type="checkbox"
              checked={settings.sandboxDryRunMode}
              onChange={(e) => {
                onChange({ sandboxDryRunMode: e.target.checked });
                if (e.target.checked) {
                  toast.warning("Sandbox Mode ENABLED: External dispatch is paused.");
                } else {
                  toast.info("Sandbox Mode DISABLED: Live dispatch active.");
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>
      </div>

      {/* Circuit Breaker & Safeguards */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <ShieldCheck className="size-4 text-[#10B981]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Automated Circuit Breaker & Data Privacy</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
          {/* Circuit Breaker */}
          <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#111C3A] text-[11.5px] block">Emergency Circuit Breaker</span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  Auto-pauses workflow worker if error rate spikes abruptly.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.circuitBreakerEnabled}
                  onChange={(e) => onChange({ circuitBreakerEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {settings.circuitBreakerEnabled && (
              <div className="pt-2 flex items-center gap-2">
                <span className="text-[10px] text-[#64748B]">Trip threshold:</span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.circuitBreakerThresholdFailures}
                  onChange={(e) => onChange({ circuitBreakerThresholdFailures: parseInt(e.target.value) || 25 })}
                  className="w-16 bg-white border border-[#E2E8F0] rounded px-2 py-1 text-[11px] font-mono font-bold text-[#111C3A]"
                />
                <span className="text-[10px] text-[#64748B]">failures in 60 seconds</span>
              </div>
            )}
          </div>

          {/* Mask PII */}
          <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#111C3A] text-[11.5px] block">Mask Customer PII in Console Logs</span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  Anonymizes phone numbers (<code className="font-mono text-[9px]">+91 98*** **344</code>) and email addresses in debug traces.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.maskPiiInLogs}
                  onChange={(e) => onChange({ maskPiiInLogs: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Log Retention */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-[11px]">
          <div>
            <label className="block font-bold text-[#334155] mb-1">Execution Trace Log Retention Duration</label>
            <select
              value={settings.logRetentionDays}
              onChange={(e) => onChange({ logRetentionDays: parseInt(e.target.value) || 90 })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value={30}>30 days (Lightweight)</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days (Recommended)</option>
              <option value={365}>365 days (Enterprise Compliance)</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Payload blobs and HTTP headers older than this window are automatically purged.
            </p>
          </div>

          <div className="flex items-start justify-between p-3.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD]">
            <div>
              <span className="font-bold text-[#111C3A] block text-[11.5px]">Require 2-Person Approval for Risky Actions</span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">
                Bulk contact deletions or broad broadcast blasts require second admin sign-off.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={settings.requireApprovalForRiskyActions}
                onChange={(e) => onChange({ requireApprovalForRiskyActions: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-[#DC2626]" />
          <h4 className="text-[13px] font-bold text-[#DC2626]">Danger Zone Controls</h4>
        </div>
        <p className="text-[11px] text-[#EF4444] leading-relaxed">
          High-impact actions that affect all live client workflows and background processing threads immediately.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowDangerModal("pause_all")}
            className="flex items-center gap-1.5 bg-white border border-[#FECACA] text-[#DC2626] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 shadow-2xs transition-colors cursor-pointer"
          >
            <PauseCircle className="size-3.5" />
            {settings.emergencyKillSwitchActive ? "Deactivate Emergency Kill Switch" : "Emergency Pause All Workflows"}
          </button>

          <button
            type="button"
            onClick={() => setShowDangerModal("purge_logs")}
            className="flex items-center gap-1.5 bg-white border border-[#FECACA] text-[#DC2626] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Trash2 className="size-3.5" /> Purge Completed Logs
          </button>

          <button
            type="button"
            onClick={() => setShowDangerModal("reset_all")}
            className="flex items-center gap-1.5 bg-white border border-[#FECACA] text-[#DC2626] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3.5" /> Reset All to Factory Defaults
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDangerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-[#DC2626]">
              <div className="size-9 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="size-5" />
              </div>
              <h3 className="text-[15px] font-bold text-[#111C3A]">
                {showDangerModal === "pause_all" && "Confirm Emergency Pause"}
                {showDangerModal === "purge_logs" && "Confirm Purge Completed Logs"}
                {showDangerModal === "reset_all" && "Reset All Settings to Defaults"}
              </h3>
            </div>

            <p className="text-[12px] text-[#64748B] leading-relaxed">
              {showDangerModal === "pause_all" && "Are you sure you want to toggle the global emergency kill switch? All running and scheduled executions will immediately halt."}
              {showDangerModal === "purge_logs" && "Are you sure you want to purge all completed logs? This action cannot be reversed and logs will be permanently deleted."}
              {showDangerModal === "reset_all" && "This will overwrite all 8 automation settings sections back to their factory default values. Any custom retry or routing settings will be lost."}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setShowDangerModal(null)}
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-slate-50 text-[11.5px] font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11.5px] font-bold shadow-sm shadow-red-500/20 transition-colors"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
