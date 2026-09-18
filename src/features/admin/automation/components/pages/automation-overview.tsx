"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { automationRepository } from "../../data/mock-provider";
import { AutomationWorkflow, AutomationAnalytics } from "../../data/types";
import {
  Play, Bot, CheckCircle2, XCircle, Clock3, Zap, Activity,
  TrendingUp, TrendingDown, MoreVertical, ChevronRight, AlertCircle,
} from "lucide-react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChannelLogo } from "@/features/admin/shared/channel-logo";


const DEFAULT_ANALYTICS: AutomationAnalytics = {
  activeWorkflows: { value: 12, trend: 33 },
  totalRuns: { value: 2076, trend: 18 },
  successRate: { value: 97.1, trend: 2.4 },
  failedRuns: { value: 61, trend: -28 },
  timeSavedHours: { value: 84, trend: 41 },
  actionsExecuted: { value: 6842, trend: 26 },
  activity: [
    { date: "Mar 15", successfulRuns: 50, failedRuns: 5, successRate: 90 },
    { date: "Mar 20", successfulRuns: 85, failedRuns: 2, successRate: 97 },
    { date: "Mar 25", successfulRuns: 70, failedRuns: 3, successRate: 95 },
    { date: "Mar 30", successfulRuns: 100, failedRuns: 3, successRate: 97 },
    { date: "Apr 4", successfulRuns: 115, failedRuns: 2, successRate: 98 },
    { date: "Apr 9", successfulRuns: 110, failedRuns: 4, successRate: 96 },
    { date: "Apr 14", successfulRuns: 115, failedRuns: 2, successRate: 98 }
  ],
  health: [
    { status: "Healthy", count: 24, color: "#10B981" },
    { status: "Needs Attention", count: 4, color: "#F59E0B" },
    { status: "Paused", count: 3, color: "#3B82F6" },
    { status: "Error", count: 1, color: "#EF4444" }
  ],
  triggerSources: [
    { source: "Meta Ads", percentage: 38, color: "#1877F2" },
    { source: "Website", percentage: 24, color: "#10B981" },
    { source: "Google Business", percentage: 16, color: "#F59E0B" },
    { source: "Manual", percentage: 10, color: "#8B5CF6" },
    { source: "Time Based", percentage: 8, color: "#EC4899" },
    { source: "Others", percentage: 4, color: "#94A3B8" }
  ],
  alerts: [
    { id: "a1", type: "error", title: "WhatsApp action failed 14 times", description: "New Meta Lead Follow-up", timeAgo: "2 hrs ago", actionLabel: "View Runs" },
    { id: "a2", type: "warning", title: "Google connection expired", description: "Google Review Alert", timeAgo: "5 hrs ago", actionLabel: "Reconnect" },
  ]
};

interface AutomationOverviewProps {
  onNavigateTab?: (tab: "overview" | "workflows" | "templates" | "runs" | "settings") => void;
}

export function AutomationOverview({ onNavigateTab }: AutomationOverviewProps) {
  const [analytics, setAnalytics] = useState<AutomationAnalytics>(DEFAULT_ANALYTICS);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);

  useEffect(() => {
    const clientId = "client_1";
    automationRepository.getAnalytics(clientId).then((res) => {
      if (res) setAnalytics(res);
    });
    automationRepository.getWorkflows(clientId).then((wfs) => {
      const extraWorkflows: AutomationWorkflow[] = [
        { id: "wf_ex_1", clientId: "c1", name: "SEO Critical Issue Alert", status: "Active", version: 1, trigger: { type: "seo", label: "SEO Audit Warning" }, channels: ["google", "slack"], runs: 84, successRate: 96.2, failures: 3, lastRunAt: new Date().toISOString(), createdAt: "", updatedAt: "", nodes: [], edges: [] },
        { id: "wf_ex_2", clientId: "c1", name: "Form Submission Lead Routing", status: "Active", version: 1, trigger: { type: "form", label: "Website Form Submit" }, channels: ["web", "email"], runs: 210, successRate: 92.4, failures: 8, lastRunAt: new Date().toISOString(), createdAt: "", updatedAt: "", nodes: [], edges: [] },
        { id: "wf_ex_3", clientId: "c1", name: "Missed Call Instant Callback", status: "Paused", version: 1, trigger: { type: "call", label: "Missed Phone Call" }, channels: ["phone", "whatsapp"], runs: 175, successRate: 89.1, failures: 15, lastRunAt: new Date().toISOString(), createdAt: "", updatedAt: "", nodes: [], edges: [] },
        { id: "wf_ex_4", clientId: "c1", name: "Abandoned Cart Recovery", status: "Active", version: 1, trigger: { type: "webhook", label: "Cart Drop Trigger" }, channels: ["whatsapp", "email"], runs: 532, successRate: 97.8, failures: 6, lastRunAt: new Date().toISOString(), createdAt: "", updatedAt: "", nodes: [], edges: [] },
      ];
      setWorkflows([...wfs, ...extraWorkflows]);
    });
  }, []);

  return (
    <div className="space-y-2 pb-12 text-[#111C3A]">

      {/* 1. KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        <KpiCard
          icon={<div className="bg-[#EBF5FF] text-[#3B82F6] p-2.5 rounded-lg"><Play className="size-5" fill="currentColor" /></div>}
          title="Active Workflows"
          value={analytics.activeWorkflows.value.toString()}
          trend={analytics.activeWorkflows.trend}
        />
        <KpiCard
          icon={<div className="bg-[#ECFDF5] text-[#10B981] p-2.5 rounded-lg"><Activity className="size-5" /></div>}
          title="Total Runs"
          value={analytics.totalRuns.value.toLocaleString()}
          trend={analytics.totalRuns.trend}
        />
        <KpiCard
          icon={<div className="bg-[#ECFDF5] text-[#10B981] p-2.5 rounded-lg"><CheckCircle2 className="size-5" /></div>}
          title="Success Rate"
          value={analytics.successRate.value + "%"}
          trend={analytics.successRate.trend}
        />
        <KpiCard
          icon={<div className="bg-[#FEF2F2] text-[#EF4444] p-2.5 rounded-lg"><XCircle className="size-5" /></div>}
          title="Failed Runs"
          value={analytics.failedRuns.value.toString()}
          trend={analytics.failedRuns.trend}
        />
        <KpiCard
          icon={<div className="bg-[#F5F3FF] text-[#8B5CF6] p-2.5 rounded-lg"><Clock3 className="size-5" /></div>}
          title="Time Saved"
          value={analytics.timeSavedHours.value + " hrs"}
          trend={analytics.timeSavedHours.trend}
        />
        <KpiCard
          icon={<div className="bg-[#FFFBEB] text-[#F59E0B] p-2.5 rounded-lg"><Zap className="size-5" /></div>}
          title="Actions Executed"
          value={analytics.actionsExecuted.value.toLocaleString()}
          trend={analytics.actionsExecuted.trend}
        />
      </div>

      {/* 2. Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        {/* Automation Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-[13.5px] font-bold text-[#111C3A]">Automation Activity</h3>
              <p className="text-[11px] text-[#6B7A94]">30-day execution metrics</p>
            </div>
            <div className="flex items-center gap-2 text-[10.5px] font-medium text-[#6B7A94]">
              <div className="flex items-center gap-1"><div className="size-2 rounded-sm bg-[#10B981]"></div>Success</div>
              <div className="flex items-center gap-1"><div className="size-2 rounded-sm bg-[#EF4444]"></div>Failed</div>
              <div className="flex items-center gap-1"><div className="size-2 rounded-full bg-[#3B82F6]"></div>Rate</div>
            </div>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.activity} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} minTickGap={20} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dx={-10} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `${val}%`} dx={10} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Bar yAxisId="left" dataKey="successfulRuns" stackId="a" fill="#34D399" barSize={12} radius={[0, 0, 4, 4]} />
                <Bar yAxisId="left" dataKey="failedRuns" stackId="a" fill="#F87171" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workflow Health */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
          <h3 className="text-[14px] font-bold text-[#111C3A] mb-4">Workflow Health</h3>
          <div className="flex-1 flex items-center">
            <div className="w-1/2 relative h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.health} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="count" stroke="none">
                    {analytics.health.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[20px] font-bold text-[#111C3A]">32</span>
                <span className="text-[11px] text-[#6B7A94]">Total</span>
              </div>
            </div>
            <div className="w-1/2 pl-4 space-y-3">
              {analytics.health.map((h, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="size-2.5 rounded-full" style={{ backgroundColor: h.color }}></div>
                  <span className="text-[12px] font-bold w-4">{h.count}</span>
                  <span className="text-[12px] text-[#6B7A94]">{h.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
            <button
              type="button"
              onClick={() => onNavigateTab?.("workflows")}
              className="text-[12px] font-medium text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all workflows <ChevronRight className="size-3" />
            </button>
          </div>
        </div>

        {/* Top Trigger Sources */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
          <h3 className="text-[14px] font-bold text-[#111C3A] mb-6">Top Trigger Sources</h3>
          <div className="space-y-4 flex-1">
            {analytics.triggerSources.map((t, i) => (
              <div key={i} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1 w-32">
                  <div className="grid size-5 place-items-center rounded bg-[#F8FAFC]">
                    {/* Mock Icon */}
                    {i === 0 ? <span className="text-blue-600 font-bold text-[10px]">M</span> :
                      i === 1 ? <Bot className="size-3 text-emerald-500" /> :
                        i === 2 ? <span className="text-orange-500 font-bold text-[10px]">G</span> :
                          <Zap className="size-3 text-[#94A3B8]" />}
                  </div>
                  <span className="text-[#334155] font-medium truncate">{t.source}</span>
                </div>
                <div className="w-8 text-right text-[#64748B] text-[11px] font-medium">{t.percentage}%</div>
                <div className="flex-1 ml-4 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${t.percentage}%`, backgroundColor: t.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Management Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">

        {/* Active Workflows Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13.5px] font-bold text-[#111C3A]">Active Workflows</h3>
            <button
              type="button"
              onClick={() => onNavigateTab?.("workflows")}
              className="text-[11.5px] font-medium text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all <ChevronRight className="size-3" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1 scrollbar-thin">
            <table className="w-full min-w-[720px] text-left text-[11.5px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] text-[10.5px] uppercase tracking-wider whitespace-nowrap">
                  <th className="py-2.5 px-3 font-semibold">Workflow</th>
                  <th className="py-2.5 px-3 font-semibold">Trigger</th>
                  <th className="py-2.5 px-3 font-semibold">Channels</th>
                  <th className="py-2.5 px-3 font-semibold">Runs</th>
                  <th className="py-2.5 px-3 font-semibold">Success</th>
                  <th className="py-2.5 px-3 font-semibold">Last Run</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {workflows.slice(0, 8).map((wf) => (
                  <tr key={wf.id} className="hover:bg-[#F8FAFC] transition-colors whitespace-nowrap">
                    <td className="px-3 py-3 font-medium text-[#111C3A]">{wf.name}</td>
                    <td className="px-3 py-3 text-[#64748B]">{wf.trigger.label}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center -space-x-1 shrink-0">
                        {wf.channels.map((ch, i) => (
                          <ChannelLogo 
                            key={i} 
                            channel={ch === 'meta' ? 'Meta' : ch === 'whatsapp' ? 'WhatsApp' : ch === 'google-business' ? 'Google Business' : ch === 'google' ? 'Google' : ch} 
                            className="size-5 rounded-full border border-white shadow-2xs bg-white" 
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[#111C3A] font-medium">{wf.runs.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className={wf.successRate > 95 ? "text-[#10B981] font-semibold" : "text-[#F59E0B] font-semibold"}>{wf.successRate}%</span>
                    </td>
                    <td className="px-3 py-3 text-[#64748B]">{wf.lastRunAt ? "12 min ago" : "-"}</td>
                    <td className="px-3 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${wf.status === "Active" ? "bg-[#ECFDF5] text-[#10B981]" :
                          wf.status === "Paused" ? "bg-[#FEF3C7] text-[#D97706]" :
                            "bg-[#F1F5F9] text-[#64748B]"
                        }`}>
                        <div className={`size-1.5 rounded-full ${wf.status === "Active" ? "bg-[#10B981]" : wf.status === "Paused" ? "bg-[#D97706]" : "bg-[#94A3B8]"}`} />
                        {wf.status}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button className="text-[#94A3B8] hover:text-[#111C3A] cursor-pointer"><MoreVertical className="size-4 inline-block" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workflow Preview */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-bold text-[#111C3A]">Workflow Preview</h3>
            <button
              type="button"
              onClick={() => onNavigateTab?.("workflows")}
              className="text-[12px] font-medium text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
            >
              View full <ChevronRight className="size-3" />
            </button>
          </div>

          <div className="mb-4">
            <div className="text-[13px] font-bold text-[#111C3A]">New Meta Lead Follow-up</div>
            <div className="text-[11px] text-[#64748B] mt-0.5">Automatically follow up with new Meta leads</div>
            <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ECFDF5] text-[#10B981] rounded text-[9px] font-bold uppercase tracking-wider border border-[#10B981]/20">
              <CheckCircle2 className="size-2.5" /> Active
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-2 relative">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-[#E2E8F0] to-[#E2E8F0] -translate-x-1/2 z-0"></div>

            {[
              { icon: <span className="text-white text-[12px] font-bold">M</span>, bg: "bg-[#1877F2]", title: "Trigger", desc: "New Meta Lead" },
              { icon: <span className="text-white text-[12px] font-bold">W</span>, bg: "bg-[#25D366]", title: "Action", desc: "Send WhatsApp Message" },
              { icon: <Clock3 className="size-3.5 text-white" />, bg: "bg-[#8B5CF6]", title: "Wait", desc: "2 Hours" },
              { icon: <Zap className="size-3.5 text-white" />, bg: "bg-[#F59E0B]", title: "Condition", desc: "Lead Replied?" },
              { icon: <Bot className="size-3.5 text-white" />, bg: "bg-[#EF4444]", title: "Action", desc: "Assign to Sales Team" },
            ].map((node, i) => (
              <div key={i} className="relative z-10 w-full flex justify-center mb-2.5 last:mb-0 px-2">
                <div className="bg-white border border-[#E2E8F0] shadow-xs rounded-lg p-2.5 flex items-center gap-3 w-full max-w-[280px] hover:border-[#CBD5E1] transition-colors cursor-pointer">
                  <div className={`grid size-7 place-items-center rounded-md ${node.bg} shrink-0`}>
                    {node.icon}
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{node.title}</div>
                    <div className="text-[11.5px] font-medium text-[#111C3A] leading-tight truncate">{node.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#111C3A]">Needs Attention</h3>
            <button
              type="button"
              onClick={() => onNavigateTab?.("runs")}
              className="text-[12px] font-medium text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all <ChevronRight className="size-3" />
            </button>
          </div>

          <div className="flex-1 space-y-4">
            {analytics.alerts.map(alert => (
              <div key={alert.id} className="flex gap-3">
                <div className="pt-0.5">
                  {alert.type === "error" ?
                    <AlertCircle className="size-4 text-[#EF4444]" /> :
                    <AlertCircle className="size-4 text-[#F59E0B]" />
                  }
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-bold text-[#111C3A] leading-tight">{alert.title}</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">{alert.description}</div>
                  <div className="text-[10px] text-[#94A3B8] mt-1">{alert.timeAgo}</div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.(alert.actionLabel === "Edit" ? "workflows" : "runs")}
                    className="text-[11px] font-semibold text-[#2563EB] border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-1 rounded-md hover:bg-[#DBEAFE] transition-colors inline-block cursor-pointer"
                  >
                    {alert.actionLabel}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Recent Runs */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#111C3A]">Recent Runs</h3>
            <button
              type="button"
              onClick={() => onNavigateTab?.("runs")}
              className="text-[12px] font-medium text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all <ChevronRight className="size-3" />
            </button>
          </div>
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                  <th className="px-5 py-2 font-medium">Workflow</th>
                  <th className="px-3 py-2 font-medium">Trigger Entity</th>
                  <th className="px-3 py-2 font-medium">Started</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Steps</th>
                  <th className="px-5 py-2 font-medium text-right">Result</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { wf: "New Meta Lead Follow-up", entity: "Rahul Sharma", started: "12 min ago", dur: "2m 14s", steps: "4/4", res: "Success" },
                  { wf: "Google Review Alert", entity: "5 Star Review", started: "2 hrs ago", dur: "1m 32s", steps: "3/3", res: "Success" },
                  { wf: "WhatsApp Re-engagement", entity: "Neha Verma", started: "4 hrs ago", dur: "4m 11s", steps: "3/4", res: "Failed" },
                  { wf: "SEO Critical Issue", entity: "Missing Title", started: "5 hrs ago", dur: "1m 08s", steps: "4/4", res: "Success" },
                  { wf: "Website Down Alert", entity: "mokshasewa.org", started: "8 hrs ago", dur: "45s", steps: "2/2", res: "Success" }
                ].map((r, i) => (
                  <tr key={i} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="px-5 py-2.5 font-medium text-[#111C3A] truncate max-w-[140px]">{r.wf}</td>
                    <td className="px-3 py-2.5 text-[#64748B]">{r.entity}</td>
                    <td className="px-3 py-2.5 text-[#64748B]">{r.started}</td>
                    <td className="px-3 py-2.5 text-[#64748B]">{r.dur}</td>
                    <td className="px-3 py-2.5 text-[#64748B]">{r.steps}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`w-[76px] justify-center inline-flex items-center gap-1 py-0.5 rounded-full text-[10px] font-bold ${r.res === "Success" ? "bg-[#ECFDF5] text-[#10B981]" : "bg-[#FEF2F2] text-[#EF4444]"
                        }`}>
                        {r.res === "Success" ? <CheckCircle2 className="size-3 shrink-0" /> : <XCircle className="size-3 shrink-0" />}
                        <span>{r.res}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Popular Templates */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#111C3A]">Popular Templates</h3>
            <button
              type="button"
              onClick={() => onNavigateTab?.("templates")}
              className="text-[12px] font-medium text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all templates <ChevronRight className="size-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {[
              { icon: <Bot className="size-4 text-blue-600" />, bg: "bg-blue-100", title: "New Lead Follow-up", desc: "Instantly follow up with new leads", badge: "Most Used" },
              { icon: <span className="text-orange-600 font-bold text-[12px]">G</span>, bg: "bg-orange-100", title: "Negative Review Alert", desc: "Get notified of negative reviews" },
              { icon: <Activity className="size-4 text-emerald-600" />, bg: "bg-emerald-100", title: "Website Down Alert", desc: "Alert when website is down" },
              { icon: <span className="text-emerald-500 font-bold text-[12px]">W</span>, bg: "bg-emerald-100/50", title: "WhatsApp Re-engagement", desc: "Re-engage inactive leads" }
            ].map((tpl, i) => (
              <div key={i} className="border border-[#E2E8F0] rounded-xl p-2.5 hover:border-[#CBD5E1] hover:shadow-xs transition-all flex flex-col bg-[#FAFBFD] hover:bg-white justify-between">
                <div>
                  <div className="flex gap-2 mb-1.5">
                    <div className={`grid size-7 place-items-center rounded-md ${tpl.bg} shrink-0`}>
                      {tpl.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-[#111C3A] leading-tight mb-0.5 truncate">{tpl.title}</div>
                      <div className="text-[9.5px] text-[#64748B] leading-tight line-clamp-2">{tpl.desc}</div>
                    </div>
                  </div>
                  {tpl.badge && <div className="mb-2"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8.5px] font-bold rounded uppercase tracking-wider border border-blue-100">{tpl.badge}</span></div>}
                </div>
                <div className="mt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      onNavigateTab?.("templates");
                      toast.success(`Loaded blueprint: "${tpl.title}"`);
                    }}
                    className="w-full text-center py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-[#2563EB] text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between text-[10.5px] bg-[#F8FAFC] px-3 py-2 rounded-lg border border-[#E2E8F0]">
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <Zap className="size-3 text-[#94A3B8]" /> Need a custom workflow?
            </div>
            <button 
              type="button" 
              onClick={() => toast.info("Template request sent to support team")}
              className="font-bold text-[#2563EB] hover:underline cursor-pointer"
            >
              Request Template
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

function KpiCard({ icon, title, value, trend }: { icon: React.ReactNode, title: string, value: string, trend: number }) {
  const isPositive = trend >= 0;
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2 shadow-sm flex flex-col gap-1">
      <div className="flex items-center gap-3">
        {icon}
        <h4 className="text-[12px] font-medium text-[#64748B]">{title}</h4>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[24px] font-bold text-[#111C3A]">{value}</span>
        <span className={`text-[11px] font-bold flex items-center ${isPositive ? "text-[#10B981]" : "text-[#EF4444]"}`}>
          {isPositive ? <TrendingUp className="size-3 mr-0.5" /> : <TrendingDown className="size-3 mr-0.5" />}
          {Math.abs(trend)}%
        </span>
      </div>
      <p className="text-[10px] text-[#94A3B8]">vs last 30 days</p>
    </div>
  );
}
