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
    note: "+1 new this month",
    icon: BarChart3,
    color: "blue",
  },
  {
    label: "Total Leads",
    value: "248",
    trend: "18%",
    note: "+42 new this month",
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
    note: "+2.4K from last month",
    icon: BarChart3,
    color: "green",
  },
  {
    label: "Social Reach",
    value: "86.5K",
    trend: "12%",
    note: "Across all channels",
    icon: Sparkles,
    color: "purple",
  },
  {
    label: "SEO Score",
    value: "78/100",
    trend: "6%",
    note: "+5 from last month",
    icon: Gauge,
    color: "green",
  },
  {
    label: "Conversion Rate",
    value: "4.8%",
    trend: "12%",
    note: "+0.7% from last month",
    icon: Filter,
    color: "blue",
  },
  {
    label: "GMB Rating",
    value: "4.7 ★",
    trend: "",
    note: "428 reviews · +0.2 this month",
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
      <div className="grid h-80 place-items-center text-[10px] text-[#71809D]">
        Loading marketing dashboard...
      </div>
    );
  return (
    <div className="space-y-2">
      <Header />
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
        {topStats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid items-start gap-2 [&>section]:h-[252px] xl:grid-cols-[1.48fr_1.05fr_.95fr]">
        <Performance />
        <ChannelOverview channels={data.channels} />
        <Attention items={data.attention} />
      </div>
      <div className="grid gap-2 xl:grid-cols-[.88fr_1.18fr_1fr]">
        <LeadSources />
        <Campaigns />
        <Upcoming />
      </div>
      <div className="grid gap-2 xl:grid-cols-[1.1fr_.72fr_.72fr_.68fr]">
        <RecentLeads leads={data.recentLeads} />
        <SeoSnapshot />
        <GmbSnapshot />
        <QuickActions />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="grid min-h-[52px] grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[minmax(0,1fr)_210px_185px]">
      <div className="self-center">
        <h1 className="flex items-center gap-1.5 text-[20px] font-bold leading-6 tracking-[-0.025em] text-[#111B43]">
          Good Morning, Manish <span aria-hidden>👋</span>
        </h1>
        <p className="mt-0.5 text-[10px] leading-4 text-[#687797]">
          Here&apos;s how your marketing is performing across all projects.
        </p>
      </div>
      <div className="contents">
        <blockquote className="hidden justify-self-end text-center text-[10px] font-medium leading-[14px] text-[#21335F] lg:block">
          “Consistent effort creates
          <br />
          extraordinary brands.”
          <footer className="mt-0.5 text-[9px] font-normal text-[#7B88A4]">— EnCodency</footer>
        </blockquote>
        <button className="flex h-11 w-full items-center gap-2 rounded-xl border border-[#D7E0EB] bg-white px-3 shadow-[0_1px_4px_rgb(31_50_81/0.08)]">
          <CalendarDays className="size-3.5 shrink-0 text-[#19315E]" />
          <span className="text-left leading-none">
            <b className="block text-[9.5px] leading-4 text-[#172044]">Last 30 days</b>
            <small className="block whitespace-nowrap text-[7.5px] leading-3 text-[#75829D]">
              Mar 15, 2025 – Apr 14, 2025
            </small>
          </span>
          <ChevronDown className="ml-auto size-3 shrink-0" />
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
  const c: Record<string, string> = {
    blue: "bg-[#E8F2FF] text-[#1975E7]",
    red: "bg-[#FFE9EB] text-[#EA1A26]",
    green: "bg-[#E4F8F0] text-[#0AA673]",
    purple: "bg-[#F2E9FF] text-[#8A38DD]",
    amber: "bg-[#FFF1D8] text-[#E79A00]",
  };
  return (
    <div className="flex min-h-[78px] items-center rounded-lg border border-[#DCE4EE] bg-white px-2.5 py-2.5 shadow-[0_1px_4px_rgb(31_50_81/0.05)] transition-shadow hover:shadow-md">
      <div className="flex w-full items-center gap-2">
        <span
          className={cn(
            "grid size-[30px] shrink-0 place-items-center rounded-full",
            c[color],
          )}
        >
          <Icon className="size-[15px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold leading-3 text-[#52617D]">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <b className="text-[19px] leading-[22px] tracking-[-0.02em] text-[#142044]">{value}</b>
            {trend && (
              <span className="whitespace-nowrap text-[8px] font-bold text-[#05A36D]">
                ↑ {trend}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[7.5px] leading-3 text-[#7C89A2]">{note}</p>
        </div>
      </div>
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
    <section className="overflow-hidden rounded-md border border-[#DDE4ED] bg-white shadow-sm">
      <header className="flex h-8 items-center justify-between border-b border-[#E8EDF3] px-2.5">
        <h2 className="text-[12px] font-bold text-[#172044]">{title}</h2>
        {action && (
          <button className="text-[9px] font-semibold text-[#EB0711]">
            {action} →
          </button>
        )}
      </header>
      {children}
    </section>
  );
}
function Performance() {
  return (
    <Box title="Marketing Performance">
      <div className="px-2 pb-1">
        <div className="flex h-7 items-center gap-3 text-[9px]">
          <i className="size-1.5 rounded-full bg-[#F20C20]" />
          Website Visits
          <i className="size-1.5 rounded-full bg-[#F2709B]" />
          Social Reach
          <i className="size-1.5 rounded-full bg-[#3186F3]" />
          Leads
          <i className="size-1.5 rounded-full bg-[#10A66E]" />
          Conversions
        </div>
        <div className="h-[165px]">
          <ResponsiveContainer>
            <AreaChart
              data={graph}
              margin={{ top: 3, right: 3, left: -30, bottom: 0 }}
            >
              <CartesianGrid stroke="#E8EDF3" vertical />
              <XAxis
                dataKey="d"
                tick={{ fontSize: 8, fill: "#71809D" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 8, fill: "#71809D" }}
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
      <div className="max-h-[218px] overflow-y-auto px-2 [scrollbar-color:#CBD5E1_transparent] [scrollbar-width:thin]">
        <div className="sticky top-0 z-10 grid grid-cols-[1.35fr_.48fr_.62fr_.3fr_.66fr_.36fr] gap-1 bg-white py-1.5 text-[9px] font-medium text-[#7A87A0]">
          <span>Channel</span>
          <span>Reach</span>
          <span>Engagement</span>
          <span>Leads</span>
          <span>Status</span>
          <span>Trend</span>
        </div>
        {channels.slice(0, 6).map((ch) => (
          <div
            key={ch.id}
            className="grid grid-cols-[1.35fr_.48fr_.62fr_.3fr_.66fr_.36fr] items-center gap-1 border-t border-[#EDF1F5] py-2 text-[10.5px]"
          >
            <span className="flex items-center gap-1">
              <ChannelLogo channel={ch.name} className="size-[18px]" />
              <b className="truncate">{ch.name}</b>
            </span>
            <span>{ch.reach}</span>
            <span>{ch.engagement}</span>
            <span>{ch.leads}</span>
            <span>
              <i className="rounded bg-[#E5F7EF] px-1.5 py-0.5 text-[8.5px] text-[#078359]">
                Connected
              </i>
            </span>
            <b className="text-right text-[#078359]">
              ↑ {Math.abs(ch.trend).toFixed(0)}%
            </b>
          </div>
        ))}
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
      <div className="max-h-[218px] overflow-y-auto [scrollbar-color:#CBD5E1_transparent] [scrollbar-width:thin]">
        {[...items, ...extra].slice(0, 6).map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-2 border-b border-[#EDF1F5] px-2 py-1.5"
          >
            <span className="grid size-5 place-items-center rounded-full bg-[#FFF0E2] text-[#F07800]">
              <AlertTriangle className="size-3" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-semibold">
                {item.title}
              </p>
              <p className="truncate text-[8px] text-[#7A87A0]">
                {item.detail}
              </p>
            </div>
            <span className="rounded bg-[#FFF0F1] px-1 py-0.5 text-[7.5px] text-[#EB0711]">
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
      <div className="flex h-[162px] items-center gap-2 px-2.5">
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
              <b className="block text-[16px]">248</b>
              <small className="text-[9px] text-[#71809D]">Total Leads</small>
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          {sources.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-[9.5px] leading-4">
              <i
                className="size-1.5 rounded-full"
                style={{ background: s.color }}
              />
              <span className="flex-1">{s.name}</span>
              <b className="text-[#172044]">{s.value}%</b>
              <span className="min-w-[24px] text-right text-[9px] text-[#7A87A0]">
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
      <div className="px-2">
        <div className="grid grid-cols-[1.35fr_.75fr_.28fr_.38fr_.55fr_.45fr] gap-1 py-1 text-[8px] text-[#7A87A0]">
          <span>Campaign</span>
          <span>Project</span>
          <span>Leads</span>
          <span>CPL</span>
          <span>Conversions</span>
          <span>Status</span>
        </div>
        {campaigns.map((c, i) => (
          <div
            key={c.name}
            className="grid grid-cols-[1.35fr_.75fr_.28fr_.38fr_.55fr_.45fr] items-center gap-1 border-t border-[#EDF1F5] py-1.5 text-[8.5px]"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Image
                src={campaignPhotos[i] ?? "/campaigns/river-cleanup.jpg"}
                alt=""
                width={34}
                height={24}
                className="h-6 w-[34px] shrink-0 rounded object-cover shadow-sm"
              />
              <b className="truncate">{c.name}</b>
            </span>
            <span className="truncate text-[#6F7D98]">{c.project}</span>
            <b>{c.leads}</b>
            <span>{c.cpl}</span>
            <span>{c.conv}</span>
            <i
              className={cn(
                "w-fit rounded px-1 py-0.5 text-[7.5px]",
                c.status === "Active"
                  ? "bg-[#E5F7EF] text-[#078359]"
                  : "bg-[#FFE8EA] text-[#D91521]",
              )}
            >
              {c.status}
            </i>
          </div>
        ))}
      </div>
    </Box>
  );
}
function Upcoming() {
  return (
    <Box title="Upcoming Scheduled Content" action="View all">
      <div>
        {upcoming.map((item, i) => (
          <div
            key={item.title}
            className="grid grid-cols-[38px_1fr_.7fr_20px_.7fr] items-center gap-1.5 border-b border-[#EDF1F5] px-2 py-1"
          >
            <Image
              src={campaignPhotos[i] ?? "/campaigns/river-cleanup.jpg"}
              alt=""
              width={38}
              height={28}
              className="h-7 w-[38px] rounded object-cover shadow-sm"
            />
            <b className="truncate text-[8.5px]">{item.title}</b>
            <span className="truncate text-[7.5px] text-[#71809D]">
              {item.project}
            </span>
            <ChannelLogo channel={item.channel} className="size-4" />
            <span className="text-right text-[7.5px] text-[#62718E]">
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
  return (
    <Box title="Recent Leads" action="View all">
      <div className="px-2">
        <div className="grid grid-cols-[1.2fr_.58fr_.76fr_.62fr_.76fr_.66fr] gap-1 py-1 text-[7.5px] text-[#71809D]">
          <span>Name</span>
          <span>Source</span>
          <span>Project</span>
          <span>Stage</span>
          <span>Assigned To</span>
          <span>Date</span>
        </div>
        {leads.map((l, i) => (
          <div
            key={l.id}
            className="grid grid-cols-[1.2fr_.58fr_.76fr_.62fr_.76fr_.66fr] items-center gap-1 border-t border-[#EDF1F5] py-1 text-[8px]"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <i className={cn("grid size-4 shrink-0 place-items-center rounded-full font-bold not-italic", ["bg-[#DDF8E9] text-[#16A16C]", "bg-[#E5F7EF] text-[#11A578]", "bg-[#FFF0DC] text-[#F28C28]", "bg-[#E7F0FF] text-[#3478DB]", "bg-[#EEE7FF] text-[#8357DC]"][i])}>{l.name.charAt(0)}</i>
              <b className="truncate">{l.name}</b>
            </span>
            <span>{l.source}</span>
            <span className="truncate">{["Moksha Sewa", "Ganga Explorer", "Ganga Drive", "Namo Gange Trust", "Moksha Sewa"][i]}</span>
            <i className="w-fit rounded bg-[#EAF2FF] px-1 py-0.5 text-[#286CB7]">
              {l.stage}
            </i>
            <span className="truncate">{["Priya Sharma", "Amit Singh", "Neha Verma", "Rohit Kumar", "Priya Sharma"][i]}</span>
            <span>Apr {14 - i}, 2025</span>
          </div>
        ))}
      </div>
    </Box>
  );
}
function SeoSnapshot() {
  return (
    <Box title="SEO Snapshot" action="View details">
      <div className="grid grid-cols-4 divide-x divide-[#EDF1F5] px-1 py-2 text-center">
        <Mini value="1,245" label="Keywords" trend="↑ 12%" />
        <Mini value="18.4K" label="Clicks" trend="↑ 26%" />
        <Mini value="320K" label="Impressions" trend="↑ 18%" />
        <Mini value="12.6" label="Avg. Position" trend="↓ 2.4" negative />
      </div>
      <div className="mx-2 mb-2 rounded-md border border-[#FFE1E4] bg-[#FFF0F1] p-2 text-[8px] leading-[14px] text-[#D91521]">
        <b>⚠ 3 critical issues need attention</b>
        <p className="mt-1">• 12 keywords dropped</p>
        <p>• Missing meta descriptions</p>
        <p>• Improve Core Web Vitals</p>
      </div>
    </Box>
  );
}
function GmbSnapshot() {
  return (
    <Box title="Google Business Snapshot" action="View details">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white shadow-[0_1px_5px_rgb(31_50_81/0.14)]">
          <ChannelLogo channel="Google Business" className="size-5" />
        </span>
        <b className="text-[18px] text-[#172044]">4.7</b>
        <span className="text-[14px] text-[#F5A000]">★</span>
        <span className="text-[8px] text-[#71809D]">428 reviews</span>
        <span className="ml-auto rounded bg-[#E5F7EF] px-1.5 py-0.5 text-[8px] font-semibold text-[#078359]">↑ 0.2</span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-[#EDF1F5] border-y border-[#EDF1F5] px-1 py-2 text-[8px]">
        <p className="flex items-start gap-1.5 px-1">
          <Phone className="mt-0.5 size-3 shrink-0 text-[#EA4335]" />
          <span><b>1,248</b><br />Calls ↑18%</span>
        </p>
        <p className="flex items-start gap-1.5 px-1">
          <MousePointerClick className="mt-0.5 size-3 shrink-0 text-[#4285F4]" />
          <span><b>2,836</b><br />Clicks ↑24%</span>
        </p>
        <p className="flex items-start gap-1.5 px-1">
          <Navigation className="mt-0.5 size-3 shrink-0 text-[#34A853]" />
          <span><b>1,120</b><br />Directions</span>
        </p>
      </div>
      <div className="m-2 rounded-md border border-[#D8F2E7] bg-[#E8F8F1] p-2 text-[8px] leading-3 text-[#078359]">
        ✓ You&apos;re doing great! Keep engaging with reviews.
      </div>
    </Box>
  );
}
function QuickActions() {
  const actions = [
    [Megaphone, "Create Campaign"],
    [Plus, "Create Post"],
    [SearchCheck, "Run SEO Audit"],
    [UsersRound, "Add Lead"],
    [Globe2, "Generate Report"],
    [UsersRound, "Invite User"],
  ] as const;
  return (
    <Box title="Quick Actions">
      <div className="grid grid-cols-2 gap-1 p-2">
        {actions.map(([Icon, label], index) => (
          <button
            key={label}
            className="flex h-9 items-center gap-2 rounded-md border border-[#E1E7EF] px-2 text-left text-[8px] font-semibold transition-colors hover:bg-[#F8FAFD]"
          >
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", ["bg-[#FFE8EA] text-[#EB0711]", "bg-[#E8F1FF] text-[#1769D2]", "bg-[#DCF8ED] text-[#0A9E70]", "bg-[#EEE7FF] text-[#7B3FE4]", "bg-[#E8F1FF] text-[#1769D2]", "bg-[#FFF0DC] text-[#F07C18]"][index])}>
              <Icon className="size-3.5" />
            </span>
            {label}
          </button>
        ))}
      </div>
    </Box>
  );
}
function Mini({ value, label, trend, negative = false }: { value: string; label: string; trend?: string; negative?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center px-1">
      <b className="block text-[10px] leading-4 text-[#172044]">{value}</b>
      <span className="block min-h-4 whitespace-nowrap text-[7px] leading-4 text-[#71809D]">{label}</span>
      {trend && <span className={cn("block text-[7.5px] font-semibold leading-3", negative ? "text-[#EB3342]" : "text-[#08A36D]")}>{trend}</span>}
    </div>
  );
}
