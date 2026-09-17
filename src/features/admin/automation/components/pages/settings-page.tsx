"use client";

import {
  Settings, Play, RotateCcw, Bell, Clock, User, Link, ShieldAlert,
  Check, PauseCircle, Archive, AlertTriangle
} from "lucide-react";

export function SettingsPage() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start pb-12">

      {/* LEFT COLUMN: Navigation Sidebar */}
      <div className="w-full lg:w-[220px] shrink-0 space-y-1">
        {[
          { icon: <Settings className="size-4" />, label: "General", active: true },
          { icon: <Play className="size-4" />, label: "Execution Rules" },
          { icon: <RotateCcw className="size-4" />, label: "Retry Logic" },
          { icon: <Bell className="size-4" />, label: "Notifications" },
          { icon: <Clock className="size-4" />, label: "Business Hours" },
          { icon: <User className="size-4" />, label: "Ownership & Routing" },
          { icon: <Link className="size-4" />, label: "Integrations" },
          { icon: <ShieldAlert className="size-4" />, label: "Safety Controls" },
        ].map((item, i) => (
          <div key={i} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${item.active
              ? 'bg-blue-50 text-[#2563EB] font-bold'
              : 'text-[#64748B] hover:bg-slate-50 hover:text-[#111C3A] font-medium'
            }`}>
            {item.icon}
            <span className="text-[12px]">{item.label}</span>
          </div>
        ))}
      </div>

      {/* MIDDLE COLUMN: Form Content */}
      <div className="flex-1 space-y-2 min-w-0">

        {/* General Settings */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
          <div className="mb-4">
            <h3 className="text-[13px] font-bold text-[#111C3A]">General Settings</h3>
            <p className="text-[10px] text-[#64748B]">Basic configuration for automation behavior across your agency.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#111C3A] mb-1">Default Workflow Ownership</label>
              <select className="w-full border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[11px] text-[#334155] bg-white focus:outline-none focus:border-blue-500 mb-1">
                <option>Assign to account owner</option>
              </select>
              <p className="text-[9px] text-[#94A3B8]">New workflows will be owned by the client's account owner.</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#111C3A] mb-1">Workflow Timezone</label>
              <select className="w-full border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[11px] text-[#334155] bg-white focus:outline-none focus:border-blue-500 mb-1">
                <option>Agency Timezone (GMT+5:30)</option>
              </select>
              <p className="text-[9px] text-[#94A3B8]">Controls time-based triggers and scheduling.</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#111C3A] mb-1">Default Reply Channel</label>
              <select className="w-full border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[11px] text-[#334155] bg-white focus:outline-none focus:border-blue-500 mb-1">
                <option>WhatsApp</option>
              </select>
              <p className="text-[9px] text-[#94A3B8]">Used for automated responses when channel not specified.</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#111C3A] mb-1">Allowed Channels</label>
              <div className="w-full border border-[#E2E8F0] rounded-md px-2 py-1.5 bg-white flex gap-1 flex-wrap mb-1">
                {['WhatsApp', 'Email', 'SMS', 'Instagram'].map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 text-[#2563EB] px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {tag} <span className="cursor-pointer text-[#93C5FD] hover:text-[#2563EB]">×</span>
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-[#94A3B8]">Channels available for workflows across all clients.</p>
            </div>
          </div>
        </div>

        {/* Execution Rules */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
          <div className="mb-4">
            <h3 className="text-[13px] font-bold text-[#111C3A]">Execution Rules</h3>
            <p className="text-[10px] text-[#64748B]">Define when and how workflows should run.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#111C3A]">Auto-assign new leads</span>
                <div className="relative inline-block w-8 h-4 bg-blue-600 rounded-full cursor-pointer">
                  <div className="absolute left-4 top-0.5 w-3 h-3 bg-white rounded-full transition-transform"></div>
                </div>
              </label>
              <p className="text-[9px] text-[#94A3B8]">Automatically assign new leads to the appropriate workflow.</p>
            </div>
            <div>
              <label className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#111C3A]">Execute workflows in parallel</span>
                <div className="relative inline-block w-8 h-4 bg-[#E2E8F0] rounded-full cursor-pointer">
                  <div className="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm"></div>
                </div>
              </label>
              <p className="text-[9px] text-[#94A3B8]">Allow multiple workflows to run simultaneously for the same contact.</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#111C3A] mb-1">Maximum concurrent runs per client</label>
              <input type="number" defaultValue="5" className="w-full border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[11px] text-[#334155] bg-white focus:outline-none focus:border-blue-500 mb-1" />
              <p className="text-[9px] text-[#94A3B8]">Limits the number of workflow runs per client.</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#111C3A] mb-1">Workflow run timeout</label>
              <select className="w-full border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[11px] text-[#334155] bg-white focus:outline-none focus:border-blue-500 mb-1">
                <option>30 minutes</option>
              </select>
              <p className="text-[9px] text-[#94A3B8]">Stop workflow if it runs longer than this duration.</p>
            </div>
          </div>
        </div>

        {/* Retry Logic & Failure Escalation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="mb-4">
              <h3 className="text-[13px] font-bold text-[#111C3A]">Retry Logic</h3>
              <p className="text-[10px] text-[#64748B]">Configure retry behavior for failed actions.</p>
            </div>
            <div className="grid gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#111C3A] mb-1">Maximum retry attempts</label>
                <input type="number" defaultValue="3" className="w-full border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[11px] text-[#334155] bg-white focus:outline-none focus:border-blue-500 mb-1" />
                <p className="text-[9px] text-[#94A3B8]">Number of times to retry a failed step.</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#111C3A] mb-1">Retry interval</label>
                <select className="w-full border border-[#E2E8F0] rounded-md px-3 py-1.5 text-[11px] text-[#334155] bg-white focus:outline-none focus:border-blue-500 mb-1">
                  <option>5 minutes</option>
                </select>
                <p className="text-[9px] text-[#94A3B8]">Time to wait between retry attempts.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="mb-4">
              <h3 className="text-[13px] font-bold text-[#111C3A]">Failure Escalation</h3>
              <p className="text-[10px] text-[#64748B]">What to do when a workflow consistently fails.</p>
            </div>
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="escalation" defaultChecked className="mt-0.5 size-3.5 text-blue-600 focus:ring-blue-500 border-gray-300" />
                <div>
                  <div className="text-[11px] font-bold text-[#111C3A]">Notify team and continue</div>
                  <div className="text-[9px] text-[#94A3B8]">Send notification but keep workflow active</div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="escalation" className="mt-0.5 size-3.5 text-blue-600 focus:ring-blue-500 border-gray-300" />
                <div>
                  <div className="text-[11px] font-bold text-[#334155]">Pause workflow after max retries</div>
                  <div className="text-[9px] text-[#94A3B8]">Automatically pause the workflow</div>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="escalation" className="mt-0.5 size-3.5 text-blue-600 focus:ring-blue-500 border-gray-300" />
                <div>
                  <div className="text-[11px] font-bold text-[#334155]">Create support ticket</div>
                  <div className="text-[9px] text-[#94A3B8]">Open a ticket in your helpdesk (if connected)</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Bottom Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

          {/* Notifications */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-[12px] font-bold text-[#111C3A]">Notifications</h3>
              <p className="text-[9px] text-[#64748B]">Choose how and when to be notified.</p>
            </div>
            <div className="space-y-3 text-[10px]">
              <div className="flex items-start justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative inline-block w-7 h-3.5 bg-blue-600 rounded-full"><div className="absolute left-3.5 top-[2px] w-2.5 h-2.5 bg-white rounded-full"></div></div>
                  <span className="font-bold text-[#111C3A]">Email notifications</span>
                </label>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-1.5 flex items-center">
                <input type="text" defaultValue="team@youragency.com" className="bg-transparent w-full outline-none text-[#334155]" />
              </div>
              <div className="flex items-start justify-between mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative inline-block w-7 h-3.5 bg-blue-600 rounded-full"><div className="absolute left-3.5 top-[2px] w-2.5 h-2.5 bg-white rounded-full"></div></div>
                  <span className="font-bold text-[#111C3A]">WhatsApp notifications</span>
                </label>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-1.5 flex items-center">
                <input type="text" defaultValue="+91 98765 43210" className="bg-transparent w-full outline-none text-[#334155]" />
              </div>
              <div className="flex items-start justify-between mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative inline-block w-7 h-3.5 bg-blue-600 rounded-full"><div className="absolute left-3.5 top-[2px] w-2.5 h-2.5 bg-white rounded-full"></div></div>
                  <span className="font-bold text-[#111C3A]">In-app notifications</span>
                </label>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-[12px] font-bold text-[#111C3A]">Business Hours</h3>
              <p className="text-[9px] text-[#64748B]">Set your agency's working hours and quiet hours.</p>
            </div>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <div className="relative inline-block w-7 h-3.5 bg-blue-600 rounded-full"><div className="absolute left-3.5 top-[2px] w-2.5 h-2.5 bg-white rounded-full"></div></div>
              <span className="text-[10px] font-bold text-[#111C3A]">Enable business hours</span>
            </label>
            <div className="space-y-2 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#334155] w-24">Working hours (Mon-Fri)</span>
                <div className="flex items-center gap-1 text-[#64748B]">
                  <span className="border border-[#E2E8F0] rounded px-1 py-0.5 bg-white">09:00 AM</span>
                  <span>→</span>
                  <span className="border border-[#E2E8F0] rounded px-1 py-0.5 bg-white">06:00 PM</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-medium text-[#334155] w-24">Quiet hours</span>
                <div className="flex items-center gap-1 text-[#64748B]">
                  <span className="border border-[#E2E8F0] rounded px-1 py-0.5 bg-white">10:00 PM</span>
                  <span>→</span>
                  <span className="border border-[#E2E8F0] rounded px-1 py-0.5 bg-white">07:00 AM</span>
                </div>
              </div>
              <p className="text-[8px] text-[#94A3B8] leading-tight pt-1">Workflows will be paused during quiet hours (unless marked as critical).</p>
            </div>
          </div>

          {/* Approval & Safety */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-[12px] font-bold text-[#111C3A]">Approval & Safety</h3>
              <p className="text-[9px] text-[#64748B]">Add safeguards for sensitive actions.</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="relative inline-block w-7 h-3.5 shrink-0 bg-blue-600 rounded-full mt-0.5"><div className="absolute left-3.5 top-[2px] w-2.5 h-2.5 bg-white rounded-full"></div></div>
                <div>
                  <div className="text-[10px] font-bold text-[#111C3A]">Require approval for risky actions</div>
                  <div className="text-[8px] text-[#64748B] leading-tight">Manual approval required for actions like data deletion, bulk messaging, etc.</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-[#111C3A]">Log retention period</div>
                <select className="border border-[#E2E8F0] rounded px-2 py-0.5 text-[10px] bg-white">
                  <option>90 days</option>
                </select>
              </div>
              <div className="flex items-start gap-2 border-t border-[#F1F5F9] pt-3">
                <div className="relative inline-block w-7 h-3.5 shrink-0 bg-[#E2E8F0] rounded-full mt-0.5"><div className="absolute left-[2px] top-[2px] w-2.5 h-2.5 bg-white rounded-full"></div></div>
                <div>
                  <div className="text-[10px] font-bold text-[#334155]">Enable test sandbox mode</div>
                  <div className="text-[8px] text-[#94A3B8] leading-tight">Run workflows in test mode (no actual actions performed).</div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="md:col-span-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <AlertTriangle className="size-4 text-[#DC2626]" />
                <h3 className="text-[13px] font-bold text-[#DC2626]">Danger Zone</h3>
              </div>
              <p className="text-[10px] text-[#EF4444]">Advanced controls for your automations.</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 bg-white border border-[#FECACA] text-[#DC2626] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-50">
                <PauseCircle className="size-3.5" /> Pause All Automations
              </button>
              <button className="flex items-center gap-1.5 bg-white border border-[#FECACA] text-[#DC2626] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-50">
                <Archive className="size-3.5" /> Archive All Automations
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* RIGHT COLUMN: Sidebar stats */}
      <div className="w-full lg:w-[260px] shrink-0 space-y-2">

        {/* Configuration Health */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
          <h3 className="text-[13px] font-bold text-[#111C3A] mb-4">Configuration Health</h3>
          <div className="flex items-center gap-4">
            <div className="size-20 shrink-0 rounded-full border-[6px] border-[#10B981] flex flex-col items-center justify-center">
              <span className="text-[20px] font-black text-[#111C3A] leading-none">92</span>
              <span className="text-[9px] font-bold text-[#10B981]">Good</span>
            </div>
            <div className="space-y-1.5">
              {[
                "Core settings configured",
                "Integrations connected",
                "Notification channels active",
                "Business hours set",
                "Safety controls enabled"
              ].map((txt, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="size-3.5 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
                    <Check className="size-2.5 text-white" />
                  </div>
                  <span className="text-[9px] text-[#334155] leading-tight">{txt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Connected Integrations */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-[#111C3A]">Connected Integrations</h3>
            <a href="#" className="text-[10px] font-medium text-[#2563EB] hover:underline">View all →</a>
          </div>
          <div className="space-y-1 text-[10px]">
            {[
              { label: "Meta Ads", icon: "M" },
              { label: "WhatsApp Business", icon: "W" },
              { label: "Google Business", icon: "G" },
              { label: "Google Search Console", icon: "G" },
              { label: "Email SMTP", icon: "@" }
            ].map(int => (
              <div key={int.label} className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="size-5 rounded flex items-center justify-center bg-slate-100 text-slate-600 font-bold text-[10px]">{int.icon}</div>
                  <span className="font-medium text-[#334155]">{int.label}</span>
                </div>
                <span className="text-[9px] font-bold text-[#10B981] bg-[#ECFDF5] px-1.5 py-0.5 rounded">Connected</span>
              </div>
            ))}
          </div>
        </div>

        {/* Last Changed */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-bold text-[#111C3A]">Last Changed</h3>
            <a href="#" className="text-[10px] font-medium text-[#2563EB] hover:underline">View history →</a>
          </div>
          <div className="flex items-start gap-2 mb-3">
            <div className="size-8 rounded-full bg-[#1E293B] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">M</div>
            <div>
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] font-bold text-[#111C3A]">Manish Sirohi</span>
                <span className="text-[9px] font-bold text-[#10B981] bg-[#ECFDF5] px-1.5 py-0.5 rounded ml-2">Current</span>
              </div>
              <div className="text-[9px] text-[#94A3B8]">2 hours ago • Apr 14, 2025, 10:24 AM</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-[#111C3A] mb-1">Changes made</div>
            <ul className="text-[9px] text-[#64748B] space-y-1 list-disc pl-3">
              <li>Updated retry attempts from 2 to 3</li>
              <li>Enabled WhatsApp notifications</li>
              <li>Set business hours (9:00 AM - 6:00 PM)</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
