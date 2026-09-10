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
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock,
  Copy,
  Eye,
  Image as ImageIcon,
  Link as LinkIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Pencil,
  Phone,
  RefreshCw,
  Settings2,
  ShieldAlert,
  SquarePen,
  Star,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const stats = [
  { label: "Connected Locations", value: "4", trend: "0%", note: "4 active locations", icon: MapPin, color: "green" },
  { label: "Average Rating", value: "4.7", trend: "0.2", note: "Based on 428 reviews", icon: Star, color: "amber" },
  { label: "Total Reviews", value: "428", trend: "18%", note: "+65 this month", icon: MessageSquare, color: "purple" },
  { label: "Profile Views", value: "12.4K", trend: "28%", note: "8.6K search · 3.8K maps", icon: Eye, color: "blue" },
  { label: "Calls", value: "248", trend: "22%", note: "+45 this month", icon: Phone, color: "green" },
  { label: "Website Clicks", value: "312", trend: "18%", note: "+47 this month", icon: LinkIcon, color: "blue" },
  { label: "Direction Requests", value: "196", trend: "16%", note: "+27 this month", icon: Navigation, color: "sky" },
  { label: "Search Visibility", value: "86.5K", trend: "24%", note: "Discovery views", icon: BarChart3, color: "green" },
] as const;

const performanceSeries = [
  { key: "searchViews", label: "Search Views", color: "#2D7FF0" },
  { key: "mapsViews", label: "Maps Views", color: "#EA4335" },
  { key: "websiteClicks", label: "Website Clicks", color: "#21C56A" },
  { key: "calls", label: "Calls", color: "#F5A524" },
  { key: "directionRequests", label: "Direction Requests", color: "#8B5CF6" },
] as const;

/** Mar 15 → Apr 14, the range shown in the date picker. */
function dayLabel(index: number): string {
  return index < 17 ? `Mar ${15 + index}` : `Apr ${index - 16}`;
}

const axisTicks = ["Mar 15", "Mar 20", "Mar 25", "Mar 30", "Apr 5", "Apr 10", "Apr 14"];

const performance = Array.from({ length: 31 }, (_, i) => {
  const t = i / 30;
  const wave = (freq: number) => Math.sin(i * freq) * 0.5 + 0.5;
  return {
    label: dayLabel(i),
    searchViews: Math.round(1180 + t * 2400 + wave(1.7) * 190),
    mapsViews: Math.round(880 + t * 1780 + wave(2.1) * 150),
    websiteClicks: Math.round(340 + t * 900 + wave(2.6) * 110),
    calls: Math.round(230 + t * 620 + wave(3.1) * 90),
    directionRequests: Math.round(130 + t * 380 + wave(2.4) * 70),
  };
});

const locations = [
  { name: "Namo Gange Trust", office: "Head Office", verified: true, rating: "4.8", reviews: "248", profile: 95, sync: "2 hours ago", photo: "/campaigns/river-cleanup.jpg" },
  { name: "Namo Gange Trust", office: "Varanasi Center", verified: true, rating: "4.6", reviews: "92", profile: 88, sync: "3 hours ago", photo: "/campaigns/clean-river.jpg" },
  { name: "Namo Gange Trust", office: "Haridwar Center", verified: true, rating: "4.5", reviews: "64", profile: 82, sync: "5 hours ago", photo: "/campaigns/ganga-tourism.jpg" },
  { name: "Namo Gange Trust", office: "New Delhi Office", verified: false, rating: "4.2", reviews: "24", profile: 70, sync: "12 hours ago", photo: "/campaigns/tree-planting.jpg" },
];

const attention = [
  { title: "12 unanswered reviews", detail: "Respond to maintain good reputation", priority: "High", icon: CircleAlert, color: "rose" },
  { title: "Incomplete business hours", detail: "1 location missing weekend hours", priority: "High", icon: Clock, color: "rose" },
  { title: "Outdated photos", detail: "Some locations haven't updated photos in 6+ months", priority: "Medium", icon: ImageIcon, color: "amber" },
  { title: "Low response rate", detail: "Current response rate is 48% (recommended 70%+)", priority: "Medium", icon: MessageCircle, color: "amber" },
  { title: "Missing attributes", detail: "Add services, accessibility info, and more", priority: "Low", icon: Settings2, color: "blue" },
  { title: "Duplicate listing risk", detail: "Possible duplicate listing detected for Varanasi", priority: "Low", icon: Copy, color: "rose" },
] as const;

const reviews = [
  { name: "Rahul Sharma", initials: "RS", time: "2 days ago", text: "Amazing work by Namo Gange Trust! Highly appreciate their efforts towards a cleaner Ganga.", replied: false, action: "Reply" },
  { name: "Priya Singh", initials: "PS", time: "4 days ago", text: "Great initiative and very helpful team. Keep up the good work!", replied: true, action: "View" },
  { name: "Amit Mishra", initials: "AM", time: "6 days ago", text: "Very informative center. Learned a lot about river conservation. Highly recommended!", replied: false, action: "Generate Reply" },
  { name: "Sunita Kapoor", initials: "SK", time: "1 week ago", text: "Wonderful organization with a noble cause. Their awareness programs are impactful.", replied: true, action: "View" },
];

const avatarTints = [
  "bg-[#E7F1FC] text-[#1A6BC4]",
  "bg-[#F1E9FE] text-[#7C3AED]",
  "bg-[#FFEFE1] text-[#D97706]",
  "bg-[#E1F8EC] text-[#0B8A4D]",
];

const posts = [
  { title: "World Water Day 2025", subtitle: "Together for Cleaner Rivers", type: "Image", views: "12.4K", clicks: "842", published: "Apr 10, 2025", photo: "/campaigns/water-conservation.jpg" },
  { title: "Community Clean-up Drive", subtitle: "Join Us This Sunday!", type: "Event", views: "9.8K", clicks: "612", published: "Apr 5, 2025", photo: "/campaigns/river-cleanup.jpg" },
  { title: "River Conservation Tips", subtitle: "Small Actions, Big Impact", type: "Image", views: "8.1K", clicks: "540", published: "Mar 28, 2025", photo: "/campaigns/clean-river.jpg" },
  { title: "Namo Gange at Schools", subtitle: "Awareness Program", type: "Video", views: "6.9K", clicks: "468", published: "Mar 22, 2025", photo: "/campaigns/tree-planting.jpg" },
  { title: "Volunteer With Us", subtitle: "Be the Change", type: "Image", views: "5.7K", clicks: "390", published: "Mar 15, 2025", photo: "/campaigns/ganga-tourism.jpg" },
];

const postTypeTint: Record<string, string> = {
  Image: "bg-[#EAF2FE] text-[#1A6BC4]",
  Event: "bg-[#F1E9FE] text-[#7C3AED]",
  Video: "bg-[#FFEFE1] text-[#D97706]",
};

const searchQueries = [
  { query: "namo gange trust", impressions: "12.4K", clicks: "1.2K" },
  { query: "ganga conservation", impressions: "8.6K", clicks: "842" },
  { query: "clean ganges", impressions: "6.1K", clicks: "620" },
  { query: "river cleaning ngo", impressions: "4.8K", clicks: "412" },
  { query: "namo gange varanasi", impressions: "3.9K", clicks: "368" },
  { query: "ganga trust", impressions: "3.2K", clicks: "304" },
  { query: "water conservation ngo", impressions: "2.8K", clicks: "281" },
  { query: "namo gange delhi", impressions: "2.1K", clicks: "196" },
];

const quickActions = [
  { label: "Create Post", icon: SquarePen, color: "blue" },
  { label: "Reply to Reviews", icon: MessageCircle, color: "purple" },
  { label: "Update Info", icon: Store, color: "sky" },
  { label: "Add Photos", icon: ImageIcon, color: "green" },
  { label: "View Insights", icon: BarChart3, color: "amber" },
  { label: "Sync Locations", icon: RefreshCw, color: "blue" },
] as const;

const recentActivity = [
  { title: "New review received", detail: "Priya Singh left a 5-star review", time: "2 hours ago", icon: Star, color: "amber" },
  { title: "Post published", detail: "World Water Day 2025", time: "12 hours ago", icon: CalendarCheck, color: "blue" },
  { title: "Location synced", detail: "Varanasi Center", time: "", icon: RefreshCw, color: "sky" },
  { title: "Business hours updated", detail: "New Delhi Office", time: "", icon: Pencil, color: "purple" },
] as const;

const customerActions = [
  { label: "Calls", value: "248", trend: "22%", note: "+45 this month", icon: Phone, color: "green" },
  { label: "Website Clicks", value: "312", trend: "18%", note: "+47 this month", icon: LinkIcon, color: "blue" },
  { label: "Direction Requests", value: "196", trend: "16%", note: "+27 this month", icon: Navigation, color: "sky" },
  { label: "Message Taps", value: "48", trend: "33%", note: "+12 this month", icon: MessageSquare, color: "green" },
  { label: "Bookings", value: "24", trend: "20%", note: "+4 this month", icon: CalendarDays, color: "amber" },
] as const;

const profileHealth = {
  complete: 88,
  done: ["Business name", "Address & location", "Phone number", "Website", "Business category", "Description"],
  pending: ["Business hours", "Photos (12)", "Services & attributes"],
  missing: ["Products", "Q&A", "Posts (5)"],
};

const tint: Record<string, string> = {
  blue: "bg-[#E8F2FF] text-[#1975E7]",
  sky: "bg-[#E4F1FE] text-[#0E86D4]",
  green: "bg-[#E1F8EC] text-[#0B9457]",
  amber: "bg-[#FFF3DC] text-[#E0930B]",
  purple: "bg-[#F1E9FE] text-[#7C3AED]",
  rose: "bg-[#FFE9EF] text-[#E11D48]",
};

const priorityTint: Record<string, string> = {
  High: "bg-[#FFE4E8] text-[#D6293E]",
  Medium: "bg-[#FFF1D8] text-[#C77C02]",
  Low: "bg-[#E9EFF7] text-[#4E6182]",
};

export function GoogleBusinessPage() {
  return (
    <div className="space-y-3">
      <Header />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>
      <div className="grid items-start gap-3 [&>section]:h-[290px] xl:grid-cols-[1.36fr_1.12fr_.9fr]">
        <PerformanceOverview />
        <LocationsOverview />
        <NeedsAttention />
      </div>
      <div className="grid items-start gap-3 xl:grid-cols-[1.45fr_1.36fr_1fr]">
        <div className="space-y-3">
          <RecentReviews />
          <CustomerActions />
        </div>
        <div className="space-y-3">
          <PostsAndUpdates />
          <ProfileHealth />
        </div>
        <div className="space-y-3">
          <TopSearchQueries />
          <QuickActions />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-[#1A73E8] text-white shadow-[0_1px_5px_rgb(26_115_232/0.35)]">
          <Store className="size-[22px]" />
        </span>
        <div>
          <h1 className="text-[27px] font-bold leading-8 tracking-[-0.025em] text-[#111B43]">
            Google Business
          </h1>
          <p className="mt-0.5 text-[12.5px] leading-4 text-[#687797]">
            Manage locations, reviews, posts, insights, and local visibility.
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
          <button className="flex h-[38px] items-center gap-2 rounded-lg bg-[#1A73E8] px-4 text-[12.5px] font-semibold text-white shadow-[0_1px_4px_rgb(26_115_232/0.3)] transition-colors hover:bg-[#1665CE]">
            <RefreshCw className="size-3.5" />
            Sync Locations
          </button>
          <p className="mt-1 text-[9.5px] text-[#8A97AF]">Last synced: 1 hour ago</p>
        </div>
      </div>
    </header>
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
  icon: typeof MapPin;
  color: string;
}) {
  return (
    <div className="flex min-h-[78px] items-center rounded-xl border border-[#DCE4EE] bg-white px-2.5 py-2.5 shadow-[0_1px_4px_rgb(31_50_81/0.05)] transition-shadow hover:shadow-md">
      <div className="flex w-full items-center gap-2">
        <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-full", tint[color])}>
          <Icon className="size-[17px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[9.5px] font-semibold leading-3 text-[#52617D]">{label}</p>
          <div className="flex items-baseline gap-1">
            <b className="text-[19px] leading-6 tracking-[-0.02em] text-[#142044]">{value}</b>
            <span className="whitespace-nowrap text-[9px] font-bold text-[#0B9457]">↑ {trend}</span>
          </div>
          <p className="mt-0.5 truncate text-[8.5px] leading-3 text-[#7C89A2]">{note}</p>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  action,
  filter,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
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
      <header
        className={cn(
          "flex shrink-0 items-center justify-between gap-2 px-3.5",
          subtitle ? "h-[48px]" : "h-[42px]",
        )}
      >
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold leading-5 text-[#172044]">{title}</h2>
          {subtitle && <p className="truncate text-[9px] leading-3 text-[#7C89A2]">{subtitle}</p>}
        </div>
        {filter && (
          <button className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-[#DDE4ED] px-2 text-[10.5px] font-medium text-[#425273]">
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

function ViewAll({ label = "View all" }: { label?: string }) {
  return (
    <button className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#E4453B]">
      {label} <span className="text-[#E4453B]">→</span>
    </button>
  );
}

function PerformanceOverview() {
  return (
    <Card
      title="Performance Overview"
      subtitle="Search views, maps views, website clicks, calls and direction requests over the last 30 days."
      filter="Last 30 days"
    >
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 pb-1 text-[10px] text-[#52617D]">
          {performanceSeries.map((series) => (
            <span key={series.key} className="flex items-center gap-1.5">
              <i className="size-2 rounded-full" style={{ background: series.color }} />
              {series.label}
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          <ResponsiveContainer>
            <AreaChart data={performance} margin={{ top: 4, right: 14, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gmbSearch" x1="0" y1="0" x2="0" y2="1">
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
                domain={[0, 4000]}
                ticks={[0, 1000, 2000, 3000, 4000]}
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
                dataKey="searchViews"
                name="Search Views"
                stroke="#2D7FF0"
                strokeWidth={1.7}
                fill="url(#gmbSearch)"
                dot={{ r: 1.7, strokeWidth: 0, fill: "#2D7FF0" }}
                isAnimationActive={false}
              />
              {performanceSeries.slice(1).map((series) => (
                <Line
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  stroke={series.color}
                  strokeWidth={1.5}
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

const locationCols = "grid-cols-[1.9fr_.7fr_.5fr_.46fr_.66fr_.72fr]";

function LocationsOverview() {
  return (
    <Card title="Locations Overview" action={<ViewAll />}>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3">
        <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[9.5px] text-[#7A87A0]", locationCols)}>
          <span>Location</span>
          <span>Verification</span>
          <span>Rating</span>
          <span>Reviews</span>
          <span>Profile %</span>
          <span>Last Sync</span>
        </div>
        {locations.map((location) => (
          <div
            key={location.office}
            className={cn(
              "grid items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[10.5px] text-[#52617D]",
              locationCols,
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <Image
                src={location.photo}
                alt=""
                width={30}
                height={30}
                className="size-[30px] shrink-0 rounded object-cover"
              />
              <span className="min-w-0">
                <b className="block truncate text-[10.5px] text-[#172044]">{location.name}</b>
                <small className="block truncate text-[9px] text-[#8A97AF]">{location.office}</small>
              </span>
            </span>
            <span className="flex items-center gap-1">
              {location.verified ? (
                <>
                  <CircleCheck className="size-3.5 shrink-0 text-[#12A150]" />
                  <span className="text-[10px] font-medium text-[#0B7A42]">Verified</span>
                </>
              ) : (
                <>
                  <Clock className="size-3.5 shrink-0 text-[#8A97AF]" />
                  <span className="text-[10px] font-medium text-[#6B7A96]">Pending</span>
                </>
              )}
            </span>
            <span className="flex items-center gap-0.5">
              <Star className="size-3 shrink-0 fill-[#F5A524] text-[#F5A524]" />
              <b className="text-[#172044]">{location.rating}</b>
            </span>
            <span>{location.reviews}</span>
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EDF1F7]">
                <i
                  className={cn(
                    "block h-full rounded-full",
                    location.profile >= 85 ? "bg-[#12A150]" : location.profile >= 75 ? "bg-[#5AC47F]" : "bg-[#2D7FF0]",
                  )}
                  style={{ width: `${location.profile}%` }}
                />
              </i>
              <b className="shrink-0 text-[#172044]">{location.profile}%</b>
            </span>
            <span className="whitespace-nowrap text-[9.5px] text-[#8A97AF]">{location.sync}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NeedsAttention() {
  return (
    <Card title="Needs Attention" action={<ViewAll />}>
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col divide-y divide-[#EDF1F5] overflow-y-auto">
        {attention.map(({ title, detail, priority, icon: Icon, color }) => (
          <div key={title} className="flex flex-1 items-center gap-2 px-3 py-1.5">
            <span className={cn("grid size-[26px] shrink-0 place-items-center rounded-lg", tint[color])}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10.5px] font-semibold leading-4 text-[#1B2647]">{title}</p>
              <p className="truncate text-[9.5px] leading-3 text-[#8A97AF]">{detail}</p>
            </div>
            <i
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold not-italic",
                priorityTint[priority],
              )}
            >
              {priority}
            </i>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecentReviews() {
  return (
    <Card title="Recent Reviews" action={<ViewAll />} className="h-[306px]">
      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col divide-y divide-[#EDF1F5] overflow-y-auto">
        {reviews.map((review, index) => (
          <div key={review.name} className="flex flex-1 items-center gap-2.5 px-3.5 py-2">
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                avatarTints[index],
              )}
            >
              {review.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5">
                <b className="truncate text-[11.5px] font-bold text-[#1A6BC4]">{review.name}</b>
                <span className="flex shrink-0 gap-px">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="size-2.5 fill-[#F5A524] text-[#F5A524]" />
                  ))}
                </span>
                <small className="shrink-0 text-[9.5px] text-[#8A97AF]">{review.time}</small>
              </p>
              <p className="line-clamp-2 text-[10px] leading-[14px] text-[#52617D]">{review.text}</p>
            </div>
            <i
              className={cn(
                "w-[62px] shrink-0 rounded px-1.5 py-0.5 text-center text-[9.5px] font-semibold not-italic",
                review.replied ? "bg-[#E1F8EC] text-[#0B8A4D]" : "bg-[#FFE4E8] text-[#D6293E]",
              )}
            >
              {review.replied ? "Replied" : "Not Replied"}
            </i>
            <button className="w-[78px] shrink-0 rounded-md border border-[#DDE4ED] py-1 text-[9.5px] font-semibold text-[#425273] transition-colors hover:bg-[#F8FAFD]">
              {review.action}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

const postCols = "grid-cols-[1.7fr_.52fr_.44fr_.44fr_.7fr]";

function PostsAndUpdates() {
  return (
    <Card title="Posts & Updates" action={<ViewAll />} className="h-[306px]">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3.5">
        <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[9.5px] text-[#7A87A0]", postCols)}>
          <span>Post</span>
          <span>Type</span>
          <span>Views</span>
          <span>Clicks</span>
          <span>Published</span>
        </div>
        {posts.map((post) => (
          <div
            key={post.title}
            className={cn(
              "grid items-center gap-1.5 border-t border-[#EDF1F5] py-[7px] text-[10.5px] text-[#52617D]",
              postCols,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Image
                src={post.photo}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded object-cover"
              />
              <span className="min-w-0">
                <b className="block truncate text-[10.5px] text-[#172044]">{post.title}</b>
                <small className="block truncate text-[9px] text-[#8A97AF]">{post.subtitle}</small>
              </span>
            </span>
            <span>
              <i
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9.5px] font-semibold not-italic",
                  postTypeTint[post.type],
                )}
              >
                {post.type}
              </i>
            </span>
            <b className="text-[#172044]">{post.views}</b>
            <span>{post.clicks}</span>
            <span className="whitespace-nowrap text-[9.5px] text-[#8A97AF]">{post.published}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

const queryCols = "grid-cols-[1.6fr_.6fr_.44fr]";

function TopSearchQueries() {
  return (
    <Card title="Top Search Queries" action={<ViewAll />} className="h-[272px]">
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3.5">
        <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1 text-[9.5px] text-[#7A87A0]", queryCols)}>
          <span>Query</span>
          <span className="text-right">Impressions</span>
          <span className="text-right">Clicks</span>
        </div>
        {searchQueries.map((row) => (
          <div
            key={row.query}
            className={cn(
              "grid items-center gap-1.5 border-t border-[#EDF1F5] py-[3px] text-[10.5px] text-[#52617D]",
              queryCols,
            )}
          >
            <span className="truncate">{row.query}</span>
            <b className="text-right text-[#172044]">{row.impressions}</b>
            <span className="text-right">{row.clicks}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card title="Quick Actions" className="h-[100px]">
      <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-1.5 px-3.5 pb-3">
        {quickActions.map(({ label, icon: Icon, color }) => (
          <button
            key={label}
            className="flex items-center justify-center gap-1 rounded-md border border-[#E4EAF2] bg-white px-0.5 text-[8.5px] font-semibold text-[#425273] transition-colors hover:bg-[#F8FAFD]"
          >
            <span className={cn("grid size-[18px] shrink-0 place-items-center rounded", tint[color])}>
              <Icon className="size-[11px]" />
            </span>
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function RecentActivity() {
  return (
    <Card title="Recent Activity" action={<ViewAll />} className="h-[114px]">
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-x-3 gap-y-0.5 px-3.5 pb-2">
        {recentActivity.map(({ title, detail, time, icon: Icon, color }) => (
          <div key={title} className="flex min-w-0 items-center gap-1.5">
            <span className={cn("grid size-5 shrink-0 place-items-center rounded", tint[color])}>
              <Icon className="size-3" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[9.5px] font-semibold leading-[11px] text-[#172044]">{title}</p>
              <p className="truncate text-[8.5px] leading-[10px] text-[#8A97AF]">{detail}</p>
              {time && <p className="truncate text-[8px] leading-[10px] text-[#9AA6BC]">{time}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CustomerActions() {
  return (
    <Card title="Customer Actions" filter="Last 30 days" className="h-[192px]">
      <div className="grid min-h-0 flex-1 grid-cols-5 gap-2 px-3.5 pb-3.5">
        {customerActions.map(({ label, value, trend, note, icon: Icon, color }) => (
          <div
            key={label}
            className="flex flex-col justify-center rounded-lg border border-[#E4EAF2] bg-[#FBFCFE] px-2 py-2"
          >
            <span className={cn("grid size-8 place-items-center rounded-full", tint[color])}>
              <Icon className="size-4" />
            </span>
            <p className="mt-1.5 truncate text-[9.5px] leading-4 text-[#6B7A96]">{label}</p>
            <p className="flex items-baseline gap-1">
              <b className="text-[18px] leading-6 text-[#142044]">{value}</b>
              <span className="text-[9.5px] font-bold text-[#0B9457]">↑ {trend}</span>
            </p>
            <p className="truncate text-[8.5px] leading-3 text-[#8A97AF]">{note}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

const healthDonut = [
  { name: "Complete", value: 88, color: "#12A150" },
  { name: "Remaining", value: 12, color: "#E8EDF3" },
];

function ProfileHealth() {
  return (
    <Card title="Profile Health" action={<ViewAll label="View Details" />} className="h-[192px]">
      <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-2.5">
        <div className="grid min-h-0 flex-1 grid-cols-[108px_1fr_1fr] items-center gap-2">
          <div className="relative size-[104px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={healthDonut}
                  dataKey="value"
                  innerRadius={36}
                  outerRadius={50}
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
                <b className="block text-[19px] leading-5 text-[#142044]">88%</b>
                <small className="text-[9px] text-[#75829D]">Complete</small>
              </span>
            </div>
          </div>
          <ul className="space-y-[3px]">
            {profileHealth.done.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[10px] text-[#52617D]">
                <CircleCheck className="size-3.5 shrink-0 text-[#12A150]" />
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
          <ul className="space-y-[3px]">
            {profileHealth.pending.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[10px] text-[#52617D]">
                <CircleAlert className="size-3.5 shrink-0 text-[#E0930B]" />
                <span className="truncate">{item}</span>
              </li>
            ))}
            {profileHealth.missing.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[10px] text-[#8A97AF]">
                <CircleAlert className="size-3.5 shrink-0 text-[#C3CDDC]" />
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-1.5 flex shrink-0 items-center gap-1.5 rounded-md border border-[#F7E3BE] bg-[#FFFAEF] px-2 py-1.5 text-[9.5px] text-[#9A6A05]">
          <ShieldAlert className="size-3.5 shrink-0 text-[#E0930B]" />
          Add more photos and complete your business hours to improve visibility.
        </p>
      </div>
    </Card>
  );
}

