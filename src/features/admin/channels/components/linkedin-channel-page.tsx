"use client";

import Image from "next/image";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  AtSign,
  BarChart3,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  Heart,
  Link as LinkIcon,
  MapPin,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  PenLine,
  RefreshCcw,
  Settings,
  ThumbsUp,
  TrendingUp,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { cn } from "@/lib/utils/cn";


const tabs = [
  "Overview",
  "Posts",
  "Analytics",
  "Audience",
  "Campaigns",
  "Leads",
  "Inbox",
  "Settings",
];

const keyMetrics = [
  { label: "Total Followers", value: "12,482", trend: "18%", icon: UsersRound, color: "blue" },
  { label: "Profile Views", value: "248", trend: "22%", icon: Eye, color: "purple" },
  { label: "Post Impressions", value: "86,452", trend: "28%", icon: BarChart3, color: "indigo" },
  { label: "Post Engagements", value: "6,248", trend: "34%", icon: Heart, color: "rose" },
  { label: "Website Clicks", value: "312", trend: "26%", icon: MousePointerClick, color: "amber" },
  { label: "New Followers", value: "48", trend: "52%", icon: UserPlus, color: "green" },
] as const;

const demographics = [
  { name: "Operations", value: 28, color: "#0A66C2" },
  { name: "Education", value: 18, color: "#21C56A" },
  { name: "Community & Social S...", value: 14, color: "#8B5CF6" },
  { name: "Government", value: 12, color: "#F5A524" },
  { name: "Healthcare", value: 10, color: "#F43F63" },
  { name: "Other", value: 18, color: "#C3CDDC" },
];

const demographicTabs = ["Job Function", "Industry", "Location", "Seniority"];

/** Mar 15 → Apr 14, the range shown in the date picker. */
function dayLabel(index: number): string {
  return index < 17 ? `Mar ${15 + index}` : `Apr ${index - 16}`;
}

const axisTicks = ["Mar 15", "Mar 20", "Mar 25", "Mar 30", "Apr 5", "Apr 10", "Apr 14"];

const performanceTrend = Array.from({ length: 31 }, (_, i) => {
  const t = i / 30;
  const wave = (freq: number) => Math.sin(i * freq) * 0.5 + 0.5;
  return {
    label: dayLabel(i),
    impressions: Math.round(12400 + t * 25600 + wave(1.7) * 2400),
    followers: Math.round(5200 + t * 16600 + wave(2.3) * 800),
    engagements: Math.round(2100 + t * 4000 + wave(3.1) * 420),
    profileViews: Math.round(1100 + t * 2800 + wave(2.7) * 300),
  };
});

const pageGrowth = Array.from({ length: 31 }, (_, i) => {
  const t = i / 30;
  const wave = (freq: number) => Math.sin(i * freq) * 0.5 + 0.5;
  return {
    label: dayLabel(i),
    gained: Math.round(170 + t * 210 + wave(1.9) * 190),
    lost: -Math.round(46 + wave(2.6) * 78),
  };
});

const trendSeries = [
  { key: "impressions", label: "Impressions", color: "#2D7FF0" },
  { key: "engagements", label: "Engagements", color: "#21C56A" },
  { key: "profileViews", label: "Profile Views", color: "#8B5CF6" },
  { key: "followers", label: "Followers (cumulative)", color: "#F5A524" },
] as const;

const topPosts = [
  { title: "Clean Ganga Drive – A Step Towards ...", date: "Apr 10, 2025", type: "Image", views: "12.4K", likes: "842", comments: "120", photo: "/campaigns/river-cleanup.jpg" },
  { title: "Volunteer Spotlight – Real Change M...", date: "Apr 5, 2025", type: "Video", views: "9.8K", likes: "612", comments: "86", photo: "/campaigns/tree-planting.jpg" },
  { title: "World Water Day 2025 | Every Drop ...", date: "Mar 22, 2025", type: "Image", views: "8.1K", likes: "540", comments: "64", photo: "/campaigns/water-conservation.jpg" },
  { title: "Join the Movement for a Cleaner Ga...", date: "Mar 18, 2025", type: "Carousel", views: "6.9K", likes: "468", comments: "52", photo: "/campaigns/clean-river.jpg" },
  { title: "Namo Gange at Community Outreach", date: "Mar 12, 2025", type: "Video", views: "5.7K", likes: "390", comments: "41", photo: "/campaigns/ganga-tourism.jpg" },
];

const contentCalendar = [
  { month: "APR", day: "15", title: "Clean Ganga, Green India", time: "10:00 AM", status: "Scheduled" },
  { month: "APR", day: "16", title: "Volunteer Stories Series", time: "02:00 PM", status: "Scheduled" },
  { month: "APR", day: "17", title: "Infographic – Water Conservation Tips", time: "11:00 AM", status: "Scheduled" },
  { month: "APR", day: "18", title: "Campaign Announcement", time: "05:00 PM", status: "Draft" },
  { month: "APR", day: "20", title: "Throwback – On Ground Impact", time: "10:00 AM", status: "Draft" },
];

const growthTiles = [
  { label: "Total New Followers", value: "48", trend: "52%", up: true },
  { label: "Total Unfollows", value: "12", trend: "8%", up: false },
  { label: "Net Growth", value: "+36", trend: "68%", up: true },
] as const;

const quickActions = [
  { label: "Create Post", icon: PenLine, primary: true },
  { label: "Schedule Post", icon: CalendarClock },
  { label: "Boost Post", icon: Megaphone },
  { label: "View Page", icon: ExternalLink },
  { label: "Manage Campaigns", icon: TrendingUp },
  { label: "Export Report", icon: Download },
  { label: "Audience Insights", icon: UsersRound },
  { label: "Page Settings", icon: Settings },
] as const;

const recentActivity = [
  { title: "New follower", detail: "Priya Sharma started following your page.", time: "10 min ago", icon: UserPlus, color: "blue" },
  { title: "Post performed well", detail: "“Clean Ganga Drive” reached 10K impressions.", time: "2 hours ago", brand: true, color: "blue" },
  { title: "Comment received", detail: "Amit S. commented on your post.", time: "4 hours ago", icon: MessageSquare, color: "amber" },
  { title: "Mention detected", detail: "You were mentioned in a post by Green India Initiative.", time: "6 hours ago", icon: AtSign, color: "green" },
] as const;

const tint: Record<string, string> = {
  blue: "bg-[#E7F1FC] text-[#0A66C2]",
  indigo: "bg-[#E8EDFD] text-[#3B5BDB]",
  purple: "bg-[#F1E9FE] text-[#7C3AED]",
  rose: "bg-[#FFE9EF] text-[#E11D48]",
  amber: "bg-[#FFF3DC] text-[#D97706]",
  green: "bg-[#E1F8EC] text-[#0F9D58]",
};

export function LinkedInChannelPage() {
  return (
    <div className="space-y-3">
      <Header />
      <Tabs />
      <div className="grid items-start gap-3 [&>section]:h-[318px] xl:grid-cols-[1.18fr_1fr_1fr]">
        <PageOverview />
        <KeyMetrics />
        <AudienceDemographics />
      </div>
      <div className="grid items-start gap-3 [&>section]:h-[234px] xl:grid-cols-[.96fr_1fr]">
        <PerformanceTrend />
        <TopPosts />
      </div>
      <div className="grid items-start gap-3 [&>section]:h-[340px] xl:grid-cols-[.86fr_.88fr_1fr]">
        <ContentCalendar />
        <PageGrowth />
        <ActionsAndActivity />
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
        <span className="font-semibold text-[#0A66C2]">LinkedIn</span>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image
            src="/brands/linkedin.svg"
            alt="LinkedIn"
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-[10px]"
          />
          <div>
            <h1 className="text-[27px] font-bold leading-8 tracking-[-0.025em] text-[#111B43]">
              LinkedIn
            </h1>
            <p className="mt-0.5 text-[12.5px] leading-4 text-[#687797]">
              Manage your LinkedIn company page, content, analytics and audience growth.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <button className="flex h-[42px] items-center gap-2 rounded-lg border border-[#D7E0EB] bg-white px-3 shadow-[0_1px_4px_rgb(31_50_81/0.06)]">
            <CalendarDays className="size-4 shrink-0 text-[#19315E]" />
            <span className="text-left leading-none">
              <b className="block text-[11.5px] leading-4 text-[#172044]">Last 30 days</b>
              <small className="block whitespace-nowrap text-[9.5px] leading-3 text-[#75829D]">
                Mar 15, 2025 – Apr 14, 2025
              </small>
            </span>
            <ChevronDown className="ml-1 size-3.5 shrink-0 text-[#75829D]" />
          </button>
          <div className="text-right">
            <button className="flex h-[38px] items-center gap-2 rounded-lg bg-[#0A66C2] px-4 text-[12.5px] font-semibold text-white shadow-[0_1px_4px_rgb(10_102_194/0.3)] transition-colors hover:bg-[#0958A8]">
              <RefreshCcw className="size-3.5" />
              Sync LinkedIn
            </button>
            <p className="mt-1 text-[9.5px] text-[#8A97AF]">Last synced: 1 hour ago</p>
          </div>
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
          key={tab}
          className={cn(
            "shrink-0 border-b-2 pb-2.5 text-[12.5px] font-semibold transition-colors",
            index === 0
              ? "border-[#0A66C2] text-[#0A66C2]"
              : "border-transparent text-[#687797] hover:text-[#172044]",
          )}
        >
          {tab}
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
  title: string;
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
      <header className="flex h-[46px] shrink-0 items-center justify-between gap-2 px-3.5">
        <h2 className="text-[14.5px] font-bold text-[#172044]">{title}</h2>
        {filter && (
          <button className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-[#DDE4ED] px-2 text-[11px] font-medium text-[#425273]">
            {filter}
            <ChevronDown className="size-3" />
          </button>
        )}
        {action}
      </header>
      {children}
    </section>
  );
}

function CardLink({ label, arrow = "→" }: { label: string; arrow?: string }) {
  return (
    <button className="shrink-0 whitespace-nowrap text-[11.5px] font-semibold text-[#0A66C2]">
      {label} {arrow}
    </button>
  );
}

function PageOverview() {
  return (
    <Card
      title="Page Overview"
      action={
        <span className="flex shrink-0 items-center gap-2">
          <button className="flex items-center gap-1 whitespace-nowrap text-[11.5px] font-semibold text-[#0A66C2]">
            View on LinkedIn
            <ArrowUpRight className="size-3" />
          </button>
          <button className="h-7 rounded-md border border-[#DDE4ED] px-2.5 text-[11px] font-semibold text-[#425273] transition-colors hover:bg-[#F8FAFD]">
            Edit Page
          </button>
        </span>
      }
    >
      <div className="min-h-0 flex-1 px-3.5 pb-3.5">
        <div className="relative">
          <div className="relative h-[104px] overflow-hidden rounded-lg">
            <Image
              src="/campaigns/river-cleanup.jpg"
              alt="Namo Gange Trust page banner"
              fill
              sizes="480px"
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[#0B3C63]/35" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
              <p className="text-[13px] font-bold leading-[17px] drop-shadow-sm">
                Clean Rivers
                <br />
                Healthy Communities
                <br />
                Brighter Tomorrow
              </p>
              <span className="mt-1 rounded bg-[#0A66C2] px-1.5 py-0.5 text-[8.5px] font-semibold">
                #GangaForFuture
              </span>
            </div>
          </div>
          <span className="absolute -bottom-5 left-3 grid size-[58px] place-items-center rounded-lg border border-[#E8EDF3] bg-white p-1 shadow-[0_2px_8px_rgb(31_50_81/0.14)]">
            <Image
              src="/namogange.webp"
              alt="Namo Gange Trust"
              width={48}
              height={48}
              className="size-full object-contain"
            />
          </span>
        </div>
        <div className="mt-7 pl-[74px]">
          <p className="text-[14px] font-bold leading-5 text-[#172044]">Namo Gange Trust</p>
          <p className="text-[11px] leading-4 text-[#75829D]">Non-profit Organization</p>
        </div>
        <p className="mt-2 text-[11.5px] leading-[17px] text-[#52617D]">
          Working towards a cleaner Ganga through awareness, action and community participation.
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#52617D]">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-[#8A97AF]" />
            New Delhi, India
          </span>
          <span className="flex items-center gap-1.5">
            <Briefcase className="size-3.5 shrink-0 text-[#8A97AF]" />
            Non-profit Organization
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-[#0A66C2]">
            <LinkIcon className="size-3.5 shrink-0" />
            namogangetrust.org
          </span>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#52617D]">
          <UsersRound className="size-3.5 shrink-0 text-[#8A97AF]" />
          12,482 followers · 50–200 employees
        </p>
      </div>
    </Card>
  );
}

function KeyMetrics() {
  return (
    <Card title="Key Metrics" filter="Last 30 days">
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-2 px-3.5 pb-3.5">
        {keyMetrics.map(({ label, value, trend, icon: Icon, color }) => (
          <div
            key={label}
            className="flex flex-col justify-center rounded-lg border border-[#E4EAF2] bg-[#FBFCFE] px-2.5 py-2"
          >
            <span className={cn("grid size-8 place-items-center rounded-lg", tint[color])}>
              <Icon className="size-4" />
            </span>
            <b className="mt-2 block text-[19px] leading-6 tracking-[-0.02em] text-[#142044]">
              {value}
            </b>
            <p className="whitespace-nowrap text-[10px] leading-[13px] text-[#6B7A96]">{label}</p>
            <p className="text-[10.5px] font-bold leading-4 text-[#0F9D58]">↑ {trend}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AudienceDemographics() {
  return (
    <Card title="Audience Demographics" action={<CardLink label="View Details" />}>
      <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-3.5">
        <div className="scrollbar-thin flex shrink-0 gap-5 overflow-x-auto border-b border-[#E8EDF3]">
          {demographicTabs.map((tab, index) => (
            <button
              key={tab}
              className={cn(
                "shrink-0 border-b-2 pb-2 text-[11.5px] font-semibold transition-colors",
                index === 0
                  ? "border-[#0A66C2] text-[#0A66C2]"
                  : "border-transparent text-[#8A97AF] hover:text-[#172044]",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[148px_1fr] items-center gap-3">
          <div className="relative size-[148px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={demographics}
                  dataKey="value"
                  innerRadius={47}
                  outerRadius={72}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {demographics.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center text-center">
              <span>
                <b className="block text-[19px] leading-6 text-[#142044]">12,482</b>
                <small className="text-[10.5px] text-[#75829D]">Followers</small>
              </span>
            </div>
          </div>
          <div className="min-w-0 space-y-[7px]">
            {demographics.map((slice) => (
              <div key={slice.name} className="flex items-center gap-2 text-[11.5px]">
                <i className="size-2 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="min-w-0 flex-1 truncate text-[#52617D]">{slice.name}</span>
                <b className="shrink-0 text-[#172044]">{slice.value}%</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ChartLegend({
  items,
}: {
  items: readonly { label: string; color: string }[];
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#52617D]">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <i className="size-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function PerformanceTrend() {
  return (
    <Card title="Performance Trend" filter="Last 30 days">
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
        <ChartLegend items={trendSeries} />
        <div className="min-h-0 flex-1 pt-1">
          <ResponsiveContainer>
            <AreaChart data={performanceTrend} margin={{ top: 4, right: 16, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="liImpressions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2D7FF0" stopOpacity={0.2} />
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
                width={40}
                domain={[0, 40000]}
                ticks={[0, 10000, 20000, 30000, 40000]}
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
                dataKey="impressions"
                name="Impressions"
                stroke="#2D7FF0"
                strokeWidth={1.8}
                fill="url(#liImpressions)"
                dot={{ r: 1.7, strokeWidth: 0, fill: "#2D7FF0" }}
                isAnimationActive={false}
              />
              {trendSeries.slice(1).map((series) => (
                <Line
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={1.6}
                  dot={{ r: 1.7, strokeWidth: 0, fill: series.color }}
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

const postCols = "grid-cols-[1.6fr_.62fr_.5fr_.42fr_.38fr_.34fr]";

function TopPosts() {
  return (
    <Card title="Top Performing Posts" action={<CardLink label="View All" />}>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3">
        {topPosts.map((post) => (
          <div
            key={post.title}
            className={cn(
              "grid items-center gap-2 border-t border-[#EDF1F5] py-[3px] text-[11px] text-[#52617D] first:border-t-0",
              postCols,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Image
                src={post.photo}
                alt=""
                width={42}
                height={30}
                className="h-[30px] w-[42px] shrink-0 rounded object-cover"
              />
              <b className="truncate text-[11.5px] font-semibold text-[#172044]">{post.title}</b>
            </span>
            <span className="whitespace-nowrap text-[10.5px]">{post.date}</span>
            <span>
              <i className="rounded bg-[#EAF2FE] px-1.5 py-0.5 text-[10px] font-semibold not-italic text-[#1A6BC4]">
                {post.type}
              </i>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Eye className="size-3 shrink-0 text-[#9AA6BC]" />
              {post.views}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <ThumbsUp className="size-3 shrink-0 text-[#9AA6BC]" />
              {post.likes}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <MessageSquare className="size-3 shrink-0 text-[#9AA6BC]" />
              {post.comments}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ContentCalendar() {
  return (
    <Card title="Content Calendar" action={<CardLink label="View Calendar" />}>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3.5 pb-2">
        {contentCalendar.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-2.5 border-t border-[#EDF1F5] py-2 first:border-t-0"
          >
            <span className="grid w-[34px] shrink-0 place-items-center rounded-md bg-[#FFEFF0] py-0.5 leading-none text-[#D6323C]">
              <small className="text-[8px] font-bold">{item.month}</small>
              <b className="text-[13px] font-bold leading-4">{item.day}</b>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold leading-4 text-[#172044]">
                {item.title}
              </p>
              <p className="text-[10px] leading-4 text-[#8A97AF]">{item.time}</p>
            </div>
            <i
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold not-italic",
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

function PageGrowth() {
  return (
    <Card title="Page Growth" filter="Last 30 days">
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        <ChartLegend
          items={[
            { label: "New Followers", color: "#2D7FF0" },
            { label: "Unfollows", color: "#F4485B" },
          ]}
        />
        <div className="min-h-0 flex-1 pt-1">
          <ResponsiveContainer>
            <BarChart data={pageGrowth} margin={{ top: 4, right: 14, left: -4, bottom: 0 }} barGap={0}>
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
                width={44}
                domain={[-200, 600]}
                ticks={[-200, 0, 200, 400, 600]}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: "1px solid #DDE4ED",
                  padding: "6px 10px",
                }}
                formatter={(value) => Math.abs(Number(value))}
              />
              <ReferenceLine y={0} stroke="#D7DFEA" />
              <Bar dataKey="gained" name="New Followers" fill="#2D7FF0" isAnimationActive={false} />
              <Bar dataKey="lost" name="Unfollows" fill="#F4485B" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2">
          {growthTiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-lg border border-[#E4EAF2] bg-[#FBFCFE] px-2 py-1.5"
            >
              <p className="truncate text-[9.5px] leading-3 text-[#7A87A0]">{tile.label}</p>
              <p className="flex items-baseline gap-1">
                <b className="text-[16px] leading-5 text-[#142044]">{tile.value}</b>
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    tile.up ? "text-[#0F9D58]" : "text-[#E11D48]",
                  )}
                >
                  {tile.up ? "↑" : "↓"} {tile.trend}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ActionsAndActivity() {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-[#DDE4ED] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
      <header className="flex h-[46px] shrink-0 items-center px-3.5">
        <h2 className="text-[14.5px] font-bold text-[#172044]">Quick Actions</h2>
      </header>
      <div className="grid shrink-0 grid-cols-4 gap-2 px-3.5 pb-3.5">
        {quickActions.map(({ label, icon: Icon, ...rest }) => {
          const primary = "primary" in rest && rest.primary;
          return (
            <button
              key={label}
              className={cn(
                "flex h-[42px] flex-col items-center justify-center gap-1 rounded-lg border text-[9.5px] font-semibold leading-3 transition-colors",
                primary
                  ? "border-[#BBD7F5] bg-[#EAF3FD] text-[#0A66C2]"
                  : "border-[#E4EAF2] bg-white text-[#425273] hover:bg-[#F8FAFD]",
              )}
            >
              <Icon className={cn("size-4", primary ? "text-[#0A66C2]" : "text-[#6B7A96]")} />
              {label}
            </button>
          );
        })}
      </div>
      <header className="flex h-9 shrink-0 items-center justify-between border-t border-[#EDF1F5] px-3.5">
        <h2 className="text-[13px] font-bold text-[#172044]">Recent Activity</h2>
        <CardLink label="View All" />
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3.5 pb-2">
        {recentActivity.map(({ title, detail, time, color, ...rest }) => {
          const Icon = "icon" in rest ? rest.icon : null;
          return (
            <div
              key={title}
              className="flex items-center gap-2 border-t border-[#EDF1F5] py-[3px] first:border-t-0"
            >
              {Icon ? (
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", tint[color])}>
                  <Icon className="size-3.5" />
                </span>
              ) : (
                <ChannelLogo channel="LinkedIn" className="size-6 shrink-0 rounded-full" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold leading-[14px] text-[#172044]">{title}</p>
                <p className="truncate text-[10px] leading-[14px] text-[#8A97AF]">{detail}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[9.5px] text-[#9AA6BC]">{time}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

