"use client";

import Image from "next/image";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUp,
  BarChart3,
  CalendarDays,
  ChevronDown,
  CircleStar,
  Filter,
  Gauge,
  Globe2,
  Megaphone,
  MousePointerClick,
  Navigation,
  Phone,
  Plus,
  SearchCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { useAdminContext } from "../../shell/admin-context";
import { useAdminDashboard } from "../hooks/use-admin-dashboard";
import { cn } from "@/lib/utils/cn";

const topStats = [
  {
    label: "Clients",
    value: "4",
    trend: "33%",
    note: "+1 this month",
    icon: BarChart3,
    color: "blue",
  },
  {
    label: "Total Leads",
    value: "248",
    trend: "18%",
    note: "+42 this month",
    icon: UsersRound,
    color: "blue",
  },
  {
    label: "Active Campaigns",
    value: "6",
    trend: "20%",
    note: "2 ending soon",
    icon: Megaphone,
    color: "red",
  },
  {
    label: "Website Visits",
    value: "12.4K",
    trend: "28%",
    note: "+2.4K this month",
    icon: BarChart3,
    color: "green",
  },
  {
    label: "Social Reach",
    value: "86.5K",
    trend: "12%",
    note: "All channels",
    icon: Sparkles,
    color: "purple",
  },
  {
    label: "SEO Score",
    value: "78/100",
    trend: "6%",
    note: "+5 this month",
    icon: Gauge,
    color: "green",
  },
  {
    label: "Conversion Rate",
    value: "4.8%",
    trend: "12%",
    note: "+0.7% this month",
    icon: Filter,
    color: "blue",
  },
  {
    label: "GMB Rating",
    value: "4.7 ★",
    trend: "",
    note: "428 reviews",
    icon: CircleStar,
    color: "amber",
  },
] as const;
const graph = [
  { d: "Mar 15", visits: 10, reach: 6, leads: 3, conv: 1 },
  { d: "Mar 20", visits: 15, reach: 9, leads: 5, conv: 2 },
  { d: "Mar 25", visits: 17, reach: 10, leads: 6, conv: 3 },
  { d: "Mar 30", visits: 19, reach: 12, leads: 7, conv: 4 },
  { d: "Apr 5", visits: 22, reach: 15, leads: 8, conv: 5 },
  { d: "Apr 10", visits: 25, reach: 18, leads: 10, conv: 6 },
  { d: "Apr 14", visits: 29, reach: 20, leads: 12, conv: 8 },
];
const sources = [
  { name: "Website", value: 32, color: "#F20C20" },
  { name: "Instagram", value: 24, color: "#F2709B" },
  { name: "Facebook", value: 18, color: "#3186F3" },
  { name: "Google", value: 10, color: "#10A6B7" },
  { name: "LinkedIn", value: 8, color: "#805AD5" },
  { name: "WhatsApp", value: 6, color: "#42BE5B" },
  { name: "YouTube", value: 2, color: "#EDA000" },
];
const campaigns = [
  {
    name: "Clean Ganga Awareness",
    project: "Moksha Sewa",
    leads: 86,
    cpl: "₹120",
    conv: "8.1%",
    status: "Active",
  },
  {
    name: "Volunteer Drive",
    project: "Namo Gange Trust",
    leads: 62,
    cpl: "₹145",
    conv: "6.5%",
    status: "Active",
  },
  {
    name: "Ganga Tourism",
    project: "Ganga Explorer",
    leads: 48,
    cpl: "₹210",
    conv: "5.2%",
    status: "Active",
  },
  {
    name: "Donate for Change",
    project: "Namo Gange Foundation",
    leads: 36,
    cpl: "₹320",
    conv: "4.8%",
    status: "Active",
  },
  {
    name: "Plastic Free Rivers",
    project: "Ganga Clean Drive",
    leads: 28,
    cpl: "₹180",
    conv: "7.1%",
    status: "Paused",
  },
];
const campaignPhotos = [
  "/campaigns/river-cleanup.jpg",
  "/campaigns/clean-river.jpg",
  "/campaigns/ganga-tourism.jpg",
  "/campaigns/tree-planting.jpg",
  "/campaigns/water-conservation.jpg",
];
const upcoming = [
  {
    title: "Save Rivers, Save Lives",
    project: "Moksha Sewa",
    channel: "Instagram",
    date: "Apr 15, 2025",
    time: "10:00 AM",
  },
  {
    title: "Join the Movement",
    project: "Namo Gange Trust",
    channel: "LinkedIn",
    date: "Apr 15, 2025",
    time: "02:00 PM",
  },
  {
    title: "Clean Ganga Drive",
    project: "Ganga Clean Drive",
    channel: "Facebook",
    date: "Apr 16, 2025",
    time: "09:00 AM",
  },
  {
    title: "Volunteer Spotlight",
    project: "Namo Gange Trust",
    channel: "YouTube",
    date: "Apr 16, 2025",
    time: "05:00 PM",
  },
  {
    title: "River Conservation Tips",
    project: "Ganga Explorer",
    channel: "Instagram",
    date: "Apr 17, 2025",
    time: "11:00 AM",
  },
];

export function AdminDashboard() {
  const { selectedProjectId } = useAdminContext();
  const { data, isLoading } = useAdminDashboard(selectedProjectId);
  if (isLoading || !data)
    return (
      <div className="grid h-80 place-items-center text-[12px] text-[#71809D]">
        Loading marketing dashboard...
      </div>
    );
  return (
    <div className="space-y-1">
      <Header />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8 gap-1">
        {topStats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid items-start gap-1 grid-cols-1 lg:grid-cols-3">
        <Performance />
        <ChannelOverview channels={data.channels} />
        <Attention items={data.attention} />
      </div>

      {/* Row 2: Ad Spend & ROI, Monthly Marketing Goals, Live Activity Stream */}
      <div className="grid gap-1 grid-cols-1 lg:grid-cols-3">
        <RoiBudgetOverview />
        <MarketingGoals />
        <ActivityFeed />
      </div>

      <div className="grid gap-1 grid-cols-1 lg:grid-cols-3">
        <LeadSources />
        <Campaigns />
        <Upcoming />
      </div>
      <div className="grid gap-1 grid-cols-1 lg:grid-cols-3">
        <RecentLeads leads={data.recentLeads} />
        <SeoSnapshot />
        <GmbSnapshot />
      </div>
      <div>
        <QuickActions />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
          Good Morning, Manish <span aria-hidden>👋</span>
        </h1>
        <p className="mt-0.5 text-xs text-slate-500 font-medium">
          Here&apos;s how your marketing is performing across all projects.
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <blockquote className="hidden text-right text-xs font-medium text-slate-600 lg:block border-r border-slate-200/80 pr-4">
          “Consistent effort creates extraordinary brands.”
          <footer className="text-[11px] font-normal text-slate-400">— EnCodency</footer>
        </blockquote>
        <button className="flex items-center gap-3 rounded-sm border border-slate-200/80 bg-white px-3.5 py-2 text-left shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs cursor-pointer shrink-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-blue-50 text-blue-600">
            <CalendarDays className="size-4" />
          </span>
          <span className="leading-tight">
            <b className="block text-xs font-bold text-slate-800">Last 30 days</b>
            <small className="block text-[11px] font-medium text-slate-500 whitespace-nowrap">
              Mar 15, 2025 – Apr 14, 2025
            </small>
          </span>
          <ChevronDown className="size-4 shrink-0 text-slate-400 ml-1" />
        </button>
      </div>
    </div>
  );
}
function Stat({
  label,
  value,
  trend,
  note,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  trend: string;
  note: string;
  icon: typeof BarChart3;
  color: string;
}) {
  const c: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-50/90", text: "text-blue-600" },
    red: { bg: "bg-rose-50/90", text: "text-rose-600" },
    green: { bg: "bg-emerald-50/90", text: "text-emerald-600" },
    purple: { bg: "bg-purple-50/90", text: "text-purple-600" },
    amber: { bg: "bg-amber-50/90", text: "text-amber-600" },
  };
  const style = c[color] ?? { bg: "bg-blue-50/90", text: "text-blue-600" };

  return (
    <div className="group relative flex flex-col justify-between min-h-[84px] rounded-sm border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xs">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-none">
          {label}
        </span>
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm transition-transform group-hover:scale-105", style.bg, style.text)}>
          <Icon className="size-3.5" />
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-1">
        <b className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</b>
        {trend && (
          <span className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200/50">
            <ArrowUp className="size-2.5" />
            {trend}
          </span>
        )}
      </div>

      <p className="mt-0.5 text-[11px] font-medium text-slate-500 leading-tight">{note}</p>
    </div>
  );
}
function Box({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs transition-all duration-200 hover:shadow-xs">
      <header className="flex min-h-[44px] shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/40 px-3.5 py-2">
        <h2 className="text-xs font-bold tracking-tight text-slate-800">{title}</h2>
        {action && (
          <button className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-700">
            {action} →
          </button>
        )}
      </header>
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </section>
  );
}
function Performance() {
  return (
    <Box title="Marketing Performance">
      <div className="px-2.5 pb-2">
        <div className="flex flex-wrap items-center gap-3 py-1.5 text-[12px]">
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-sm bg-[#F20C20]" />
            Website Visits
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-sm bg-[#F2709B]" />
            Social Reach
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-sm bg-[#3186F3]" />
            Leads
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-sm bg-[#10A66E]" />
            Conversions
          </span>
        </div>
        <div className="h-[175px]">
          <ResponsiveContainer>
            <AreaChart
              data={graph}
              margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
            >
              <CartesianGrid stroke="#E8EDF3" vertical />
              <XAxis
                dataKey="d"
                tick={{ fontSize: 12, fill: "#71809D" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#71809D" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Area
                dataKey="visits"
                stroke="#F20C20"
                fill="#F20C2010"
                strokeWidth={1.5}
              />
              <Area dataKey="reach" stroke="#F2709B" fill="transparent" />
              <Area dataKey="leads" stroke="#3186F3" fill="transparent" />
              <Area dataKey="conv" stroke="#10A66E" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Box>
  );
}
function ChannelOverview({
  channels,
}: {
  channels: Array<{
    id: string;
    name: string;
    reach: string;
    engagement: string;
    leads: number;
    trend: number;
    status: string;
  }>;
}) {
  return (
    <Box title="Channel Overview" action="View all">
      <div className="max-h-[235px] overflow-y-auto overflow-x-auto px-3 scrollbar-thin">
        <div className="sticky top-0 z-10 grid min-w-[500px] grid-cols-[135px_70px_85px_55px_85px_60px] gap-2 bg-white py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <span>Channel</span>
          <span>Reach</span>
          <span>Engagement</span>
          <span>Leads</span>
          <span>Status</span>
          <span className="text-right">Trend</span>
        </div>
        <div className="divide-y divide-slate-100">
          {channels.slice(0, 6).map((ch) => (
            <div
              key={ch.id}
              className="grid min-w-[500px] grid-cols-[135px_70px_85px_55px_85px_60px] items-center gap-2 py-2 text-xs"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <ChannelLogo channel={ch.name} className="size-4 shrink-0" />
                <b className="whitespace-nowrap font-semibold text-slate-900">{ch.name}</b>
              </span>
              <span className="text-slate-600 font-medium tabular-nums">{ch.reach}</span>
              <span className="text-slate-600 font-medium tabular-nums">{ch.engagement}</span>
              <span className="text-slate-900 font-bold tabular-nums">{ch.leads}</span>
              <span>
                <span className="rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                  Connected
                </span>
              </span>
              <b className="text-right text-emerald-600 font-bold tabular-nums">
                ↑ {Math.abs(ch.trend).toFixed(0)}%
              </b>
            </div>
          ))}
        </div>
      </div>
    </Box>
  );
}
function Attention({
  items,
}: {
  items: Array<{ id: string; title: string; detail: string }>;
}) {
  const extra = [
    {
      id: "x1",
      title: "Meta campaign CPL increased",
      detail: "Ganga Clean Drive · 6 hours ago",
    },
    {
      id: "x2",
      title: "WhatsApp campaign failed",
      detail: "Ganga Clean Drive · 12 hours ago",
    },
    {
      id: "x3",
      title: "Website traffic dipped by 18%",
      detail: "Namo Gange Trust · 14 hours ago",
    },
  ];
  return (
    <Box title="Needs Attention" action="View all">
      <div className="max-h-[235px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
        {[...items, ...extra].slice(0, 6).map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-slate-50/80"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-amber-50 text-amber-600 border border-amber-200/60">
              <AlertTriangle className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-snug text-slate-800">
                {item.title}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-tight">
                {item.detail}
              </p>
            </div>
            <span className="shrink-0 rounded-sm bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 border border-rose-200/60">
              {
                [
                  "Connection",
                  "Review",
                  "Campaign",
                  "SEO",
                  "Campaign",
                  "Traffic",
                ][i]
              }
            </span>
          </div>
        ))}
      </div>
    </Box>
  );
}
function LeadSources() {
  return (
    <Box title="Leads by Source" action="View all">
      <div className="flex min-h-[175px] items-center gap-3 px-3 py-2">
        <div className="relative size-[126px] shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={sources}
                dataKey="value"
                innerRadius={39}
                outerRadius={58}
                strokeWidth={0}
              >
                {sources.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center text-center">
            <span>
              <b className="block text-base font-bold text-slate-900 tabular-nums">248</b>
              <small className="text-[11px] font-semibold text-slate-500">Total Leads</small>
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {sources.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-xs leading-5">
              <i
                className="size-2 rounded-sm shrink-0"
                style={{ background: s.color }}
              />
              <span className="flex-1 whitespace-nowrap text-slate-700 font-medium">{s.name}</span>
              <b className="text-slate-900 tabular-nums">{s.value}%</b>
              <span className="min-w-[28px] text-right text-[11px] text-slate-500 tabular-nums">
                ({Math.round(s.value * 2.48)})
              </span>
            </div>
          ))}
        </div>
      </div>
    </Box>
  );
}
function Campaigns() {
  return (
    <Box title="Top Performing Campaigns" action="View all">
      <div className="overflow-x-auto px-3 py-1 scrollbar-thin">
        <div className="sticky top-0 z-10 grid min-w-[620px] grid-cols-[180px_130px_55px_60px_80px_65px] gap-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-white">
          <span>Campaign</span>
          <span>Project</span>
          <span>Leads</span>
          <span>CPL</span>
          <span>Conversions</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-100">
          {campaigns.map((c, i) => (
            <div
              key={c.name}
              className="grid min-w-[620px] grid-cols-[180px_130px_55px_60px_80px_65px] items-center gap-2 py-2 text-xs"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Image
                  src={campaignPhotos[i] ?? "/campaigns/river-cleanup.jpg"}
                  alt=""
                  width={34}
                  height={24}
                  className="h-6 w-[34px] shrink-0 rounded object-cover shadow-2xs"
                />
                <b className="whitespace-nowrap font-semibold text-slate-900">{c.name}</b>
              </span>
              <span className="whitespace-nowrap text-slate-600 font-medium">{c.project}</span>
              <b className="text-slate-900 tabular-nums">{c.leads}</b>
              <span className="text-slate-600 tabular-nums">{c.cpl}</span>
              <span className="text-slate-600 tabular-nums">{c.conv}</span>
              <span>
                <i
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-bold not-italic border",
                    c.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-rose-50 text-rose-700 border-rose-200/60",
                  )}
                >
                  {c.status}
                </i>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Box>
  );
}
function Upcoming() {
  return (
    <Box title="Upcoming Scheduled Content" action="View all">
      <div className="divide-y divide-slate-100 max-h-[235px] overflow-y-auto overflow-x-auto p-1 scrollbar-thin">
        {upcoming.map((item, i) => (
          <div
            key={item.title}
            className="grid min-w-[420px] grid-cols-[38px_150px_110px_24px_80px] items-center gap-2 px-2 py-2 text-xs transition-colors hover:bg-slate-50/80"
          >
            <Image
              src={campaignPhotos[i] ?? "/campaigns/river-cleanup.jpg"}
              alt=""
              width={38}
              height={28}
              className="h-7 w-[38px] rounded object-cover shadow-2xs shrink-0"
            />
            <b className="whitespace-nowrap text-xs font-bold text-slate-900">{item.title}</b>
            <span className="whitespace-nowrap text-xs text-slate-500 font-medium">
              {item.project}
            </span>
            <ChannelLogo channel={item.channel} className="size-4 shrink-0" />
            <span className="text-right text-[11px] leading-tight text-slate-600 font-medium whitespace-nowrap tabular-nums">
              {item.date}
              <br />
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </Box>
  );
}
function RecentLeads({
  leads,
}: {
  leads: Array<{
    id: string;
    name: string;
    source: string;
    stage: string;
    receivedAt: string;
  }>;
}) {
  const avatarColors = [
    "bg-emerald-100 text-emerald-800",
    "bg-indigo-100 text-indigo-800",
    "bg-amber-100 text-amber-800",
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
  ];

  const projects = ["Moksha Sewa", "Ganga Explorer", "Ganga Drive", "Namo Gange Trust", "Moksha Sewa"];
  const assignees = ["Priya Sharma", "Amit Singh", "Neha Verma", "Rohit Kumar", "Priya Sharma"];

  const stageStyles: Record<string, string> = {
    New: "bg-blue-50 text-blue-700 border-blue-200/70",
    Contacted: "bg-purple-50 text-purple-700 border-purple-200/70",
    Qualified: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    Proposal: "bg-amber-50 text-amber-700 border-amber-200/70",
  };

  return (
    <Box title="Recent Leads" action="View all">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-3 scrollbar-thin">
        <div className="sticky top-0 z-10 bg-white grid min-w-[580px] grid-cols-[140px_85px_115px_85px_105px_50px] gap-2 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 px-1">
          <span>Name</span>
          <span>Source</span>
          <span>Project</span>
          <span>Stage</span>
          <span>Assigned</span>
          <span className="text-right">Date</span>
        </div>
        <div className="divide-y divide-slate-100">
          {leads.map((l, i) => (
            <div
              key={l.id}
              className="grid min-w-[580px] grid-cols-[140px_85px_115px_85px_105px_50px] items-center gap-2 py-2 px-1 text-xs transition-colors hover:bg-slate-50/80 rounded-sm"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-sm font-bold text-[10px] shadow-2xs", avatarColors[i % avatarColors.length])}>
                  {l.name.charAt(0)}
                </span>
                <b className="whitespace-nowrap font-semibold text-slate-900 text-xs">{l.name}</b>
              </span>
              <span className="text-slate-600 font-medium whitespace-nowrap">{l.source}</span>
              <span className="whitespace-nowrap text-slate-600">{projects[i % projects.length]}</span>
              <span>
                <span className={cn("inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold border", stageStyles[l.stage] || "bg-slate-50 text-slate-700 border-slate-200")}>
                  {l.stage}
                </span>
              </span>
              <span className="whitespace-nowrap text-slate-600">{assignees[i % assignees.length]}</span>
              <span className="text-slate-500 font-medium tabular-nums whitespace-nowrap text-[11px] text-right">Apr {14 - i}</span>
            </div>
          ))}
        </div>
      </div>
    </Box>
  );
}
function RoiBudgetOverview() {
  return (
    <Box title="Ad Budget & ROI Overview" action="View breakdown">
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-sm border border-emerald-100 bg-emerald-50/60 p-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Revenue</span>
            <b className="text-sm font-extrabold text-slate-900 block mt-0.5">₹6,84,000</b>
            <span className="text-[10px] font-bold text-emerald-600">↑ 34%</span>
          </div>
          <div className="rounded-sm border border-blue-100 bg-blue-50/60 p-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Ad Spend</span>
            <b className="text-sm font-extrabold text-slate-900 block mt-0.5">₹1,42,500</b>
            <span className="text-[10px] font-semibold text-slate-500">75% budget</span>
          </div>
          <div className="rounded-sm border border-purple-100 bg-purple-50/60 p-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">ROAS Multiplier</span>
            <b className="text-sm font-extrabold text-purple-700 block mt-0.5">4.8x</b>
            <span className="text-[10px] font-bold text-emerald-600">High Yield</span>
          </div>
        </div>

        {/* Budget Bar Breakdown */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-600 text-[11px]">Meta & Instagram Ads</span>
            <span className="text-slate-900 font-extrabold text-[11px]">₹60,000 <span className="text-slate-400 font-normal">(42%)</span></span>
          </div>
          <div className="h-1.5 w-full rounded-sm bg-slate-100 overflow-hidden">
            <div className="h-full rounded-sm bg-pink-500" style={{ width: "42%" }} />
          </div>

          <div className="flex items-center justify-between text-xs font-bold pt-1">
            <span className="text-slate-600 text-[11px]">Google Search & Display</span>
            <span className="text-slate-900 font-extrabold text-[11px]">₹42,500 <span className="text-slate-400 font-normal">(30%)</span></span>
          </div>
          <div className="h-1.5 w-full rounded-sm bg-slate-100 overflow-hidden">
            <div className="h-full rounded-sm bg-blue-500" style={{ width: "30%" }} />
          </div>

          <div className="flex items-center justify-between text-xs font-bold pt-1">
            <span className="text-slate-600 text-[11px]">WhatsApp Cloud API Broadcasts</span>
            <span className="text-slate-900 font-extrabold text-[11px]">₹25,000 <span className="text-slate-400 font-normal">(18%)</span></span>
          </div>
          <div className="h-1.5 w-full rounded-sm bg-slate-100 overflow-hidden">
            <div className="h-full rounded-sm bg-emerald-500" style={{ width: "18%" }} />
          </div>
        </div>
      </div>
    </Box>
  );
}

function MarketingGoals() {
  const goals = [
    { label: "Monthly Leads Goal", current: "248", target: "300", percent: 82, color: "bg-blue-600" },
    { label: "Website Traffic Goal", current: "12.4K", target: "15K", percent: 83, color: "bg-purple-600" },
    { label: "WhatsApp Subscribers", current: "3,842", target: "4,000", percent: 96, color: "bg-emerald-600" },
    { label: "GMB Review Growth", current: "428", target: "500", percent: 86, color: "bg-amber-500" },
  ];

  return (
    <Box title="Monthly Growth Goals" action="Manage targets">
      <div className="p-3 space-y-3">
        {goals.map((g) => (
          <div key={g.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700 text-[11.5px]">{g.label}</span>
              <span className="text-slate-900 font-extrabold text-[11.5px]">
                {g.current} <span className="text-slate-400 font-medium">/ {g.target}</span> ({g.percent}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-sm bg-slate-100 overflow-hidden">
              <div className={cn("h-full rounded-sm transition-all duration-500", g.color)} style={{ width: `${g.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Box>
  );
}

function ActivityFeed() {
  const activities = [
    { text: "Rahul Verma submitted lead form via Meta Ads", time: "8m ago", type: "lead", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { text: "Earth Day Awareness WhatsApp Broadcast completed (2,480 sent)", time: "1h ago", type: "whatsapp", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { text: "New 5-star review received on Google Business Profile", time: "3h ago", type: "gmb", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { text: "Template event_reminder_v2 approved by Meta WABA", time: "5h ago", type: "template", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ];

  return (
    <Box title="Live Activity Stream" action="View log">
      <div className="p-2.5 divide-y divide-slate-100 max-h-[220px] overflow-y-auto scrollbar-thin">
        {activities.map((act, i) => (
          <div key={i} className="flex items-center justify-between gap-2.5 py-2 text-xs hover:bg-slate-50/80 px-1 rounded-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("size-2 rounded-sm shrink-0", i === 0 ? "bg-blue-500 animate-pulse" : i === 1 ? "bg-emerald-500" : i === 2 ? "bg-amber-500" : "bg-purple-500")} />
              <p className="font-semibold text-slate-800 text-[11.5px] truncate">{act.text}</p>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold shrink-0">{act.time}</span>
          </div>
        ))}
      </div>
    </Box>
  );
}

function SeoSnapshot() {
  return (
    <Box title="SEO Snapshot" action="View details">
      <div className="p-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Mini value="1,245" label="Keywords" trend="↑ 12%" />
          <Mini value="18.4K" label="Clicks" trend="↑ 26%" />
          <Mini value="320K" label="Impressions" trend="↑ 18%" />
          <Mini value="12.6" label="Avg. Position" trend="↓ 2.4" negative />
        </div>

        {/* Top Keywords Ranking */}
        <div className="rounded-sm border border-slate-100 bg-slate-50/60 p-2 text-xs">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase border-b border-slate-200/60 pb-1">
            <span>Top Keywords</span>
            <span>Rank</span>
            <span>Traffic</span>
          </div>
          <div className="divide-y divide-slate-100 space-y-1 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-800 truncate max-w-[130px]">Clean Ganga NGO</span>
              <span className="font-bold text-emerald-600">#1 <span className="text-[9px]">↑2</span></span>
              <span className="text-slate-500 font-medium">4.2K</span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="font-semibold text-slate-800 truncate max-w-[130px]">River Cleanup Delhi</span>
              <span className="font-bold text-emerald-600">#2 <span className="text-[9px]">↑1</span></span>
              <span className="text-slate-500 font-medium">2.8K</span>
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-rose-200/80 bg-rose-50/60 p-2.5 text-xs text-rose-900 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <span className="grid size-5 place-items-center rounded-sm bg-rose-100 text-rose-700">
              <AlertTriangle className="size-3.5" />
            </span>
            <span>3 critical issues need attention</span>
          </div>
          <ul className="mt-1 space-y-0.5 text-rose-800 font-medium pl-1 text-[11px]">
            <li className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-sm bg-rose-500" />
              12 keywords dropped position
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-sm bg-rose-500" />
              Missing meta descriptions on 4 pages
            </li>
          </ul>
        </div>
      </div>
    </Box>
  );
}

function GmbSnapshot() {
  return (
    <Box title="Google Business Snapshot" action="View details">
      <div className="p-3 space-y-2.5">
        <div className="flex items-center gap-2.5 rounded-sm border border-slate-100 bg-slate-50/60 p-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-sm bg-white border border-slate-200/60 p-1.5 shadow-2xs">
            <ChannelLogo channel="Google Business" className="size-5" />
          </div>
          <div className="flex items-baseline gap-1">
            <b className="text-xl font-bold text-slate-900 tabular-nums">4.7</b>
            <span className="text-amber-500 font-bold text-sm">★</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">428 reviews</span>
          <span className="ml-auto rounded-sm bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
            ↑ 0.2
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <div className="rounded-sm border border-slate-100 bg-slate-50/50 p-2 text-center">
            <Phone className="mx-auto size-3.5 text-rose-500 mb-1" />
            <b className="block text-slate-900 font-bold tabular-nums text-xs">1,248</b>
            <span className="text-[10px] text-emerald-600 font-semibold">Calls ↑18%</span>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/50 p-2 text-center">
            <MousePointerClick className="mx-auto size-3.5 text-blue-500 mb-1" />
            <b className="block text-slate-900 font-bold tabular-nums text-xs">2,836</b>
            <span className="text-[10px] text-emerald-600 font-semibold">Clicks ↑24%</span>
          </div>
          <div className="rounded-sm border border-slate-100 bg-slate-50/50 p-2 text-center">
            <Navigation className="mx-auto size-3.5 text-emerald-500 mb-1" />
            <b className="block text-slate-900 font-bold tabular-nums text-xs">1,120</b>
            <span className="text-[10px] text-slate-500 font-medium">Directions</span>
          </div>
        </div>

        {/* Recent Review Card */}
        <div className="rounded-sm border border-amber-200/80 bg-amber-50/50 p-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-amber-500 font-bold text-[10px]">
              <span>★★★★★</span>
              <span className="text-slate-800 font-bold ml-1 text-[11px]">Rajesh Kumar</span>
            </div>
            <span className="text-[9.5px] text-slate-400 font-semibold">2h ago</span>
          </div>
          <p className="mt-0.5 text-[10.5px] text-slate-600 italic line-clamp-1">
            &ldquo;Great river cleanup initiative by Namo Gange! Well organized.&rdquo;
          </p>
          <div className="mt-1.5 flex items-center justify-between border-t border-amber-200/40 pt-1">
            <span className="text-[10px] font-bold text-emerald-700">✓ Responded</span>
            <button className="text-[10px] font-bold text-blue-600 hover:underline">View All Reviews →</button>
          </div>
        </div>

        <div className="rounded-sm border border-emerald-200/80 bg-emerald-50/60 p-2 text-[11px] font-semibold text-emerald-800 flex items-center gap-2 shadow-2xs">
          <span className="grid size-5 shrink-0 place-items-center rounded-sm bg-emerald-200/60 text-emerald-800 font-bold">
            ✓
          </span>
          <span>You&apos;re doing great! Keep engaging with reviews.</span>
        </div>
      </div>
    </Box>
  );
}

function QuickActions() {
  const actions = [
    [Megaphone, "Create Campaign", "bg-rose-50 text-rose-600 border-rose-100"],
    [Plus, "Create Post", "bg-blue-50 text-blue-600 border-blue-100"],
    [SearchCheck, "Run SEO Audit", "bg-emerald-50 text-emerald-600 border-emerald-100"],
    [UsersRound, "Add Lead", "bg-purple-50 text-purple-600 border-purple-100"],
    [Globe2, "Generate Report", "bg-sky-50 text-sky-600 border-sky-100"],
    [UsersRound, "Invite User", "bg-amber-50 text-amber-600 border-amber-100"],
  ] as const;

  return (
    <Box title="Quick Actions">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3">
        {actions.map(([Icon, label, colors]) => (
          <button
            key={label}
            className="group flex min-h-[44px] items-center gap-2.5 rounded-sm border border-slate-200/80 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-800 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/60 cursor-pointer"
          >
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm border transition-transform group-hover:scale-105", colors)}>
              <Icon className="size-3.5" />
            </span>
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </Box>
  );
}

function Mini({ value, label, trend, negative = false }: { value: string; label: string; trend?: string; negative?: boolean }) {
  return (
    <div className="rounded-sm border border-slate-100 bg-slate-50/50 p-2 text-center transition-colors hover:bg-slate-100/60">
      <b className="block text-sm font-bold text-slate-900 tabular-nums">{value}</b>
      <span className="block text-[11px] font-medium text-slate-500 mt-0.5">{label}</span>
      {trend && (
        <span className={cn("block text-[11px] font-bold mt-0.5", negative ? "text-rose-600" : "text-emerald-600")}>
          {trend}
        </span>
      )}
    </div>
  );
}
