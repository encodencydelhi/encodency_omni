"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

function Box({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-sm border border-slate-200 bg-white shadow-xs flex flex-col transition-all hover:shadow-md", className)}>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4">
        <h2 className="text-xs font-bold tracking-wider text-slate-800 uppercase">{title}</h2>
        {action && <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">{action}</div>}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">{children}</div>
    </section>
  );
}

export function AnalyticsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "acquisition" | "audience">("overview");
  const [timeRange, setTimeRange] = useState("30d");

  // Acquisition Data
  const channels = [
    { name: "Organic Search (Google)", visits: "12.8K", leads: 512, conv: 418, rate: "3.3%", change: "+14%" },
    { name: "Direct Traffic", visits: "6.2K", leads: 210, conv: 168, rate: "2.7%", change: "+8%" },
    { name: "Social Media (LinkedIn & Meta)", visits: "4.4K", leads: 184, conv: 142, rate: "3.2%", change: "+24%" },
    { name: "Referral & News Outlets", visits: "2.4K", leads: 92, conv: 74, rate: "3.1%", change: "-2%" },
    { name: "Paid Ads (Google / Meta)", visits: "1.8K", leads: 82, conv: 66, rate: "3.7%", change: "+45%" },
    { name: "Email Newsletters", visits: "720", leads: 34, conv: 28, rate: "3.9%", change: "+12%" },
  ];

  // Hourly Traffic Data
  const hourlyData = [
    { hour: "02:00", visits: 45 },
    { hour: "06:00", visits: 120 },
    { hour: "09:00", visits: 410 },
    { hour: "12:00", visits: 680 },
    { hour: "15:00", visits: 720 },
    { hour: "18:00", visits: 890 },
    { hour: "21:00", visits: 540 },
    { hour: "23:00", visits: 180 },
  ];

  // Geographic Data
  const geoData = [
    { region: "Delhi-NCR", visitors: "9,420", share: "38.0%", growth: "↑ 18%" },
    { region: "Uttarakhand (Dehradun, Haridwar)", visitors: "5,950", share: "24.0%", growth: "↑ 32%" },
    { region: "Maharashtra (Mumbai, Pune)", visitors: "3,470", share: "14.0%", growth: "↑ 12%" },
    { region: "Uttar Pradesh (Varanasi, Lucknow)", visitors: "2,980", share: "12.0%", growth: "↑ 22%" },
    { region: "International (NRI & Global NGOs)", visitors: "2,980", share: "12.0%", growth: "↑ 15%" },
  ];

  // Device & Platform Breakdown
  const deviceData = [
    { name: "Mobile Phones", value: 64, color: "#2563EB" },
    { name: "Desktop / PC", value: 31, color: "#7C3AED" },
    { name: "Tablets", value: 5, color: "#0D9488" },
  ];

  const browserData = [
    { name: "Chrome", share: "66.4%" },
    { name: "Safari (iOS/Mac)", share: "21.2%" },
    { name: "Edge", share: "7.8%" },
    { name: "Firefox & Other", share: "4.6%" },
  ];

  // Age Distribution
  const ageData = [
    { range: "18-24 (Students)", pct: 28 },
    { range: "25-34 (Young Professionals)", pct: 36 },
    { range: "35-44 (Corporate CSR)", pct: 20 },
    { range: "45-54 (Donors)", pct: 11 },
    { range: "55+ (Philanthropists)", pct: 5 },
  ];

  const exportReport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "Metric,Value,Period",
        `Total Visitors,24.8K,${timeRange}`,
        `Conversion Rate,3.4%,${timeRange}`,
        `Mobile Share,64%,${timeRange}`,
        `Top Region,Delhi-NCR (38%),${timeRange}`,
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `website_analytics_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Analytics Report downloaded!");
  };

  return (
    <div className="space-y-2 pt-1 bg-slate-50/30 p-1 rounded-sm">
      {/* Sub Tabs Navigation & Date Filter */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 px-2 pb-1 gap-2">
        <div className="flex gap-4">
          {(["overview", "acquisition", "audience"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={cn(
                "pb-1.5 text-xs font-bold capitalize border-b-2 transition-all cursor-pointer",
                activeSubTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {tab === "overview" ? "Overview & Funnel" : tab === "acquisition" ? "Traffic Acquisition" : "Audience Demographics"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-sm border border-slate-200 bg-white p-0.5 text-[10.5px] font-bold">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-2 py-0.5 rounded-xs transition-colors cursor-pointer",
                  timeRange === r ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={exportReport}
            className="flex h-7 items-center gap-1 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 px-2.5 text-[11px] font-bold text-slate-700 shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <Download className="size-3" /> Download Report
          </button>
        </div>
      </div>

      {/* OVERVIEW SUB-TAB */}
      {activeSubTab === "overview" && (
        <div className="space-y-2">
          {/* Conversion Funnel */}
          <Box title="Multi-Stage Conversion Funnel">
            <div className="p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-sm border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Stage 1: Visitors</span>
                  <b className="text-base font-bold text-slate-900 block mt-0.5">24,840</b>
                  <span className="text-[10px] text-slate-500">100% baseline</span>
                </div>
                <div className="p-2.5 rounded-sm border border-blue-200 bg-blue-50/50">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Stage 2: Programs Viewed</span>
                  <b className="text-base font-bold text-blue-900 block mt-0.5">11,280</b>
                  <span className="text-[10px] text-blue-600 font-bold">45.4% retention</span>
                </div>
                <div className="p-2.5 rounded-sm border border-purple-200 bg-purple-50/50">
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Stage 3: Form Opened</span>
                  <b className="text-base font-bold text-purple-900 block mt-0.5">2,640</b>
                  <span className="text-[10px] text-purple-600 font-bold">10.6% intent</span>
                </div>
                <div className="p-2.5 rounded-sm border border-emerald-200 bg-emerald-50/50">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Stage 4: Completed</span>
                  <b className="text-base font-bold text-emerald-900 block mt-0.5">862</b>
                  <span className="text-[10px] text-emerald-700 font-bold">3.4% overall conv.</span>
                </div>
              </div>
            </div>
          </Box>

          {/* Hourly Traffic Chart */}
          <Box title="Hourly Traffic Pattern (Peak Visitor Hours)">
            <div className="p-3">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderRadius: 6,
                        border: "1px solid #E2E8F0",
                        color: "#0F172A",
                        fontSize: 11,
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                        padding: "6px 10px",
                      }}
                      itemStyle={{ color: "#0F172A", fontSize: 11, fontWeight: 600 }}
                      labelStyle={{ color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 2 }}
                    />
                    <Bar dataKey="visits" fill="#2563EB" radius={[2, 2, 0, 0]} name="Hourly Traffic" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10.5px] text-slate-500 text-center mt-1 border-t border-slate-100 pt-2 font-medium">
                Peak visitor window occurs between <b>17:00 – 21:00 IST</b>. Best time to publish breaking announcements and live volunteer drives.
              </p>
            </div>
          </Box>
        </div>
      )}

      {/* ACQUISITION SUB-TAB */}
      {activeSubTab === "acquisition" && (
        <div className="space-y-2">
          <Box title="Acquisition Channels & Conversion Breakdown">
            <div className="overflow-x-auto [scrollbar-width:thin] px-3 py-1">
              <div className="grid min-w-[550px] grid-cols-[1.6fr_.9fr_.9fr_.9fr_.9fr_.6fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100 whitespace-nowrap">
                <span>Acquisition Channel</span>
                <span className="text-right">Sessions</span>
                <span className="text-right">Inbound Leads</span>
                <span className="text-right">Conversions</span>
                <span className="text-right">Conv. Rate</span>
                <span className="text-right">Growth</span>
              </div>
              {channels.map((c, i) => (
                <div
                  key={i}
                  className="grid min-w-[550px] grid-cols-[1.6fr_.9fr_.9fr_.9fr_.9fr_.6fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors whitespace-nowrap"
                >
                  <span className="font-bold text-slate-900 truncate">{c.name}</span>
                  <span className="text-right font-bold text-slate-900">{c.visits}</span>
                  <span className="text-right text-slate-600 font-medium">{c.leads}</span>
                  <span className="text-right font-bold text-emerald-700">{c.conv}</span>
                  <span className="text-right font-mono font-bold text-slate-900">{c.rate}</span>
                  <span className="text-right text-emerald-600 font-bold">{c.change}</span>
                </div>
              ))}
            </div>
          </Box>
        </div>
      )}

      {/* AUDIENCE SUB-TAB (HIGH PRIORITY IMPLEMENTATION) */}
      {activeSubTab === "audience" && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
            {/* Geographic Breakdown */}
            <Box title="Geographic Distribution (Top Indian States & NRI)" className="lg:col-span-7">
              <div className="p-3 space-y-2">
                {geoData.map((g, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-800">
                      <span>{g.region}</span>
                      <span>{g.visitors} ({g.share})</span>
                    </div>
                    <div className="h-1.5 w-full rounded-xs bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-xs bg-blue-600 transition-all duration-300"
                        style={{ width: g.share }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Box>

            {/* Device Breakdown Donut */}
            <Box title="Device & Hardware Share" className="lg:col-span-5">
              <div className="p-3 flex flex-col items-center justify-center">
                <div className="size-36 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deviceData}
                        innerRadius={36}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {deviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: 6,
                          border: "1px solid #E2E8F0",
                          color: "#0F172A",
                          fontSize: 11,
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                          padding: "6px 10px",
                        }}
                        itemStyle={{ color: "#0F172A", fontSize: 11, fontWeight: 600 }}
                        formatter={(val: unknown) => [`${val}%`, "Share"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-slate-900">64%</span>
                    <span className="text-[9px] text-slate-400 font-medium">Mobile</span>
                  </div>
                </div>

                <div className="flex gap-4 text-xs font-semibold text-slate-700 mt-2">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-xs bg-[#2563EB]" /> Mobile 64%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-xs bg-[#7C3AED]" /> Desktop 31%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-xs bg-[#0D9488]" /> Tablet 5%
                  </span>
                </div>
              </div>
            </Box>
          </div>

          {/* Age & Browser Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
            <Box title="Audience Age Demographics" className="lg:col-span-7">
              <div className="p-3">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                      <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                      <YAxis dataKey="range" type="category" tick={{ fontSize: 10, fill: "#475569" }} width={160} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: 6,
                          border: "1px solid #E2E8F0",
                          color: "#0F172A",
                          fontSize: 11,
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                          padding: "6px 10px",
                        }}
                        itemStyle={{ color: "#0F172A", fontSize: 11, fontWeight: 600 }}
                        labelStyle={{ color: "#475569", fontSize: 11, fontWeight: 700, marginBottom: 2 }}
                        formatter={(val: unknown) => [`${val}%`, "Audience Share"]}
                      />
                      <Bar dataKey="pct" fill="#9333EA" radius={[0, 2, 2, 0]} name="Audience %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Box>

            <Box title="Browser & Platform Share" className="lg:col-span-5">
              <div className="p-3 space-y-2.5 text-xs">
                {browserData.map((b, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-800">{b.name}</span>
                    <span className="font-mono font-bold text-slate-900">{b.share}</span>
                  </div>
                ))}
              </div>
            </Box>
          </div>
        </div>
      )}
    </div>
  );
}
