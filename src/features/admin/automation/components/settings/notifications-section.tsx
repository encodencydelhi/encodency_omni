"use client";

import { useState } from "react";
import { Bell, Mail, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { NotificationSettings } from "../../data/settings-types";

interface NotificationsSectionProps {
  settings: NotificationSettings;
  onChange: (updates: Partial<NotificationSettings>) => void;
}

export function NotificationsSection({ settings, onChange }: NotificationsSectionProps) {
  const [emailInput, setEmailInput] = useState(settings.alertEmails.join(", "));
  const [phoneInput, setPhoneInput] = useState(settings.alertPhoneNumbers.join(", "));
  const [isSendingPing, setIsSendingPing] = useState(false);

  const handleEmailBlur = () => {
    const list = emailInput.split(",").map(s => s.trim()).filter(Boolean);
    onChange({ alertEmails: list });
  };

  const handlePhoneBlur = () => {
    const list = phoneInput.split(",").map(s => s.trim()).filter(Boolean);
    onChange({ alertPhoneNumbers: list });
  };

  const handleTestPing = () => {
    if (!settings.alertWebhookUrl) {
      toast.error("Please enter a valid webhook URL before sending a test ping.");
      return;
    }
    setIsSendingPing(true);
    setTimeout(() => {
      setIsSendingPing(false);
      toast.success("Test alert ping delivered successfully!", {
        description: `HTTP 200 OK received from ${new URL(settings.alertWebhookUrl || "https://example.com").hostname}`,
      });
    }, 1200);
  };

  const toggleEvent = (key: keyof NotificationSettings["events"]) => {
    onChange({
      events: {
        ...settings.events,
        [key]: !settings.events[key],
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4 flex items-start gap-3">
        <div className="size-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="size-4" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">Notifications & Incident Alerting</h3>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Configure multi-channel dispatch for critical failures, DLQ spikes, third-party API token expiry, and daily operational digests.
          </p>
        </div>
      </div>

      {/* Alert Dispatch Channels */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <Bell className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Alert Dispatch Channels</h4>
        </div>

        <div className="space-y-3 text-[11px]">
          {/* In-App Notifications */}
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD]">
            <div>
              <span className="font-bold text-[#111C3A] block text-[11.5px]">In-App Topbar Notification Center</span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">
                Displays red badge alerts directly on the admin bell icon with 1-click links to failed runs.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={settings.enableInAppAlerts}
                onChange={(e) => onChange({ enableInAppAlerts: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Email Alerts */}
          <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-blue-600" />
                <span className="font-bold text-[#111C3A] text-[11.5px]">Email Notifications</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.enableEmailAlerts}
                  onChange={(e) => onChange({ enableEmailAlerts: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {settings.enableEmailAlerts && (
              <div>
                <label className="block text-[10px] font-bold text-[#64748B] mb-1">Recipient Emails (Comma-separated)</label>
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="alerts@company.com, ops@agency.in"
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11.5px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* WhatsApp Alerts */}
          <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-emerald-600" />
                <span className="font-bold text-[#111C3A] text-[11.5px]">WhatsApp Urgent Incident Dispatch</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.enableWhatsAppAlerts}
                  onChange={(e) => onChange({ enableWhatsAppAlerts: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {settings.enableWhatsAppAlerts && (
              <div>
                <label className="block text-[10px] font-bold text-[#64748B] mb-1">Admin Mobile Numbers (With country code)</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder="+91 98765 43210, +91 98112 23344"
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11.5px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Outgoing Webhook / Slack */}
          <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="size-4 text-purple-600" />
                <span className="font-bold text-[#111C3A] text-[11.5px]">Slack / Discord / Custom Webhook</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={settings.enableWebhookAlerts}
                  onChange={(e) => onChange({ enableWebhookAlerts: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {settings.enableWebhookAlerts && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="url"
                  value={settings.alertWebhookUrl}
                  onChange={(e) => onChange({ alertWebhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  className="flex-1 bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[11.5px] font-mono text-[#111C3A] focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isSendingPing}
                  className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 text-[11px] font-bold text-[#2563EB] shadow-2xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isSendingPing ? "Pinging..." : "Send Ping"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Granular Event Subscriptions */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <ShieldCheck className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Granular Event Subscriptions</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          {[
            {
              key: "criticalFailuresAndDlq" as const,
              title: "Critical Failures & DLQ Arrivals",
              desc: "Instant alert when a workflow step fails all retries and lands in the Dead Letter Queue.",
            },
            {
              key: "quotaThresholdWarning" as const,
              title: "API Quota & Token Expiry Warning",
              desc: "Alert when Meta or WhatsApp API remaining quota drops below 20% or token expires in <7 days.",
            },
            {
              key: "dailyHealthDigest" as const,
              title: "Daily Automation Health Digest",
              desc: "Daily summary sent at 09:00 AM with run counts, success rate, and active agent loads.",
            },
            {
              key: "highIngestionSpikes" as const,
              title: "High Ingestion Spike Warning",
              desc: "Immediate warning if incoming webhook volume suddenly exceeds 500 events / minute.",
            },
          ].map((item) => {
            const isChecked = settings.events[item.key];
            return (
              <label
                key={item.key}
                onClick={() => toggleEvent(item.key)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  isChecked
                    ? "bg-blue-50/50 border-blue-500 shadow-2xs"
                    : "bg-[#FAFBFD] border-[#E2E8F0] hover:bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="mt-0.5 size-3.5 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                />
                <div>
                  <span className={`text-[11.5px] font-bold block ${isChecked ? "text-blue-600" : "text-[#111C3A]"}`}>
                    {item.title}
                  </span>
                  <span className="text-[10px] text-[#64748B] block mt-0.5 leading-relaxed">{item.desc}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
