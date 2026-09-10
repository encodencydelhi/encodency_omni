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
  BadgeCheck,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ChevronDown,
  Heart,
  Link2,
  Megaphone,
  MessageCircle,
  MoreVertical,
  PenLine,
  RefreshCcw,
  Rocket,
  Signal,
  UsersRound,
  Video,
  XCircle,
} from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { cn } from "@/lib/utils/cn";

const stats = [
  { label: "Connected Accounts", value: "2", trend: "0%", note: "Facebook + Instagram", icon: Link2, color: "blue" },
  { label: "Total Followers", value: "24.6K", trend: "12%", note: "+ 2.6K this month", icon: UsersRound, color: "sky" },
  { label: "Total Reach", value: "186.3K", trend: "28%", note: "+40.8K from last month", icon: Signal, color: "green" },
  { label: "Engagement Rate", value: "4.8%", trend: "16%", note: "Industry avg. 2.9%", icon: Heart, color: "red" },
  { label: "Scheduled Posts", value: "12", trend: "33%", note: "Next 7 days", icon: CalendarRange, color: "purple" },
  { label: "Ad Spend", value: "₹12,450", trend: "8%", note: "Across 4 campaigns", icon: Megaphone, color: "rose" },
] as const;

const performance = [
  { d: "Mar 15", fbReach: 12000, igReach: 6800, fbEng: 900, igEng: 520 },
  { d: "Mar 20", fbReach: 18600, igReach: 11200, fbEng: 1250, igEng: 780 },
  { d: "Mar 25", fbReach: 22400, igReach: 14800, fbEng: 1480, igEng: 960 },
  { d: "Mar 30", fbReach: 26800, igReach: 18200, fbEng: 1720, igEng: 1180 },
  { d: "Apr 5", fbReach: 30200, igReach: 21600, fbEng: 1980, igEng: 1420 },
  { d: "Apr 10", fbReach: 34600, igReach: 25400, fbEng: 2240, igEng: 1680 },
  { d: "Apr 14", fbReach: 38200, igReach: 29800, fbEng: 2480, igEng: 1920 },
];

const accounts = [
  {
    id: "fb",
    channel: "Facebook",
    name: "Namo Gange Trust",
    type: "Facebook Page",
    photo: "/campaigns/river-cleanup.jpg",
    metrics: [
      ["18.2K", "Followers"],
      ["4.6%", "Engagement"],
      ["12.4K", "Reach (30d)"],
      ["342", "Posts"],
    ],
  },
  {
    id: "ig",
    channel: "Instagram",
    name: "@namogangetrust",
    type: "Instagram Business",
    photo: "/campaigns/clean-river.jpg",
    metrics: [
      ["6.4K", "Followers"],
      ["5.3%", "Engagement"],
      ["8.6K", "Reach (30d)"],
      ["287", "Posts"],
    ],
  },
] as const;

const attention = [
  { title: "Ad spend 32% higher than usual", detail: "Clean Ganga Awareness · 2 hours ago", tone: "amber", icon: AlertTriangle },
  { title: "18 unread Instagram comments", detail: "Across 3 recent posts · 4 hours ago", tone: "red", icon: MessageCircle },
  { title: "Ad rejected by Meta", detail: "River Conservation · 6 hours ago", tone: "red", icon: XCircle },
  { title: "Page media sync failed", detail: "Namo Gange Trust · 12 hours ago", tone: "red", icon: RefreshCcw },
] as const;

const posts = [
  { title: "Clean Ganga, Brighter...", excerpt: "A cleaner tomorrow...", platform: "Instagram", type: "Reel", reach: "24.8K", engagement: "6.2%", clicks: "1.2K", published: "Apr 12, 2025", photo: "/campaigns/clean-river.jpg" },
  { title: "Rivers Save Lives", excerpt: "Together for river...", platform: "Instagram", type: "Image", reach: "18.6K", engagement: "4.8%", clicks: "892", published: "Apr 10, 2025", photo: "/campaigns/river-cleanup.jpg" },
  { title: "Volunteer with Us", excerpt: "Be the change", platform: "Facebook", type: "Reel", reach: "16.2K", engagement: "5.9%", clicks: "1.1K", published: "Apr 8, 2025", photo: "/campaigns/tree-planting.jpg" },
  { title: "World Water Day 2025", excerpt: "Water unites us", platform: "Facebook", type: "Video", reach: "14.7K", engagement: "4.1%", clicks: "642", published: "Apr 5, 2025", photo: "/campaigns/water-conservation.jpg" },
  { title: "Small Actions Big Impact", excerpt: "Keep our rivers clean", platform: "Instagram", type: "Carousel", reach: "12.3K", engagement: "3.6%", clicks: "521", published: "Apr 2, 2025", photo: "/campaigns/ganga-tourism.jpg" },
];

const metaCampaigns = [
  { name: "Clean Ganga Awareness", objective: "Awareness", spend: "₹4,320", leads: "86", links: "66", cpl: "₹50", status: "Active", photo: "/campaigns/clean-river.jpg" },
  { name: "Volunteer Drive", objective: "Leads", spend: "₹3,120", leads: "62", links: "62", cpl: "₹50", status: "Active", photo: "/campaigns/tree-planting.jpg" },
  { name: "River Conservation", objective: "Traffic", spend: "₹2,450", leads: "28", links: "42", cpl: "₹88", status: "Active", photo: "/campaigns/river-cleanup.jpg" },
  { name: "World Water Day", objective: "Engagement", spend: "₹1,860", leads: "—", links: "—", cpl: "—", status: "Completed", photo: "/campaigns/water-conservation.jpg" },
  { name: "Donate for Change", objective: "Conversions", spend: "₹700", leads: "18", links: "12", cpl: "₹39", status: "Active", photo: "/campaigns/ganga-tourism.jpg" },
];

const quickActions = [
  { label: "Create Post", icon: PenLine, color: "rose" },
  { label: "Schedule Reel", icon: Video, color: "purple" },
  { label: "Launch Campaign", icon: Rocket, color: "blue" },
  { label: "Sync Accounts", icon: RefreshCcw, color: "green" },
  { label: "View Leads", icon: UsersRound, color: "amber" },
  { label: "Open Calendar", icon: CalendarPlus, color: "slate" },
] as const;

const gender = [
  { name: "Women", value: 62, color: "#F2709B" },
  { name: "Men", value: 36, color: "#3186F3" },
  { name: "Other", value: 2, color: "#C3CDDC" },
];

const locations = [
  { name: "Delhi", value: 28 },
  { name: "Uttar Pradesh", value: 18 },
  { name: "Maharashtra", value: 12 },
  { name: "Bihar", value: 8 },
  { name: "Other", value: 34 },
];

const conversations = [
  { user: "Priya Sharma", platform: "Instagram", message: "This is such an important initiative! ...", time: "10 min ago", type: "Comment" },
  { user: "Rahul Verma", platform: "Facebook", message: "How can I volunteer?", time: "45 min ago", type: "Message" },
  { user: "Sneha Kapoor", platform: "Instagram", message: "Amazing work 🙌", time: "2 hours ago", type: "Comment" },
  { user: "Amit Yadav", platform: "Facebook", message: "Is there a donation link?", time: "4 hours ago", type: "Message" },
  { user: "Neha Singh", platform: "Instagram", message: "Would love to join the next drive!", time: "6 hours ago", type: "Comment" },
];

const scheduled = [
  { title: "Save Rivers, Save Lives", platform: "Instagram", type: "Image", date: "Apr 15, 2025", time: "10:00 AM", photo: "/campaigns/river-cleanup.jpg" },
  { title: "Behind the Scenes", platform: "Instagram", type: "Reel", date: "Apr 15, 2025", time: "02:00 PM", photo: "/campaigns/clean-river.jpg" },
  { title: "Volunteer Stories", platform: "Facebook", type: "Carousel", date: "Apr 16, 2025", time: "09:00 AM", photo: "/campaigns/tree-planting.jpg" },
  { title: "Clean Ganga Drive", platform: "Facebook", type: "Video", date: "Apr 16, 2025", time: "05:00 PM", photo: "/campaigns/ganga-tourism.jpg" },
];

export function MetaChannelPage() {
  return (
    <div className="space-y-2">
      <Header />
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid items-start gap-2 [&>section]:h-[232px] xl:grid-cols-[1.5fr_1fr_.86fr]">
        <PerformanceOverview />
        <ConnectedAccounts />
        <NeedsAttention />
      </div>
      <div className="grid items-start gap-2 [&>section]:h-[236px] xl:grid-cols-[1.16fr_1.2fr_.64fr]">
        <TopPosts />
        <CampaignPerformance />
        <QuickActions />
      </div>
      <div className="grid items-start gap-2 [&>section]:h-[224px] xl:grid-cols-[1fr_1.1fr_.9fr]">
        <AudienceInsights />
        <Conversations />
        <ScheduledContent />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="grid min-h-[52px] grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[minmax(0,1fr)_220px_185px]">
      <div className="self-center">
        <h1 className="flex items-center gap-2 text-[20px] font-bold leading-6 tracking-[-0.025em] text-[#111B43]">
          Meta &amp; Instagram
          <ChannelLogo channel="Meta" className="size-[22px] bg-transparent" />
          <ChannelLogo channel="Instagram" className="size-[19px] bg-transparent" />
        </h1>
        <p className="mt-0.5 text-[10px] leading-4 text-[#687797]">
          Manage your Facebook and Instagram presence, create content, run campaigns and track performance.
        </p>
      </div>
      <div className="contents">
        <blockquote className="hidden justify-self-end text-center text-[10px] font-medium leading-[14px] text-[#21335F] lg:block">
          &ldquo;Social media turns purpose
          <br />
          into people&apos;s action.&rdquo;
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

const tint: Record<string, string> = {
  blue: "bg-[#E8F2FF] text-[#1975E7]",
  sky: "bg-[#E4F1FE] text-[#0E86D4]",
  red: "bg-[#FFE9EB] text-[#EA1A26]",
  rose: "bg-[#FFECF1] text-[#E0356F]",
  green: "bg-[#E4F8F0] text-[#0AA673]",
  purple: "bg-[#F2E9FF] text-[#8A38DD]",
  amber: "bg-[#FFF1D8] text-[#E79A00]",
  slate: "bg-[#EDF1F7] text-[#4E6182]",
};

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
  icon: typeof Link2;
  color: string;
}) {
  return (
    <div className="flex min-h-[78px] items-center rounded-lg border border-[#DCE4EE] bg-white px-2.5 py-2.5 shadow-[0_1px_4px_rgb(31_50_81/0.05)] transition-shadow hover:shadow-md">
      <div className="flex w-full items-center gap-2">
        <span className={cn("grid size-[30px] shrink-0 place-items-center rounded-full", tint[color])}>
          <Icon className="size-[15px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold leading-3 text-[#52617D]">{label}</p>
          <div className="flex items-baseline gap-1">
            <b className="text-[19px] leading-[22px] tracking-[-0.02em] text-[#142044]">{value}</b>
            <span className="whitespace-nowrap text-[8px] font-bold text-[#05A36D]">↑ {trend}</span>
          </div>
          <p className="mt-0.5 truncate text-[7.5px] leading-3 text-[#7C89A2]">{note}</p>
        </div>
      </div>
    </div>
  );
}

function Box({
  title,
  subtitle,
  badge,
  action,
  filter,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: string;
  filter?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-md border border-[#DDE4ED] bg-white shadow-sm">
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 border-b border-[#E8EDF3] px-2.5",
          subtitle ? "h-[38px]" : "h-8",
        )}
      >
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-[12px] font-bold leading-4 text-[#172044]">
            {title}
            {badge && (
              <i className="grid size-[15px] place-items-center rounded-full bg-[#EB0711] text-[8px] font-bold not-italic text-white">
                {badge}
              </i>
            )}
          </h2>
          {subtitle && <p className="truncate text-[8px] leading-3 text-[#7C89A2]">{subtitle}</p>}
        </div>
        {filter && (
          <button className="flex h-[22px] shrink-0 items-center gap-1 rounded-md border border-[#DDE4ED] px-1.5 text-[8px] font-semibold text-[#425273]">
            {filter}
            <ChevronDown className="size-2.5" />
          </button>
        )}
        {action && (
          <button className="shrink-0 whitespace-nowrap text-[9px] font-semibold text-[#EB0711]">{action} →</button>
        )}
      </header>
      {children}
    </section>
  );
}

function PerformanceOverview() {
  const legend = [
    ["Facebook Reach", "#1877F2"],
    ["Instagram Reach", "#E4405F"],
    ["Facebook Engagement", "#5DA9FF"],
    ["Instagram Engagement", "#F58EA8"],
  ] as const;
  return (
    <Box
      title="Performance Overview"
      subtitle="Reach, engagement and profile visits across Facebook & Instagram"
      filter="Last 30 days"
    >
      <div className="flex min-h-0 flex-1 flex-col px-2 pb-1">
        <div className="flex h-6 shrink-0 flex-wrap items-center gap-x-2.5 text-[8px] text-[#52617D]">
          {legend.map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <i className="size-1.5 rounded-full" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer>
            <AreaChart data={performance} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="metaFbReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1877F2" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#1877F2" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="metaIgReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E4405F" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#E4405F" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E8EDF3" vertical />
              <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 8, fill: "#71809D" }}
                axisLine={false}
                tickLine={false}
                width={42}
                domain={[0, 40000]}
                ticks={[0, 10000, 20000, 30000, 40000]}
                tickFormatter={(value: number) => (value ? `${value / 1000}K` : "0")}
              />
              <Tooltip
                contentStyle={{ fontSize: 9, borderRadius: 6, border: "1px solid #DDE4ED", padding: "4px 8px" }}
                formatter={(value) => Number(value).toLocaleString("en-IN")}
              />
              <Area
                dataKey="fbReach"
                name="Facebook Reach"
                stroke="#1877F2"
                strokeWidth={1.6}
                fill="url(#metaFbReach)"
                dot={{ r: 1.8, strokeWidth: 0, fill: "#1877F2" }}
                isAnimationActive={false}
              />
              <Area
                dataKey="igReach"
                name="Instagram Reach"
                stroke="#E4405F"
                strokeWidth={1.6}
                fill="url(#metaIgReach)"
                dot={{ r: 1.8, strokeWidth: 0, fill: "#E4405F" }}
                isAnimationActive={false}
              />
              <Area
                dataKey="fbEng"
                name="Facebook Engagement"
                stroke="#5DA9FF"
                strokeWidth={1.4}
                fill="transparent"
                dot={{ r: 1.6, strokeWidth: 0, fill: "#5DA9FF" }}
                isAnimationActive={false}
              />
              <Area
                dataKey="igEng"
                name="Instagram Engagement"
                stroke="#F58EA8"
                strokeWidth={1.4}
                fill="transparent"
                dot={{ r: 1.6, strokeWidth: 0, fill: "#F58EA8" }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Box>
  );
}

function ConnectedAccounts() {
  return (
    <Box title="Connected Accounts" action="Manage Accounts">
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col divide-y divide-[#EDF1F5] overflow-y-auto">
        {accounts.map((account) => (
          <div key={account.id} className="flex flex-1 flex-col justify-center p-2">
            <div className="flex items-center gap-1.5">
              <ChannelLogo channel={account.channel} className="size-[26px] shadow-[0_1px_4px_rgb(31_50_81/0.14)]" />
              <Image
                src={account.photo}
                alt=""
                width={34}
                height={26}
                className="h-[26px] w-[34px] shrink-0 rounded object-cover shadow-sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-bold leading-4 text-[#172044]">{account.name}</p>
                <p className="truncate text-[8px] leading-3 text-[#7C89A2]">{account.type}</p>
              </div>
              <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#E5F7EF] px-1.5 py-0.5 text-[8px] font-semibold text-[#078359]">
                <BadgeCheck className="size-2.5" />
                Connected
              </span>
              <button className="shrink-0 text-[#93A0B8]">
                <MoreVertical className="size-3.5" />
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
              {account.metrics.map(([value, label]) => (
                <span key={label} className="min-w-0">
                  <b className="block text-[10px] leading-4 text-[#172044]">{value}</b>
                  <small className="block truncate text-[7px] leading-3 text-[#7C89A2]">{label}</small>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Box>
  );
}

function NeedsAttention() {
  return (
    <Box title="Needs Attention" badge="4" action="View all">
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col divide-y divide-[#EDF1F5] overflow-y-auto">
        {attention.map(({ title, detail, tone, icon: Icon }) => (
          <div key={title} className="flex flex-1 items-center gap-2 px-2 py-[9px]">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full",
                tone === "amber" ? "bg-[#FFF0E2] text-[#F07800]" : "bg-[#FFEAEC] text-[#EA1A26]",
              )}
            >
              <Icon className="size-3" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] font-semibold leading-4 text-[#1B2647]">{title}</p>
              <p className="truncate text-[8px] leading-3 text-[#7A87A0]">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Box>
  );
}

const postCols = "grid-cols-[1.5fr_.42fr_.62fr_.5fr_.72fr_.44fr_.82fr]";

function TopPosts() {
  return (
    <Box title="Top Performing Posts / Reels" action="View all">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2">
        <div className={cn("sticky top-0 z-10 grid gap-1 bg-white py-1 text-[8px] text-[#7A87A0]", postCols)}>
          <span>Content</span>
          <span>Platform</span>
          <span>Type</span>
          <span>Reach</span>
          <span>Engagement</span>
          <span>Clicks</span>
          <span>Published</span>
        </div>
        {posts.map((post) => (
          <div
            key={post.title}
            className={cn(
              "grid items-center gap-1 border-t border-[#EDF1F5] py-1.5 text-[8.5px] text-[#3B4A6B]",
              postCols,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Image
                src={post.photo}
                alt=""
                width={30}
                height={22}
                className="h-[22px] w-[30px] shrink-0 rounded object-cover shadow-sm"
              />
              <span className="min-w-0">
                <b className="block truncate text-[#172044]">{post.title}</b>
                <small className="block truncate text-[7px] text-[#8A97AF]">{post.excerpt}</small>
              </span>
            </span>
            <ChannelLogo channel={post.platform} className="size-[15px]" />
            <span>{post.type}</span>
            <b className="text-[#172044]">{post.reach}</b>
            <span>{post.engagement}</span>
            <span>{post.clicks}</span>
            <span className="text-[8px] text-[#71809D]">{post.published}</span>
          </div>
        ))}
      </div>
    </Box>
  );
}

const campaignCols = "grid-cols-[1.32fr_.8fr_.58fr_.42fr_.42fr_.42fr_.72fr]";

function CampaignPerformance() {
  return (
    <Box title="Campaign Performance" action="View all">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2">
        <div className={cn("sticky top-0 z-10 grid gap-1 bg-white py-1 text-[8px] text-[#7A87A0]", campaignCols)}>
          <span>Campaign</span>
          <span>Objective</span>
          <span>Spend</span>
          <span>Leads</span>
          <span>Links</span>
          <span>CPL</span>
          <span>Status</span>
        </div>
        {metaCampaigns.map((campaign) => (
          <div
            key={campaign.name}
            className={cn(
              "grid items-center gap-1 border-t border-[#EDF1F5] py-1.5 text-[8.5px] text-[#3B4A6B]",
              campaignCols,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Image
                src={campaign.photo}
                alt=""
                width={30}
                height={22}
                className="h-[22px] w-[30px] shrink-0 rounded object-cover shadow-sm"
              />
              <b className="truncate text-[#172044]">{campaign.name}</b>
            </span>
            <span className="truncate">{campaign.objective}</span>
            <b className="text-[#172044]">{campaign.spend}</b>
            <span>{campaign.leads}</span>
            <span>{campaign.links}</span>
            <span>{campaign.cpl}</span>
            <i
              className={cn(
                "w-fit rounded px-1 py-0.5 text-[7.5px] font-semibold not-italic",
                campaign.status === "Active" ? "bg-[#E5F7EF] text-[#078359]" : "bg-[#EAF2FF] text-[#286CB7]",
              )}
            >
              {campaign.status}
            </i>
          </div>
        ))}
      </div>
    </Box>
  );
}

const actionSkin: Record<string, string> = {
  rose: "border-[#FFDCE2] bg-[#FFF5F7] text-[#D8285F] hover:bg-[#FFECF1]",
  purple: "border-[#E7DAFB] bg-[#FAF6FF] text-[#7B3FE4] hover:bg-[#F2E9FF]",
  blue: "border-[#D6E7FC] bg-[#F5F9FF] text-[#1769D2] hover:bg-[#E8F1FF]",
  green: "border-[#CFEFE2] bg-[#F4FCF8] text-[#0A9E70] hover:bg-[#E4F8F0]",
  amber: "border-[#FBE5C0] bg-[#FFFBF3] text-[#DE8A00] hover:bg-[#FFF1D8]",
  slate: "border-[#DFE6F0] bg-[#F8FAFD] text-[#43567A] hover:bg-[#EDF1F7]",
};

function QuickActions() {
  return (
    <Box title="Quick Actions">
      <div className="grid min-h-0 flex-1 grid-cols-2 content-between gap-2 p-2">
        {quickActions.map(({ label, icon: Icon, color }) => (
          <button
            key={label}
            className={cn(
              "flex h-[44px] items-center gap-1.5 rounded-md border px-1.5 text-left text-[8.5px] font-semibold leading-3 transition-colors",
              actionSkin[color],
            )}
          >
            <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", tint[color])}>
              <Icon className="size-3.5" />
            </span>
            {label}
          </button>
        ))}
      </div>
    </Box>
  );
}

function AudienceInsights() {
  return (
    <Box title="Audience Insights" filter="Last 30 days">
      <div className="grid min-h-0 flex-1 grid-cols-[126px_1fr] items-center gap-2 px-2.5 pb-2">
        <div>
          <div className="relative mx-auto size-[116px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={gender}
                  dataKey="value"
                  innerRadius={36}
                  outerRadius={54}
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                  isAnimationActive={false}
                >
                  {gender.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center text-center">
              <span>
                <b className="block text-[18px] leading-5 tracking-[-0.02em] text-[#172044]">24.6K</b>
                <small className="text-[8.5px] text-[#71809D]">Total Followers</small>
              </span>
            </div>
          </div>
          <div className="mt-1 space-y-[3px] px-0.5 text-[10.5px] text-[#52617D]">
            {gender.map((slice) => (
              <span key={slice.name} className="flex items-center gap-1.5">
                <i className="size-2 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="flex-1">{slice.name}</span>
                <b className="text-[#172044]">{slice.value}%</b>
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 self-start pt-1">
          <p className="mb-2 text-[11px] font-bold text-[#172044]">Top Audience Locations</p>
          <div className="space-y-[9px]">
            {locations.map((location) => (
              <div
                key={location.name}
                className="grid grid-cols-[74px_1fr_26px] items-center gap-2 text-[10.5px]"
              >
                <span className="truncate text-[#52617D]">{location.name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-[#EDF1F7]">
                  <i
                    className="block h-full rounded-full bg-[#3186F3]"
                    style={{ width: `${location.value}%` }}
                  />
                </span>
                <b className="text-right text-[#172044]">{location.value}%</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Box>
  );
}

const conversationCols = "grid-cols-[.85fr_.42fr_1.5fr_.7fr_.62fr]";

function Conversations() {
  return (
    <Box title="Recent Comments & Messages" action="View all">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2">
        <div className={cn("sticky top-0 z-10 grid gap-1 bg-white py-1 text-[8px] text-[#7A87A0]", conversationCols)}>
          <span>User</span>
          <span>Platform</span>
          <span>Message</span>
          <span>Time</span>
          <span>Type</span>
        </div>
        {conversations.map((item, index) => (
          <div
            key={item.user}
            className={cn(
              "grid items-center gap-1 border-t border-[#EDF1F5] py-[7px] text-[8.5px] text-[#3B4A6B]",
              conversationCols,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <i
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full text-[7px] font-bold not-italic",
                  [
                    "bg-[#FFECF1] text-[#D8285F]",
                    "bg-[#E7F0FF] text-[#3478DB]",
                    "bg-[#EEE7FF] text-[#8357DC]",
                    "bg-[#FFF0DC] text-[#F28C28]",
                    "bg-[#DDF8E9] text-[#16A16C]",
                  ][index],
                )}
              >
                {item.user.charAt(0)}
              </i>
              <b className="truncate text-[#172044]">{item.user}</b>
            </span>
            <ChannelLogo channel={item.platform} className="size-[15px]" />
            <span className="truncate">{item.message}</span>
            <span className="truncate text-[8px] text-[#71809D]">{item.time}</span>
            <i
              className={cn(
                "w-fit rounded px-1 py-0.5 text-[7.5px] font-semibold not-italic",
                item.type === "Comment" ? "bg-[#E5F7EF] text-[#078359]" : "bg-[#EAF2FF] text-[#286CB7]",
              )}
            >
              {item.type}
            </i>
          </div>
        ))}
      </div>
    </Box>
  );
}

const scheduledCols = "grid-cols-[1.5fr_.5fr_.66fr_.9fr]";

function ScheduledContent() {
  return (
    <Box title="Scheduled Content" action="View all">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2">
        <div className={cn("sticky top-0 z-10 grid gap-1 bg-white py-1 text-[8px] text-[#7A87A0]", scheduledCols)}>
          <span>Content</span>
          <span>Platform</span>
          <span>Type</span>
          <span>Schedule</span>
        </div>
        {scheduled.map((item) => (
          <div
            key={item.title}
            className={cn(
              "grid items-center gap-1 border-t border-[#EDF1F5] py-1.5 text-[8.5px] text-[#3B4A6B]",
              scheduledCols,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Image
                src={item.photo}
                alt=""
                width={30}
                height={22}
                className="h-[22px] w-[30px] shrink-0 rounded object-cover shadow-sm"
              />
              <b className="truncate text-[#172044]">{item.title}</b>
            </span>
            <ChannelLogo channel={item.platform} className="size-[15px]" />
            <span>{item.type}</span>
            <span className="text-[8px] leading-3 text-[#62718E]">
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
