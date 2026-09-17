"use client";

import { 
  Play, CheckCircle2, XCircle, Clock, ChevronDown, Download, Search, 
  MoreHorizontal, Activity, Calendar, MessageSquare, Globe, User, 
  RotateCcw, RefreshCcw, ShieldAlert, Check
} from "lucide-react";

export function RunsPage() {
  return (
    <div className="space-y-2 pb-12">
      
      {/* Top Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-[#E2E8F0] bg-white rounded-md px-3 py-1.5 text-[12px] font-medium text-[#111C3A] cursor-pointer hover:bg-slate-50">
            <Calendar className="size-3.5 text-[#64748B]" />
            <div className="flex flex-col text-left leading-none">
              <span className="font-bold text-[#111C3A]">Last 30 days</span>
              <span className="text-[9px] text-[#94A3B8]">Mar 15, 2025 - Apr 14, 2025</span>
            </div>
            <ChevronDown className="size-3.5 text-[#94A3B8] ml-1" />
          </div>
          
          {['All Workflows', 'All Statuses', 'All Trigger Sources', 'All Channels'].map(f => (
            <div key={f} className="flex items-center gap-1.5 border border-[#E2E8F0] bg-white rounded-md px-3 py-2 text-[12px] font-medium text-[#334155] cursor-pointer hover:bg-slate-50">
              {f} <ChevronDown className="size-3.5 text-[#94A3B8]" />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
            <input 
              type="text" 
              placeholder="Search runs, contacts, or messages..." 
              className="pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-md text-[12px] w-[260px] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
          <button className="flex items-center gap-1.5 border border-[#E2E8F0] bg-white rounded-md px-3 py-2 text-[12px] font-bold text-[#2563EB] hover:bg-slate-50 transition-colors">
            <Download className="size-3.5" /> Export Logs
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2 shadow-sm flex items-center gap-3">
          <div className="bg-[#EFF6FF] text-[#3B82F6] p-2 rounded-full"><Play className="size-5" fill="currentColor" /></div>
          <div>
            <h4 className="text-[10px] font-medium text-[#64748B] mb-0.5">Total Runs</h4>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-[#111C3A]">2,076</span>
              <span className="text-[10px] font-bold text-[#10B981] flex items-center">↑ 18%</span>
            </div>
            <p className="text-[9px] text-[#94A3B8]">vs last 30 days</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2 shadow-sm flex items-center gap-3">
          <div className="bg-[#ECFDF5] text-[#10B981] p-2 rounded-full"><CheckCircle2 className="size-5" /></div>
          <div>
            <h4 className="text-[10px] font-medium text-[#64748B] mb-0.5">Successful</h4>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-[#111C3A]">1,742</span>
              <span className="text-[10px] font-bold text-[#10B981] flex items-center">↑ 22%</span>
            </div>
            <p className="text-[9px] text-[#64748B]">84.0% success rate</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2 shadow-sm flex items-center gap-3">
          <div className="bg-[#FEF2F2] text-[#EF4444] p-2 rounded-full"><XCircle className="size-5" fill="currentColor" /></div>
          <div>
            <h4 className="text-[10px] font-medium text-[#64748B] mb-0.5">Failed</h4>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-[#111C3A]">186</span>
              <span className="text-[10px] font-bold text-[#EF4444] flex items-center">↓ 28%</span>
            </div>
            <p className="text-[9px] text-[#64748B]">9.0% failure rate</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2 shadow-sm flex items-center gap-3">
          <div className="bg-[#FEF9C3] text-[#EAB308] p-2 rounded-full"><Clock className="size-5" fill="currentColor" /></div>
          <div>
            <h4 className="text-[10px] font-medium text-[#64748B] mb-0.5">Pending</h4>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-[#111C3A]">64</span>
              <span className="text-[10px] font-bold text-[#10B981] flex items-center">↑ 12%</span>
            </div>
            <p className="text-[9px] text-[#64748B]">3.1% in queue</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2 shadow-sm flex items-center gap-3">
          <div className="bg-[#F3E8FF] text-[#A855F7] p-2 rounded-full"><RotateCcw className="size-5" /></div>
          <div>
            <h4 className="text-[10px] font-medium text-[#64748B] mb-0.5">Retries</h4>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-[#111C3A]">124</span>
              <span className="text-[10px] font-bold text-[#10B981] flex items-center">↑ 40%</span>
            </div>
            <p className="text-[9px] text-[#64748B]">6.0% retried runs</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] px-3 py-2 shadow-sm flex items-center gap-3">
          <div className="bg-[#EBF5FF] text-[#3B82F6] p-2 rounded-full"><Clock className="size-5" /></div>
          <div>
            <h4 className="text-[10px] font-medium text-[#64748B] mb-0.5">Avg. Duration</h4>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-[#111C3A]">2m 14s</span>
              <span className="text-[10px] font-bold text-[#EF4444] flex items-center">↓ 18%</span>
            </div>
            <p className="text-[9px] text-[#94A3B8]">vs last 30 days</p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-2 items-start pt-2">
        
        {/* LEFT COLUMN (Main Content) */}
        <div className="flex-1 space-y-2 min-w-0">
          
          {/* Workflow Runs Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-[#E2E8F0]">
              <h3 className="text-[13px] font-bold text-[#111C3A]">Workflow Runs</h3>
              <div className="flex items-center gap-2 text-[11px] text-[#64748B]">
                <span>1-8 of 2,076 runs</span>
                <div className="flex items-center gap-1">
                  <button className="size-6 flex items-center justify-center rounded border border-[#E2E8F0] hover:bg-slate-50">&lt;</button>
                  <button className="size-6 flex items-center justify-center rounded border border-[#E2E8F0] hover:bg-slate-50">&gt;</button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead className="bg-white text-[#64748B] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="pl-3 pr-2 py-2 w-[24px]"><input type="checkbox" className="rounded border-gray-300" /></th>
                    <th className="px-2 py-2 font-medium">Run ID</th>
                    <th className="px-2 py-2 font-medium">Workflow</th>
                    <th className="px-2 py-2 font-medium">Triggered By</th>
                    <th className="px-2 py-2 font-medium text-[#2563EB]">Started At ↓</th>
                    <th className="px-2 py-2 font-medium">Duration</th>
                    <th className="px-2 py-2 font-medium">Steps</th>
                    <th className="px-2 py-2 font-medium">Result</th>
                    <th className="px-2 py-2 font-medium">Owner</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: "run_8f3a2c1e", wf: "New Meta Lead Follow-up", trigIcon: <Activity className="size-3.5 text-blue-500" />, trigLbl: "Meta Ads", date: "Apr 14, 2025, 10:24 AM", dur: "2m 14s", steps: "4/4", res: "Success", resCol: "bg-[#ECFDF5] text-[#10B981]", own: "Manish S.", sel: false },
                    { id: "run_7c9d4b2a", wf: "WhatsApp Re-engagement", trigIcon: <MessageSquare className="size-3.5 text-emerald-500" fill="currentColor" />, trigLbl: "Manual", date: "Apr 14, 2025, 09:18 AM", dur: "1m 32s", steps: "3/4", res: "Failed", resCol: "bg-[#FEF2F2] text-[#EF4444]", own: "Neha V.", sel: true },
                    { id: "run_5e2f8a9d", wf: "Google Review Alert", trigIcon: <span className="text-orange-500 font-bold text-[11px]">G</span>, trigLbl: "Website", date: "Apr 14, 2025, 08:44 AM", dur: "45s", steps: "3/3", res: "Success", resCol: "bg-[#ECFDF5] text-[#10B981]", own: "Rohit K.", sel: false },
                    { id: "run_1d7c9e5b", wf: "SEO Critical Issue", trigIcon: <span className="text-orange-500 font-bold text-[11px]">G</span>, trigLbl: "System", date: "Apr 14, 2025, 07:12 AM", dur: "3m 21s", steps: "4/4", res: "Retried", resCol: "bg-[#FEF9C3] text-[#D97706]", own: "Manish S.", sel: false },
                    { id: "run_4b8e2d1f", wf: "Website Down Alert", trigIcon: <Globe className="size-3.5 text-blue-500" />, trigLbl: "Website", date: "Apr 13, 2025, 11:03 PM", dur: "38s", steps: "2/2", res: "Success", resCol: "bg-[#ECFDF5] text-[#10B981]", own: "Priya M.", sel: false },
                    { id: "run_9a3f6c7e", wf: "New Meta Lead Follow-up", trigIcon: <Activity className="size-3.5 text-blue-500" />, trigLbl: "Meta Ads", date: "Apr 13, 2025, 08:21 PM", dur: "-", steps: "0/4", res: "Queued", resCol: "bg-[#F1F5F9] text-[#64748B]", own: "Unassigned", sel: false },
                    { id: "run_6d2b4e8f", wf: "WhatsApp Re-engagement", trigIcon: <Clock className="size-3.5 text-emerald-500" />, trigLbl: "Scheduled", date: "Apr 13, 2025, 05:44 PM", dur: "2m 08s", steps: "4/4", res: "Success", resCol: "bg-[#ECFDF5] text-[#10B981]", own: "Neha V.", sel: false },
                    { id: "run_3e9c1a7d", wf: "Negative Review Alert", trigIcon: <span className="text-orange-500 font-bold text-[11px]">G</span>, trigLbl: "Google Business", date: "Apr 13, 2025, 03:12 PM", dur: "1m 14s", steps: "3/3", res: "Cancelled", resCol: "bg-[#FEF2F2] text-[#EF4444]", own: "Rohit K.", sel: false },
                  ].map((r) => (
                    <tr key={r.id} className={`border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors cursor-pointer ${r.sel ? 'bg-blue-50/30 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}>
                      <td className="pl-3 pr-2 py-2.5"><input type="checkbox" className="rounded border-gray-300" /></td>
                      <td className="px-2 py-2.5 font-mono text-[#64748B]">{r.id}</td>
                      <td className="px-2 py-2.5 font-semibold text-[#111C3A]">{r.wf}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-1.5 text-[#334155]">
                          <div className="w-4 flex justify-center">{r.trigIcon}</div>
                          {r.trigLbl}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-[#334155]">{r.date}</td>
                      <td className="px-2 py-2.5 text-[#334155]">{r.dur}</td>
                      <td className="px-2 py-2.5 text-[#64748B]">{r.steps}</td>
                      <td className="px-2 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${r.resCol}`}>
                           <div className={`size-1.5 rounded-full ${r.res === 'Success' ? 'bg-[#10B981]' : r.res === 'Failed' || r.res === 'Cancelled' ? 'bg-[#EF4444]' : r.res === 'Retried' ? 'bg-[#D97706]' : 'bg-[#94A3B8]'}`}></div>
                           {r.res}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-[#64748B]">{r.own}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button className="text-[#94A3B8] hover:text-[#111C3A]"><MoreHorizontal className="size-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            
            {/* Runs Over Time (Line + Bar mock) */}
            <div className="md:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[13px] font-bold text-[#111C3A]">Runs Over Time</h3>
                  <p className="text-[10px] text-[#64748B]">Total workflow runs and success rate over time.</p>
                </div>
                <div className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-md px-2 py-1 text-[11px] font-medium text-[#334155]">
                  Last 30 days <ChevronDown className="size-3" />
                </div>
              </div>
              <div className="flex-1 flex items-end justify-between relative h-[120px] pb-4 px-2">
                 {/* Fake Chart Graphics */}
                 <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6">
                   <div className="border-t border-[#F1F5F9] w-full border-dashed" />
                   <div className="border-t border-[#F1F5F9] w-full border-dashed" />
                   <div className="border-t border-[#F1F5F9] w-full border-dashed" />
                   <div className="border-t border-[#F1F5F9] w-full border-dashed" />
                   <div className="border-t border-[#E2E8F0] w-full" />
                 </div>
                 
                 {/* Fake Bars */}
                 <div className="relative z-10 w-full h-full flex items-end justify-between gap-1 px-4">
                   {[35, 42, 65, 80, 25, 45, 55, 70, 30, 50, 60, 75, 40, 58, 68, 85, 32, 48, 62, 78, 28, 52, 66, 82, 38].map((h, i) => (
                     <div key={i} className="w-full bg-[#10B981] rounded-t-sm" style={{ height: `${h}%` }}>
                       {i % 4 === 0 && <div className="w-full bg-[#EF4444]" style={{ height: `${h * 0.25}%` }} />}
                     </div>
                   ))}
                 </div>
                 
                 {/* Fake Line */}
                 <svg className="absolute inset-0 h-full w-full pointer-events-none z-20" preserveAspectRatio="none">
                    <path d="M 10,60 Q 40,70 80,40 T 150,50 T 220,30 T 290,40 T 360,20 T 430,30 T 500,10" fill="none" stroke="#3B82F6" strokeWidth="2" />
                    <circle cx="150" cy="50" r="3" fill="#3B82F6" />
                    <circle cx="290" cy="40" r="3" fill="#3B82F6" />
                    <circle cx="430" cy="30" r="3" fill="#3B82F6" />
                 </svg>

                 <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-[#94A3B8] px-4 font-medium">
                   <span>Mar 15</span>
                   <span>Mar 20</span>
                   <span>Mar 25</span>
                   <span>Mar 30</span>
                   <span>Apr 4</span>
                   <span>Apr 9</span>
                   <span>Apr 14</span>
                 </div>
              </div>
            </div>

            {/* Success vs Failure */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
              <h3 className="text-[13px] font-bold text-[#111C3A] mb-4">Success vs Failure</h3>
              <div className="flex-1 flex items-center justify-center relative">
                 {/* Donut Chart Mock */}
                 <div className="size-24 rounded-full border-[12px] border-[#10B981] border-r-[#EF4444] border-b-[#EAB308] border-l-[#8B5CF6] flex items-center justify-center transform rotate-45">
                    <div className="transform -rotate-45 text-center">
                      <div className="text-[14px] font-bold text-[#111C3A]">2,076</div>
                      <div className="text-[8px] text-[#64748B]">Total Runs</div>
                    </div>
                 </div>
                 
                 <div className="absolute right-0 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-[#10B981]" />
                      <div>
                        <div className="text-[11px] font-bold text-[#111C3A] leading-none mb-0.5">1,742</div>
                        <div className="text-[9px] text-[#64748B] leading-none">Successful (84.0%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-[#EF4444]" />
                      <div>
                        <div className="text-[11px] font-bold text-[#111C3A] leading-none mb-0.5">186</div>
                        <div className="text-[9px] text-[#64748B] leading-none">Failed (9.0%)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2.5 rounded-full bg-[#EAB308]" />
                      <div>
                        <div className="text-[11px] font-bold text-[#111C3A] leading-none mb-0.5">64</div>
                        <div className="text-[9px] text-[#64748B] leading-none">Pending (3.1%)</div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            
            {/* Failure Reasons */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-[#111C3A]">Failure Reasons</h3>
                <a href="#" className="text-[10px] font-medium text-[#2563EB] hover:underline">View all →</a>
              </div>
              <div className="space-y-2">
                {[
                  { lbl: "Invalid configuration", pct: 32, col: "bg-red-500" },
                  { lbl: "API rate limit", pct: 24, col: "bg-orange-500" },
                  { lbl: "Contact not found", pct: 18, col: "bg-amber-500" },
                  { lbl: "Message delivery failed", pct: 14, col: "bg-blue-500" },
                  { lbl: "Condition not met", pct: 8, col: "bg-cyan-500" },
                  { lbl: "Others", pct: 4, col: "bg-slate-400" },
                ].map(r => (
                  <div key={r.lbl} className="flex items-center gap-2 text-[10px]">
                    <ShieldAlert className={`size-3 shrink-0 text-slate-400`} />
                    <span className="text-[#334155] w-28 truncate">{r.lbl}</span>
                    <span className="text-[#64748B] font-medium w-6">{r.pct}%</span>
                    <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className={`h-full ${r.col} rounded-full`} style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-[#111C3A]">Recent Incidents</h3>
                <a href="#" className="text-[10px] font-medium text-[#2563EB] hover:underline">View all incidents →</a>
              </div>
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-[10px] whitespace-nowrap">
                  <thead className="text-[#94A3B8] border-b border-[#F1F5F9]">
                    <tr>
                      <th className="font-medium pb-2 pr-2">Time</th>
                      <th className="font-medium pb-2 px-2">Run ID</th>
                      <th className="font-medium pb-2 px-2">Workflow</th>
                      <th className="font-medium pb-2 px-2">Error</th>
                      <th className="font-medium pb-2 pl-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#334155]">
                    {[
                      { time: "Apr 14, 09:19 AM", id: "run_7c9d...", wf: "WhatsApp Re-eng...", err: "Invalid wait duration format" },
                      { time: "Apr 14, 07:33 AM", id: "run_2e8f...", wf: "New Meta Lead F...", err: "WhatsApp API rate limit exceeded" },
                    ].map(inc => (
                      <tr key={inc.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                        <td className="py-2 pr-2">{inc.time}</td>
                        <td className="py-2 px-2 font-mono text-[#64748B]">{inc.id}</td>
                        <td className="py-2 px-2">{inc.wf}</td>
                        <td className="py-2 px-2 text-[#EF4444]">{inc.err}</td>
                        <td className="py-2 pl-2 text-right text-[#2563EB] font-bold cursor-pointer hover:underline">View Logs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN (Sidebar Details) */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-2">
          
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] font-bold text-[#111C3A]">Selected Run Details</h3>
                <button className="text-[#94A3B8] hover:text-[#111C3A]"><XCircle className="size-4" /></button>
              </div>

              <div className="flex gap-3">
                <div className="size-10 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center shrink-0">
                  <MessageSquare className="size-5 text-[#10B981]" fill="currentColor" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[13px] font-bold text-[#111C3A]">WhatsApp Re-engagement</h4>
                    <span className="text-[9px] font-bold bg-[#FEF2F2] text-[#EF4444] px-1.5 py-0.5 rounded text-red-600">Failed</span>
                  </div>
                  <div className="text-[10px] text-[#64748B] mb-2 flex flex-col gap-0.5">
                    <span className="font-mono">Run ID: run_7c9d4b2a</span>
                    <span>Apr 14, 2025, 09:18 AM &nbsp;•&nbsp; 1m 32s &nbsp;•&nbsp; 3/4 steps</span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <button className="px-2 py-1 border border-[#E2E8F0] rounded text-[10px] font-bold text-[#64748B] hover:bg-slate-50"><MoreHorizontal className="size-3" /></button>
                    <button className="px-2 py-1 border border-[#BFDBFE] rounded text-[10px] font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 transition-colors">Retry Run</button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#E2E8F0] text-[10px]">
                <div>
                  <div className="text-[#94A3B8] mb-1">Triggered By</div>
                  <div className="flex items-center gap-1 text-[#111C3A] font-medium"><Activity className="size-3 text-[#64748B]" /> Manual (User)</div>
                </div>
                <div>
                  <div className="text-[#94A3B8] mb-1">Contact</div>
                  <div className="flex flex-col">
                     <span className="flex items-center gap-1 text-[#111C3A] font-medium"><User className="size-3 text-[#64748B]" /> Ramesh Patel</span>
                     <span className="text-[#64748B] text-[9px] ml-4">ramesh.patel@gmail.com</span>
                  </div>
                </div>
                <div>
                  <div className="text-[#94A3B8] mb-1">Owner</div>
                  <div className="flex items-center gap-1 text-[#111C3A] font-medium"><User className="size-3 text-[#64748B]" /> Neha Verma</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC]">
              <h3 className="text-[11px] font-bold text-[#111C3A] mb-4">Execution Log</h3>
              
              <div className="space-y-0 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                
                {/* Step 1 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-4">
                  <div className="flex items-start w-full">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-[#10B981] text-white shrink-0 z-10 mr-3">
                       <Check className="size-3" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-[#111C3A]">Trigger Received</h4>
                        <span className="text-[9px] text-[#94A3B8]">09:18:12 AM</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Manual trigger by Neha Verma</p>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-4">
                  <div className="flex items-start w-full">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-[#10B981] text-white shrink-0 z-10 mr-3">
                       <Check className="size-3" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-[#111C3A]">Condition Check</h4>
                        <span className="text-[9px] text-[#94A3B8]">09:18:14 AM</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Contact matches re-engagement criteria</p>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-4">
                  <div className="flex items-start w-full">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-[#10B981] text-white shrink-0 z-10 mr-3">
                       <Check className="size-3" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-[#111C3A]">WhatsApp Message Sent</h4>
                        <span className="text-[9px] text-[#94A3B8]">09:18:17 AM</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Message sent successfully via WhatsApp</p>
                    </div>
                  </div>
                </div>

                {/* Step 4 (Failed) */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active pb-4">
                  <div className="flex items-start w-full">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-[#EF4444] text-white shrink-0 z-10 mr-3">
                       <XCircle className="size-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-[#EF4444]">Wait 2 Hours</h4>
                        <span className="text-[9px] text-[#94A3B8]">09:19:42 AM</span>
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Step failed due to invalid delay configuration</p>
                      <div className="mt-2 bg-[#FEF2F2] border border-[#FECACA] rounded-md p-2 flex items-start justify-between">
                         <div className="flex items-start gap-1.5 text-[9px] text-[#B91C1C] font-medium">
                           <ShieldAlert className="size-3 shrink-0 mt-0.5" /> Error: Invalid wait duration format
                         </div>
                         <button className="text-[9px] font-bold text-[#2563EB] bg-white px-1.5 py-0.5 rounded border border-[#BFDBFE]">Retry Step</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 5 (Not executed) */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-start w-full">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-[#E2E8F0] text-[#94A3B8] shrink-0 z-10 mr-3">
                       <span className="text-[10px] font-bold">5</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between opacity-50">
                        <h4 className="text-[11px] font-bold text-[#111C3A]">Assign User</h4>
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5">Not executed</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
               <h3 className="text-[11px] font-bold text-[#111C3A]">Queue Health</h3>
               <a href="#" className="text-[10px] font-medium text-[#2563EB] hover:underline">View all →</a>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div className="flex gap-2 items-center">
                 <div className="size-6 bg-[#FEF9C3] text-[#EAB308] rounded flex items-center justify-center"><Clock className="size-3" /></div>
                 <div>
                   <div className="text-[12px] font-bold text-[#111C3A] leading-tight">64</div>
                   <div className="text-[9px] text-[#64748B]">Runs in Queue</div>
                 </div>
               </div>
               <div className="flex gap-2 items-center justify-between">
                 <div className="flex gap-2 items-center">
                   <div className="size-6 bg-[#F3E8FF] text-[#A855F7] rounded flex items-center justify-center"><RefreshCcw className="size-3" /></div>
                   <div>
                     <div className="text-[12px] font-bold text-[#111C3A] leading-tight">124</div>
                     <div className="text-[9px] text-[#64748B]">Runs Retried</div>
                   </div>
                 </div>
                 <div className="text-[9px] font-bold text-[#10B981]">↑ 40%</div>
               </div>
               <div className="flex gap-2 items-center mt-2">
                 <div className="size-6 bg-[#ECFDF5] text-[#10B981] rounded flex items-center justify-center"><Clock className="size-3" /></div>
                 <div>
                   <div className="text-[12px] font-bold text-[#111C3A] leading-tight">~5 min</div>
                   <div className="text-[9px] text-[#64748B]">Average Wait Time</div>
                 </div>
               </div>
               <div className="flex gap-2 items-center justify-between mt-2">
                 <div className="flex gap-2 items-center">
                   <div className="size-6 bg-[#EBF5FF] text-[#3B82F6] rounded flex items-center justify-center"><Activity className="size-3" /></div>
                   <div>
                     <div className="text-[12px] font-bold text-[#111C3A] leading-tight">98.2%</div>
                     <div className="text-[9px] text-[#64748B]">Queue Processing Rate</div>
                   </div>
                 </div>
                 <div className="text-[9px] font-bold text-[#10B981]">↑ 2%</div>
               </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
