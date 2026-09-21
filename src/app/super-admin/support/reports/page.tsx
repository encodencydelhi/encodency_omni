"use client";

import React from "react";
import { useSupport } from "@/features/support-tickets/data/mock-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { 
  BarChart3, Download, TrendingUp, Clock, 
  Users, CheckCircle, AlertTriangle, ArrowUpRight 
} from "lucide-react";

export default function ReportsInsightsPage() {
  const { tickets, teams, escalations } = useSupport();

  const totalTickets = tickets.length;
  const resolvedTickets = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
  
  const avgResponseTime = "4.2h";
  const avgResolutionTime = "18.5h";
  const satisfactionScore = "92%";

  const categoryBreakdown = tickets.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityBreakdown = tickets.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sourceBreakdown = tickets.reduce((acc, t) => {
    acc[t.sourceChannel] = (acc[t.sourceChannel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const otherCatCount = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0) - topCategories.reduce((a, b) => a + b[1], 0);
  if (otherCatCount > 0) topCategories.push(["Other", otherCatCount]);

  const priorityList: [string, number][] = ["Urgent", "High", "Normal", "Low"].map(p => [p, priorityBreakdown[p] || 0]);

  const topSources = Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const otherSrcCount = Object.values(sourceBreakdown).reduce((a, b) => a + b, 0) - topSources.reduce((a, b) => a + b[1], 0);
  if (otherSrcCount > 0) topSources.push(["Other", otherSrcCount]);

  return (
    <div className="flex flex-col gap-2 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">Reports & Insights</h2>
          <p className="text-[13px] text-[#64748B] mt-1">Analyze support performance metrics and team productivity</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-2 border-[#E2E8F0] text-[#475569]" onClick={() => {
          const header = "Team,Active Tickets,Resolved,Avg Response,Load Status\n";
          const rows = teams.map(team => {
            const teamTickets = tickets.filter(t => t.assignedTeamId === team.id);
            const active = teamTickets.filter(t => t.status !== "Resolved" && t.status !== "Closed").length;
            const resolved = teamTickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
            return `${team.name},${active},${resolved},4.2h,${active > 5 ? "High" : "Normal"}`;
          }).join("\n");
          const blob = new Blob([header + rows], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = `support-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
        }}>
          <Download size={14} />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Card className="p-3 flex flex-col gap-1 shadow-sm border-[#E2E8F0] rounded-sm overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-medium text-[#64748B] truncate">Total Tickets</h3>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-blue-50">
              <BarChart3 size={14} className="text-blue-600" />
            </div>
          </div>
          <span className="text-[22px] font-bold text-[#0F172A] leading-tight">{totalTickets}</span>
          <p className="text-[11px] text-[#64748B] truncate">All time</p>
        </Card>
        <Card className="p-3 flex flex-col gap-1 shadow-sm border-[#E2E8F0] rounded-sm overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-medium text-[#64748B] truncate">Resolution Rate</h3>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50">
              <CheckCircle size={14} className="text-emerald-600" />
            </div>
          </div>
          <span className="text-[22px] font-bold text-[#10B981] leading-tight">{resolutionRate}%</span>
          <p className="text-[11px] text-[#64748B] truncate">{resolvedTickets} of {totalTickets} resolved</p>
        </Card>
        <Card className="p-3 flex flex-col gap-1 shadow-sm border-[#E2E8F0] rounded-sm overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-medium text-[#64748B] truncate">Avg First Response</h3>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-amber-200 bg-amber-50">
              <Clock size={14} className="text-amber-600" />
            </div>
          </div>
          <span className="text-[22px] font-bold text-[#0F172A] leading-tight">{avgResponseTime}</span>
          <p className="text-[11px] text-[#64748B] truncate">Target: 4h</p>
        </Card>
        <Card className="p-3 flex flex-col gap-1 shadow-sm border-[#E2E8F0] rounded-sm overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-medium text-[#64748B] truncate">CSAT Score</h3>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50">
              <TrendingUp size={14} className="text-violet-600" />
            </div>
          </div>
          <span className="text-[22px] font-bold text-[#10B981] leading-tight">{satisfactionScore}</span>
          <p className="text-[11px] text-[#64748B] truncate">Customer satisfaction</p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm h-[280px] flex flex-col">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">By Category</h3>
          <div className="flex flex-col gap-3 flex-1">
            {topCategories.map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-[12px] text-[#475569] truncate flex-1 mr-2">{category}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#3B82F6] rounded-full" 
                      style={{ width: `${(count / totalTickets) * 100}%` }} 
                    />
                  </div>
                  <span className="text-[12px] font-semibold text-[#0F172A] w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm h-[280px] flex flex-col">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">By Priority</h3>
          <div className="flex flex-col gap-3 flex-1">
            {priorityList.map(([priority, count]) => {
              const colors = {
                Urgent: "bg-[#EF4444]",
                High: "bg-[#F97316]",
                Normal: "bg-[#3B82F6]",
                Low: "bg-[#94A3B8]"
              };
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <div className={cn("w-2 h-2 shrink-0 rounded-full", colors[priority as keyof typeof colors])} />
                    <span className="text-[12px] text-[#475569] truncate">{priority}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-20 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", colors[priority as keyof typeof colors])}
                        style={{ width: `${(count / totalTickets) * 100}%` }} 
                      />
                    </div>
                    <span className="text-[12px] font-semibold text-[#0F172A] w-6 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm h-[280px] flex flex-col">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">By Source Channel</h3>
          <div className="flex flex-col gap-3 flex-1">
            {topSources.map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-[12px] text-[#475569] truncate flex-1 mr-2">{source}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#8B5CF6] rounded-full" 
                      style={{ width: `${(count / totalTickets) * 100}%` }} 
                    />
                  </div>
                  <span className="text-[12px] font-semibold text-[#0F172A] w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
        <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">Team Performance</h3>
        <div className="border border-[#E2E8F0] rounded-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="text-left text-[#475569] font-semibold text-[12px] h-9 px-4">Team</th>
                <th className="text-left text-[#475569] font-semibold text-[12px] h-9 px-4">Active Tickets</th>
                <th className="text-left text-[#475569] font-semibold text-[12px] h-9 px-4">Resolved</th>
                <th className="text-left text-[#475569] font-semibold text-[12px] h-9 px-4">Avg Response</th>
                <th className="text-left text-[#475569] font-semibold text-[12px] h-9 px-4">Load Status</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(team => {
                const teamTickets = tickets.filter(t => t.assignedTeamId === team.id);
                const active = teamTickets.filter(t => t.status !== "Resolved" && t.status !== "Closed").length;
                const resolved = teamTickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
                const isOverloaded = active > 5;

                return (
                  <tr key={team.id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 text-[13px] font-medium text-[#0F172A]">{team.name}</td>
                    <td className="py-2.5 px-4 text-[13px] text-[#475569]">{active}</td>
                    <td className="py-2.5 px-4 text-[13px] text-[#10B981] font-medium">{resolved}</td>
                    <td className="py-2.5 px-4 text-[13px] text-[#475569]">{avgResponseTime}</td>
                    <td className="py-2.5 px-4">
                      <span className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded-sm",
                        isOverloaded ? "text-[#EF4444] bg-[#FEE2E2]" : "text-[#10B981] bg-[#D1FAE5]"
                      )}>
                        {isOverloaded ? "High" : "Normal"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
