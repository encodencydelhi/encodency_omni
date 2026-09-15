"use client";

import { useState } from "react";
import {
  UsersRound,
  TrendingUp,
  Target,
  FileText,
  Clock,
  Star,
  Globe2,
  CheckCircle2,
  Zap,
  Activity,
  Shield,
  Sparkles,
  Plus,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils/cn";
import { TabKey } from "./types";

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

function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral" | "info";
  className?: string;
}) {
  const styles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    neutral: "bg-slate-50 text-slate-700 border-slate-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span className={cn("inline-flex items-center justify-center rounded-sm border px-2 py-0.5 text-[10px] font-bold shrink-0 not-italic", styles[tone], className)}>
      {children}
    </span>
  );
}

interface OverviewTabProps {
  onTabChange: (tab: TabKey) => void;
}

export function OverviewTab({ onTabChange }: OverviewTabProps) {
  const [trafficRange, setTrafficRange] = useState("30d");

  const stats = [
    { label: "Total Visitors", value: "24.8K", trend: "↑ 28%", note: "vs last month", icon: UsersRound, bg: "bg-blue-50/80 border-blue-200/80", iconBg: "bg-blue-600 text-white shadow-xs", trendColor: "text-blue-700" },
    { label: "Sessions", value: "32.1K", trend: "↑ 24%", note: "vs last month", icon: TrendingUp, bg: "bg-purple-50/80 border-purple-200/80", iconBg: "bg-purple-600 text-white shadow-xs", trendColor: "text-purple-700" },
    { label: "Conversion Rate", value: "3.4%", trend: "↑ 18%", note: "high conversion", icon: Target, bg: "bg-emerald-50/80 border-emerald-200/80", iconBg: "bg-emerald-600 text-white shadow-xs", trendColor: "text-emerald-700" },
    { label: "Form Submissions", value: "862", trend: "↑ 32%", note: "inbound leads", icon: FileText, bg: "bg-amber-50/80 border-amber-200/80", iconBg: "bg-amber-600 text-white shadow-xs", trendColor: "text-amber-700" },
    { label: "Avg. Engagement", value: "2m 36s", trend: "↑ 14%", note: "time on site", icon: Clock, bg: "bg-indigo-50/80 border-indigo-200/80", iconBg: "bg-indigo-600 text-white shadow-xs", trendColor: "text-indigo-700" },
    { label: "Website Health", value: "92/100", trend: "↑ 4%", note: "excellent rating", icon: Star, bg: "bg-emerald-50/80 border-emerald-200/80", iconBg: "bg-emerald-600 text-white shadow-xs", trendColor: "text-emerald-700" },
  ];

  const trafficData30d = [
    { date: "Mar 15", visitors: 580, sessions: 720 },
    { date: "Mar 18", visitors: 640, sessions: 810 },
    { date: "Mar 21", visitors: 710, sessions: 890 },
    { date: "Mar 24", visitors: 680, sessions: 840 },
    { date: "Mar 27", visitors: 820, sessions: 1040 },
    { date: "Mar 30", visitors: 940, sessions: 1190 },
    { date: "Apr 02", visitors: 890, sessions: 1120 },
    { date: "Apr 05", visitors: 1020, sessions: 1310 },
    { date: "Apr 08", visitors: 1140, sessions: 1480 },
    { date: "Apr 11", visitors: 1080, sessions: 1390 },
    { date: "Apr 14", visitors: 1240, sessions: 1610 },
  ];

  const quickActions = [
    { label: "Landing Pages", icon: Globe2, color: "text-amber-600", bg: "hover:bg-amber-50/60", onClick: () => onTabChange("landing-pages") },
    { label: "Create Website Page", icon: Plus, color: "text-blue-600", bg: "hover:bg-blue-50/60", onClick: () => onTabChange("pages") },
    { label: "Form Submissions", icon: FileText, color: "text-purple-600", bg: "hover:bg-purple-50/60", onClick: () => onTabChange("forms") },
    { label: "SEO Keyword Audit", icon: Zap, color: "text-emerald-600", bg: "hover:bg-emerald-50/60", onClick: () => onTabChange("seo") },
    { label: "SSL & DNS Settings", icon: Shield, color: "text-rose-600", bg: "hover:bg-rose-50/60", onClick: () => onTabChange("settings") },
    { label: "Uptime Monitoring", icon: Activity, color: "text-cyan-600", bg: "hover:bg-cyan-50/60", onClick: () => onTabChange("monitoring") },
  ];

  const latencyData = [
    { hour: "00:00", ms: 112 },
    { hour: "04:00", ms: 108 },
    { hour: "08:00", ms: 134 },
    { hour: "12:00", ms: 142 },
    { hour: "16:00", ms: 128 },
    { hour: "20:00", ms: 119 },
    { hour: "Now", ms: 115 },
  ];

  return (
    <div className="space-y-2 pt-1 bg-slate-50/30 p-1 rounded-sm">
      {/* Real-time status banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-sm border border-blue-200/80 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-3">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
          </span>
          <div>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              Real-Time Activity: <b className="text-blue-700">38 Live Visitors</b> on namogangetrust.org
            </span>
            <p className="text-[10px] text-slate-500">
              Top active page: <span className="font-mono text-blue-600 font-semibold">/events/youth-leadership-summit-2025</span> (14 active)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTabChange("analytics")}
            className="flex items-center gap-1 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            Audience Analytics →
          </button>
        </div>
      </div>

      {/* 6 Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {stats.map((s, i) => (
          <div key={i} className={cn("flex flex-col justify-between rounded-sm border p-3 bg-white shadow-2xs transition-all hover:shadow-sm", s.bg)}>
            <div className="flex items-center justify-between mb-2">
              <span className={cn("grid size-8 place-items-center rounded-sm", s.iconBg)}>
                <s.icon className="size-4" />
              </span>
              <span className={cn("text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-sm bg-white/90 border border-slate-200/60", s.trendColor)}>
                {s.trend}
              </span>
            </div>
            <div>
              <p className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
              <b className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{s.value}</b>
              <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">{s.note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {quickActions.map((qa, i) => (
          <button
            key={i}
            onClick={qa.onClick}
            className={cn(
              "flex items-center gap-2 p-2 rounded-sm border border-slate-200 bg-white text-left transition-all hover:border-slate-300 shadow-2xs cursor-pointer",
              qa.bg
            )}
          >
            <qa.icon className={cn("size-4 shrink-0", qa.color)} />
            <span className="text-[11px] font-bold text-slate-700 truncate">{qa.label}</span>
          </button>
        ))}
      </div>

      {/* Row 3: Traffic Chart & AI Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        {/* Traffic Chart */}
        <Box
          title="Website Traffic Overview (Visitors vs. Sessions)"
          className="lg:col-span-8"
          action={
            <div className="flex items-center gap-1 text-[11px]">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTrafficRange(r)}
                  className={cn(
                    "px-2 py-0.5 rounded-xs font-bold uppercase transition-colors cursor-pointer",
                    trafficRange === r ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          }
        >
          <div className="p-3">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficData30d}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
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
                  <Line type="monotone" dataKey="visitors" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} name="Unique Visitors" />
                  <Line type="monotone" dataKey="sessions" stroke="#9333EA" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 2 }} name="Total Sessions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center items-center gap-6 mt-1 text-[11px] font-semibold text-slate-600 border-t border-slate-100 pt-2">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-600" /> Unique Visitors (24,840)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-purple-600" /> Total Sessions (32,150)
              </span>
            </div>
          </div>
        </Box>

        {/* AI Quick Insights Box */}
        <Box title="AI Quick Insights" className="lg:col-span-4">
          <div className="p-3 space-y-2.5">
            <div className="rounded-sm border border-purple-200 bg-purple-50/60 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <Sparkles className="size-3.5 text-purple-600" /> Donation Page High Intent
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Visitors from LinkedIn campaigns are converting <b>2.4x higher</b> on the Clean Ganga donation appeal. Recommend increasing ad allocation.
              </p>
            </div>

            <div className="rounded-sm border border-blue-200 bg-blue-50/60 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <TrendingUp className="size-3.5 text-blue-600" /> Organic Keyword Jump
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                The keyword &quot;riverfront cleaning volunteer drive&quot; climbed <b>+5 positions</b> into the Google Top 3 this week.
              </p>
            </div>

            <div className="rounded-sm border border-emerald-200 bg-emerald-50/60 p-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> Server Edge Latency
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Global edge cache hit ratio is at <b>98.4%</b> with average response time under 120ms.
              </p>
            </div>
          </div>
        </Box>
      </div>

      {/* Row 4: Server Latency & Competitor Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
        <Box title="Server Edge Latency (Last 24 Hours)" className="lg:col-span-6">
          <div className="p-3">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} tickLine={false} axisLine={false} unit="ms" />
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
                  <Line type="monotone" dataKey="ms" stroke="#10B981" strokeWidth={2} dot={{ r: 2 }} name="Latency (ms)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-center text-[10.5px] font-bold text-slate-500 border-t border-slate-100 pt-2 mt-1">
              <span>Avg: 118ms</span>
              <span>Min: 108ms</span>
              <span>Max: 142ms</span>
              <span className="text-emerald-600">Status: Optimal (99.98%)</span>
            </div>
          </div>
        </Box>

        <Box title="Competitor Organic Benchmark" className="lg:col-span-6">
          <div className="p-3 space-y-2">
            {[
              { name: "Namo Gange Trust (You)", domain: "namogangetrust.org", traffic: "24.8K", keywords: "482", authority: 42, isYou: true },
              { name: "Clean Ganga Mission (NMCG)", domain: "nmcg.nic.in", traffic: "82.4K", keywords: "1.2K", authority: 64, isYou: false },
              { name: "Ganga Action Parivar", domain: "gangaaction.org", traffic: "18.2K", keywords: "310", authority: 38, isYou: false },
              { name: "Water Aid India", domain: "wateraid.org/in", traffic: "45.1K", keywords: "890", authority: 58, isYou: false },
            ].map((c, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between p-2 rounded-sm border text-xs",
                  c.isYou ? "border-blue-200 bg-blue-50/50 font-bold" : "border-slate-100 bg-white"
                )}
              >
                <div>
                  <span className={cn("text-xs", c.isYou ? "text-blue-900 font-bold" : "text-slate-800 font-semibold")}>
                    {c.name}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono">{c.domain}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[11px] font-bold text-slate-900 block">{c.traffic}</span>
                    <span className="text-[9.5px] text-slate-400">Monthly</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-900 block">{c.keywords}</span>
                    <span className="text-[9.5px] text-slate-400">Keywords</span>
                  </div>
                  <Badge tone={c.isYou ? "info" : "neutral"} className="w-[52px] justify-center">DA {c.authority}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 5: Connected Domains */}
      <Box title="Connected Production Domains">
        <div className="overflow-x-auto [scrollbar-width:thin] px-3 py-1">
          <div className="grid min-w-[550px] grid-cols-[1.5fr_1.5fr_.8fr_.8fr_.8fr_1fr_.4fr] gap-2 py-2 text-[10.5px] font-bold text-slate-400 uppercase border-b border-slate-100 whitespace-nowrap">
            <span>Website</span><span>Domain</span><span>Status</span><span>SSL</span><span>Uptime</span><span>Last Sync</span><span className="text-right">Actions</span>
          </div>
          {[
            { name: "Namo Gange Trust Official", domain: "namogangetrust.org", status: "Active", ssl: "TLS 1.3 Active", uptime: "99.98%", sync: "Just now" },
            { name: "Clean Ganga Campaign Portal", domain: "cleanganga.namogangetrust.org", status: "Active", ssl: "TLS 1.3 Active", uptime: "99.95%", sync: "2m ago" },
          ].map((w, i) => (
            <div key={i} className="grid min-w-[550px] grid-cols-[1.5fr_1.5fr_.8fr_.8fr_.8fr_1fr_.4fr] gap-2 items-center border-b border-slate-50 py-2.5 text-xs hover:bg-slate-50/80 transition-colors whitespace-nowrap">
              <span className="flex items-center gap-2 font-bold text-slate-900 truncate">
                <Globe2 className="size-3.5 text-blue-600 shrink-0" />
                {w.name}
              </span>
              <span className="text-blue-600 font-medium hover:underline cursor-pointer truncate">{w.domain}</span>
              <span><Badge tone="success" className="w-[60px] justify-center">{w.status}</Badge></span>
              <span className="flex items-center gap-1 text-emerald-700 font-semibold"><CheckCircle2 className="size-3 text-emerald-600" /> {w.ssl}</span>
              <span className="text-slate-700 font-bold">{w.uptime}</span>
              <span className="text-slate-500 font-medium">{w.sync}</span>
              <span className="flex justify-end">
                <button onClick={() => onTabChange("settings")} className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer">
                  Manage
                </button>
              </span>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}
