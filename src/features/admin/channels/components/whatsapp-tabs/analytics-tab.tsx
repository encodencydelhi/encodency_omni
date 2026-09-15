"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Download,
  Send,
  Eye,
  CornerUpLeft,
  MousePointerClick,
  Target,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const trendData = [
  { d: "Mar 15", sent: 300, delivered: 280, read: 200, replied: 80 },
  { d: "Mar 20", sent: 500, delivered: 480, read: 350, replied: 150 },
  { d: "Mar 25", sent: 450, delivered: 420, read: 300, replied: 120 },
  { d: "Mar 30", sent: 800, delivered: 760, read: 550, replied: 200 },
  { d: "Apr 5", sent: 900, delivered: 880, read: 650, replied: 250 },
  { d: "Apr 10", sent: 1100, delivered: 1050, read: 800, replied: 300 },
  { d: "Apr 14", sent: 1200, delivered: 1150, read: 900, replied: 350 },
];

const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  messages: Math.floor(Math.random() * 400 + 50 + (i >= 9 && i <= 21 ? 300 : 0)),
}));

const templatePerformance = [
  { name: "event_reminder", rate: 82 },
  { name: "volunteer_invite", rate: 76 },
  { name: "donation_thanks", rate: 71 },
  { name: "welcome_message", rate: 68 },
  { name: "campaign_update", rate: 64 },
];

const typeDistribution = [
  { name: "Marketing", value: 5480, color: "#EC4899" },
  { name: "Utility", value: 4920, color: "#3B82F6" },
  { name: "Authentication", value: 830, color: "#8B5CF6" },
];

const campaignPerformance = [
  { name: "World Water Day 2025", sent: 2480, delivered: "97.2%", read: "82.2%", replied: "25.0%", clicks: 342, conversions: 89, roi: "340%" },
  { name: "Volunteer Drive 2025", sent: 1920, delivered: "97.4%", read: "75.9%", replied: "25.0%", clicks: 284, conversions: 67, roi: "290%" },
  { name: "Donation Appeal", sent: 1240, delivered: "97.1%", read: "82.4%", replied: "25.5%", clicks: 198, conversions: 54, roi: "420%" },
  { name: "Community Updates", sent: 980, delivered: "97.2%", read: "76.6%", replied: "21.7%", clicks: 156, conversions: 32, roi: "180%" },
  { name: "Tree Plantation Drive", sent: 800, delivered: "97.5%", read: "79.5%", replied: "23.1%", clicks: 124, conversions: 28, roi: "210%" },
];

const funnelSteps = [
  { label: "Sent", value: 12482, pct: "100%" },
  { label: "Delivered", value: 10842, pct: "86.9%", drop: "-13.1%" },
  { label: "Read", value: 8421, pct: "67.5%", drop: "-22.4%" },
  { label: "Replied", value: 2845, pct: "22.8%", drop: "-46.2%" },
  { label: "Clicked", value: 1560, pct: "12.5%", drop: "-45.2%" },
  { label: "Converted", value: 420, pct: "3.4%", drop: "-73.1%" },
];

function Box({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs flex flex-col", className)}>
      <header className="flex h-11 shrink-0 items-center border-b border-slate-100 bg-slate-50/50 px-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">{title}</h2>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">{children}</div>
    </section>
  );
}

export function AnalyticsTab() {
  const [dateRange, setDateRange] = useState("30d");

  const handleExport = () => {
    toast.success("Downloading Analytics CSV Report...", {
      description: "Includes message performance, engagement rates and conversion funnel data.",
    });
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="h-10 w-40 text-xs border-slate-200 rounded-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger className="h-10 w-44 text-xs border-slate-200 rounded-sm"><SelectValue placeholder="Campaign" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              <SelectItem value="world-water">World Water Day</SelectItem>
              <SelectItem value="volunteer">Volunteer Drive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExport} variant="outline" className="h-10 px-4 text-xs font-bold border-slate-200 rounded-sm flex items-center gap-1.5">
          <Download className="size-4 text-slate-600" /> Export CSV Report
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Messages", value: "12,482", trend: "↑ 28%", icon: Send, color: "bg-blue-50 text-blue-600 border-blue-100" },
          { label: "Delivery Rate", value: "96.5%", trend: "↑ 1.2%", icon: Send, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
          { label: "Read Rate", value: "77.6%", trend: "↑ 3.4%", icon: Eye, color: "bg-blue-50 text-blue-600 border-blue-100" },
          { label: "Reply Rate", value: "26.2%", trend: "↑ 2.1%", icon: CornerUpLeft, color: "bg-purple-50 text-purple-600 border-purple-100" },
          { label: "Click Rate", value: "12.8%", trend: "↑ 1.8%", icon: MousePointerClick, color: "bg-amber-50 text-amber-600 border-amber-100" },
          { label: "Conversion Rate", value: "4.2%", trend: "↑ 0.6%", icon: Target, color: "bg-teal-50 text-teal-600 border-teal-100" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-sm border border-slate-200/90 bg-white p-3.5 shadow-xs">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-sm font-bold", s.color)}>
              <s.icon className="size-4" />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <div className="flex items-baseline gap-1.5">
                <b className="text-lg font-bold text-slate-900">{s.value}</b>
                <span className="text-xs font-bold text-emerald-600">{s.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Box title="Message Trends Over Time">
          <div className="p-4">
            <div className="mb-3 flex gap-4 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-emerald-500" />Sent</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-blue-500" />Delivered</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-purple-500" />Read</span>
              <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-amber-500" />Replied</span>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }} />
                <Line type="monotone" dataKey="sent" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="delivered" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="read" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="replied" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Box>

        <Box title="Hourly Messaging Traffic">
          <div className="p-4">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#64748B" }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }} />
                <Bar dataKey="messages" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={9} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Box>
      </div>

      {/* Row 3: Templates & Type Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Box title="Top Performing Templates">
          <div className="p-4">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={templatePerformance} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #E2E8F0" }} formatter={(v) => [`${v}%`, "Engagement"]} />
                <Bar dataKey="rate" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Box>

        <Box title="Message Category Breakdown">
          <div className="flex items-center px-5 py-4">
            <div className="relative size-[145px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeDistribution} dataKey="value" innerRadius={50} outerRadius={70} strokeWidth={0}>
                    {typeDistribution.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <b className="block text-lg font-bold text-slate-900 leading-none">11,230</b>
                  <small className="text-[10px] font-semibold text-slate-400 uppercase">Total</small>
                </div>
              </div>
            </div>
            <div className="ml-6 flex-1 space-y-3">
              {typeDistribution.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-slate-600">
                    <i className="size-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </span>
                  <div className="text-right">
                    <span className="block font-bold text-slate-900">{d.value.toLocaleString()}</span>
                    <span className="text-[10px] font-medium text-slate-400">{((d.value / 11230) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Box>
      </div>

      {/* Campaign Performance Table */}
      <Box title="Campaign Performance Analysis">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Campaign</th>
                <th className="px-3 py-3 text-right">Sent</th>
                <th className="px-3 py-3 text-right">Delivered</th>
                <th className="px-3 py-3 text-right">Read</th>
                <th className="px-3 py-3 text-right">Replied</th>
                <th className="px-3 py-3 text-right">Clicks</th>
                <th className="px-3 py-3 text-right">Conversions</th>
                <th className="px-3 py-3 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaignPerformance.map((c) => (
                <tr key={c.name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{c.name}</td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.sent.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.delivered}</td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.read}</td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.replied}</td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.clicks}</td>
                  <td className="px-3 py-3 text-right text-slate-600 font-medium">{c.conversions}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="rounded-sm bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {c.roi}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      {/* Conversion Funnel */}
      <Box title="WhatsApp Conversion Funnel">
        <div className="flex flex-wrap items-center justify-center gap-3 p-5">
          {funnelSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="text-center">
                <div
                  className={cn(
                    "mx-auto mb-1 flex flex-col items-center justify-center rounded-sm border-2 px-5 py-3 shadow-xs min-w-[110px]",
                    i === 0 ? "border-blue-300 bg-blue-50/80 text-blue-900" :
                      i === 1 ? "border-emerald-300 bg-emerald-50/80 text-emerald-900" :
                        i === 2 ? "border-purple-300 bg-purple-50/80 text-purple-900" :
                          i === 3 ? "border-amber-300 bg-amber-50/80 text-amber-900" :
                            i === 4 ? "border-rose-300 bg-rose-50/80 text-rose-900" :
                              "border-teal-300 bg-teal-50/80 text-teal-900"
                  )}
                >
                  <b className="block text-base font-bold text-slate-900">{step.value.toLocaleString()}</b>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{step.pct}</span>
                </div>
                <p className="text-xs font-bold text-slate-900">{step.label}</p>
                {step.drop && <p className="text-[10px] font-bold text-rose-600">{step.drop}</p>}
              </div>
              {i < funnelSteps.length - 1 && <ArrowRight className="size-4 text-slate-400 shrink-0" />}
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}
