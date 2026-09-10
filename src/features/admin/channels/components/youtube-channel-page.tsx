"use client";

import Image from "next/image";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  ChartBar,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock,
  EllipsisVertical,
  Eye,
  Heart,
  Image as ImageIcon,
  Lightbulb,
  ListVideo,
  MessageSquare,
  MousePointerClick,
  Pencil,
  Play,
  Radio,
  SlidersHorizontal,
  ThumbsUp,
  Timer,
  Upload,
  UsersRound,
  Video,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { label: "Overview" },
  { label: "Content" },
  { label: "Analytics", caret: true },
  { label: "Audience" },
  { label: "Comments" },
  { label: "Playlists", caret: true },
  { label: "Monetization" },
  { label: "Settings" },
];

const stats = [
  { label: "Views", value: "248.6K", trend: "28%", icon: Eye, color: "blue" },
  { label: "Watch Time (hours)", value: "12.4K", trend: "35%", icon: Clock, color: "purple" },
  { label: "Subscribers", value: "12.4K", trend: "18%", icon: UsersRound, color: "rose" },
  { label: "Avg. View Duration", value: "3:42", trend: "12%", icon: Timer, color: "red" },
  { label: "Impressions", value: "1.2M", trend: "26%", icon: BarChart3, color: "violet" },
  { label: "CTR", value: "6.8%", trend: "14%", icon: MousePointerClick, color: "sky" },
] as const;

const channelHealth = [
  { label: "Channel Verification", ok: true },
  { label: "Profile & Banner", ok: true },
  { label: "Links & About", ok: true },
  { label: "Upload Consistency", ok: false },
  { label: "Audience Growth", ok: true },
  { label: "SEO Optimization", ok: true },
  { label: "Community Engagement", ok: true },
  { label: "Monetization Eligibility", ok: true },
];

const healthDonut = [
  { name: "Score", value: 82, color: "#12A150" },
  { name: "Remaining", value: 18, color: "#E8EDF3" },
];

const quickActions = [
  { label: "Upload Video", icon: Upload, color: "blue" },
  { label: "Go Live", icon: Radio, color: "red" },
  { label: "Create Short", icon: Zap, color: "rose" },
  { label: "Create Playlist", icon: ListVideo, color: "sky" },
  { label: "Manage Thumbnails", icon: ImageIcon, color: "violet" },
  { label: "YouTube Studio", icon: SlidersHorizontal, color: "red" },
  { label: "Keyword Research", icon: Lightbulb, color: "amber" },
  { label: "Competitor Analysis", icon: ChartBar, color: "blue" },
] as const;

/** Mar 18 → Apr 14, the 28-day range shown in the date picker. */
function dayLabel(index: number): string {
  return index < 14 ? `Mar ${18 + index}` : `Apr ${index - 13}`;
}

const axisTicks = ["Mar 18", "Mar 22", "Mar 26", "Mar 30", "Apr 3", "Apr 7", "Apr 11", "Apr 14"];

const performance = Array.from({ length: 28 }, (_, i) => {
  const t = i / 27;
  const wave = (freq: number) => Math.sin(i * freq) * 0.5 + 0.5;
  return {
    label: dayLabel(i),
    views: Math.round(4200 + t * 14200 + wave(1.8) * 2100),
    watchTime: Math.round(2400 + t * 9400 + wave(2.4) * 1300),
    subscribers: Math.round(900 + t * 3600 + wave(2.9) * 620),
  };
});

const performanceSeries = [
  { key: "views", label: "Views", color: "#2D7FF0" },
  { key: "watchTime", label: "Watch Time (hours)", color: "#EA4335" },
  { key: "subscribers", label: "Subscribers", color: "#12B5A6" },
] as const;

const trafficSources = [
  { name: "Browse Features", value: 42.3, color: "#2D7FF0" },
  { name: "Suggested Videos", value: 24.1, color: "#6D5AE6" },
  { name: "YouTube Search", value: 16.8, color: "#F5A524" },
  { name: "External", value: 8.4, color: "#EA4335" },
  { name: "Channel Pages", value: 5.2, color: "#B44BE0" },
  { name: "Others", value: 3.2, color: "#C3CDDC" },
];

const audienceTabs = ["Age & Gender", "Geography", "Devices"];

const gender = [
  { name: "Male", value: 68, color: "#2D7FF0" },
  { name: "Female", value: 32, color: "#F2709B" },
];

const ageGroups = [
  { range: "13-17", value: 8 },
  { range: "18-24", value: 24 },
  { range: "25-34", value: 38 },
  { range: "35-44", value: 20 },
  { range: "45-54", value: 7 },
  { range: "55+", value: 3 },
];

const topVideos = [
  { title: "Clean Ganga Drive | A Step Towards a...", date: "Apr 5, 2025", duration: "8:24", views: "124.6K", likes: "8.2K", comments: "320", photo: "/campaigns/river-cleanup.jpg" },
  { title: "World Water Day 2025 | Every Drop ...", date: "Mar 22, 2025", duration: "6:12", views: "98.4K", likes: "5.1K", comments: "210", photo: "/campaigns/water-conservation.jpg" },
  { title: "Volunteer Spotlight – Real Change M...", date: "Mar 18, 2025", duration: "6:12", views: "56.2K", likes: "3.4K", comments: "98", photo: "/campaigns/tree-planting.jpg" },
  { title: "Join the Movement for a Cleaner Ga...", date: "Mar 10, 2025", duration: "4:36", views: "48.1K", likes: "2.9K", comments: "76", photo: "/campaigns/clean-river.jpg" },
  { title: "Ganga Tourism – Culture, Nature, Ho...", date: "Feb 28, 2025", duration: "7:15", views: "32.7K", likes: "1.8K", comments: "54", photo: "/campaigns/ganga-tourism.jpg" },
];

const comments = [
  { name: "Priya Sharma", time: "10 min ago", text: "Amazing initiative! Proud to support this 🙏", photo: "/campaigns/clean-river.jpg", initials: "PS" },
  { name: "Rahul Mehta", time: "2 hours ago", text: "Very informative video. Keep it up!", initials: "R" },
  { name: "Amit Singh", time: "5 hours ago", text: "Can I volunteer for the next drive?", initials: "R" },
  { name: "Neha Gupta", time: "8 hours ago", text: "Such a great cause ❤️", initials: "R" },
  { name: "Vikram Patel", time: "1 day ago", text: "This gives hope for a cleaner future.", initials: "V" },
];

const commentTints = [
  "bg-[#E7F1FC] text-[#1A6BC4]",
  "bg-[#FFE9EF] text-[#E11D48]",
  "bg-[#FFEFE1] text-[#D97706]",
  "bg-[#E1F8EC] text-[#0B8A4D]",
  "bg-[#F1E9FE] text-[#7C3AED]",
];

const contentCalendar = [
  { month: "APR", day: "15", title: "Clean Ganga Stories – Episode 3", type: "Video", time: "10:00 AM", status: "Scheduled", duration: "12:05", photo: "/campaigns/river-cleanup.jpg" },
  { month: "APR", day: "16", title: "Water Conservation Tips", type: "Shorts", time: "02:00 PM", status: "Scheduled", duration: "0:56", photo: "/campaigns/water-conservation.jpg" },
  { month: "APR", day: "18", title: "Volunteer Announcement", type: "Community Post", time: "11:00 AM", status: "Draft", duration: "0:18", photo: "/campaigns/tree-planting.jpg" },
  { month: "APR", day: "20", title: "Ganga Plants & Wildlife", type: "Video", time: "04:00 PM", status: "Scheduled", duration: "7:30", photo: "/campaigns/clean-river.jpg" },
  { month: "APR", day: "22", title: "Q&A with Our Team", type: "Live", time: "06:00 PM", status: "Scheduled", duration: "1:02", photo: "/campaigns/ganga-tourism.jpg" },
];

const typeTint: Record<string, string> = {
  Video: "bg-[#FFE4E4] text-[#D6293E]",
  Shorts: "bg-[#F1E9FE] text-[#7C3AED]",
  "Community Post": "bg-[#E8F2FF] text-[#1975E7]",
  Live: "bg-[#FFE4E4] text-[#D6293E]",
};

const tint: Record<string, string> = {
  blue: "bg-[#E8F2FF] text-[#1975E7]",
  sky: "bg-[#E4F1FE] text-[#0E86D4]",
  red: "bg-[#FFE4E4] text-[#E02B20]",
  rose: "bg-[#FFE9EF] text-[#E11D48]",
  violet: "bg-[#F1E9FE] text-[#7C3AED]",
  purple: "bg-[#EFE9FE] text-[#6D5AE6]",
  amber: "bg-[#FFF3DC] text-[#E0930B]",
  green: "bg-[#E1F8EC] text-[#0B9457]",
};

export function YouTubeChannelPage() {
  return (
    <div className="space-y-3">
      <Header />
      <Tabs />
      <div className="grid items-start gap-3 [&>section]:h-[236px] xl:grid-cols-[1.71fr_1fr_1fr]">
        <ChannelBanner />
        <ChannelHealth />
        <QuickActions />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid items-start gap-3 [&>section]:h-[224px] xl:grid-cols-[1.6fr_1.02fr_1fr]">
        <PerformanceOverview />
        <TrafficSources />
        <Audience />
      </div>
      <div className="grid items-start gap-3 [&>section]:h-[290px] xl:grid-cols-[1.21fr_.94fr_1fr]">
        <TopVideos />
        <RecentComments />
        <ContentCalendar />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="space-y-2">
      <nav className="flex items-center gap-1.5 text-[11px] text-[#75829D]">
        <span>Channels</span>
        <span className="text-[#B6C0D1]">›</span>
        <span className="font-semibold text-[#E02B20]">YouTube</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-[34px] w-[48px] shrink-0 place-items-center rounded-lg bg-[#FF0000] shadow-[0_1px_5px_rgb(255_0_0/0.28)]">
            <Play className="size-[15px] fill-white text-white" />
          </span>
          <div>
            <h1 className="text-[27px] font-bold leading-8 tracking-[-0.025em] text-[#111B43]">
              YouTube
            </h1>
            <p className="mt-0.5 text-[12.5px] leading-4 text-[#687797]">
              Manage your YouTube channel, content, audience and growth.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="flex h-[42px] items-center gap-2 rounded-lg border border-[#D7E0EB] bg-white px-3 shadow-[0_1px_4px_rgb(31_50_81/0.06)]">
            <CalendarDays className="size-4 shrink-0 text-[#19315E]" />
            <span className="text-left leading-none">
              <b className="block text-[11.5px] leading-4 text-[#172044]">Last 28 days</b>
              <small className="block whitespace-nowrap text-[9.5px] leading-3 text-[#75829D]">
                Mar 18, 2025 – Apr 14, 2025
              </small>
            </span>
            <ChevronDown className="ml-1 size-3.5 shrink-0 text-[#75829D]" />
          </button>
          <button className="flex h-[42px] items-center gap-2 rounded-lg bg-[#E4222B] px-4 text-[12.5px] font-semibold text-white shadow-[0_1px_4px_rgb(228_34_43/0.3)] transition-colors hover:bg-[#C91C24]">
            <Video className="size-4" />
            Create Video
          </button>
        </div>
      </div>
    </header>
  );
}

function Tabs() {
  return (
    <nav className="scrollbar-thin flex gap-6 overflow-x-auto border-b border-[#E2E8F0]">
      {tabs.map((tab, index) => (
        <button
          key={tab.label}
          className={cn(
            "flex shrink-0 items-center gap-1 border-b-2 pb-2.5 text-[12.5px] font-semibold transition-colors",
            index === 0
              ? "border-[#E4222B] text-[#E4222B]"
              : "border-transparent text-[#687797] hover:text-[#172044]",
          )}
        >
          {tab.label}
          {tab.caret && <ChevronDown className="size-3" />}
        </button>
      ))}
    </nav>
  );
}

function Card({
  title,
  action,
  filter,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  filter?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-[#DDE4ED] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]",
        className,
      )}
    >
      {title && (
        <header className="flex h-[42px] shrink-0 items-center justify-between gap-2 px-3.5">
          <h2 className="text-[14px] font-bold leading-5 text-[#172044]">{title}</h2>
          {filter && (
            <button className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-[#DDE4ED] px-2 text-[10.5px] font-medium text-[#425273]">
              {filter}
              <ChevronDown className="size-3" />
            </button>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function ViewAll({ label = "View All" }: { label?: string }) {
  return (
    <button className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#1A6BC4]">
      {label} →
    </button>
  );
}

function ChannelBanner() {
  return (
    <Card>
      <div className="relative h-[104px] shrink-0">
        <Image
          src="/campaigns/ganga-tourism.jpg"
          alt="Namo Gange Trust channel banner"
          fill
          sizes="600px"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B3C63]/45 to-[#0B3C63]/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
          <p className="text-[16px] font-bold leading-5 drop-shadow-sm">
            Cleaner Rivers
            <br />
            Brighter Tomorrows
          </p>
          <p className="mt-1 text-[9px] font-medium tracking-wide drop-shadow-sm">
            Education | Awareness | Action
          </p>
        </div>
        <button className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-md bg-[#1B2333]/80 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
          <Pencil className="size-3" />
          Edit Cover
        </button>
      </div>
      <div className="relative min-h-0 flex-1 px-3.5">
        <span className="absolute -top-[30px] left-3.5 grid size-[62px] place-items-center rounded-full border-[3px] border-white bg-white shadow-[0_2px_8px_rgb(31_50_81/0.16)]">
          <Image
            src="/namogange.webp"
            alt="Namo Gange Trust"
            width={54}
            height={54}
            className="size-full rounded-full object-contain"
          />
        </span>
        <div className="flex items-start justify-between gap-3 pl-[74px] pt-1.5">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[14px] font-bold leading-5 text-[#172044]">
              Namo Gange Trust
              <BadgeCheck className="size-3.5 shrink-0 text-[#1A6BC4]" />
            </p>
            <p className="text-[11px] leading-4 text-[#75829D]">@NamoGangeTrust</p>
            <p className="text-[10.5px] leading-4 text-[#8A97AF]">
              12.4K subscribers • 482 videos
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <button className="flex h-7 items-center gap-1.5 rounded-md border border-[#DDE4ED] px-2.5 text-[10.5px] font-semibold text-[#425273] transition-colors hover:bg-[#F8FAFD]">
              View on YouTube
              <span className="grid h-3.5 w-[19px] place-items-center rounded-[3px] bg-[#FF0000]">
                <Play className="size-2 fill-white text-white" />
              </span>
            </button>
            <button className="flex h-7 items-center justify-center gap-1.5 rounded-md border border-[#DDE4ED] px-2.5 text-[10.5px] font-semibold text-[#425273] transition-colors hover:bg-[#F8FAFD]">
              <Pencil className="size-3" />
              Edit Channel
            </button>
          </div>
        </div>
        <p className="mt-1.5 pb-3 text-[11px] leading-4 text-[#52617D]">
          Working towards a cleaner, healthier Ganga through awareness, action and community
          participation.
        </p>
      </div>
    </Card>
  );
}

function ChannelHealth() {
  return (
    <Card title="Channel Health">
      <div className="grid min-h-0 flex-1 grid-cols-[124px_1fr] items-center gap-2 px-3.5 pb-3.5">
        <div>
          <div className="relative mx-auto size-[118px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={healthDonut}
                  dataKey="value"
                  innerRadius={41}
                  outerRadius={56}
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {healthDonut.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center text-center">
              <span>
                <b className="block text-[22px] leading-6 text-[#142044]">
                  82<small className="text-[11px] font-semibold text-[#8A97AF]">/100</small>
                </b>
                <small className="text-[9.5px] text-[#75829D]">Channel Score</small>
              </span>
            </div>
          </div>
          <p className="mt-0.5 text-center text-[9.5px] font-semibold text-[#0B9457]">
            ↑ 12% <span className="font-normal text-[#8A97AF]">from last month</span>
          </p>
        </div>
        <ul className="space-y-[3px]">
          {channelHealth.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-[10px] text-[#52617D]">
              {item.ok ? (
                <CircleCheck className="size-3.5 shrink-0 text-[#12A150]" />
              ) : (
                <CircleAlert className="size-3.5 shrink-0 text-[#E0930B]" />
              )}
              <span className="truncate">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card title="Quick Actions">
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-4 gap-2 px-3.5 pb-3.5">
        {quickActions.map(({ label, icon: Icon, color }) => (
          <button
            key={label}
            className="flex items-center gap-2 rounded-lg border border-[#E4EAF2] bg-white px-2 text-[10px] font-semibold text-[#425273] transition-colors hover:bg-[#F8FAFD]"
          >
            <span className={cn("grid size-[22px] shrink-0 place-items-center rounded-md", tint[color])}>
              <Icon className="size-3.5" />
            </span>
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  trend,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  trend: string;
  icon: typeof Eye;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#DCE4EE] bg-white px-2.5 py-2 shadow-[0_1px_4px_rgb(31_50_81/0.05)] transition-shadow hover:shadow-md">
      <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-full", tint[color])}>
        <Icon className="size-[17px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] leading-4 text-[#6B7A96]">{label}</p>
        <p className="flex items-baseline gap-1.5">
          <b className="text-[17px] leading-5 tracking-[-0.02em] text-[#142044]">{value}</b>
          <span className="whitespace-nowrap text-[9.5px] font-bold text-[#0B9457]">↑ {trend}</span>
        </p>
      </div>
    </div>
  );
}

function ChartLegend({ items }: { items: readonly { label: string; color: string }[] }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3.5 gap-y-1 text-[10px] text-[#52617D]">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <i className="size-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function PerformanceOverview() {
  return (
    <Card title="Performance Overview" filter="Last 28 days">
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
        <ChartLegend items={performanceSeries} />
        <div className="min-h-0 flex-1 pt-1">
          <ResponsiveContainer>
            <AreaChart data={performance} margin={{ top: 4, right: 14, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="ytViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2D7FF0" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2D7FF0" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EDF1F7" vertical={false} />
              <XAxis
                dataKey="label"
                ticks={axisTicks}
                tick={{ fontSize: 9.5, fill: "#8A97AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9.5, fill: "#8A97AF" }}
                axisLine={false}
                tickLine={false}
                width={42}
                domain={[0, 20000]}
                ticks={[0, 5000, 10000, 15000, 20000]}
                tickFormatter={(value: number) => (value ? `${value / 1000}K` : "0")}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid #DDE4ED",
                  padding: "6px 10px",
                }}
                formatter={(value) => Number(value).toLocaleString("en-IN")}
              />
              <Area
                dataKey="views"
                name="Views"
                stroke="#2D7FF0"
                strokeWidth={1.7}
                fill="url(#ytViews)"
                dot={{ r: 1.8, strokeWidth: 0, fill: "#2D7FF0" }}
                isAnimationActive={false}
              />
              {performanceSeries.slice(1).map((series) => (
                <Line
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={1.6}
                  dot={{ r: 1.8, strokeWidth: 0, fill: series.color }}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

function TrafficSources() {
  return (
    <Card title="Traffic Sources" action={<ViewAll label="View Details" />}>
      <div className="grid min-h-0 flex-1 grid-cols-[124px_1fr] items-center gap-2 px-3.5 pb-3">
        <div className="relative size-[122px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={trafficSources}
                dataKey="value"
                innerRadius={38}
                outerRadius={58}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {trafficSources.map((slice) => (
                  <Cell key={slice.name} fill={slice.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center text-center">
            <span>
              <b className="block text-[16px] leading-5 text-[#142044]">248.6K</b>
              <small className="text-[9px] text-[#75829D]">Total Views</small>
            </span>
          </div>
        </div>
        <ul className="min-w-0 space-y-[5px]">
          {trafficSources.map((slice) => (
            <li key={slice.name} className="flex items-center gap-1.5 text-[10.5px]">
              <i className="size-2 shrink-0 rounded-full" style={{ background: slice.color }} />
              <span className="min-w-0 flex-1 truncate text-[#52617D]">{slice.name}</span>
              <b className="shrink-0 text-[#172044]">{slice.value}%</b>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Audience() {
  return (
    <Card title="Audience">
      <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-3">
        <div className="scrollbar-thin flex shrink-0 gap-4 overflow-x-auto border-b border-[#E8EDF3]">
          {audienceTabs.map((tab, index) => (
            <button
              key={tab}
              className={cn(
                "shrink-0 border-b-2 pb-1.5 text-[11px] font-semibold transition-colors",
                index === 0
                  ? "border-[#E4222B] text-[#E4222B]"
                  : "border-transparent text-[#8A97AF] hover:text-[#172044]",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[104px_1fr] items-center gap-2">
          <div>
            <div className="relative mx-auto size-[86px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={gender}
                    dataKey="value"
                    innerRadius={26}
                    outerRadius={41}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {gender.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-0.5 flex justify-center gap-3">
              {gender.map((slice) => (
                <span key={slice.name} className="text-center">
                  <UsersRound
                    className="mx-auto size-3"
                    style={{ color: slice.color }}
                  />
                  <b className="block text-[12px] leading-4 text-[#142044]">{slice.value}%</b>
                  <small className="text-[8.5px] text-[#8A97AF]">{slice.name}</small>
                </span>
              ))}
            </div>
          </div>
          <ul className="min-w-0 space-y-[5px]">
            {ageGroups.map((group) => (
              <li
                key={group.range}
                className="grid grid-cols-[38px_1fr_26px] items-center gap-1.5 text-[9.5px]"
              >
                <span className="text-[#52617D]">{group.range}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-[#EDF1F7]">
                  <i
                    className="block h-full rounded-full bg-[#2D7FF0]"
                    style={{ width: `${(group.value / 64) * 100}%` }}
                  />
                </span>
                <b className="text-right text-[#172044]">{group.value}%</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function TopVideos() {
  return (
    <Card title="Top Performing Videos" action={<ViewAll />}>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3">
        {topVideos.map((video, index) => (
          <div
            key={video.title}
            className="flex items-center gap-2 border-t border-[#EDF1F5] py-[7px] first:border-t-0"
          >
            <span className="w-3 shrink-0 text-center text-[10px] font-bold text-[#8A97AF]">
              {index + 1}
            </span>
            <span className="relative shrink-0">
              <Image
                src={video.photo}
                alt=""
                width={54}
                height={32}
                className="h-8 w-[54px] rounded object-cover"
              />
              <i className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-0.5 text-[7px] font-semibold not-italic text-white">
                {video.duration}
              </i>
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[10.5px] font-semibold text-[#172044]">
                {video.title}
              </b>
              <small className="block text-[9px] text-[#8A97AF]">{video.date}</small>
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-[9.5px] text-[#52617D]">
              <Play className="size-2.5 shrink-0 fill-[#9AA6BC] text-[#9AA6BC]" />
              {video.views}
            </span>
            <span className="flex w-[46px] shrink-0 items-center gap-0.5 text-[9.5px] text-[#52617D]">
              <ThumbsUp className="size-2.5 shrink-0 text-[#9AA6BC]" />
              {video.likes}
            </span>
            <span className="flex w-[38px] shrink-0 items-center gap-0.5 text-[9.5px] text-[#52617D]">
              <MessageSquare className="size-2.5 shrink-0 text-[#9AA6BC]" />
              {video.comments}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentComments() {
  return (
    <Card title="Recent Comments" action={<ViewAll />}>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3.5">
        {comments.map((comment, index) => (
          <div
            key={comment.name}
            className="flex items-center gap-2 border-t border-[#EDF1F5] py-2 first:border-t-0"
          >
            {index === 0 && comment.photo ? (
              <Image
                src={comment.photo}
                alt=""
                width={28}
                height={28}
                className="size-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                  commentTints[index],
                )}
              >
                {comment.initials}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5">
                <b className="truncate text-[10.5px] font-semibold text-[#172044]">
                  {comment.name}
                </b>
                <small className="shrink-0 text-[9px] text-[#8A97AF]">{comment.time}</small>
              </p>
              <p className="truncate text-[10px] leading-4 text-[#52617D]">{comment.text}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-[#9AA6BC]">
              <ThumbsUp className="size-3.5" />
              <Heart className="size-3.5" />
              <EllipsisVertical className="size-3.5" />
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ContentCalendar() {
  return (
    <Card title="Content Calendar" action={<ViewAll />}>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3.5">
        {contentCalendar.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-2 border-t border-[#EDF1F5] py-2 first:border-t-0"
          >
            <span className="grid w-[30px] shrink-0 place-items-center rounded-md bg-[#FFEFF0] py-0.5 leading-none text-[#D6323C]">
              <small className="text-[7.5px] font-bold">{item.month}</small>
              <b className="text-[12px] font-bold leading-4">{item.day}</b>
            </span>
            <span className="relative shrink-0">
              <Image
                src={item.photo}
                alt=""
                width={44}
                height={30}
                className="h-[30px] w-11 rounded object-cover"
              />
              <i className="absolute bottom-0.5 right-0.5 rounded bg-black/75 px-0.5 text-[6.5px] font-semibold not-italic text-white">
                {item.duration}
              </i>
            </span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[10.5px] font-semibold text-[#172044]">
                {item.title}
              </b>
              <p className="flex items-center gap-1.5">
                <i
                  className={cn(
                    "shrink-0 rounded px-1 py-px text-[8.5px] font-semibold not-italic",
                    typeTint[item.type],
                  )}
                >
                  {item.type}
                </i>
                <small className="shrink-0 text-[9px] text-[#8A97AF]">{item.time}</small>
              </p>
            </div>
            <i
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold not-italic",
                item.status === "Scheduled"
                  ? "bg-[#E1F8EC] text-[#0B8A4D]"
                  : "bg-[#EEF1F6] text-[#5B6B87]",
              )}
            >
              {item.status}
            </i>
          </div>
        ))}
      </div>
    </Card>
  );
}
