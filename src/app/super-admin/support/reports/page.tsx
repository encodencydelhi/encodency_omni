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

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#0F172A]">Reports & Insights</h2>
          <p className="text-[13px] text-[#64748B] mt-1">Analyze support performance metrics and team productivity</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-2 border-[#E2E8F0] text-[#475569]">
          <Download size={14} />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        <Card className="p-4 flex flex-col gap-2 shadow-sm border-[#E2E8F0] h-[104px] rounded-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <h3 className="text-[12px] font-medium">Total Tickets</h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50">
              <BarChart3 size={16} className="text-blue-600" />
            </div>
          </div>
          <span className="text-[24px] font-bold text-[#0F172A]">{totalTickets}</span>
          <p className="text-[11px] text-[#64748B] mt-auto">All time</p>
        </Card>
        <Card className="p-4 flex flex-col gap-2 shadow-sm border-[#E2E8F0] h-[104px] rounded-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <h3 className="text-[12px] font-medium">Resolution Rate</h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50">
              <CheckCircle size={16} className="text-emerald-600" />
            </div>
          </div>
          <span className="text-[24px] font-bold text-[#10B981]">{resolutionRate}%</span>
          <p className="text-[11px] text-[#64748B] mt-auto">{resolvedTickets} of {totalTickets} resolved</p>
        </Card>
        <Card className="p-4 flex flex-col gap-2 shadow-sm border-[#E2E8F0] h-[104px] rounded-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <h3 className="text-[12px] font-medium">Avg First Response</h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-amber-50">
              <Clock size={16} className="text-amber-600" />
            </div>
          </div>
          <span className="text-[24px] font-bold text-[#0F172A]">{avgResponseTime}</span>
          <p className="text-[11px] text-[#64748B] mt-auto">Target: 4h</p>
        </Card>
        <Card className="p-4 flex flex-col gap-2 shadow-sm border-[#E2E8F0] h-[104px] rounded-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <h3 className="text-[12px] font-medium">CSAT Score</h3>
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-violet-200 bg-violet-50">
              <TrendingUp size={16} className="text-violet-600" />
            </div>
          </div>
          <span className="text-[24px] font-bold text-[#10B981]">{satisfactionScore}</span>
          <p className="text-[11px] text-[#64748B] mt-auto">Customer satisfaction</p>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">By Category</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-[13px] text-[#475569]">{category}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
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

        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">By Priority</h3>
          <div className="flex flex-col gap-3">
            {["Urgent", "High", "Normal", "Low"].map(priority => {
              const count = priorityBreakdown[priority] || 0;
              const colors = {
                Urgent: "bg-[#EF4444]",
                High: "bg-[#F97316]",
                Normal: "bg-[#3B82F6]",
                Low: "bg-[#94A3B8]"
              };
              return (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", colors[priority as keyof typeof colors])} />
                    <span className="text-[13px] text-[#475569]">{priority}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
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

        <Card className="p-5 border-[#E2E8F0] shadow-sm rounded-sm">
          <h3 className="text-[14px] font-semibold text-[#0F172A] mb-4">By Source Channel</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(sourceBreakdown).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-[13px] text-[#475569]">{source}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
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
