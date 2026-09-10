"use client";

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
  CalendarDays,
  ChevronDown,
  Globe2,
  UsersRound,
  TrendingUp,
  Target,
  FileText,
  Clock,
  Star,
  AlertTriangle,
  Clock4,
  SearchCheck,
  CheckCircle2,
  Download,
  Plus,
  Flame,
  Layout,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
const topStats = [
  { label: "Total Visitors", value: "24.8K", trend: "↑ 28%", note: "+ 5.4K from last month", icon: UsersRound, color: "blue" },
  { label: "Sessions", value: "32.1K", trend: "↑ 24%", note: "+ 6.2K from last month", icon: TrendingUp, color: "purple" },
  { label: "Conversion Rate", value: "3.4%", trend: "↑ 18%", note: "+ 0.5% from last month", icon: Target, color: "green" },
  { label: "Form Submissions", value: "862", trend: "↑ 32%", note: "+ 210 from last month", icon: FileText, color: "red" },
  { label: "Avg. Engagement Time", value: "2m 36s", trend: "↑ 14%", note: "+ 18s from last month", icon: Clock, color: "orange" },
  { label: "Page Performance Score", value: "88/100", trend: "↑ 6%", note: "+ 5 points from last month", icon: Star, color: "blue" },
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

const needsAttention = [
  { icon: AlertTriangle, title: "High bounce rate on donation page", desc: "Bounce rate 78% (↑ 12%)", time: "2 hours ago", color: "text-[#EF4444]" },
  { icon: Clock4, title: "Slow mobile performance", desc: "LCP 4.2s (target < 2.5s)", time: "5 hours ago", color: "text-[#F59E0B]" },
  { icon: FileText, title: "Contact form drop-off", desc: "68% users leave before submitting", time: "6 hours ago", color: "text-[#EF4444]" },
  { icon: AlertTriangle, title: "Missing CTA on top page", desc: `"Our Impact" page has no CTA`, time: "1 day ago", color: "text-[#F59E0B]" },
  { icon: Target, title: "Homepage conversion dip", desc: "Conversion rate 2.1% (↓ 0.8%)", time: "1 day ago", color: "text-[#EF4444]" },
];

const topPages = [
  { name: "Home", views: "8.4K", time: "2m 12s", bounce: "42%", conv: "3.2%", color: "#10B981" },
  { name: "Our Work", views: "4.8K", time: "1m 48s", bounce: "46%", conv: "2.8%", color: "#10B981" },
  { name: "Donate", views: "4.2K", time: "2m 36s", bounce: "38%", conv: "6.4%", color: "#10B981" },
  { name: "Volunteer", views: "3.1K", time: "1m 52s", bounce: "44%", conv: "4.1%", color: "#EF4444" },
  { name: "About Us", views: "2.6K", time: "1m 28s", bounce: "52%", conv: "1.9%", color: "#EF4444" },
];

const funnelData = [
  { stage: "Homepage Visits", count: "24,842", pct: "100%", color: "bg-[#60A5FA]" },
  { stage: "Service Page Visits", count: "8,620", pct: "34.7%", color: "bg-[#818CF8]" },
  { stage: "Form Starts", count: "2,416", pct: "9.7%", color: "bg-[#A78BFA]" },
  { stage: "Form Submissions", count: "862", pct: "3.5%", color: "bg-[#F472B6]" },
  { stage: "Donations / Leads", count: "248", pct: "1.0%", color: "bg-[#FB7185]" },
];

const activeForms = [
  { icon: UserPlus, name: "Contact Form", sub: "382", conv: "4.1%", status: "Active" },
  { icon: UserPlus, name: "Volunteer Signup", sub: "214", conv: "3.8%", status: "Active" },
  { icon: UserPlus, name: "Donation Form", sub: "198", conv: "6.2%", status: "Active" },
  { icon: Mail, name: "Newsletter Signup", sub: "68", conv: "2.4%", status: "Active" },
  { icon: CalendarDays, name: "Event Registration", sub: "0", conv: "0%", status: "Draft" },
];

const deviceData = [
  { name: "Desktop", value: 58.4, color: "#3B82F6" },
  { name: "Mobile", value: 36.2, color: "#0EA5E9" },
  { name: "Tablet", value: 5.4, color: "#38BDF8" },
];

const recentActivity = [
  { icon: UserPlus, title: "New lead from website", desc: "via Contact Form", time: "10 min ago", color: "bg-[#E0F2FE] text-[#0284C7]" },
  { icon: Layout, title: "Landing page updated", desc: "/volunteer-campaign", time: "1 hour ago", color: "bg-[#EDE9FE] text-[#7C3AED]" },
  { icon: FileText, title: "Form published", desc: "Event Registration Form", time: "3 hours ago", color: "bg-[#FFE4E6] text-[#E11D48]" },
  { icon: SearchCheck, title: "SEO fix deployed", desc: "Meta tags updated", time: "5 hours ago", color: "bg-[#DCFCE7] text-[#16A34A]" },
  { icon: RefreshCcw, title: "Analytics sync completed", desc: "Website data updated", time: "6 hours ago", color: "bg-[#FEF3C7] text-[#D97706]" },
];

const connectedWebsites = [
  { name: "Namo Gange Trust (Main)", domain: "www.namogange.org", status: "Connected", ssl: "Valid", uptime: "99.9%", sync: "2 hours ago" },
  { name: "Clean Ganga Drive", domain: "www.cleanganga.org", status: "Connected", ssl: "Valid", uptime: "99.8%", sync: "4 hours ago" },
  { name: "Ganga Explorer", domain: "www.gangaexplorer.in", status: "Connected", ssl: "Valid", uptime: "99.9%", sync: "6 hours ago" },
];

// Reusing icon component locally because lucide-react doesn't have Mail exported cleanly without alias
import { Mail, RefreshCcw } from "lucide-react";

// --- Components ---

function Box({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-md border border-[#DDE4ED] bg-white shadow-sm flex flex-col", className)}>
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#E8EDF3] px-3">
        <h2 className="text-[11.5px] font-bold text-[#172044]">{title}</h2>
        {action && (
          <div className="text-[9px] font-semibold text-[#71809D] flex items-center gap-1">
            {action}
          </div>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]">{children}</div>
    </section>
  );
}

export function WebsiteChannelPage() {
  return (
    <div className="space-y-3 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-[#DDE4ED] bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#EBF4FF] text-[#3186F3]">
            <Globe2 className="size-7" strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="text-[20px] font-bold text-[#172044]">Website</h1>
            <p className="text-[10px] text-[#71809D]">Manage website performance, traffic, pages, conversions, forms, and user behavior.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 items-center gap-2.5 rounded border border-[#DDE4ED] bg-white px-3 text-[11px] font-semibold text-[#38444D] shadow-sm hover:bg-[#FAFBFC]">
            <CalendarDays className="size-4 text-[#182A58]" />
            <div className="text-left">
              <span className="block leading-tight">Last 30 days</span>
              <span className="block mt-0.5 text-[9px] font-normal text-[#71809D]">Mar 15, 2025 – Apr 14, 2025</span>
            </div>
            <ChevronDown className="size-3.5" />
          </button>
          <button className="flex h-9 items-center gap-2 rounded border border-[#DDE4ED] bg-white px-3.5 text-[11px] font-semibold text-[#172044] shadow-sm hover:bg-[#FAFBFC]">
            <Download className="size-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#DDE4ED] px-2">
        {["Overview", "Pages", "Landing Pages", "Forms", "Analytics", "SEO", "Settings"].map((tab, i) => (
          <button key={tab} className={cn("pb-2 text-[10px] font-bold", i === 0 ? "border-b-2 border-[#EB0711] text-[#EB0711]" : "text-[#71809D] hover:text-[#38444D]")}>{tab}</button>
        ))}
      </div>

      {/* Row 1: Metrics */}
      <div className="grid grid-cols-6 gap-2">
        {topStats.map((stat, i) => {
          const c: Record<string, string> = {
            blue: "bg-[#EAF2FF] text-[#3186F3]",
            purple: "bg-[#F2EAFF] text-[#805AD5]",
            green: "bg-[#EAF5EF] text-[#25D366]",
            red: "bg-[#FFE8EA] text-[#EA111B]",
            orange: "bg-[#FFF0DC] text-[#F28C28]",
          };
          return (
            <div key={i} className="flex min-h-[70px] items-center gap-3 rounded-lg border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_3px_rgb(47_44_42/0.035)]">
              <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-full", c[stat.color])}><stat.icon className="size-[18px]" /></span>
              <div className="min-w-0">
                <p className="truncate text-[9.5px] font-bold text-[#52617D]">{stat.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <b className="text-[20px] font-bold tracking-[-0.02em] text-[#142044]">{stat.value}</b>
                  <span className={cn("text-[9px] font-bold whitespace-nowrap", stat.trend.includes("↑") || stat.trend.includes("9") ? "text-[#00A66A]" : "text-[#EA111B]")}>{stat.trend}</span>
                </div>
                {stat.note && <p className="text-[8px] text-[#71809D]">{stat.note}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2 */}
      <div className="grid h-[240px] grid-cols-[2fr_1fr_1fr] gap-2">
        <Box title="Website Traffic" action={
          <button className="flex h-6 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5 text-[8.5px] font-semibold text-[#52617D]">Last 30 days <ChevronDown className="size-2.5" /></button>
        }>
          <div className="px-3 py-1 flex flex-col h-full">
            <p className="text-[8px] text-[#71809D] mb-2">Visitors, sessions and conversions over time</p>
            <div className="mb-2 flex gap-4 text-[9px] font-semibold text-[#52617D]">
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#3186F3]" />Visitors</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#8B5CF6]" />Sessions</span>
              <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#EF4444]" />Conversions</span>
            </div>
            <div className="flex-1 min-h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trafficData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#E8EDF3" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
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
                  <small className="text-[7px] leading-tight text-[#71809D]">Total Sessions</small>
                </span>
              </div>
            </div>
            <div className="ml-2 flex-1 space-y-1.5">
              {sourceData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[8px] font-semibold">
                  <span className="flex items-center gap-1.5 text-[#52617D]"><i className="size-1.5 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</span>
                  <span className="text-[#172044]">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Needs Attention" action={<span className="text-[#EB0711] cursor-pointer">View all →</span>}>
          <div className="divide-y divide-[#EDF1F5]">
            {needsAttention.map((item, i) => (
              <div key={i} className="flex gap-2 p-2.5">
                <item.icon className={cn("size-3.5 mt-0.5", item.color)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] font-bold text-[#172044] leading-tight">{item.title}</p>
                  <p className="text-[8.5px] text-[#71809D] mt-0.5">{item.desc}</p>
                </div>
                <span className="text-[7.5px] text-[#A0ABBA] whitespace-nowrap">{item.time}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 3 */}
      <div className="grid h-[240px] grid-cols-[1.5fr_1.1fr_1.4fr] gap-2">
        <Box title="Top Pages">
          <div className="px-2 h-full flex flex-col">
            <div className="grid grid-cols-[.2fr_1.2fr_.6fr_.6fr_.6fr_.6fr_.4fr] py-1.5 text-[8.5px] font-bold text-[#71809D] items-center">
              <span>#</span>
              <span>Page</span>
              <span className="text-right">Page Views</span>
              <span className="text-right">Avg. Time</span>
              <span className="text-right">Bounce Rate</span>
              <span className="text-right">Conversions</span>
              <span className="text-right">Trend</span>
            </div>
            <div className="flex-1">
              {topPages.map((p, i) => (
                <div key={p.name} className="grid grid-cols-[.2fr_1.2fr_.6fr_.6fr_.6fr_.6fr_.4fr] border-t border-[#EDF1F5] py-2 text-[9px] items-center">
                  <span className="text-[#A0ABBA]">{i + 1}</span>
                  <span className="truncate font-semibold text-[#3186F3]">{p.name}</span>
                  <span className="text-right text-[#172044]">{p.views}</span>
                  <span className="text-right text-[#52617D]">{p.time}</span>
                  <span className="text-right text-[#52617D]">{p.bounce}</span>
                  <span className="text-right font-semibold text-[#172044]">{p.conv}</span>
                  <span className="flex justify-end">
                    {/* Simplified sparkline representation using a simple SVG curve */}
                    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke={p.color} strokeWidth="1.5">
                      <path d={i < 3 ? "M0 10 Q 6 10, 12 5 T 24 2" : "M0 2 Q 6 2, 12 8 T 24 10"} />
                    </svg>
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-1 pb-2">
              <span className="text-[9px] font-bold text-[#3186F3] cursor-pointer">View all pages →</span>
            </div>
          </div>
        </Box>

        <Box title="Conversion Funnel" action={<span className="text-[#EB0711] cursor-pointer">View details →</span>}>
          <div className="p-3 space-y-3">
            {funnelData.map((f, i) => (
              <div key={f.stage} className="flex items-center gap-3 text-[9px]">
                <div className="w-[100px] shrink-0 text-[#52617D]">{f.stage}</div>
                <div className="w-[45px] shrink-0 font-bold text-[#172044]">{f.count}</div>
                <div className="flex-1 h-3.5 bg-[#F1F5F9] rounded-r-sm overflow-hidden flex items-center justify-between">
                  <div className={cn("h-full", f.color)} style={{ width: f.pct }} />
                  {i === 0 && <span className="pr-1 text-[7px] text-[#A0ABBA]">{f.pct}</span>}
                </div>
                {i > 0 && <div className="w-[30px] shrink-0 text-right text-[#71809D]">{f.pct}</div>}
              </div>
            ))}
          </div>
        </Box>

        <Box title="Active Forms / Lead Capture" action={<span className="text-[#EB0711] cursor-pointer">View all →</span>}>
          <div className="px-2">
            <div className="grid grid-cols-[1.5fr_.5fr_.5fr_.5fr] py-1.5 text-[8.5px] font-bold text-[#71809D] items-center">
              <span>Form Name</span>
              <span className="text-right">Submissions</span>
              <span className="text-right">Conversion Rate</span>
              <span className="text-right">Status</span>
            </div>
            {activeForms.map((f) => (
              <div key={f.name} className="grid grid-cols-[1.5fr_.5fr_.5fr_.5fr] border-t border-[#EDF1F5] py-2 text-[9px] items-center">
                <span className="flex items-center gap-2 font-semibold text-[#172044]">
                  <span className="grid size-5 place-items-center rounded bg-[#EAF2FF] text-[#3186F3]"><f.icon className="size-3" /></span>
                  {f.name}
                </span>
                <span className="text-right text-[#172044] font-semibold">{f.sub}</span>
                <span className="text-right text-[#52617D]">{f.conv}</span>
                <span className="flex justify-end">
                  <i className={cn("rounded px-1.5 py-0.5 text-[8px] font-bold", f.status === "Active" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]")}>{f.status}</i>
                </span>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 4 */}
      <div className="grid h-[210px] grid-cols-[1.5fr_1fr_1fr_1fr] gap-2">
        <Box title="Website Performance" action={<span className="text-[#EB0711] cursor-pointer">View report →</span>}>
          <div className="px-3 py-1 flex flex-col h-full">
            <p className="text-[8px] text-[#71809D] mb-3">Core Web Vitals and technical performance</p>
            <div className="grid grid-cols-5 gap-2 flex-1 items-center">
              <div className="flex flex-col items-center justify-center border-r border-[#EDF1F5]">
                <p className="text-[9px] font-bold text-[#172044]">LCP</p>
                <b className="text-[16px] text-[#172044] my-1">2.1s</b>
                <span className="bg-[#DCFCE7] text-[#15803D] text-[7.5px] px-1.5 rounded-sm font-bold mb-1">Good</span>
                <span className="text-[7px] text-[#A0ABBA]">Target {'<'} 2.5s</span>
              </div>
              <div className="flex flex-col items-center justify-center border-r border-[#EDF1F5]">
                <p className="text-[9px] font-bold text-[#172044]">INP</p>
                <b className="text-[16px] text-[#172044] my-1">180ms</b>
                <span className="bg-[#DCFCE7] text-[#15803D] text-[7.5px] px-1.5 rounded-sm font-bold mb-1">Good</span>
                <span className="text-[7px] text-[#A0ABBA]">Target {'<'} 200ms</span>
              </div>
              <div className="flex flex-col items-center justify-center border-r border-[#EDF1F5]">
                <p className="text-[9px] font-bold text-[#172044]">CLS</p>
                <b className="text-[16px] text-[#172044] my-1">0.08</b>
                <span className="bg-[#DCFCE7] text-[#15803D] text-[7.5px] px-1.5 rounded-sm font-bold mb-1">Good</span>
                <span className="text-[7px] text-[#A0ABBA]">Target {'<'} 0.1</span>
              </div>
              <div className="flex flex-col items-center justify-center border-r border-[#EDF1F5]">
                <p className="text-[9px] font-bold text-[#172044]">Uptime</p>
                <b className="text-[16px] text-[#172044] my-1">99.9%</b>
                <span className="bg-[#DCFCE7] text-[#15803D] text-[7.5px] px-1.5 rounded-sm font-bold mb-1">Excellent</span>
                <span className="text-[7px] text-[#A0ABBA]">Last 30 days</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-[9px] font-bold text-[#172044]">Mobile Score</p>
                <b className="text-[16px] text-[#172044] my-1">84/100</b>
                <span className="bg-[#DCFCE7] text-[#15803D] text-[7.5px] px-1.5 rounded-sm font-bold mb-1">Good</span>
                <span className="text-[7px] text-[#10B981]">+ 6 points</span>
              </div>
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
                <span>
                  <b className="block text-[12px] text-[#172044]">24.8K</b>
                  <small className="text-[6px] leading-tight text-[#71809D]">Total Visitors</small>
                </span>
              </div>
            </div>
            <div className="ml-3 flex-1 space-y-2">
              {deviceData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[8px] font-semibold">
                  <span className="flex items-center gap-1.5 text-[#52617D]"><i className="size-1.5 rounded-full" style={{ backgroundColor: d.color }} />{d.name}</span>
                  <span className="text-[#172044]">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Recent Activity" action={<span className="text-[#EB0711] cursor-pointer">View all →</span>}>
          <div className="px-3 pt-2">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full mt-0.5", a.color)}><a.icon className="size-2.5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-[#172044] leading-tight">{a.title}</p>
                  <p className="text-[8px] text-[#71809D] leading-tight">{a.desc}</p>
                </div>
                <span className="text-[7px] text-[#A0ABBA] whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </Box>

        <Box title="Quick Actions">
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {[
              { icon: SearchCheck, label: "Run Site Audit", color: "text-[#3186F3]" },
              { icon: FileText, label: "View Pages", color: "text-[#3186F3]" },
              { icon: Layout, label: "Publish Banner", color: "text-[#3186F3]" },
              { icon: Plus, label: "Create Landing Page", color: "text-[#3186F3]" },
              { icon: UserPlus, label: "Manage Forms", color: "text-[#3186F3]" },
              { icon: Flame, label: "Open Heatmap", color: "text-[#EA111B]" },
              { icon: Download, label: "Export Report", color: "text-[#3186F3]" },
              { icon: Globe2, label: "Website Settings", color: "text-[#3186F3]" },
            ].map((a, i) => (
              <button key={i} className="flex h-8 items-center gap-1.5 rounded border border-[#E1E7EF] bg-[#FAFBFC] px-1.5 text-left text-[8.5px] font-bold text-[#172044] hover:bg-white transition-colors">
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full bg-[#EBF4FF]", a.color, a.color.includes('EA111B') && "bg-[#FFE8EA]")}>
                  <a.icon className="size-3" />
                </span>
                <span className="truncate">{a.label}</span>
              </button>
            ))}
          </div>
        </Box>
      </div>

      {/* Row 5 */}
      <Box title="Connected Websites" action={<button className="flex h-6 items-center gap-1 rounded border border-[#DDE4ED] bg-white px-2 text-[8.5px] font-bold text-[#172044] hover:bg-[#FAFBFC]"><Plus className="size-3" /> Add Website</button>}>
        <div className="px-2">
          <div className="grid grid-cols-[1.5fr_1.5fr_.8fr_.8fr_.8fr_1fr_.2fr] py-1.5 text-[8.5px] font-bold text-[#71809D] items-center">
            <span>Website</span>
            <span>Domain</span>
            <span>Status</span>
            <span>SSL</span>
            <span>Uptime (30 days)</span>
            <span>Last Sync</span>
            <span className="text-right">Actions</span>
          </div>
          {connectedWebsites.map((w, i) => (
            <div key={i} className="grid grid-cols-[1.5fr_1.5fr_.8fr_.8fr_.8fr_1fr_.2fr] border-t border-[#EDF1F5] py-2 text-[9px] items-center">
              <span className="flex items-center gap-1.5 font-bold text-[#172044]">
                <Globe2 className="size-3.5 text-[#3186F3]" />
                {w.name}
              </span>
              <span className="text-[#3186F3] hover:underline cursor-pointer">{w.domain}</span>
              <span className="flex items-center gap-1 text-[#15803D] font-semibold"><i className="size-1.5 rounded-full bg-[#15803D]" /> {w.status}</span>
              <span className="flex items-center gap-1 text-[#15803D] font-semibold"><CheckCircle2 className="size-2.5" /> {w.ssl}</span>
              <span className="text-[#52617D]">{w.uptime}</span>
              <span className="text-[#71809D]">{w.sync}</span>
              <span className="flex items-center justify-end gap-2 text-[#71809D]">
                <span className="font-semibold text-[#172044] cursor-pointer">Manage</span>
                <MoreVertical className="size-3 cursor-pointer" />
              </span>
            </div>
          ))}
        </div>
      </Box>

    </div>
  );
}

// Ensure icon is available
import { MoreVertical } from "lucide-react";
