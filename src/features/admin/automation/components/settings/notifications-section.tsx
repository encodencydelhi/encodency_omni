"use client";

import { useState } from "react";
import { Bell, Mail, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { NotificationSettings } from "../../data/settings-types";
import { automationApi } from "../../data/automation-api";

interface NotificationsSectionProps {
  settings: NotificationSettings;
  onChange: (updates: Partial<NotificationSettings>) => void;
  /** True while there are unsaved settings changes (tests use the saved settings). */
  isDirty: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={`relative inline-flex shrink-0 items-center ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
      <input type="checkbox" aria-label={label} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <div className="h-5 w-9 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
    </label>
  );
}

export function NotificationsSection({ settings, onChange, isDirty }: NotificationsSectionProps) {
  const [emailInput, setEmailInput] = useState(settings.alertEmails.join(", "));
  const [testing, setTesting] = useState(false);

  const emails = emailInput.split(",").map((s) => s.trim()).filter(Boolean);
  const invalidEmails = emails.filter((e) => !EMAIL_RE.test(e));
  const webhookInvalid = Boolean(settings.alertWebhookUrl) && !/^https?:\/\/\S+$/i.test(settings.alertWebhookUrl);

  const sendTest = async () => {
    if (isDirty) { toast.error("Save your changes first. The test uses the saved settings."); return; }
    setTesting(true);
    try {
      const results = await automationApi.testAlert();
      for (const r of results) (r.ok ? toast.success : toast.error)(`${r.channel === "none" ? "Alerts" : r.channel === "email" ? "Email" : "Webhook"}: ${r.detail}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Test alert failed.");
    } finally {
      setTesting(false);
    }
  };

  const events: Array<{ key: keyof NotificationSettings["events"]; title: string; desc: string; available: boolean }> = [
    { key: "criticalFailuresAndDlq", title: "Run failures", desc: "Alert every time a live run fails after its retries (and when a circuit breaker stops a workflow).", available: true },
    { key: "dailyHealthDigest", title: "Daily health digest", desc: "A summary of the last 24 hours of runs, sent after 09:00 in the timezone from General settings.", available: true },
    { key: "quotaThresholdWarning", title: "API quota warnings", desc: "Not tracked yet: providers do not report quota to the engine.", available: false },
    { key: "highIngestionSpikes", title: "Ingestion spike warnings", desc: "Not tracked yet.", available: false },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600"><Bell className="size-4" /></div>
          <div>
            <h3 className="text-[14px] font-bold text-[#111C3A]">Notifications &amp; alerting</h3>
            <p className="mt-0.5 text-[11px] text-[#64748B]">Where failure alerts and the daily digest are delivered. Test runs never send alerts.</p>
          </div>
        </div>
        <button type="button" onClick={() => void sendTest()} disabled={testing} className="shrink-0 rounded-lg border border-[#BFDBFE] bg-[#FAFBFD] px-3 py-1.5 text-[11px] font-bold text-[#2563EB] shadow-2xs hover:bg-white disabled:opacity-50">
          {testing ? "Sending..." : "Send test alert"}
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-5 text-[11px] shadow-xs">
        <div className="flex items-start justify-between rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] p-3.5">
          <div>
            <span className="block text-[11.5px] font-bold text-[#111C3A]">In-app alerts</span>
            <span className="mt-0.5 block text-[10px] text-[#64748B]">Failures and safety warnings appear under Automation → Overview → Needs attention.</span>
          </div>
          <Toggle label="In-app alerts" checked={settings.enableInAppAlerts} onChange={(v) => onChange({ enableInAppAlerts: v })} />
        </div>

        <div className="space-y-2 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Mail className="size-4 text-blue-600" /><span className="text-[11.5px] font-bold text-[#111C3A]">Email alerts</span></div>
            <Toggle label="Email alerts" checked={settings.enableEmailAlerts} onChange={(v) => onChange({ enableEmailAlerts: v })} />
          </div>
          {settings.enableEmailAlerts ? (
            <div>
              <label className="mb-1 block text-[10px] font-bold text-[#64748B]">Recipients (comma-separated)</label>
              <input type="text" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onBlur={() => onChange({ alertEmails: emails.filter((e) => EMAIL_RE.test(e)) })} placeholder="alerts@company.com, ops@company.com" className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[11.5px] font-medium text-[#111C3A] focus:border-blue-500 focus:outline-none" />
              {invalidEmails.length ? <p className="mt-1 text-[10px] text-red-600">Not valid (ignored): {invalidEmails.join(", ")}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-1 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] p-3.5 opacity-70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><MessageSquare className="size-4 text-emerald-600" /><span className="text-[11.5px] font-bold text-[#111C3A]">WhatsApp alerts</span></div>
            <Toggle label="WhatsApp alerts" checked={false} disabled onChange={() => undefined} />
          </div>
          <p className="text-[10px] text-[#64748B]">Not available yet: WhatsApp only allows pre-approved templates, and no alert template is configured. Use email or a webhook.</p>
        </div>

        <div className="space-y-2 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Send className="size-4 text-purple-600" /><span className="text-[11.5px] font-bold text-[#111C3A]">Slack / Discord / custom webhook</span></div>
            <Toggle label="Webhook alerts" checked={settings.enableWebhookAlerts} onChange={(v) => onChange({ enableWebhookAlerts: v })} />
          </div>
          {settings.enableWebhookAlerts ? (
            <div>
              <input type="url" value={settings.alertWebhookUrl} onChange={(e) => onChange({ alertWebhookUrl: e.target.value.trim() })} placeholder="https://hooks.slack.com/services/..." className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 font-mono text-[11.5px] text-[#111C3A] focus:border-blue-500 focus:outline-none" />
              {webhookInvalid ? <p className="mt-1 text-[10px] text-red-600">Enter a full http(s) URL.</p> : <p className="mt-1 text-[10px] text-[#64748B]">We POST a JSON body with <code>type</code>, <code>subject</code> and <code>text</code>.</p>}
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <ShieldCheck className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">What to alert on</h4>
        </div>
        <div className="grid grid-cols-1 gap-3 text-[11px] md:grid-cols-2">
          {events.map((item) => {
            const checked = item.available && settings.events[item.key];
            return (
              <label key={item.key} className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${!item.available ? "cursor-not-allowed border-[#E2E8F0] bg-[#FAFBFD] opacity-60" : checked ? "cursor-pointer border-blue-500 bg-blue-50/50" : "cursor-pointer border-[#E2E8F0] bg-[#FAFBFD] hover:bg-white"}`}>
                <input type="checkbox" checked={checked} disabled={!item.available} onChange={() => onChange({ events: { ...settings.events, [item.key]: !settings.events[item.key] } })} className="mt-0.5 size-3.5 rounded border-gray-300" />
                <div>
                  <span className={`block text-[11.5px] font-bold ${checked ? "text-blue-600" : "text-[#111C3A]"}`}>{item.title}</span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-[#64748B]">{item.desc}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
