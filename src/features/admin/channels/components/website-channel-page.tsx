"use client";

import { useState } from "react";
import {
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
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Clock4,
  Download,
  FileText,
  Globe2,
  Layout,
  Plus,
  SearchCheck,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  UsersRound,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  BarChart3,
  Activity,
  Shield,
  Zap,
  Search,
  Tag,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ─── TAB DATA ─── */
const TABS = [
  { key: "overview", label: "Overview" },
  { key: "pages", label: "Pages" },
  { key: "landing-pages", label: "Landing Pages" },
  { key: "forms", label: "Forms" },
  { key: "analytics", label: "Analytics" },
  { key: "seo", label: "SEO" },
  { key: "monitoring", label: "Monitoring" },
  { key: "settings", label: "Settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ─── SHARED BOX COMPONENT ─── */
function Box({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-sm border border-[#DDE4ED] bg-white shadow-sm flex flex-col", className)}>
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#E8EDF3] px-3">
        <h2 className="text-[12px] font-semibold text-[#172044]">{title}</h2>
        {action && <div className="text-[12px] font-semibold text-[#71809D] flex items-center gap-1">{action}</div>}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">{children}</div>
    </section>
  );
}

/* ─── STATUS BADGE ─── */
function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "success" | "warning" | "danger" | "neutral" | "info" }) {
  const styles: Record<string, string> = {
    success: "bg-[#DCFCE7] text-[#15803D]",
    warning: "bg-[#FEF3C7] text-[#D97706]",
    danger: "bg-[#FFE8EA] text-[#EA111B]",
    neutral: "bg-[#F1F5F9] text-[#64748B]",
    info: "bg-[#E0F2FE] text-[#0284C7]",
  };
  return <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[12px] font-semibold", styles[tone])}>{children}</span>;
}

/* ═══════════════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════════════ */
function OverviewTab() {
  const stats = [
    { label: "Total Visitors", value: "24.8K", trend: "↑ 28%", note: "+ 5.4K from last month", icon: UsersRound, color: "bg-[#EAF2FF] text-[#3186F3]" },
    { label: "Sessions", value: "32.1K", trend: "↑ 24%", note: "+ 6.2K from last month", icon: TrendingUp, color: "bg-[#F2EAFF] text-[#805AD5]" },
    { label: "Conversion Rate", value: "3.4%", trend: "↑ 18%", note: "+ 0.5% from last month", icon: Target, color: "bg-[#EAF5EF] text-[#25D366]" },
    { label: "Form Submissions", value: "862", trend: "↑ 32%", note: "+ 210 from last month", icon: FileText, color: "bg-[#FFE8EA] text-[#EA111B]" },
    { label: "Avg. Engagement", value: "2m 36s", trend: "↑ 14%", note: "+ 18s from last month", icon: Clock, color: "bg-[#FFF0DC] text-[#F28C28]" },
    { label: "Website Health", value: "88/100", trend: "↑ 6%", note: "+ 5 points from last month", icon: Star, color: "bg-[#EAF2FF] text-[#3186F3]" },
  ];

  const trafficData = [
    { d: "Mar 15", visitors: 1100, sessions: 1300, conversions: 40 },
    { d: "Mar 20", visitors: 1200, sessions: 1450, conversions: 45 },
    { d: "Mar 25", visitors: 1400, sessions: 1700, conversions: 55 },
    { d: "Mar 30", visitors: 1700, sessions: 2100, conversions: 70 },
    { d: "Apr 5", visitors: 1900, sessions: 2400, conversions: 80 },
    { d: "Apr 10", visitors: 2200, sessions: 2800, conversions: 95 },
    { d: "Apr 14", visitors: 2500, sessions: 3200, conversions: 110 },
  ];

  const sourceData = [
    { name: "Organic Search", value: 42.3, color: "#3186F3" },
    { name: "Direct", value: 24.1, color: "#8B5CF6" },
    { name: "Social Media", value: 14.8, color: "#06B6D4" },
    { name: "Referral", value: 8.6, color: "#10B981" },
    { name: "Paid Campaigns", value: 6.2, color: "#F59E0B" },
    { name: "Email", value: 2.4, color: "#F43F5E" },
    { name: "Others", value: 1.6, color: "#64748B" },
  ];

  const topPages = [
    { name: "Home", views: "8.4K", time: "2m 12s", bounce: "42%", conv: "3.2%", up: true },
    { name: "Our Work", views: "4.8K", time: "1m 48s", bounce: "46%", conv: "2.8%", up: true },
    { name: "Donate", views: "4.2K", time: "2m 36s", bounce: "38%", conv: "6.4%", up: true },
    { name: "Volunteer", views: "3.1K", time: "1m 52s", bounce: "44%", conv: "4.1%", up: false },
    { name: "About Us", views: "2.6K", time: "1m 28s", bounce: "52%", conv: "1.9%", up: false },
  ];

  const funnelData = [
    { stage: "Homepage Visits", count: "24,842", pct: "100%", color: "bg-[#60A5FA]" },
    { stage: "Service Page Visits", count: "8,620", pct: "34.7%", color: "bg-[#818CF8]" },
    { stage: "Form Starts", count: "2,416", pct: "9.7%", color: "bg-[#A78BFA]" },
    { stage: "Form Submissions", count: "862", pct: "3.5%", color: "bg-[#F472B6]" },
    { stage: "Donations / Leads", count: "248", pct: "1.0%", color: "bg-[#FB7185]" },
  ];

  const needsAttention = [
    { icon: AlertTriangle, title: "High bounce rate on donation page", desc: "Bounce rate 78% (↑ 12%)", time: "2h ago", color: "text-[#EF4444]" },
    { icon: Clock4, title: "Slow mobile performance", desc: "LCP 4.2s (target < 2.5s)", time: "5h ago", color: "text-[#F59E0B]" },
    { icon: FileText, title: "Contact form drop-off", desc: "68% users leave before submitting", time: "6h ago", color: "text-[#EF4444]" },
    { icon: AlertTriangle, title: "Missing CTA on top page", desc: '"Our Impact" page has no CTA', time: "1d ago", color: "text-[#F59E0B]" },
    { icon: Target, title: "Homepage conversion dip", desc: "Conversion rate 2.1% (↓ 0.8%)", time: "1d ago", color: "text-[#EF4444]" },
  ];

  const deviceData = [
    { name: "Desktop", value: 58.4, color: "#3B82F6" },
    { name: "Mobile", value: 36.2, color: "#0EA5E9" },
    { name: "Tablet", value: 5.4, color: "#38BDF8" },
  ];

  const activity = [
    { title: "New lead from website", desc: "via Contact Form", time: "10 min ago", color: "bg-[#E0F2FE] text-[#0284C7]" },
    { title: "Landing page updated", desc: "/volunteer-campaign", time: "1h ago", color: "bg-[#EDE9FE] text-[#7C3AED]" },
    { title: "Form published", desc: "Event Registration Form", time: "3h ago", color: "bg-[#FFE4E6] text-[#E11D48]" },
    { title: "SEO fix deployed", desc: "Meta tags updated", time: "5h ago", color: "bg-[#DCFCE7] text-[#16A34A]" },
    { title: "Analytics sync completed", desc: "Website data updated", time: "6h ago", color: "bg-[#FEF3C7] text-[#D97706]" },
  ];

  const quickActions = [
    { icon: SearchCheck, label: "Run Site Audit", color: "text-[#3186F3]" },
    { icon: FileText, label: "View Pages", color: "text-[#3186F3]" },
    { icon: Layout, label: "Publish Banner", color: "text-[#3186F3]" },
    { icon: Plus, label: "Create Landing Page", color: "text-[#3186F3]" },
    { icon: UserPlus, label: "Manage Forms", color: "text-[#3186F3]" },
    { icon: Target, label: "Open Heatmap", color: "text-[#EA111B]" },
    { icon: Download, label: "Export Report", color: "text-[#3186F3]" },
    { icon: Globe2, label: "Website Settings", color: "text-[#3186F3]" },
  ];

  const connectedWebsites = [
    { name: "Namo Gange Trust (Main)", domain: "www.namogange.org", status: "Connected", ssl: "Valid", uptime: "99.9%", sync: "2 hours ago" },
    { name: "Clean Ganga Drive", domain: "www.cleanganga.org", status: "Connected", ssl: "Valid", uptime: "99.8%", sync: "4 hours ago" },
    { name: "Ganga Explorer", domain: "www.gangaexplorer.in", status: "Connected", ssl: "Valid", uptime: "99.9%", sync: "6 hours ago" },
  ];

  return (
    <div className="space-y-3 pb-8">
      {/* Row 1: Metrics */}
      <div className="grid grid-cols-6 gap-2">
        {stats.map((stat, i) => (
          <div key={i} className="flex min-h-[70px] items-center gap-3 rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_3px_rgb(47_44_42/0.035)]">
            <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-sm", stat.color)}><stat.icon className="size-[18px]" /></span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-[#52617D]">{stat.label}</p>
              <div className="flex items-baseline gap-1.5">
                <b className="text-[20px] font-semibold tracking-[-0.02em] text-[#142044]">{stat.value}</b>
                <span className="text-[12px] font-semibold whitespace-nowrap text-[#00A66A]">{stat.trend}</span>
              </div>
              <p className="text-[12px] text-[#71809D]">{stat.note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2 */}
      <div className="grid h-[240px] grid-cols-[2fr_1fr_1fr] gap-2">
        <Box title="Website Traffic" action={<button className="flex h-6 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5 text-[12px] font-semibold text-[#52617D]">Last 30 days <ChevronDown className="size-2.5" /></button>}>
          <div className="px-3 py-1 flex flex-col h-full">
            <div className="mb-2 flex gap-4 text-[12px] font-semibold text-[#52617D]">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#3186F3]" />Visitors</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#8B5CF6]" />Sessions</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-sm bg-[#EF4444]" />Conversions</span>
            </div>
            <div className="flex-1 min-h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#E8EDF3" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#71809D" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                  <Tooltip />
                  <Line type="monotone" dataKey="visitors" stroke="#3186F3" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="sessions" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="conversions" stroke="#EF4444" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Traffic Sources">
          <div className="flex h-[200px] items-center px-2">
            <div className="relative size-[115px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sourceData} dataKey="value" innerRadius={35} outerRadius={55} strokeWidth={0}>
                    {sourceData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[14px] text-[#172044]">32.1K</b>
                  <small className="text-[12px] leading-tight text-[#71809D]">Total Sessions</small>
                </span>
              </div>
            </div>
            <div className="ml-2 flex-1 space-y-1.5">
              {sourceData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[12px] font-semibold">
                  <span className="flex items-center gap-1.5 text-[#52617D]"><i className="size-1.5 rounded-sm" style={{ backgroundColor: d.color }} />{d.name}</span>
                  <span className="text-[#172044]">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Needs Attention" action={<span className="text-[#EB0711] cursor-pointer">View all</span>}>
          <div className="divide-y divide-[#EDF1F5]">
            {needsAttention.map((item, i) => (
              <div key={i} className="flex gap-2 p-2.5">
                <item.icon className={cn("size-3.5 mt-0.5", item.color)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[#172044] leading-tight">{item.title}</p>
                  <p className="text-[12px] text-[#71809D] mt-0.5">{item.desc}</p>
                </div>
                <span className="text-[12px] text-[#A0ABBA] whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 3 */}
      <div className="grid h-[240px] grid-cols-[1.5fr_1.1fr_1.4fr] gap-2">
        <Box title="Top Pages">
          <div className="px-2 h-full flex flex-col">
            <div className="grid grid-cols-[.2fr_1.2fr_.6fr_.6fr_.6fr_.6fr_.4fr] py-1.5 text-[12px] font-semibold text-[#71809D] items-center">
              <span>#</span><span>Page</span><span className="text-right">Views</span><span className="text-right">Avg. Time</span><span className="text-right">Bounce</span><span className="text-right">Conv.</span><span className="text-right">Trend</span>
            </div>
            <div className="flex-1">
              {topPages.map((p, i) => (
                <div key={p.name} className="grid grid-cols-[.2fr_1.2fr_.6fr_.6fr_.6fr_.6fr_.4fr] border-t border-[#EDF1F5] py-2 text-[12px] items-center">
                  <span className="text-[#A0ABBA]">{i + 1}</span>
                  <span className="truncate font-semibold text-[#3186F3]">{p.name}</span>
                  <span className="text-right text-[#172044]">{p.views}</span>
                  <span className="text-right text-[#52617D]">{p.time}</span>
                  <span className="text-right text-[#52617D]">{p.bounce}</span>
                  <span className="text-right font-semibold text-[#172044]">{p.conv}</span>
                  <span className="flex justify-end">
                    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke={p.up ? "#10B981" : "#EF4444"} strokeWidth="1.5">
                      <path d={p.up ? "M0 10 Q 6 10, 12 5 T 24 2" : "M0 2 Q 6 2, 12 8 T 24 10"} />
                    </svg>
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-1 pb-2"><span className="text-[12px] font-semibold text-[#3186F3] cursor-pointer">View all pages</span></div>
          </div>
        </Box>

        <Box title="Conversion Funnel" action={<span className="text-[#EB0711] cursor-pointer">View details</span>}>
          <div className="p-3 space-y-3">
            {funnelData.map((f, i) => (
              <div key={f.stage} className="flex items-center gap-3 text-[12px]">
                <div className="w-[100px] shrink-0 text-[#52617D]">{f.stage}</div>
                <div className="w-[45px] shrink-0 font-semibold text-[#172044]">{f.count}</div>
                <div className="flex-1 h-3.5 bg-[#F1F5F9] rounded-r-sm overflow-hidden flex items-center justify-between">
                  <div className={cn("h-full", f.color)} style={{ width: f.pct }} />
                  {i === 0 && <span className="pr-1 text-[12px] text-[#A0ABBA]">{f.pct}</span>}
                </div>
                {i > 0 && <div className="w-[30px] shrink-0 text-right text-[#71809D]">{f.pct}</div>}
              </div>
            ))}
          </div>
        </Box>

        <Box title="Active Forms" action={<span className="text-[#EB0711] cursor-pointer">View all</span>}>
          <div className="px-2">
            <div className="grid grid-cols-[1.5fr_.5fr_.5fr_.5fr] py-1.5 text-[12px] font-semibold text-[#71809D] items-center">
              <span>Form Name</span><span className="text-right">Submissions</span><span className="text-right">Conv. Rate</span><span className="text-right">Status</span>
            </div>
            {[
              { name: "Contact Form", sub: "382", conv: "4.1%", active: true },
              { name: "Volunteer Signup", sub: "214", conv: "3.8%", active: true },
              { name: "Donation Form", sub: "198", conv: "6.2%", active: true },
              { name: "Newsletter Signup", sub: "68", conv: "2.4%", active: true },
            ].map((f) => (
              <div key={f.name} className="grid grid-cols-[1.5fr_.5fr_.5fr_.5fr] border-t border-[#EDF1F5] py-2 text-[12px] items-center">
                <span className="flex items-center gap-2 font-semibold text-[#172044]">
                  <span className="grid size-5 place-items-center rounded bg-[#EAF2FF] text-[#3186F3]"><FileText className="size-3" /></span>
                  {f.name}
                </span>
                <span className="text-right text-[#172044] font-semibold">{f.sub}</span>
                <span className="text-right text-[#52617D]">{f.conv}</span>
                <span className="flex justify-end"><Badge tone={f.active ? "success" : "neutral"}>{f.active ? "Active" : "Draft"}</Badge></span>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 4 */}
      <div className="grid h-[210px] grid-cols-[1.5fr_1fr_1fr_1fr] gap-2">
        <Box title="Website Performance" action={<span className="text-[#EB0711] cursor-pointer">View report</span>}>
          <div className="px-3 py-1 flex flex-col h-full">
            <p className="text-[12px] text-[#71809D] mb-3">Core Web Vitals and technical performance</p>
            <div className="grid grid-cols-5 gap-2 flex-1 items-center">
              {[
                { metric: "LCP", value: "2.1s", status: "Good", target: "Target < 2.5s" },
                { metric: "INP", value: "180ms", status: "Good", target: "Target < 200ms" },
                { metric: "CLS", value: "0.08", status: "Good", target: "Target < 0.1" },
                { metric: "Uptime", value: "99.9%", status: "Excellent", target: "Last 30 days" },
                { metric: "Mobile", value: "84/100", status: "Good", target: "+ 6 points" },
              ].map((item, i) => (
                <div key={item.metric} className={cn("flex flex-col items-center justify-center", i < 4 && "border-r border-[#EDF1F5]")}>
                  <p className="text-[12px] font-semibold text-[#172044]">{item.metric}</p>
                  <b className="text-[16px] text-[#172044] my-1">{item.value}</b>
                  <span className="bg-[#DCFCE7] text-[#15803D] text-[12px] px-1.5 rounded-sm font-semibold mb-1">{item.status}</span>
                  <span className="text-[12px] text-[#A0ABBA]">{item.target}</span>
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Device & Audience">
          <div className="flex h-full items-center justify-center px-2">
            <div className="relative size-[100px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={deviceData} dataKey="value" innerRadius={28} outerRadius={46} strokeWidth={0}>
                    {deviceData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span><b className="block text-[12px] text-[#172044]">24.8K</b><small className="text-[12px] leading-tight text-[#71809D]">Visitors</small></span>
              </div>
            </div>
            <div className="ml-3 flex-1 space-y-2">
              {deviceData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[12px] font-semibold">
                  <span className="flex items-center gap-1.5 text-[#52617D]"><i className="size-1.5 rounded-sm" style={{ backgroundColor: d.color }} />{d.name}</span>
                  <span className="text-[#172044]">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Recent Activity" action={<span className="text-[#EB0711] cursor-pointer">View all</span>}>
          <div className="px-3 pt-2">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-sm mt-0.5", a.color)}><FileText className="size-2.5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-[#172044] leading-tight">{a.title}</p>
                  <p className="text-[12px] text-[#71809D] leading-tight">{a.desc}</p>
                </div>
                <span className="text-[12px] text-[#A0ABBA] whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </Box>

        <Box title="Quick Actions">
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {quickActions.map((a, i) => (
              <button key={i} className="flex h-8 items-center gap-1.5 rounded border border-[#E1E7EF] bg-[#FAFBFC] px-1.5 text-left text-[12px] font-semibold text-[#172044] hover:bg-white transition-colors">
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-sm bg-[#EBF4FF]", a.color, a.color.includes("EA111B") && "bg-[#FFE8EA]")}>
                  <a.icon className="size-3" />
                </span>
                <span className="truncate">{a.label}</span>
              </button>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 5: Connected Websites */}
      <Box title="Connected Websites" action={<button className="flex h-6 items-center gap-1 rounded border border-[#DDE4ED] bg-white px-2 text-[12px] font-semibold text-[#172044] hover:bg-[#FAFBFC]"><Plus className="size-3" /> Add Website</button>}>
        <div className="px-2">
          <div className="grid grid-cols-[1.5fr_1.5fr_.8fr_.8fr_.8fr_1fr_.2fr] py-1.5 text-[12px] font-semibold text-[#71809D] items-center">
            <span>Website</span><span>Domain</span><span>Status</span><span>SSL</span><span>Uptime</span><span>Last Sync</span><span className="text-right">Actions</span>
          </div>
          {connectedWebsites.map((w, i) => (
            <div key={i} className="grid grid-cols-[1.5fr_1.5fr_.8fr_.8fr_.8fr_1fr_.2fr] border-t border-[#EDF1F5] py-2 text-[12px] items-center">
              <span className="flex items-center gap-1.5 font-semibold text-[#172044]"><Globe2 className="size-3.5 text-[#3186F3]" />{w.name}</span>
              <span className="text-[#3186F3] hover:underline cursor-pointer">{w.domain}</span>
              <span className="flex items-center gap-1 text-[#15803D] font-semibold"><i className="size-1.5 rounded-sm bg-[#15803D]" /> {w.status}</span>
              <span className="flex items-center gap-1 text-[#15803D] font-semibold"><CheckCircle2 className="size-2.5" /> {w.ssl}</span>
              <span className="text-[#52617D]">{w.uptime}</span>
              <span className="text-[#71809D]">{w.sync}</span>
              <span className="flex items-center justify-end gap-2 text-[#71809D]"><span className="font-semibold text-[#172044] cursor-pointer">Manage</span></span>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PAGES TAB
   ═══════════════════════════════════════════════════════════════════ */
function PagesTab() {
  const pages = [
    { name: "Home", slug: "/", status: "Published", views: "8.4K", bounce: "42%", seo: 92, updated: "Apr 12" },
    { name: "Our Work", slug: "/our-work", status: "Published", views: "4.8K", bounce: "46%", seo: 88, updated: "Apr 10" },
    { name: "Donate", slug: "/donate", status: "Published", views: "4.2K", bounce: "38%", seo: 95, updated: "Apr 8" },
    { name: "Volunteer", slug: "/volunteer", status: "Published", views: "3.1K", bounce: "44%", seo: 85, updated: "Apr 6" },
    { name: "About Us", slug: "/about", status: "Published", views: "2.6K", bounce: "52%", seo: 82, updated: "Mar 28" },
    { name: "Programs", slug: "/programs", status: "Published", views: "2.2K", bounce: "40%", seo: 87, updated: "Apr 1" },
    { name: "Contact", slug: "/contact", status: "Published", views: "1.8K", bounce: "35%", seo: 90, updated: "Apr 11" },
    { name: "Events", slug: "/events", status: "Published", views: "1.6K", bounce: "48%", seo: 79, updated: "Apr 9" },
    { name: "Blog", slug: "/blog", status: "Published", views: "3.2K", bounce: "32%", seo: 86, updated: "Apr 13" },
    { name: "Impact Report 2025", slug: "/impact-report-2025", status: "Draft", views: "0", bounce: "-", seo: 65, updated: "Apr 14" },
    { name: "Annual Gala 2025", slug: "/annual-gala-2025", status: "Scheduled", views: "0", bounce: "-", seo: 78, updated: "Apr 14" },
    { name: "Privacy Policy", slug: "/privacy", status: "Published", views: "420", bounce: "68%", seo: 70, updated: "Feb 1" },
  ];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = pages.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-3 pb-8">
      {/* KPIs */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Published", value: "9", icon: CheckCircle2, color: "bg-[#DCFCE7] text-[#15803D]" },
          { label: "Draft", value: "1", icon: FileText, color: "bg-[#FEF3C7] text-[#D97706]" },
          { label: "Scheduled", value: "1", icon: Clock, color: "bg-[#E0F2FE] text-[#0284C7]" },
          { label: "Avg. Views", value: "2.8K", icon: Eye, color: "bg-[#F2EAFF] text-[#805AD5]" },
          { label: "Avg. SEO Score", value: "84", icon: SearchCheck, color: "bg-[#EAF2FF] text-[#3186F3]" },
        ].map((kpi, i) => (
          <div key={i} className="flex min-h-[60px] items-center gap-3 rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-sm", kpi.color)}><kpi.icon className="size-4" /></span>
            <div>
              <p className="text-[12px] font-semibold text-[#52617D]">{kpi.label}</p>
              <b className="text-[18px] font-semibold text-[#142044]">{kpi.value}</b>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-sm border border-[#DDE4ED] bg-white pl-8 pr-3 text-[12px] text-[#27272A] outline-none focus:border-[#3186F3]"
          />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 rounded-sm border border-[#DDE4ED] bg-white px-2 text-[12px] font-semibold text-[#52617D]">
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
        </select>
        <button className="flex h-8 items-center gap-1.5 rounded-sm bg-[#EB0711] px-3 text-[12px] font-semibold text-white"><Plus className="size-3.5" /> Add Page</button>
      </div>

      {/* Table */}
      <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8EDF3]">
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Page</th>
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">URL</th>
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Status</th>
                <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Views</th>
                <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Bounce Rate</th>
                <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">SEO Score</th>
                <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Updated</th>
                <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.name} className="border-t border-[#EDF1F5] hover:bg-[#FAFBFC]">
                  <td className="px-3 py-2 text-[12px] font-semibold text-[#172044]">{p.name}</td>
                  <td className="px-3 py-2 text-[12px] text-[#3186F3]">{p.slug}</td>
                  <td className="px-3 py-2">
                    <Badge tone={p.status === "Published" ? "success" : p.status === "Draft" ? "warning" : "info"}>{p.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right text-[12px] text-[#172044]">{p.views}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-[#52617D]">{p.bounce}</td>
                  <td className="px-3 py-2 text-right text-[12px] font-semibold text-[#172044]">{p.seo}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-[#71809D]">{p.updated}</td>
                  <td className="px-3 py-2 text-right">
                    <button className="inline-flex items-center gap-1 rounded p-1 text-[#71809D] hover:bg-[#F1F5F9]"><MoreHorizontal className="size-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LANDING PAGES TAB
   ═══════════════════════════════════════════════════════════════════ */
function LandingPagesTab() {
  const lps = [
    { name: "Clean Ganga 2026", campaign: "Clean Ganga 2026", visits: "4.2K", leads: "186", conv: "4.4%", status: "Published", updated: "Mar 1" },
    { name: "Volunteer Campaign", campaign: "Volunteer Campaign", visits: "2.8K", leads: "124", conv: "4.4%", status: "Published", updated: "Feb 1" },
    { name: "Donation Campaign", campaign: "Donation Campaign", visits: "3.6K", leads: "218", conv: "6.1%", status: "Published", updated: "Mar 15" },
    { name: "Ganga Mahotsav", campaign: "Ganga Mahotsav", visits: "1.8K", leads: "72", conv: "4.0%", status: "Draft", updated: "Apr 1" },
    { name: "Monsoon Cleanup Drive", campaign: "Monsoon Cleanup", visits: "980", leads: "42", conv: "4.3%", status: "Archived", updated: "Sep 1" },
  ];

  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#71809D]">Campaign-focused pages for lead generation and conversions.</p>
        <button className="flex h-8 items-center gap-1.5 rounded-sm bg-[#EB0711] px-3 text-[12px] font-semibold text-white"><Plus className="size-3.5" /> Create Landing Page</button>
      </div>
      <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8EDF3]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Landing Page</th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Campaign</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Visits</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Leads</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Conv. Rate</th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Status</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lps.map((lp) => (
              <tr key={lp.name} className="border-t border-[#EDF1F5] hover:bg-[#FAFBFC]">
                <td className="px-3 py-2 text-[12px] font-semibold text-[#172044]">{lp.name}</td>
                <td className="px-3 py-2 text-[12px] text-[#52617D]">{lp.campaign}</td>
                <td className="px-3 py-2 text-right text-[12px] text-[#172044]">{lp.visits}</td>
                <td className="px-3 py-2 text-right text-[12px] text-[#172044]">{lp.leads}</td>
                <td className="px-3 py-2 text-right text-[12px] font-semibold text-[#172044]">{lp.conv}</td>
                <td className="px-3 py-2"><Badge tone={lp.status === "Published" ? "success" : lp.status === "Draft" ? "warning" : "neutral"}>{lp.status}</Badge></td>
                <td className="px-3 py-2 text-right"><button className="inline-flex items-center gap-1 rounded p-1 text-[#71809D] hover:bg-[#F1F5F9]"><MoreHorizontal className="size-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   FORMS TAB
   ═══════════════════════════════════════════════════════════════════ */
function FormsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"forms" | "submissions">("forms");

  const forms = [
    { name: "Contact Form", status: "Active", submissions: 382, conv: "4.1%" },
    { name: "Volunteer Signup", status: "Active", submissions: 214, conv: "3.8%" },
    { name: "Donation Form", status: "Active", submissions: 198, conv: "6.2%" },
    { name: "Newsletter Signup", status: "Active", submissions: 68, conv: "2.4%" },
    { name: "Event Registration", status: "Draft", submissions: 0, conv: "0%" },
  ];

  const submissions = [
    { name: "Rajesh Kumar", email: "rajesh@email.com", form: "Contact Form", status: "New", time: "10 min ago" },
    { name: "Anita Sharma", email: "anita@email.com", form: "Donation Form", status: "Converted", time: "1h ago" },
    { name: "Vikram Patel", email: "vikram@email.com", form: "Volunteer Signup", status: "Contacted", time: "2h ago" },
    { name: "Meena Devi", email: "meena@email.com", form: "Contact Form", status: "Read", time: "5h ago" },
    { name: "Suresh Reddy", email: "suresh@email.com", form: "Donation Form", status: "Converted", time: "6h ago" },
    { name: "Kavitha Nair", email: "kavitha@email.com", form: "Newsletter Signup", status: "New", time: "8h ago" },
    { name: "Arjun Singh", email: "arjun@email.com", form: "Volunteer Signup", status: "Contacted", time: "1d ago" },
  ];

  return (
    <div className="space-y-3 pb-8">
      {/* Sub tabs */}
      <div className="flex gap-4 border-b border-[#DDE4ED]">
        {(["forms", "submissions"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveSubTab(tab)} className={cn("pb-2 text-[12px] font-semibold capitalize border-b-2", activeSubTab === tab ? "border-[#EB0711] text-[#EB0711]" : "border-transparent text-[#71809D]")}>{tab}</button>
        ))}
      </div>

      {activeSubTab === "forms" ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#71809D]">Manage website forms and track submissions.</p>
            <button className="flex h-8 items-center gap-1.5 rounded-sm bg-[#EB0711] px-3 text-[12px] font-semibold text-white"><Plus className="size-3.5" /> Create Form</button>
          </div>
          <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8EDF3]">
                  <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Form Name</th>
                  <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Status</th>
                  <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Submissions</th>
                  <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Conv. Rate</th>
                  <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f) => (
                  <tr key={f.name} className="border-t border-[#EDF1F5] hover:bg-[#FAFBFC]">
                    <td className="px-3 py-2 text-[12px] font-semibold text-[#172044]">{f.name}</td>
                    <td className="px-3 py-2"><Badge tone={f.status === "Active" ? "success" : "warning"}>{f.status}</Badge></td>
                    <td className="px-3 py-2 text-right text-[12px] text-[#172044]">{f.submissions}</td>
                    <td className="px-3 py-2 text-right text-[12px] text-[#52617D]">{f.conv}</td>
                    <td className="px-3 py-2 text-right"><button className="inline-flex items-center gap-1 rounded p-1 text-[#71809D] hover:bg-[#F1F5F9]"><MoreHorizontal className="size-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#71809D]">View and manage all form submissions.</p>
            <button className="flex h-8 items-center gap-1.5 rounded-sm border border-[#DDE4ED] bg-white px-3 text-[12px] font-semibold text-[#172044]"><Download className="size-3.5" /> Export</button>
          </div>
          <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8EDF3]">
                  <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Name</th>
                  <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Email</th>
                  <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Form</th>
                  <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Status</th>
                  <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Time</th>
                  <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.name} className="border-t border-[#EDF1F5] hover:bg-[#FAFBFC]">
                    <td className="px-3 py-2 text-[12px] font-semibold text-[#172044]">{s.name}</td>
                    <td className="px-3 py-2 text-[12px] text-[#3186F3]">{s.email}</td>
                    <td className="px-3 py-2 text-[12px] text-[#52617D]">{s.form}</td>
                    <td className="px-3 py-2"><Badge tone={s.status === "Converted" ? "success" : s.status === "New" ? "info" : s.status === "Contacted" ? "warning" : "neutral"}>{s.status}</Badge></td>
                    <td className="px-3 py-2 text-right text-[12px] text-[#71809D]">{s.time}</td>
                    <td className="px-3 py-2 text-right"><button className="inline-flex items-center gap-1 rounded p-1 text-[#71809D] hover:bg-[#F1F5F9]"><MoreHorizontal className="size-3.5" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS TAB
   ═══════════════════════════════════════════════════════════════════ */
function AnalyticsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "acquisition" | "audience" | "behavior" | "conversions">("overview");

  const subTabs = ["overview", "acquisition", "audience", "behavior", "conversions"] as const;

  const channels = [
    { name: "Organic Search", visits: "10.5K", leads: 412, conv: 318, rate: "3.0%" },
    { name: "Direct", visits: "6.0K", leads: 186, conv: 142, rate: "2.4%" },
    { name: "Social Media", visits: "3.7K", leads: 142, conv: 98, rate: "2.7%" },
    { name: "Referral", visits: "2.1K", leads: 84, conv: 62, rate: "2.9%" },
    { name: "Paid Campaigns", visits: "1.5K", leads: 68, conv: 52, rate: "3.4%" },
    { name: "Email", visits: "596", leads: 28, conv: 18, rate: "3.0%" },
  ];

  return (
    <div className="space-y-3 pb-8">
      <div className="flex gap-4 border-b border-[#DDE4ED]">
        {subTabs.map((tab) => (
          <button key={tab} onClick={() => setActiveSubTab(tab)} className={cn("pb-2 text-[12px] font-semibold capitalize border-b-2", activeSubTab === tab ? "border-[#EB0711] text-[#EB0711]" : "border-transparent text-[#71809D]")}>{tab}</button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Visitors", value: "24.8K" },
          { label: "Sessions", value: "32.1K" },
          { label: "Page Views", value: "64.2K" },
          { label: "Conversions", value: "1,084" },
          { label: "Bounce Rate", value: "41.2%" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
            <p className="text-[12px] font-semibold text-[#52617D]">{kpi.label}</p>
            <b className="text-[18px] font-semibold text-[#142044]">{kpi.value}</b>
          </div>
        ))}
      </div>

      {activeSubTab === "overview" && (
        <div className="grid grid-cols-2 gap-2">
          <Box title="Traffic Over Time">
            <div className="p-3">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { d: "Mar 15", v: 1100 }, { d: "Mar 20", v: 1200 }, { d: "Mar 25", v: 1400 },
                  { d: "Mar 30", v: 1700 }, { d: "Apr 5", v: 1900 }, { d: "Apr 10", v: 2200 }, { d: "Apr 14", v: 2500 },
                ]} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#E8EDF3" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="v" stroke="#3186F3" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Box>
          <Box title="Traffic Sources">
            <div className="p-3 space-y-2">
              {channels.map((ch) => (
                <div key={ch.name} className="flex items-center justify-between text-[12px]">
                  <span className="text-[#52617D]">{ch.name}</span>
                  <span className="font-semibold text-[#172044]">{ch.visits}</span>
                </div>
              ))}
            </div>
          </Box>
        </div>
      )}

      {activeSubTab === "acquisition" && (
        <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-[#E8EDF3]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Source</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Visits</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Leads</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Conversions</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Conv. Rate</th>
            </tr></thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch.name} className="border-t border-[#EDF1F5]">
                  <td className="px-3 py-2 text-[12px] font-semibold text-[#172044]">{ch.name}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-[#172044]">{ch.visits}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-[#172044]">{ch.leads}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-[#172044]">{ch.conv}</td>
                  <td className="px-3 py-2 text-right text-[12px] font-semibold text-[#172044]">{ch.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === "audience" && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { title: "Devices", data: [{ name: "Desktop", pct: "58.4%" }, { name: "Mobile", pct: "36.2%" }, { name: "Tablet", pct: "5.4%" }] },
            { title: "Top Countries", data: [{ name: "India", pct: "75.0%" }, { name: "United States", pct: "10.0%" }, { name: "United Kingdom", pct: "6.0%" }, { name: "Canada", pct: "4.0%" }] },
            { title: "Browsers", data: [{ name: "Chrome", pct: "62.0%" }, { name: "Safari", pct: "22.0%" }, { name: "Firefox", pct: "9.0%" }, { name: "Edge", pct: "5.0%" }] },
          ].map((section) => (
            <Box key={section.title} title={section.title}>
              <div className="p-3 space-y-2">
                {section.data.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#52617D]">{d.name}</span>
                    <span className="font-semibold text-[#172044]">{d.pct}</span>
                  </div>
                ))}
              </div>
            </Box>
          ))}
        </div>
      )}

      {activeSubTab === "behavior" && (
        <div className="grid grid-cols-2 gap-2">
          <Box title="Top Pages">
            <div className="p-3 space-y-2">
              {["Home — 8.4K views", "Our Work — 4.8K views", "Donate — 4.2K views", "Volunteer — 3.1K views", "About Us — 2.6K views"].map((p) => (
                <div key={p} className="flex items-center justify-between text-[12px] border-b border-[#EDF1F5] pb-2">
                  <span className="text-[#172044]">{p.split(" — ")[0]}</span>
                  <span className="font-semibold text-[#52617D]">{p.split(" — ")[1]}</span>
                </div>
              ))}
            </div>
          </Box>
          <Box title="Events">
            <div className="p-3 space-y-2">
              {[
                { name: "page_view", count: "64.2K" },
                { name: "form_submit", count: "1,084" },
                { name: "cta_click", count: "4,820" },
                { name: "donation_complete", count: "248" },
                { name: "scroll_50", count: "32.1K" },
                { name: "video_play", count: "1,240" },
              ].map((e) => (
                <div key={e.name} className="flex items-center justify-between text-[12px] border-b border-[#EDF1F5] pb-2">
                  <span className="text-[#172044] font-mono">{e.name}</span>
                  <span className="font-semibold text-[#52617D]">{e.count}</span>
                </div>
              ))}
            </div>
          </Box>
        </div>
      )}

      {activeSubTab === "conversions" && (
        <div className="space-y-2">
          <Box title="Conversion Funnel">
            <div className="p-3 space-y-3">
              {[
                { step: "Homepage Visit", count: "24,842", rate: "100%" },
                { step: "Service Page Visit", count: "8,620", rate: "34.7%" },
                { step: "Form Start", count: "2,416", rate: "9.7%" },
                { step: "Form Submission", count: "862", rate: "3.5%" },
                { step: "Lead / Donation", count: "248", rate: "1.0%" },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 text-[12px]">
                  <div className="w-[120px] shrink-0 text-[#52617D]">{s.step}</div>
                  <div className="w-[60px] shrink-0 font-semibold text-[#172044]">{s.count}</div>
                  <div className="flex-1 h-4 bg-[#F1F5F9] rounded-r-sm overflow-hidden">
                    <div className={cn("h-full bg-[#60A5FA]")} style={{ width: s.rate }} />
                  </div>
                  <div className="w-[40px] text-right text-[#71809D]">{s.rate}</div>
                </div>
              ))}
            </div>
          </Box>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SEO TAB
   ═══════════════════════════════════════════════════════════════════ */
function SeoTab() {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "audit" | "keywords" | "backlinks" | "redirects">("overview");

  const issues = [
    { sev: "Critical", title: "Missing title tag", url: "/gallery", desc: "No title tag defined" },
    { sev: "Critical", title: "Missing meta description", url: "/gallery", desc: "No meta description" },
    { sev: "Critical", title: "Broken internal link", url: "/our-work", desc: "Link to /old-programs returns 404" },
    { sev: "Warning", title: "Duplicate title tag", url: "/blog/*", desc: "Multiple pages share same title" },
    { sev: "Warning", title: "Images missing alt text", url: "Multiple", desc: "12 images lack alt attributes" },
    { sev: "Warning", title: "Slow loading page", url: "/programs", desc: "LCP exceeds 2.5s on mobile" },
  ];

  const keywords = [
    { kw: "namo gange trust", pos: 1, prev: 2, vol: "8.1K", ctr: "32.4%", trend: "up" },
    { kw: "clean ganga initiative", pos: 3, prev: 5, vol: "4.4K", ctr: "18.2%", trend: "up" },
    { kw: "donate for ganga", pos: 8, prev: 12, vol: "2.9K", ctr: "8.4%", trend: "up" },
    { kw: "volunteer for river cleanup", pos: 5, prev: 4, vol: "1.6K", ctr: "12.6%", trend: "down" },
    { kw: "ganga river pollution", pos: 12, prev: 15, vol: "6.2K", ctr: "4.8%", trend: "up" },
    { kw: "ganga mahotsav 2025", pos: 2, prev: 3, vol: "5.4K", ctr: "24.6%", trend: "up" },
  ];

  return (
    <div className="space-y-3 pb-8">
      <div className="flex gap-4 border-b border-[#DDE4ED]">
        {(["overview", "audit", "keywords", "backlinks", "redirects"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveSubTab(tab)} className={cn("pb-2 text-[12px] font-semibold capitalize border-b-2", activeSubTab === tab ? "border-[#EB0711] text-[#EB0711]" : "border-transparent text-[#71809D]")}>{tab}</button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-6 gap-2">
        {[
          { label: "SEO Health", value: "82/100" },
          { label: "Indexed Pages", value: "14" },
          { label: "Organic Clicks", value: "12.5K" },
          { label: "Impressions", value: "48.2K" },
          { label: "Avg. Position", value: "14.2" },
          { label: "Critical Issues", value: "3" },
        ].map((kpi, i) => (
          <div key={i} className="rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
            <p className="text-[12px] font-semibold text-[#52617D]">{kpi.label}</p>
            <b className="text-[18px] font-semibold text-[#142044]">{kpi.value}</b>
          </div>
        ))}
      </div>

      {activeSubTab === "audit" && (
        <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-[#E8EDF3]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Severity</th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Issue</th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">URL</th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Description</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Actions</th>
            </tr></thead>
            <tbody>
              {issues.map((issue, i) => (
                <tr key={i} className="border-t border-[#EDF1F5]">
                  <td className="px-3 py-2"><Badge tone={issue.sev === "Critical" ? "danger" : "warning"}>{issue.sev}</Badge></td>
                  <td className="px-3 py-2 text-[12px] font-semibold text-[#172044]">{issue.title}</td>
                  <td className="px-3 py-2 text-[12px] text-[#3186F3]">{issue.url}</td>
                  <td className="px-3 py-2 text-[12px] text-[#52617D]">{issue.desc}</td>
                  <td className="px-3 py-2 text-right"><button className="text-[12px] font-semibold text-[#3186F3] hover:underline">Fix</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === "keywords" && (
        <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8EDF3]">
            <div className="flex items-center gap-2">
              <Search className="size-3.5 text-[#A1A1AA]" />
              <input placeholder="Search keywords..." className="text-[12px] outline-none" />
            </div>
            <button className="flex h-7 items-center gap-1 rounded-sm bg-[#EB0711] px-2 text-[12px] font-semibold text-white"><Plus className="size-3" /> Add Keyword</button>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-[#E8EDF3]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Keyword</th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-[#71809D]">Position</th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-[#71809D]">Prev.</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Volume</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">CTR</th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-[#71809D]">Trend</th>
            </tr></thead>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.kw} className="border-t border-[#EDF1F5]">
                  <td className="px-3 py-2 text-[12px] font-semibold text-[#172044]">{k.kw}</td>
                  <td className="px-3 py-2 text-center text-[12px] font-semibold text-[#172044]">#{k.pos}</td>
                  <td className="px-3 py-2 text-center text-[12px] text-[#71809D]">#{k.prev}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-[#172044]">{k.vol}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-[#52617D]">{k.ctr}</td>
                  <td className="px-3 py-2 text-center">
                    {k.trend === "up" ? <ArrowUpRight className="size-3.5 inline text-[#10B981]" /> : <ArrowDownRight className="size-3.5 inline text-[#EF4444]" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === "backlinks" && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Total Backlinks", value: "2,840" },
              { label: "Referring Domains", value: "342" },
              { label: "Domain Authority", value: "48" },
              { label: "Spam Score", value: "3.2%" },
            ].map((kpi, i) => (
              <div key={i} className="rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
                <p className="text-[12px] font-semibold text-[#52617D]">{kpi.label}</p>
                <b className="text-[18px] font-semibold text-[#142044]">{kpi.value}</b>
              </div>
            ))}
          </div>
          <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-[#E8EDF3]">
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Domain</th>
                <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Anchor</th>
                <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Authority</th>
                <th className="px-3 py-2 text-center text-[12px] font-semibold text-[#71809D]">Type</th>
              </tr></thead>
              <tbody>
                {[
                  { domain: "timesofindia.com", anchor: "Namo Gange Trust", auth: 82, type: "Follow" },
                  { domain: "ndtv.com", anchor: "Ganga Cleanup Initiative", auth: 78, type: "Follow" },
                  { domain: "thehindu.com", anchor: "river conservation NGO", auth: 76, type: "Follow" },
                  { domain: "wikipedia.org", anchor: "Namo Gange Trust", auth: 95, type: "Nofollow" },
                  { domain: "scroll.in", anchor: "clean Ganga initiative", auth: 68, type: "Follow" },
                ].map((bl) => (
                  <tr key={bl.domain} className="border-t border-[#EDF1F5]">
                    <td className="px-3 py-2 text-[12px] text-[#3186F3]">{bl.domain}</td>
                    <td className="px-3 py-2 text-[12px] text-[#172044]">{bl.anchor}</td>
                    <td className="px-3 py-2 text-right text-[12px] font-semibold text-[#172044]">{bl.auth}</td>
                    <td className="px-3 py-2 text-center"><Badge tone={bl.type === "Follow" ? "success" : "neutral"}>{bl.type}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === "redirects" && (
        <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8EDF3]">
            <p className="text-[12px] text-[#71809D]">Manage URL redirects</p>
            <button className="flex h-7 items-center gap-1 rounded-sm bg-[#EB0711] px-2 text-[12px] font-semibold text-white"><Plus className="size-3" /> Add Redirect</button>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-[#E8EDF3]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Source URL</th>
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Destination</th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-[#71809D]">Type</th>
              <th className="px-3 py-2 text-right text-[12px] font-semibold text-[#71809D]">Hits</th>
            </tr></thead>
            <tbody>
              {[
                { src: "/old-home", dest: "/", type: "301", hits: "1,240" },
                { src: "/old-programs", dest: "/programs", type: "301", hits: "860" },
                { src: "/blog/old-post", dest: "/blog", type: "302", hits: "240" },
                { src: "/donate-old", dest: "/donate", type: "301", hits: "420" },
              ].map((r) => (
                <tr key={r.src} className="border-t border-[#EDF1F5]">
                  <td className="px-3 py-2 text-[12px] text-[#3186F3]">{r.src}</td>
                  <td className="px-3 py-2 text-[12px] text-[#172044]">{r.dest}</td>
                  <td className="px-3 py-2 text-center"><Badge tone="info">{r.type}</Badge></td>
                  <td className="px-3 py-2 text-right text-[12px] text-[#52617D]">{r.hits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === "overview" && (
        <div className="grid grid-cols-2 gap-2">
          <Box title="SEO Health">
            <div className="p-4 space-y-3">
              {[
                { label: "Performance", score: 84 },
                { label: "SEO", score: 82 },
                { label: "Accessibility", score: 92 },
                { label: "Security", score: 95 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-[80px] text-[12px] text-[#52617D]">{item.label}</span>
                  <div className="flex-1 h-2 bg-[#F1F5F9] rounded-sm overflow-hidden">
                    <div className={cn("h-full rounded-sm", item.score >= 80 ? "bg-[#10B981]" : item.score >= 60 ? "bg-[#F59E0B]" : "bg-[#EF4444]")} style={{ width: `${item.score}%` }} />
                  </div>
                  <span className="text-[12px] font-semibold text-[#172044] w-[30px] text-right">{item.score}</span>
                </div>
              ))}
            </div>
          </Box>
          <Box title="Core Web Vitals">
            <div className="p-3 space-y-2">
              {[
                { metric: "LCP", mobile: "2.1s", desktop: "1.2s", status: "Good" },
                { metric: "INP", mobile: "180ms", desktop: "85ms", status: "Good" },
                { metric: "CLS", mobile: "0.08", desktop: "0.04", status: "Good" },
              ].map((v) => (
                <div key={v.metric} className="flex items-center justify-between text-[12px] border-b border-[#EDF1F5] pb-2">
                  <span className="font-semibold text-[#172044]">{v.metric}</span>
                  <span className="text-[#52617D]">Mobile: {v.mobile}</span>
                  <span className="text-[#52617D]">Desktop: {v.desktop}</span>
                  <Badge tone="success">{v.status}</Badge>
                </div>
              ))}
            </div>
          </Box>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MONITORING TAB
   ═══════════════════════════════════════════════════════════════════ */
function MonitoringTab() {
  const checks = [
    { type: "Uptime", status: "Up", value: "99.9%", icon: Activity },
    { type: "Response Time", status: "Up", value: "245ms", icon: Zap },
    { type: "SSL Certificate", status: "Up", value: "Valid (28 days)", icon: Shield },
    { type: "DNS", status: "Up", value: "Resolved", icon: Globe2 },
    { type: "HTTP Status", status: "Up", value: "200 OK", icon: CheckCircle2 },
    { type: "JS Errors", status: "Up", value: "0 errors/min", icon: AlertTriangle },
  ];

  const alerts = [
    { title: "SSL Certificate Expiring Soon", severity: "Warning", status: "Active", time: "2h ago" },
    { title: "Traffic Spike Detected", severity: "Info", status: "Active", time: "4h ago" },
    { title: "Mobile Performance Degradation", severity: "Warning", status: "Active", time: "1d ago" },
    { title: "Form Submission Failure", severity: "Critical", status: "Resolved", time: "2d ago" },
    { title: "SEO Critical Issue", severity: "Critical", status: "Muted", time: "3d ago" },
  ];

  return (
    <div className="space-y-3 pb-8">
      {/* Health Score */}
      <div className="rounded-sm border border-[#DDE4ED] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative size-16">
            <svg className="size-16 -rotate-90" viewBox="0 0 36 36">
              <path className="text-[#F1F5F9]" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="text-[#10B981]" strokeWidth="3" stroke="currentColor" fill="none" strokeDasharray="88, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-[14px] font-semibold text-[#172044]">88</span>
            </div>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-[#172044]">Website Health Score</h3>
            <p className="text-[12px] text-[#71809D]">All systems operational. No critical issues detected.</p>
          </div>
        </div>
      </div>

      {/* Status checks */}
      <div className="grid grid-cols-3 gap-2">
        {checks.map((c) => (
          <div key={c.type} className="flex items-center gap-3 rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
            <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#DCFCE7] text-[#15803D]"><c.icon className="size-4" /></span>
            <div>
              <p className="text-[12px] font-semibold text-[#52617D]">{c.type}</p>
              <div className="flex items-center gap-2">
                <b className="text-[14px] text-[#172044]">{c.value}</b>
                <Badge tone="success">{c.status}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <Box title="Recent Alerts" action={<button className="text-[12px] font-semibold text-[#EB0711]">View all</button>}>
        <div className="divide-y divide-[#EDF1F5]">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Badge tone={a.severity === "Critical" ? "danger" : a.severity === "Warning" ? "warning" : "info"}>{a.severity}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#172044]">{a.title}</p>
              </div>
              <Badge tone={a.status === "Active" ? "warning" : a.status === "Resolved" ? "success" : "neutral"}>{a.status}</Badge>
              <span className="text-[12px] text-[#A0ABBA]">{a.time}</span>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS TAB
   ═══════════════════════════════════════════════════════════════════ */
function SettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<"general" | "domains" | "tracking" | "integrations" | "notifications">("general");

  return (
    <div className="space-y-3 pb-8">
      <div className="flex gap-4 border-b border-[#DDE4ED]">
        {(["general", "domains", "tracking", "integrations", "notifications"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveSubTab(tab)} className={cn("pb-2 text-[12px] font-semibold capitalize border-b-2", activeSubTab === tab ? "border-[#EB0711] text-[#EB0711]" : "border-transparent text-[#71809D]")}>{tab}</button>
        ))}
      </div>

      {activeSubTab === "general" && (
        <div className="rounded-sm border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-4 max-w-[600px]">
          <div><label className="block text-[12px] font-semibold text-[#52617D] mb-1">Website Name</label><input defaultValue="Namo Gange Trust (Main)" className="h-8 w-full rounded-sm border border-[#DDE4ED] px-3 text-[12px]" /></div>
          <div><label className="block text-[12px] font-semibold text-[#52617D] mb-1">Website URL</label><input defaultValue="https://www.namogange.org" className="h-8 w-full rounded-sm border border-[#DDE4ED] px-3 text-[12px]" /></div>
          <div><label className="block text-[12px] font-semibold text-[#52617D] mb-1">Description</label><textarea defaultValue="Main website for Namo Gange Trust." className="min-h-[60px] w-full rounded-sm border border-[#DDE4ED] px-3 py-2 text-[12px]" /></div>
          <div><label className="block text-[12px] font-semibold text-[#52617D] mb-1">Timezone</label><select className="h-8 w-full rounded-sm border border-[#DDE4ED] px-3 text-[12px]"><option>Asia/Kolkata</option></select></div>
          <div className="space-y-2">
            {[
              { label: "Analytics Tracking", checked: true },
              { label: "Form Notifications", checked: true },
              { label: "SSL Redirect", checked: true },
              { label: "Maintenance Mode", checked: false },
              { label: "Cookie Consent", checked: true },
            ].map((toggle) => (
              <label key={toggle.label} className="flex items-center gap-2 text-[12px] text-[#172044]">
                <input type="checkbox" defaultChecked={toggle.checked} className="size-3.5 rounded-sm border-[#DDE4ED]" />
                {toggle.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex h-8 items-center gap-1.5 rounded-sm bg-[#EB0711] px-3 text-[12px] font-semibold text-white">Save Changes</button>
            <button className="flex h-8 items-center gap-1.5 rounded-sm border border-[#DDE4ED] bg-white px-3 text-[12px] font-semibold text-[#172044]">Reset</button>
          </div>
        </div>
      )}

      {activeSubTab === "domains" && (
        <div className="rounded-sm border border-[#DDE4ED] bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#E8EDF3]">
            <p className="text-[12px] text-[#71809D]">Manage website domains</p>
            <button className="flex h-7 items-center gap-1 rounded-sm bg-[#EB0711] px-2 text-[12px] font-semibold text-white"><Plus className="size-3" /> Add Domain</button>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-[#E8EDF3]">
              <th className="px-3 py-2 text-left text-[12px] font-semibold text-[#71809D]">Domain</th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-[#71809D]">Primary</th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-[#71809D]">DNS</th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-[#71809D]">SSL</th>
              <th className="px-3 py-2 text-center text-[12px] font-semibold text-[#71809D]">Status</th>
            </tr></thead>
            <tbody>
              {[
                { domain: "www.namogange.org", primary: true, dns: true, ssl: true, status: "Active" },
                { domain: "namogange.org", primary: false, dns: true, ssl: true, status: "Active" },
                { domain: "staging.namogange.org", primary: false, dns: true, ssl: true, status: "Active" },
              ].map((d) => (
                <tr key={d.domain} className="border-t border-[#EDF1F5]">
                  <td className="px-3 py-2 text-[12px] font-semibold text-[#172044]">{d.domain}</td>
                  <td className="px-3 py-2 text-center">{d.primary ? <Badge tone="success">Primary</Badge> : <button className="text-[12px] text-[#3186F3]">Set Primary</button>}</td>
                  <td className="px-3 py-2 text-center">{d.dns ? <CheckCircle2 className="size-3.5 inline text-[#10B981]" /> : <AlertTriangle className="size-3.5 inline text-[#F59E0B]" />}</td>
                  <td className="px-3 py-2 text-center">{d.ssl ? <CheckCircle2 className="size-3.5 inline text-[#10B981]" /> : <AlertTriangle className="size-3.5 inline text-[#F59E0B]" />}</td>
                  <td className="px-3 py-2 text-center"><Badge tone="success">{d.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === "tracking" && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: "Google Analytics", status: "Connected", icon: BarChart3 },
            { name: "Google Tag Manager", status: "Connected", icon: Tag },
            { name: "Meta Pixel", status: "Connected", icon: BarChart3 },
            { name: "LinkedIn Insight Tag", status: "Not Connected", icon: Target },
            { name: "Microsoft Clarity", status: "Connected", icon: Eye },
          ].map((t) => (
            <div key={t.name} className="flex items-center gap-3 rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
              <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#EAF2FF] text-[#3186F3]"><t.icon className="size-4" /></span>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-[#172044]">{t.name}</p>
                <Badge tone={t.status === "Connected" ? "success" : "neutral"}>{t.status}</Badge>
              </div>
              <button className="text-[12px] font-semibold text-[#3186F3]">{t.status === "Connected" ? "Configure" : "Connect"}</button>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === "integrations" && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "Google Search Console", desc: "Monitor search performance", status: "Connected" },
            { name: "Google Business Profile", desc: "Manage your listing", status: "Connected" },
            { name: "CRM Integration", desc: "Sync form submissions", status: "Connected" },
            { name: "Email Service", desc: "Send notifications", status: "Connected" },
            { name: "Webhooks", desc: "Real-time event delivery", status: "Disconnected" },
            { name: "WhatsApp", desc: "Send WhatsApp messages", status: "Disconnected" },
          ].map((int) => (
            <div key={int.name} className="rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
              <p className="text-[12px] font-semibold text-[#172044]">{int.name}</p>
              <p className="text-[12px] text-[#71809D] mb-2">{int.desc}</p>
              <div className="flex items-center justify-between">
                <Badge tone={int.status === "Connected" ? "success" : "neutral"}>{int.status}</Badge>
                <button className="text-[12px] font-semibold text-[#3186F3]">{int.status === "Connected" ? "Configure" : "Connect"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === "notifications" && (
        <div className="rounded-sm border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3 max-w-[600px]">
          <p className="text-[12px] text-[#71809D] mb-2">Configure notification preferences for website events.</p>
          {[
            { event: "New Lead", email: true, inApp: true, whatsapp: false },
            { event: "Form Submission", email: true, inApp: true, whatsapp: false },
            { event: "Website Down", email: true, inApp: true, whatsapp: true },
            { event: "SSL Expiry", email: true, inApp: false, whatsapp: false },
            { event: "SEO Critical Issue", email: true, inApp: true, whatsapp: false },
            { event: "Traffic Spike", email: false, inApp: true, whatsapp: false },
            { event: "Campaign Conversion", email: true, inApp: true, whatsapp: false },
            { event: "Weekly Report", email: true, inApp: false, whatsapp: false },
          ].map((n) => (
            <div key={n.event} className="flex items-center gap-4 border-b border-[#EDF1F5] pb-2">
              <span className="w-[140px] text-[12px] font-semibold text-[#172044]">{n.event}</span>
              <label className="flex items-center gap-1 text-[12px] text-[#52617D]"><input type="checkbox" defaultChecked={n.email} className="size-3" /> Email</label>
              <label className="flex items-center gap-1 text-[12px] text-[#52617D]"><input type="checkbox" defaultChecked={n.inApp} className="size-3" /> In-app</label>
              <label className="flex items-center gap-1 text-[12px] text-[#52617D]"><input type="checkbox" defaultChecked={n.whatsapp} className="size-3" /> WhatsApp</label>
            </div>
          ))}
          <button className="flex h-8 items-center gap-1.5 rounded-sm bg-[#EB0711] px-3 text-[12px] font-semibold text-white">Save Preferences</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN WEBSITE PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function WebsiteChannelPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewTab />;
      case "pages": return <PagesTab />;
      case "landing-pages": return <LandingPagesTab />;
      case "forms": return <FormsTab />;
      case "analytics": return <AnalyticsTab />;
      case "seo": return <SeoTab />;
      case "monitoring": return <MonitoringTab />;
      case "settings": return <SettingsTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-sm border border-[#DDE4ED] bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-sm bg-[#EBF4FF] text-[#3186F3]">
            <Globe2 className="size-7" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="text-[20px] font-semibold text-[#172044]">Website</h1>
            <p className="text-[12px] text-[#71809D]">Manage website performance, pages, conversions, forms, SEO, and user behavior.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 items-center gap-2.5 rounded border border-[#DDE4ED] bg-white px-3 text-[12px] font-semibold text-[#38444D] shadow-sm hover:bg-[#FAFBFC]">
            <CalendarDays className="size-4 text-[#182A58]" />
            <div className="text-left">
              <span className="block leading-tight">Last 30 days</span>
              <span className="block mt-0.5 text-[12px] font-normal text-[#71809D]">Mar 15 – Apr 14, 2025</span>
            </div>
            <ChevronDown className="size-3.5" />
          </button>
          <button className="flex h-9 items-center gap-2 rounded border border-[#DDE4ED] bg-white px-3.5 text-[12px] font-semibold text-[#172044] shadow-sm hover:bg-[#FAFBFC]">
            <Download className="size-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#DDE4ED] px-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "h-9 shrink-0 px-3 text-[12px] font-semibold transition-colors border-b-2",
              activeTab === tab.key
                ? "border-[#EB0711] text-[#EB0711]"
                : "border-transparent text-[#71809D] hover:text-[#38444D]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTab()}
    </div>
  );
}

/* icons already imported above */
