"use client";

import React from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { useTeamWorkload } from "@/features/support-tickets/data/selectors";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { Users, AlertTriangle, Clock, BarChart3, TrendingUp, CheckCircle2, UserCircle, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MOCK_AGENTS = [
  { id: 1, name: "Alice Smith", role: "L1 Support", team: "Triage Team", active: 5, resolvedToday: 12, capacity: 80, status: "online" },
  { id: 2, name: "Bob Jones", role: "Technical Specialist", team: "Technical Backlog", active: 8, resolvedToday: 4, capacity: 100, status: "busy" },
  { id: 3, name: "Charlie Davis", role: "Billing Specialist", team: "Billing Queue", active: 2, resolvedToday: 15, capacity: 40, status: "online" },
  { id: 4, name: "Diana Ross", role: "L2 Support", team: "Technical Backlog", active: 4, resolvedToday: 8, capacity: 60, status: "away" },
  { id: 5, name: "Evan Wright", role: "Triage Agent", team: "Triage Team", active: 7, resolvedToday: 9, capacity: 90, status: "online" },
  { id: 6, name: "Fiona Gallagher", role: "Senior Support", team: "Escalated Issues", active: 3, resolvedToday: 2, capacity: 50, status: "offline" },
];

export default function TeamWorkloadPage() {
  const { tickets } = useSupport();
  const workload = useTeamWorkload();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isReportOpen, setIsReportOpen] = React.useState(false);
  
  // Filter States
  const [filterTeam, setFilterTeam] = React.useState("All Teams");
  const [filterRole, setFilterRole] = React.useState("All Roles");
  const [filterStatus, setFilterStatus] = React.useState("All Statuses");

  const totalActive = tickets.filter(t => t.status !== "Resolved" && t.status !== "Closed").length;
  const totalUnassigned = tickets.filter(t => !t.assignedStaffId && !t.assignedTeamId && t.status !== "Resolved" && t.status !== "Closed").length;
  const totalHighUrgent = tickets.filter(t => (t.priority === "High" || t.priority === "Urgent") && t.status !== "Resolved" && t.status !== "Closed").length;
  const totalResolvedToday = 45; // Mock data

  const filteredAgents = MOCK_AGENTS.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) || agent.team.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = filterTeam === "All Teams" || agent.team === filterTeam;
    const matchesRole = filterRole === "All Roles" || agent.role === filterRole;
    const matchesStatus = filterStatus === "All Statuses" || agent.status.toLowerCase() === filterStatus.toLowerCase();
    
    return matchesSearch && matchesTeam && matchesRole && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[20px] font-bold text-[#0F172A]">Team Workload Overview</h2>
          <p className="text-[13px] text-[#64748B] mt-1">Monitor team capacity, ticket distribution, and individual agent performance in real-time.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-9 bg-[#EB0711] hover:bg-[#D60811] text-white text-[13px]" onClick={() => setIsReportOpen(true)}>
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm flex items-center gap-3 h-[80px]">
          <div className="w-10 h-10 rounded-sm bg-[#DBEAFE] flex items-center justify-center shrink-0">
            <BarChart3 size={18} className="text-[#2563EB]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold text-[#0F172A]">{totalActive}</span>
            <span className="text-[12px] text-[#64748B]">Total Active Tickets</span>
          </div>
        </Card>
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm flex items-center gap-3 h-[80px]">
          <div className="w-10 h-10 rounded-sm bg-[#FEF9C3] flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-[#EAB308]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[20px] font-bold text-[#0F172A]">{totalUnassigned}</span>
            <span className="text-[12px] text-[#64748B]">Unassigned Tickets</span>
          </div>
        </Card>
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm flex items-center gap-3 h-[80px]">
          <div className="w-10 h-10 rounded-sm bg-[#FEE2E2] flex items-center justify-center shrink-0">
            <Clock size={18} className="text-[#EF4444]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[24px] font-bold text-[#0F172A]">{totalHighUrgent}</span>
            <span className="text-[13px] text-[#64748B] font-medium">High/Urgent Priority</span>
          </div>
        </Card>
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm flex items-center gap-3 h-[80px]">
          <div className="w-10 h-10 rounded-sm bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200">
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[24px] font-bold text-[#0F172A]">{totalResolvedToday}</span>
            <span className="text-[13px] text-[#64748B] font-medium">Resolved Today</span>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-[#0F172A]">Team Capacity Distribution</h3>
          <span className="text-[12px] font-medium text-[#64748B] bg-slate-100 px-2 py-1 rounded-md">Live Update</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {workload.map(({ team, activeTickets, unassigned, highUrgent }) => {
            const capacityPercent = Math.min((activeTickets / 10) * 100, 100);
            const isOverloaded = activeTickets > 8;
            return (
              <Card key={team.id} className="p-4 border-[#E2E8F0] shadow-sm rounded-sm hover:border-[#CBD5E1] transition-colors flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center shrink-0",
                      isOverloaded ? "bg-[#FEF2F2]" : "bg-[#D1FAE5]"
                    )}>
                      <Users size={16} className={isOverloaded ? "text-[#EF4444]" : "text-[#10B981]"} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-[13px] font-semibold text-[#0F172A]">{team.name}</h4>
                      <p className="text-[11px] text-[#64748B] leading-snug">{team.description}</p>
                    </div>
                  </div>
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-sm shrink-0",
                    isOverloaded ? "text-[#EF4444] bg-[#FEE2E2]" : "text-[#10B981] bg-[#D1FAE5]"
                  )}>{isOverloaded ? "Overloaded" : "Normal Load"}</span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[12px] text-[#475569] flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />{activeTickets} active
                  </span>
                  {unassigned > 0 && (
                    <span className="text-[12px] text-[#EAB308] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />{unassigned} unassigned
                    </span>
                  )}
                  {highUrgent > 0 && (
                    <span className="text-[12px] text-[#EF4444] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />{highUrgent} high/urgent
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
                    <span>Capacity</span><span>{activeTickets}/10 tickets</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", isOverloaded ? "bg-[#EF4444]" : "bg-[#10B981]")} style={{ width: `${capacityPercent}%` }} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Agent Workload Table */}
      <div className="flex flex-col gap-4 mt-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-[#0F172A]">Individual Agent Workload</h3>
            {(filterTeam !== "All Teams" || filterRole !== "All Roles" || filterStatus !== "All Statuses" || searchTerm !== "") && (
              <Button variant="ghost" size="sm" className="h-8 text-[12px] text-[#64748B] hover:text-[#0F172A]" onClick={() => {
                setFilterTeam("All Teams");
                setFilterRole("All Roles");
                setFilterStatus("All Statuses");
                setSearchTerm("");
              }}>
                Clear Filters
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3 bg-white p-2.5 border border-[#E2E8F0] rounded-xl shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Search agents by name..."
                className="pl-9 h-9 text-[13px] border-none shadow-none focus-visible:ring-0"
                value={searchTerm}
                onChange={(e) => React.startTransition(() => setSearchTerm(e.target.value))}
              />
            </div>
            <div className="w-px h-6 bg-[#E2E8F0]" />
            <select 
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="h-9 w-40 rounded-md border-0 bg-transparent px-3 py-1 text-[13px] font-medium text-[#475569] focus:outline-none focus:ring-0 cursor-pointer hover:bg-slate-50"
            >
              <option value="All Teams">All Teams</option>
              <option value="Triage Team">Triage Team</option>
              <option value="Technical Backlog">Technical Backlog</option>
              <option value="Billing Queue">Billing Queue</option>
              <option value="Escalated Issues">Escalated Issues</option>
            </select>
            <div className="w-px h-6 bg-[#E2E8F0]" />
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-9 w-40 rounded-md border-0 bg-transparent px-3 py-1 text-[13px] font-medium text-[#475569] focus:outline-none focus:ring-0 cursor-pointer hover:bg-slate-50"
            >
              <option value="All Roles">All Roles</option>
              <option value="L1 Support">L1 Support</option>
              <option value="L2 Support">L2 Support</option>
              <option value="Technical Specialist">Technical Specialist</option>
              <option value="Billing Specialist">Billing Specialist</option>
              <option value="Triage Agent">Triage Agent</option>
              <option value="Senior Support">Senior Support</option>
            </select>
            <div className="w-px h-6 bg-[#E2E8F0]" />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 w-32 rounded-md border-0 bg-transparent px-3 py-1 text-[13px] font-medium text-[#475569] focus:outline-none focus:ring-0 cursor-pointer hover:bg-slate-50"
            >
              <option value="All Statuses">All Status</option>
              <option value="online">Online</option>
              <option value="busy">Busy</option>
              <option value="away">Away</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[12px] font-semibold text-[#475569] uppercase tracking-wider">
                  <th className="px-5 py-3">Agent</th>
                  <th className="px-5 py-3">Team / Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-center">Active Tickets</th>
                  <th className="px-5 py-3 text-center">Resolved Today</th>
                  <th className="px-5 py-3">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredAgents.map(agent => (
                  <tr key={agent.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#64748B]">
                          <UserCircle size={20} />
                        </div>
                        <span className="text-[14px] font-medium text-[#0F172A]">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-[#334155]">{agent.team}</span>
                        <span className="text-[12px] text-[#64748B]">{agent.role}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("w-2 h-2 rounded-full",
                          agent.status === 'online' ? "bg-emerald-500" :
                            agent.status === 'busy' ? "bg-red-500" :
                              agent.status === 'away' ? "bg-amber-500" : "bg-slate-300"
                        )} />
                        <span className="text-[13px] capitalize text-[#475569]">{agent.status}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-[14px] font-semibold text-[#0F172A]">{agent.active}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-[14px] font-semibold text-[#10B981]">{agent.resolvedToday}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all",
                            agent.capacity > 85 ? "bg-[#EF4444]" :
                              agent.capacity > 60 ? "bg-[#EAB308]" : "bg-[#10B981]"
                          )} style={{ width: `${agent.capacity}%` }} />
                        </div>
                        <span className="text-[12px] font-medium text-[#64748B] w-8">{agent.capacity}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAgents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#64748B] text-[13px]">
                      No agents found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Generate Report Modal */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Generate Workload Report</DialogTitle>
            <DialogDescription>
              Export a detailed report of team and agent workload.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Report Type</Label>
              <select className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950">
                <option>Summary (PDF)</option>
                <option>Detailed Activity (CSV)</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Time Range</Label>
              <select className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950">
                <option>Today</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportOpen(false)}>Cancel</Button>
            <Button className="bg-[#10B981] hover:bg-[#059669] text-white" onClick={() => { toast.success("Report generation started..."); setIsReportOpen(false); }}>Download Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
