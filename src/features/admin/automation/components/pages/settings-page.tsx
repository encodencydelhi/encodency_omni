"use client";

import {
  Settings, Play, RotateCcw, Bell, Clock, Users, Link2, ShieldAlert,
  Check, Save
} from "lucide-react";
import { useUrlState } from "../use-url-state";
import { useAutomationSettings } from "../settings/use-automation-settings";
import { SettingsSectionKey } from "../../data/settings-types";

// Section Components
import { GeneralSection } from "../settings/general-section";
import { ExecutionRulesSection } from "../settings/execution-rules-section";
import { RetryLogicSection } from "../settings/retry-logic-section";
import { NotificationsSection } from "../settings/notifications-section";
import { BusinessHoursSection } from "../settings/business-hours-section";
import { OwnershipRoutingSection } from "../settings/ownership-routing-section";
import { IntegrationsSection } from "../settings/integrations-section";
import { SafetyControlsSection } from "../settings/safety-controls-section";

const SECTIONS: Array<{
  key: SettingsSectionKey;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}> = [
  { key: "general", label: "General", icon: <Settings className="size-4" /> },
  { key: "execution", label: "Execution Rules", icon: <Play className="size-4" /> },
  { key: "retry", label: "Retry Logic & DLQ", icon: <RotateCcw className="size-4" /> },
  { key: "notifications", label: "Notifications", icon: <Bell className="size-4" /> },
  { key: "business-hours", label: "Business Hours", icon: <Clock className="size-4" /> },
  { key: "routing", label: "Ownership & Routing", icon: <Users className="size-4" /> },
  { key: "integrations", label: "Integrations & Webhooks", icon: <Link2 className="size-4" /> },
  { key: "safety", label: "Safety Controls", icon: <ShieldAlert className="size-4" /> },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useUrlState<SettingsSectionKey>(
    "section",
    "general",
    ["general", "execution", "retry", "notifications", "business-hours", "routing", "integrations", "safety"]
  );

  const {
    settings,
    isLoading,
    isSaving,
    isDirty,
    updateSection,
    saveSettings,
    discardChanges,
    resetToDefaults,
    health,
  } = useAutomationSettings();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-[13px] text-[#64748B] animate-pulse">
        Loading automation settings...
      </div>
    );
  }

  return (
    <div className="relative pb-20">
      <div className="flex flex-col lg:flex-row gap-2 items-start">

        {/* LEFT COLUMN: Navigation Sidebar */}
        <div className="w-full lg:w-[230px] shrink-0 space-y-1">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-1.5 space-y-0.5">
            {SECTIONS.map((item) => {
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSection(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-[#2563EB] font-bold border-l-3 border-[#2563EB] shadow-2xs"
                      : "text-[#64748B] hover:bg-slate-50 hover:text-[#111C3A] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? "text-[#2563EB]" : "text-[#64748B]"}>
                      {item.icon}
                    </span>
                    <span className="text-[12px]">{item.label}</span>
                  </div>

                  {item.key === "safety" && settings.safety.sandboxDryRunMode && (
                    <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Info Box */}
          <div className="p-3 bg-[#FAFBFD] rounded-xl border border-[#E2E8F0] text-[10.5px] text-[#64748B] space-y-1">
            <span className="font-bold text-[#111C3A] block">Auto-Sync Enabled</span>
            <p className="leading-tight">
              Settings automatically synchronize across worker nodes, Meta lead listeners, and WhatsApp Cloud queues.
            </p>
          </div>
        </div>

        {/* MIDDLE COLUMN: Active Tab View */}
        <div className="flex-1 min-w-0">
          {activeSection === "general" && (
            <GeneralSection
              settings={settings.general}
              onChange={(u) => updateSection("general", u)}
            />
          )}

          {activeSection === "execution" && (
            <ExecutionRulesSection
              settings={settings.execution}
              onChange={(u) => updateSection("execution", u)}
            />
          )}

          {activeSection === "retry" && (
            <RetryLogicSection
              settings={settings.retry}
              onChange={(u) => updateSection("retry", u)}
            />
          )}

          {activeSection === "notifications" && (
            <NotificationsSection
              settings={settings.notifications}
              onChange={(u) => updateSection("notifications", u)}
            />
          )}

          {activeSection === "business-hours" && (
            <BusinessHoursSection
              settings={settings.businessHours}
              onChange={(u) => updateSection("businessHours", u)}
            />
          )}

          {activeSection === "routing" && (
            <OwnershipRoutingSection
              settings={settings.routing}
              onChange={(u) => updateSection("routing", u)}
            />
          )}

          {activeSection === "integrations" && (
            <IntegrationsSection
              settings={settings.integrations}
              onChange={(u) => updateSection("integrations", u)}
            />
          )}

          {activeSection === "safety" && (
            <SafetyControlsSection
              settings={settings.safety}
              onChange={(u) => updateSection("safety", u)}
              onResetAllToDefaults={resetToDefaults}
            />
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar Stats & Audit */}
        <div className="w-full lg:w-[260px] shrink-0 space-y-2">

          {/* Configuration Health */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4">
            <h3 className="text-[13px] font-bold text-[#111C3A] mb-3">Configuration Health</h3>
            
            <div className="flex items-center gap-3.5 mb-3">
              <div
                className="size-20 shrink-0 rounded-full border-[5px] flex flex-col items-center justify-center shadow-2xs"
                style={{ borderColor: health.color }}
              >
                <span className="text-[20px] font-black text-[#111C3A] leading-none">{health.score}</span>
                <span className="text-[10px] font-bold mt-1 tracking-tight" style={{ color: health.color }}>
                  {health.rating}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-[12px] font-bold text-[#111C3A] block">System Status</span>
                <span className="text-[10px] text-[#64748B] block mt-0.5 leading-tight">
                  {health.score >= 85 ? "Enterprise protection active." : "Requires attention."}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9]">
              {health.checks.map((chk, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  <div
                    className={`size-3.5 rounded-full flex items-center justify-center shrink-0 ${
                      chk.passed ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <Check className="size-2.5" />
                  </div>
                  <span className={chk.passed ? "text-[#334155] font-medium" : "text-[#94A3B8]"}>
                    {chk.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Integrations Quick View */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-[#111C3A]">Connected Gateways</h3>
              <button
                type="button"
                onClick={() => setActiveSection("integrations")}
                className="text-[10.5px] font-bold text-[#2563EB] hover:underline cursor-pointer"
              >
                Configure →
              </button>
            </div>

            <div className="space-y-1.5 text-[10.5px]">
              {settings.integrations.providers.map((int) => (
                <div
                  key={int.id}
                  onClick={() => setActiveSection("integrations")}
                  className="flex items-center justify-between p-2 hover:bg-[#FAFBFD] rounded-lg border border-transparent hover:border-[#E2E8F0] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-[#111C3A] truncate">{int.name}</span>
                  </div>
                  <span className="w-[52px] text-center font-mono text-[9.5px] font-bold text-emerald-600 bg-emerald-50 py-0.5 rounded border border-emerald-200 shrink-0">
                    {int.latencyMs}ms
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4">
            <h3 className="text-[13px] font-bold text-[#111C3A] mb-2.5">Audit Log</h3>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-6 rounded-full bg-[#1E293B] text-white flex items-center justify-center font-bold text-[10px]">
                M
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#111C3A] block leading-none">Manish Sirohi</span>
                <span className="text-[9.5px] text-[#94A3B8]">Last modified: Today, 10:24 AM</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#FAFBFD] border border-[#E2E8F0] text-[9.5px] text-[#64748B] space-y-1">
              <div>• Ownership: {settings.general.defaultOwnership.replace("_", " ")}</div>
              <div>• Timezone: {settings.general.timezone.split(" ")[0]}</div>
              <div>• Retry limit: {settings.retry.maxRetryAttempts} attempts</div>
              <div>• Quiet hours: {settings.businessHours.enableQuietHours ? "Active (10 PM - 8 AM)" : "Disabled"}</div>
            </div>
          </div>

        </div>

      </div>

      {/* Floating Sticky Save Bar (Appears when isDirty === true) */}
      {isDirty && (
        <div className="fixed bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 z-[60] bg-white border border-[#CBD5E1] shadow-[0_12px_40px_rgba(0,0,0,0.14)] rounded-2xl px-6 py-3.5 sm:px-8 sm:py-4 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-200 w-[95%] max-w-4xl lg:max-w-5xl justify-between">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <span className="relative flex size-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-3 bg-amber-500"></span>
            </span>
            <div className="min-w-0">
              <span className="text-[13px] font-bold text-[#111C3A] block truncate">Unsaved Configuration Changes</span>
              <span className="text-[11px] text-[#64748B] block truncate">Review your updates before applying to live workflows.</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={discardChanges}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[12px] font-bold text-[#64748B] transition-colors cursor-pointer whitespace-nowrap"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={saveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-bold shadow-md shadow-blue-500/25 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Save className={`size-4 ${isSaving ? "animate-spin" : ""}`} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
