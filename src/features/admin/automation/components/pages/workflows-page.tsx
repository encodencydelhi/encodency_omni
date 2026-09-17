"use client";

import { useEffect, useState, useMemo } from "react";
import { automationRepository } from "../../data/mock-provider";
import { AutomationWorkflow } from "../../data/types";
import { WorkflowBuilder } from "../builder/workflow-builder";
import { 
  GitMerge, Play, FileText, PauseCircle, CheckCircle2, Clock, 
  Search, ChevronDown, MoreHorizontal, ArrowRight, User, Bell, LayoutDashboard,
  AlertCircle, Activity, TrendingUp, TrendingDown, Bot
} from "lucide-react";

// Helper components
const StatusChip = ({ status }: { status: string }) => {
  const isAct = status === "Active";
  const isPau = status === "Paused";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
      isAct ? "bg-[#ECFDF5] text-[#10B981]" : 
      isPau ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#F1F5F9] text-[#64748B]"
    }`}>
      <div className={`size-1.5 rounded-full ${isAct ? "bg-[#10B981]" : isPau ? "bg-[#D97706]" : "bg-[#94A3B8]"}`} />
      {status}
    </span>
  );
};

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [search, setSearch] = useState("");
  const [editingWorkflow, setEditingWorkflow] = useState<AutomationWorkflow | null>(null);

  useEffect(() => {
    automationRepository.getWorkflows("client_1").then((wfs) => {
      // Mock extra workflows to match screenshot layout
      const extras: AutomationWorkflow[] = [
        { id: "wf_m1", clientId: "c1", name: "SEO Critical Issue", status: "Paused", version: 1, trigger: { type: "seo", label: "SEO Issue" }, channels: ["google", "slack"], runs: 84, successRate: 96.2, failures: 3, lastRunAt: new Date(Date.now() - 5*60*60*1000).toISOString(), createdAt: "", updatedAt: new Date(Date.now() - 5*60*60*1000).toISOString(), nodes: [], edges: [] },
        { id: "wf_m2", clientId: "c1", name: "WhatsApp Re-engagement", status: "Active", version: 1, trigger: { type: "time", label: "No reply 24h" }, channels: ["whatsapp"], runs: 316, successRate: 91.8, failures: 12, lastRunAt: new Date(Date.now() - 24*60*60*1000).toISOString(), createdAt: "", updatedAt: new Date(Date.now() - 24*60*60*1000).toISOString(), nodes: [], edges: [] },
        { id: "wf_m3", clientId: "c1", name: "Website Down Alert", status: "Active", version: 1, trigger: { type: "system", label: "Website Down" }, channels: ["email", "slack"], runs: 52, successRate: 100, failures: 0, lastRunAt: new Date(Date.now() - 24*60*60*1000).toISOString(), createdAt: "", updatedAt: new Date(Date.now() - 24*60*60*1000).toISOString(), nodes: [], edges: [] },
        { id: "wf_m4", clientId: "c1", name: "Form Submission Routing", status: "Draft", version: 1, trigger: { type: "form", label: "Form Submit" }, channels: ["web", "email"], runs: 210, successRate: 92.4, failures: 8, lastRunAt: new Date(Date.now() - 2*24*60*60*1000).toISOString(), createdAt: "", updatedAt: new Date(Date.now() - 2*24*60*60*1000).toISOString(), nodes: [], edges: [] },
        { id: "wf_m5", clientId: "c1", name: "Missed Call Callback", status: "Paused", version: 1, trigger: { type: "call", label: "Missed Call" }, channels: ["phone", "whatsapp"], runs: 175, successRate: 89.1, failures: 15, lastRunAt: new Date(Date.now() - 3*24*60*60*1000).toISOString(), createdAt: "", updatedAt: new Date(Date.now() - 3*24*60*60*1000).toISOString(), nodes: [], edges: [] },
      ];
      setWorkflows([...wfs, ...extras]);
    });
  }, []);

  const filteredWorkflows = useMemo(() => {
    if (!search) return workflows;
    return workflows.filter(wf => 
      wf.name.toLowerCase().includes(search.toLowerCase()) ||
      wf.trigger.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [workflows, search]);

  if (editingWorkflow) {
    return (
      <WorkflowBuilder 
        workflow={editingWorkflow} 
        onBack={() => setEditingWorkflow(null)} 
      />
    );
  }

  return (
    <div className="space-y-2 pb-12">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2.5 shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-[#EBF5FF] text-[#3B82F6] p-1.5 rounded-lg"><GitMerge className="size-4" /></div>
            <h4 className="text-[11px] font-medium text-[#64748B]">Total Workflows</h4>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-[#111C3A]">42</span>
            <span className="text-[10px] font-bold text-[#10B981] flex items-center"><TrendingUp className="size-3 mr-0.5" />27%</span>
          </div>
          <p className="text-[9px] text-[#94A3B8]">vs last 30 days</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2.5 shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-[#EFF6FF] text-[#3B82F6] p-1.5 rounded-full"><Play className="size-4" fill="currentColor" /></div>
            <h4 className="text-[11px] font-medium text-[#64748B]">Active Workflows</h4>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-[#111C3A]">28</span>
            <span className="text-[10px] font-bold text-[#10B981] flex items-center"><TrendingUp className="size-3 mr-0.5" />33%</span>
          </div>
          <p className="text-[9px] text-[#94A3B8]">vs last 30 days</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2.5 shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-[#F0F9FF] text-[#0EA5E9] p-1.5 rounded-lg"><FileText className="size-4" fill="currentColor" /></div>
            <h4 className="text-[11px] font-medium text-[#64748B]">Draft Workflows</h4>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-[#111C3A]">6</span>
            <span className="text-[10px] font-bold text-[#10B981] flex items-center"><TrendingUp className="size-3 mr-0.5" />0%</span>
          </div>
          <p className="text-[9px] text-[#94A3B8]">vs last 30 days</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2.5 shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-[#FEF2F2] text-[#EF4444] p-1.5 rounded-full"><PauseCircle className="size-4" fill="currentColor" /></div>
            <h4 className="text-[11px] font-medium text-[#64748B]">Paused Workflows</h4>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-[#111C3A]">4</span>
            <span className="text-[10px] font-bold text-[#EF4444] flex items-center"><TrendingDown className="size-3 mr-0.5" />20%</span>
          </div>
          <p className="text-[9px] text-[#94A3B8]">vs last 30 days</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2.5 shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-[#ECFDF5] text-[#10B981] p-1.5 rounded-full"><CheckCircle2 className="size-4" /></div>
            <h4 className="text-[11px] font-medium text-[#64748B]">Avg. Success Rate</h4>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-[#111C3A]">94.3%</span>
            <span className="text-[10px] font-bold text-[#10B981] flex items-center"><TrendingUp className="size-3 mr-0.5" />2.6%</span>
          </div>
          <p className="text-[9px] text-[#94A3B8]">vs last 30 days</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2.5 shadow-sm flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-[#F5F3FF] text-[#8B5CF6] p-1.5 rounded-full"><Clock className="size-4" fill="currentColor" /></div>
            <h4 className="text-[11px] font-medium text-[#64748B]">Avg. Time Saved</h4>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[20px] font-bold text-[#111C3A]">62 hrs</span>
            <span className="text-[10px] font-bold text-[#10B981] flex items-center"><TrendingUp className="size-3 mr-0.5" />38%</span>
          </div>
          <p className="text-[9px] text-[#94A3B8]">vs last 30 days</p>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 items-start">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-3 space-y-2">
          
          {/* Workflows Table Card */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
              <div>
                <h3 className="text-[14px] font-bold text-[#111C3A]">Workflows (42)</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Create, manage and monitor all your automation workflows.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#94A3B8]" />
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search workflows..." 
                    className="pl-8 pr-3 py-1.5 border border-[#E2E8F0] rounded-md text-[12px] w-[180px] focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>
                <div className="flex items-center gap-1 border border-[#E2E8F0] rounded-md px-2 py-1.5 text-[12px] text-[#111C3A] cursor-pointer hover:bg-slate-50">
                  <span className="text-[#64748B]">Sort by</span>
                  <ChevronDown className="size-3.5" />
                </div>
                <button className="flex items-center gap-1 border border-[#E2E8F0] text-[#2563EB] bg-blue-50/50 rounded-md px-3 py-1.5 text-[12px] font-medium hover:bg-blue-50 transition-colors">
                  Bulk Actions <ChevronDown className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {['All Status', 'All Triggers', 'All Channels', 'All Owners', 'All Tags'].map(f => (
                <div key={f} className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-md px-2.5 py-1 text-[11px] font-medium text-[#64748B] hover:bg-slate-50 cursor-pointer whitespace-nowrap">
                  {f} <ChevronDown className="size-3" />
                </div>
              ))}
            </div>

            <div className="-mx-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                    <th className="pl-4 pr-2 py-2 w-[30px]"><input type="checkbox" className="rounded border-gray-300" /></th>
                    <th className="px-2 py-2 font-medium">Workflow Name</th>
                    <th className="px-2 py-2 font-medium">Trigger</th>
                    <th className="px-2 py-2 font-medium">Channels</th>
                    <th className="px-2 py-2 font-medium">Owner</th>
                    <th className="px-2 py-2 font-medium">Last Updated</th>
                    <th className="px-2 py-2 font-medium text-right">Runs (30d)</th>
                    <th className="px-2 py-2 font-medium text-right">Success Rate</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkflows.map((wf) => (
                    <tr key={wf.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors cursor-pointer" onClick={() => setEditingWorkflow(wf)}>
                      <td className="pl-4 pr-2 py-2.5 w-[30px]" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded border-gray-300" /></td>
                      <td className="px-2 py-2.5 font-bold text-[#111C3A]">{wf.name}</td>
                      <td className="px-2 py-2.5 text-[#64748B]">{wf.trigger.label}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex -space-x-1">
                          {wf.channels.map((ch, i) => (
                            <div key={i} className="size-5 rounded-full bg-blue-100 flex items-center justify-center border border-white text-blue-600 text-[8px] font-bold uppercase overflow-hidden" title={ch}>
                              {ch === 'meta' ? 'M' : ch === 'whatsapp' ? 'W' : ch === 'google-business' ? 'G' : ch.substring(0,1)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                         <div className="flex items-center gap-1.5">
                           <div className="size-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                             {wf.id === 'wf_1' ? 'RS' : wf.id === 'wf_2' ? 'NV' : wf.id === 'wf_3' ? 'AK' : 'MS'}
                           </div>
                           <span className="text-[11px] text-[#64748B]">
                             {wf.id === 'wf_1' ? 'Rahul Sharma' : wf.id === 'wf_2' ? 'Neha Verma' : wf.id === 'wf_3' ? 'Amit Kumar' : 'Manish Sirohi'}
                           </span>
                         </div>
                      </td>
                      <td className="px-2 py-2.5 text-[#64748B]">{wf.id === 'wf_1' ? '12 min ago' : '1 day ago'}</td>
                      <td className="px-2 py-2.5 text-[#111C3A] font-medium text-right">{wf.runs.toLocaleString()}</td>
                      <td className="px-2 py-2.5 text-[#10B981] font-medium text-right">{wf.successRate}%</td>
                      <td className="px-2 py-2.5"><StatusChip status={wf.status} /></td>
                      <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                        <button className="text-[#94A3B8] hover:text-[#111C3A] p-1"><MoreHorizontal className="size-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-[#64748B]">
              <div>Showing 1 to {filteredWorkflows.length} of 42 workflows</div>
              <div className="flex items-center gap-1">
                <button className="size-6 flex items-center justify-center rounded border border-[#E2E8F0] hover:bg-slate-50">&lt;</button>
                <button className="size-6 flex items-center justify-center rounded bg-[#2563EB] text-white font-bold">1</button>
                <button className="size-6 flex items-center justify-center rounded hover:bg-slate-50">2</button>
                <button className="size-6 flex items-center justify-center rounded hover:bg-slate-50">3</button>
                <span>...</span>
                <button className="size-6 flex items-center justify-center rounded hover:bg-slate-50">6</button>
                <button className="size-6 flex items-center justify-center rounded border border-[#E2E8F0] hover:bg-slate-50">&gt;</button>
                <select className="ml-2 border border-[#E2E8F0] rounded px-1.5 py-1 focus:outline-none">
                  <option>10 per page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Split Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            
            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold text-[#111C3A]">Recent Activity</h3>
                <a href="#" className="text-[11px] font-medium text-[#2563EB] hover:underline flex items-center gap-1">View all <ArrowRight className="size-3" /></a>
              </div>
              <div className="space-y-3 flex-1">
                {[
                  { user: 'RS', name: 'Rahul Sharma', action: 'updated', target: 'New Meta Lead Follow-up', time: '12 min ago', color: 'bg-emerald-500' },
                  { user: 'NV', name: 'Neha Verma', action: 'activated', target: 'Google Review Alert', time: '2 hrs ago', color: 'bg-yellow-500' },
                  { user: 'AK', name: 'Amit Kumar', action: 'paused', target: 'SEO Critical Issue', time: '5 hrs ago', color: 'bg-red-500' },
                  { user: 'PS', name: 'Priya Singh', action: 'edited', target: 'WhatsApp Re-engagement', time: '1 day ago', color: 'bg-blue-500' },
                  { user: 'KM', name: 'Karan Mehta', action: 'created', target: 'Form Submission Routing', time: '2 days ago', color: 'bg-slate-400' },
                ].map((act, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <div className={`size-6 rounded-full ${act.color} text-white flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5`}>
                      {act.user}
                    </div>
                    <div className="flex-1 text-[11.5px] leading-snug">
                      <span className="font-semibold text-[#111C3A]">{act.name}</span> <span className="text-[#64748B]">{act.action}</span> <span className="font-semibold text-[#334155]">{act.target}</span>
                    </div>
                    <div className="text-[10px] text-[#94A3B8] whitespace-nowrap">{act.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Templates */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-[13px] font-bold text-[#111C3A]">Quick Templates</h3>
                <a href="#" className="text-[11px] font-medium text-[#2563EB] hover:underline flex items-center gap-1">View all templates <ArrowRight className="size-3" /></a>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Bot className="size-4 text-blue-600" />, title: "New Lead Follow-up", desc: "Instantly follow up with new leads" },
                  { icon: <span className="text-orange-600 font-bold text-[12px]">G</span>, title: "Negative Review Alert", desc: "Get notified of negative reviews" },
                  { icon: <Activity className="size-4 text-emerald-600" />, title: "Website Down Alert", desc: "Alert when website is down" },
                  { icon: <span className="text-emerald-500 font-bold text-[12px]">W</span>, title: "WhatsApp Re-engagement", desc: "Re-engage inactive leads" }
                ].map((tpl, i) => (
                  <div key={i} className="border border-[#E2E8F0] rounded-lg p-2.5 hover:border-[#CBD5E1] hover:shadow-sm transition-all flex flex-col items-center text-center">
                    <div className={`grid size-7 place-items-center rounded-md bg-slate-50 border border-slate-100 mb-2`}>
                      {tpl.icon}
                    </div>
                    <div className="text-[10px] font-bold text-[#111C3A] leading-tight mb-1">{tpl.title}</div>
                    <div className="text-[9px] text-[#64748B] leading-tight mb-3 line-clamp-2">{tpl.desc}</div>
                    <button className="mt-auto w-full text-[10px] font-semibold text-[#2563EB] border border-[#BFDBFE] rounded py-1 hover:bg-blue-50 transition-colors">Use Template</button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
        
        {/* RIGHT COLUMN (Sidebar) */}
        <div className="space-y-2">
          
          {/* Categories */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-[#111C3A]">Workflow Categories</h3>
              <a href="#" className="text-[11px] font-medium text-[#2563EB] hover:underline flex items-center gap-1">View all <ArrowRight className="size-3" /></a>
            </div>
            <div className="space-y-1">
              {[
                { icon: <User className="size-3.5 text-blue-500" />, bg: "bg-blue-100", label: "Lead Management", count: 14 },
                { icon: <CheckCircle2 className="size-3.5 text-emerald-500" />, bg: "bg-emerald-100", label: "Customer Engagement", count: 8 },
                { icon: <AlertCircle className="size-3.5 text-orange-500" />, bg: "bg-orange-100", label: "Reputation Management", count: 6 },
                { icon: <LayoutDashboard className="size-3.5 text-purple-500" />, bg: "bg-purple-100", label: "Website & Monitoring", count: 5 },
                { icon: <Activity className="size-3.5 text-rose-500" />, bg: "bg-rose-100", label: "Sales & CRM", count: 5 },
                { icon: <Bell className="size-3.5 text-yellow-500" />, bg: "bg-yellow-100", label: "Internal Notifications", count: 4 },
              ].map((cat, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 hover:bg-slate-50 px-2 -mx-2 rounded-md cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`size-6 rounded flex items-center justify-center ${cat.bg}`}>
                      {cat.icon}
                    </div>
                    <span className="text-[11.5px] font-medium text-[#334155]">{cat.label}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#111C3A]">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger Sources */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-[#111C3A]">Trigger Sources</h3>
              <a href="#" className="text-[11px] font-medium text-[#2563EB] hover:underline flex items-center gap-1">View all <ArrowRight className="size-3" /></a>
            </div>
            <div className="space-y-3">
              {[
                { icon: <FileText className="size-3.5 text-blue-600" />, label: "Form Submission", pct: 28, color: "bg-blue-600" },
                { icon: <User className="size-3.5 text-emerald-600" />, label: "New Lead", pct: 22, color: "bg-emerald-500" },
                { icon: <LayoutDashboard className="size-3.5 text-blue-600" />, label: "Website Event", pct: 16, color: "bg-blue-500" },
                { icon: <span className="text-[10px] font-bold text-orange-600">G</span>, label: "New Review", pct: 12, color: "bg-orange-400" },
                { icon: <Clock className="size-3.5 text-fuchsia-600" />, label: "Missed Call", pct: 10, color: "bg-fuchsia-500" },
                { icon: <Clock className="size-3.5 text-indigo-600" />, label: "Scheduled", pct: 8, color: "bg-indigo-500" },
                { icon: <MoreHorizontal className="size-3.5 text-slate-500" />, label: "Others", pct: 4, color: "bg-slate-400" },
              ].map((src, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 flex justify-center">{src.icon}</div>
                  <span className="text-[11px] text-[#334155] w-28 truncate">{src.label}</span>
                  <span className="text-[10px] text-[#64748B] w-6">{src.pct}%</span>
                  <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className={`h-full ${src.color} rounded-full`} style={{ width: `${src.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Workflow Summary */}
          <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] shadow-inner p-6 flex flex-col items-center justify-center text-center h-[200px]">
            <div className="size-12 bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex items-center justify-center mb-3">
              <FileText className="size-5 text-[#94A3B8]" />
            </div>
            <h3 className="text-[12px] font-bold text-[#111C3A] mb-1">No workflow selected</h3>
            <p className="text-[11px] text-[#64748B] max-w-[180px]">
              Select a workflow from the table to view details, performance stats and recent runs.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
