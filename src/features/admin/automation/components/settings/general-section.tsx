"use client";

import { useEffect, useState } from "react";
import { Globe, MessageSquare, Settings, Terminal, User } from "lucide-react";
import { getStoredCompanyId } from "@/lib/api/tenancy-storage";
import { teamApi } from "@/features/admin/team/live/team-api";
import { GeneralSettings } from "../../data/settings-types";

interface GeneralSectionProps {
  settings: GeneralSettings;
  onChange: (updates: Partial<GeneralSettings>) => void;
}

const TIMEZONES = [
  "Asia/Kolkata (GMT+5:30)",
  "Asia/Dubai (GMT+4:00)",
  "Asia/Singapore (GMT+8:00)",
  "Europe/London (GMT+0:00)",
  "America/New_York (GMT-5:00)",
  "America/Los_Angeles (GMT-8:00)",
];

const CHANNELS = [
  { id: "WhatsApp", desc: "Send WhatsApp steps" },
  { id: "Email", desc: "Send Email steps" },
];

const field = "w-full rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] px-3 py-2 text-[12px] font-medium text-[#111C3A] focus:border-blue-500 focus:bg-white focus:outline-none";

export function GeneralSection({ settings, onChange }: GeneralSectionProps) {
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    teamApi.listMembers(getStoredCompanyId())
      .then((rows) => { if (!cancelled) setMembers(rows.filter((m) => !m.suspendedAt).map((m) => ({ id: m.user.id, name: m.user.name?.trim() || m.user.email }))); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const toggleChannel = (id: string) => {
    const has = settings.allowedChannels.some((c) => c.toLowerCase() === id.toLowerCase());
    onChange({ allowedChannels: has ? settings.allowedChannels.filter((c) => c.toLowerCase() !== id.toLowerCase()) : [...settings.allowedChannels, id] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Settings className="size-4" /></div>
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">General</h3>
          <p className="mt-0.5 text-[11px] text-[#64748B]">Company-wide defaults used by every client&apos;s workflows.</p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2"><User className="size-4 text-[#334155]" /><h4 className="text-[12.5px] font-bold text-[#111C3A]">Ownership &amp; timezone</h4></div>
        <div className="grid grid-cols-1 gap-4 text-[11px] md:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-[#334155]">Owner of leads created by form webhooks</label>
            <select value={settings.defaultOwnership} onChange={(e) => onChange({ defaultOwnership: e.target.value as GeneralSettings["defaultOwnership"] })} className={field}>
              <option value="account_owner">The workflow&apos;s owner</option>
              <option value="round_robin">Routing rules (Ownership &amp; Routing)</option>
              <option value="specific_user">A specific team member</option>
            </select>
            {settings.defaultOwnership === "specific_user" ? (
              <select aria-label="Team member" value={settings.specificOwnerId ?? ""} onChange={(e) => onChange({ specificOwnerId: e.target.value, specificOwnerName: members.find((m) => m.id === e.target.value)?.name ?? "" })} className={`${field} mt-2`}>
                <option value="">Select a team member…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            ) : null}
            <p className="mt-1 text-[10px] text-[#94A3B8]">Applies to leads a Form Submission trigger creates. Other triggers keep the record&apos;s existing owner.</p>
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 font-bold text-[#334155]"><Globe className="size-3 text-[#64748B]" /> Automation timezone</label>
            <select value={settings.timezone} onChange={(e) => onChange({ timezone: e.target.value })} className={field}>
              {(TIMEZONES.includes(settings.timezone) ? TIMEZONES : [settings.timezone, ...TIMEZONES]).map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
            <p className="mt-1 text-[10px] text-[#94A3B8]">Used for the daily digest time. Business hours have their own timezone.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2"><MessageSquare className="size-4 text-[#334155]" /><h4 className="text-[12.5px] font-bold text-[#111C3A]">Channels &amp; new leads</h4></div>
        <div className="grid grid-cols-1 gap-4 text-[11px] md:grid-cols-2">
          <div>
            <label className="mb-1 block font-bold text-[#334155]">Allowed channels</label>
            <div className="space-y-1.5">
              {CHANNELS.map((ch) => {
                const on = settings.allowedChannels.some((c) => c.toLowerCase() === ch.id.toLowerCase());
                return (
                  <label key={ch.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] px-3 py-2">
                    <input type="checkbox" checked={on} onChange={() => toggleChannel(ch.id)} />
                    <span className="font-semibold text-[#111C3A]">{ch.id}</span>
                    <span className="text-[10px] text-[#64748B]">{ch.desc}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-[#94A3B8]">A step on a disallowed channel is skipped (shown in the run).</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-bold text-[#334155]">Stage for leads created by form webhooks</label>
              <select value={settings.defaultLeadStage} onChange={(e) => onChange({ defaultLeadStage: e.target.value as GeneralSettings["defaultLeadStage"] })} className={field}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD] p-3">
              <span>
                <span className="block text-[11.5px] font-bold text-[#111C3A]">Tag automation-created leads</span>
                <span className="mt-0.5 block text-[10px] text-[#64748B]">Adds the tag <code>automation</code> so they are easy to filter in CRM.</span>
              </span>
              <input type="checkbox" className="mt-0.5" checked={settings.autoPrefixTags} onChange={(e) => onChange({ autoPrefixTags: e.target.checked })} />
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2"><Terminal className="size-4 text-[#334155]" /><h4 className="text-[12.5px] font-bold text-[#111C3A]">Default log level</h4></div>
        <p className="text-[11px] text-[#64748B]">The level the Logs page filters to when it opens. Every step is always recorded.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["debug", "info", "warn", "error"] as const).map((level) => (
            <button key={level} type="button" onClick={() => onChange({ logLevel: level })} className={`rounded-lg border px-3 py-2 text-left text-[11px] font-bold uppercase ${settings.logLevel === level ? "border-blue-500 bg-blue-50 text-blue-700" : "border-[#E2E8F0] bg-[#FAFBFD] text-[#475569] hover:bg-white"}`}>
              {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
