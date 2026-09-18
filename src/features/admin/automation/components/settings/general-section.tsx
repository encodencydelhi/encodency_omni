"use client";

import { useState } from "react";
import { Settings, Plus, X, Globe, User, MessageSquare, Tag, Terminal } from "lucide-react";
import { GeneralSettings } from "../../data/settings-types";

interface GeneralSectionProps {
  settings: GeneralSettings;
  onChange: (updates: Partial<GeneralSettings>) => void;
}

export function GeneralSection({ settings, onChange }: GeneralSectionProps) {
  const [newChannelInput, setNewChannelInput] = useState("");
  const [showAddChannel, setShowAddChannel] = useState(false);

  const handleToggleChannel = (ch: string) => {
    if (settings.allowedChannels.includes(ch)) {
      if (settings.allowedChannels.length <= 1) return; // Keep at least one
      onChange({ allowedChannels: settings.allowedChannels.filter(c => c !== ch) });
    } else {
      onChange({ allowedChannels: [...settings.allowedChannels, ch] });
    }
  };

  const handleAddCustomChannel = () => {
    const trimmed = newChannelInput.trim();
    if (trimmed && !settings.allowedChannels.includes(trimmed)) {
      onChange({ allowedChannels: [...settings.allowedChannels, trimmed] });
      setNewChannelInput("");
      setShowAddChannel(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-4 flex items-start gap-3">
        <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
          <Settings className="size-4" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-[#111C3A]">General Automation Settings</h3>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Configure global workspace defaults, primary communication channels, log retention levels, and lead tagging behavior.
          </p>
        </div>
      </div>

      {/* Grid: Workspace Identity & Timezone */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <User className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Workspace & Ownership</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
          <div>
            <label className="block font-bold text-[#334155] mb-1">Default Workflow Ownership</label>
            <select
              value={settings.defaultOwnership}
              onChange={(e) => onChange({ defaultOwnership: e.target.value as any })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="account_owner">Assign to Client Account Owner</option>
              <option value="round_robin">Round Robin across Operations Admins</option>
              <option value="specific_user">Specific Administrator: Manish Sirohi</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Determines who receives ownership notifications and escalations for new workflows.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#334155] mb-1 flex items-center gap-1.5">
              <Globe className="size-3 text-[#64748B]" /> System Automation Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => onChange({ timezone: e.target.value })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="Asia/Kolkata (GMT+5:30)">Asia/Kolkata (GMT+5:30) - India Standard Time</option>
              <option value="Asia/Dubai (GMT+4:00)">Asia/Dubai (GMT+4:00) - Gulf Standard Time</option>
              <option value="Europe/London (GMT+0:00)">Europe/London (GMT+0:00) - Greenwich Mean Time</option>
              <option value="America/New_York (GMT-5:00)">America/New_York (GMT-5:00) - Eastern Time</option>
              <option value="America/Los_Angeles (GMT-8:00)">America/Los_Angeles (GMT-8:00) - Pacific Time</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Controls scheduling, delay nodes, and quiet hour boundaries across all triggers.
            </p>
          </div>
        </div>
      </div>

      {/* Omnichannel Communication Defaults */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <MessageSquare className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Omnichannel Reply & Channel Enablement</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
          <div>
            <label className="block font-bold text-[#334155] mb-1">Default Fallback Reply Channel</label>
            <select
              value={settings.defaultReplyChannel}
              onChange={(e) => onChange({ defaultReplyChannel: e.target.value as any })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="whatsapp">WhatsApp Cloud API (Highest open rate)</option>
              <option value="instagram">Instagram Direct Message</option>
              <option value="email">Email SMTP / Resend</option>
              <option value="sms">SMS Gateway (DLT Certified)</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Selected when automated replies do not specify a channel explicitly.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#334155] mb-1">Active Communication Channels</label>
            <div className="border border-[#E2E8F0] rounded-lg p-2 bg-[#FAFBFD] flex flex-wrap gap-1.5 min-h-[38px] items-center">
              {settings.allowedChannels.map((ch) => (
                <span
                  key={ch}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200 shadow-2xs"
                >
                  {ch}
                  <button
                    type="button"
                    onClick={() => handleToggleChannel(ch)}
                    className="hover:text-blue-900 transition-colors cursor-pointer"
                    title="Remove channel"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}

              {showAddChannel ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Channel name..."
                    value={newChannelInput}
                    onChange={(e) => setNewChannelInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCustomChannel()}
                    className="bg-white border border-[#CBD5E1] rounded px-2 py-0.5 text-[11px] w-24 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomChannel}
                    className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddChannel(false)}
                    className="text-[#64748B] hover:text-[#0F172A]"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddChannel(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-medium text-[#64748B] border border-dashed border-[#CBD5E1] hover:bg-white hover:text-[#111C3A] transition-colors"
                >
                  <Plus className="size-3" /> Add Channel
                </button>
              )}
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Available channels across all client automation builders.
            </p>
          </div>
        </div>
      </div>

      {/* Tagging & Ingestion Defaults */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <Tag className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Tagging & Inbound Lead Defaults</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
          {/* Toggle Auto Prefix */}
          <div className="flex items-start justify-between p-3 rounded-lg border border-[#E2E8F0] bg-[#FAFBFD]">
            <div>
              <span className="font-bold text-[#111C3A] block">Auto-Prefix Automation Tags</span>
              <span className="text-[10px] text-[#64748B] block mt-0.5">
                Appends <code className="bg-white px-1 py-0.5 rounded border border-[#E2E8F0] font-mono text-[9.5px] text-blue-600">[Auto]</code> prefix to all tags created by workflow nodes.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={settings.autoPrefixTags}
                onChange={(e) => onChange({ autoPrefixTags: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Default Lead Stage */}
          <div>
            <label className="block font-bold text-[#334155] mb-1">Default Stage for Ingested Leads</label>
            <select
              value={settings.defaultLeadStage}
              onChange={(e) => onChange({ defaultLeadStage: e.target.value as any })}
              className="w-full bg-[#FAFBFD] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[12px] text-[#111C3A] font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            >
              <option value="new">New Lead (Awaiting Contact)</option>
              <option value="qualified">Pre-Qualified (Webhook Verified)</option>
              <option value="prospect">Active Marketing Prospect</option>
            </select>
            <p className="text-[10px] text-[#94A3B8] mt-1">
              Initial CRM pipeline status applied when Meta Leadgen or WhatsApp inbound creates a lead.
            </p>
          </div>
        </div>
      </div>

      {/* System Diagnostic Logging Level */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1F5F9]">
          <Terminal className="size-4 text-[#334155]" />
          <h4 className="text-[12.5px] font-bold text-[#111C3A]">Automation Diagnostic Logging Level</h4>
        </div>

        <p className="text-[11px] text-[#64748B]">
          Select the granularity of runtime console logs streamed to the Live Console Stream viewer.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {[
            { level: "debug", label: "DEBUG", desc: "Detailed step dumps, payloads, latency pings" },
            { level: "info", label: "INFO", desc: "Normal executions, triggers, inbound webhooks" },
            { level: "warn", label: "WARN", desc: "Transient delays, rate limits, retried steps" },
            { level: "error", label: "ERROR", desc: "Only fatal errors and unhandled exceptions" },
          ].map((item) => {
            const isSelected = settings.logLevel === item.level;
            return (
              <div
                key={item.level}
                onClick={() => onChange({ logLevel: item.level as any })}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-50/50 border-blue-500 shadow-2xs"
                    : "bg-[#FAFBFD] border-[#E2E8F0] hover:bg-white hover:border-[#CBD5E1]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-mono font-bold ${isSelected ? "text-blue-600" : "text-[#1E293B]"}`}>
                    {item.label}
                  </span>
                  <div className={`size-3 rounded-full border flex items-center justify-center ${isSelected ? "border-blue-600" : "border-[#CBD5E1]"}`}>
                    {isSelected && <div className="size-1.5 rounded-full bg-blue-600" />}
                  </div>
                </div>
                <p className="text-[9.5px] text-[#64748B] leading-tight">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
