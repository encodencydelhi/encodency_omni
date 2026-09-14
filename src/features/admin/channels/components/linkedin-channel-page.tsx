"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  AtSign,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Heart,
  Image as ImageIcon,
  IndianRupee,
  Key,
  Layers,
  Lightbulb,
  Link as LinkIcon,
  MapPin,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  MousePointerClick,
  Pause,
  Pencil,
  PenLine,
  Play,
  Plus,
  Radio,
  RefreshCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ThumbsUp,
  TrendingUp,
  Trophy,
  UploadCloud,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Video,
} from "lucide-react";
import { ChannelLogo } from "../../shared/channel-logo";
import { ChannelHeader } from "./channel-header";
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
] as const;

type TabType = (typeof tabs)[number];

// ----------------------------------------------------
// SHARED COMMON HELPERS & METRICS
// ----------------------------------------------------

const tint: Record<string, string> = {
  blue: "bg-[#E7F1FC] text-[#0A66C2]",
  indigo: "bg-[#E8EDFD] text-[#3B5BDB]",
  purple: "bg-[#F1E9FE] text-[#7C3AED]",
  rose: "bg-[#FFE9EF] text-[#E11D48]",
  amber: "bg-[#FFF3DC] text-[#D97706]",
  green: "bg-[#E1F8EC] text-[#0F9D58]",
};

function Card({
  title,
  action,
  filter,
  children,
  className,
  headerClassName,
}: {
  title: string;
  action?: React.ReactNode;
  filter?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
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
          "flex h-[46px] shrink-0 items-center justify-between gap-2 px-3.5",
          headerClassName,
        )}
      >
        <h2 className="text-[14px] font-bold text-[#172044]">{title}</h2>
        {filter && (
          <button className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-[#DDE4ED] bg-white px-2 text-[11px] font-medium text-[#425273] shadow-sm hover:bg-[#F8FAFD]">
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

function CardLink({
  label,
  arrow = "→",
  onClick,
}: {
  label: string;
  arrow?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 whitespace-nowrap text-[11.5px] font-semibold text-[#0A66C2] hover:underline cursor-pointer"
    >
      {label} {arrow}
    </button>
  );
}

// ----------------------------------------------------
// MAIN PAGE COMPONENT
// ----------------------------------------------------

export function LinkedInChannelPage() {
  const [activeTab, setActiveTab] = useState<TabType>("Overview");

  return (
    <div className="space-y-3 pb-8">
      {/* Glassmorphic Gradient Channel Header */}
      <ChannelHeader channel="linkedin" />
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "Overview" && <OverviewTab onNavigateTab={setActiveTab} />}
      {activeTab === "Posts" && <PostsTab />}
      {activeTab === "Analytics" && <AnalyticsTab />}
      {activeTab === "Audience" && <AudienceTab />}
      {activeTab === "Campaigns" && <CampaignsTab />}
      {activeTab === "Leads" && <LeadsTab />}
      {activeTab === "Inbox" && <InboxTab />}
      {activeTab === "Settings" && <SettingsTab />}
    </div>
  );
}

function Tabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
  return (
    <nav className="scrollbar-thin flex gap-6 overflow-x-auto border-b border-[#E2E8F0]">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            "shrink-0 border-b-2 pb-2.5 text-[12.5px] font-semibold transition-colors",
            activeTab === tab
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

// ----------------------------------------------------
// TAB 1: POSTS TAB (Screenshot 1)
// ----------------------------------------------------

const postsList = [
  {
    id: 1,
    title: "Clean Ganga, Brighter Tomorrow",
    subtitle: "Together we can create a cleaner, healthier and greener tomorrow. #GangaForFuture",
    image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=300&h=200&fit=crop",
    type: "Image",
    status: "Published",
    date: "Apr 12, 2025",
    time: "10:00 AM",
    impressions: "12.4K",
    impressionsTrend: "↑ 28%",
    engagement: "842",
    engagementTrend: "↑ 32%",
    hasVideo: false,
  },
  {
    id: 2,
    title: "Volunteer Spotlight – Real Change Makers",
    subtitle: "Meet the amazing volunteers who are making a difference on ground! 💙",
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=300&h=200&fit=crop",
    type: "Video",
    status: "Published",
    date: "Apr 10, 2025",
    time: "04:30 PM",
    impressions: "9.8K",
    impressionsTrend: "↑ 18%",
    engagement: "612",
    engagementTrend: "↑ 24%",
    hasVideo: true,
  },
  {
    id: 3,
    title: "World Water Day 2025",
    subtitle: "Every drop counts. Let's conserve water for a sustainable future. #WorldWaterDay",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&h=200&fit=crop",
    type: "Carousel",
    status: "Published",
    date: "Apr 5, 2025",
    time: "11:00 AM",
    impressions: "8.1K",
    impressionsTrend: "↑ 12%",
    engagement: "540",
    engagementTrend: "↑ 20%",
    hasVideo: false,
  },
  {
    id: 4,
    title: "“A Cleaner Ganga is a Healthier India”",
    subtitle: "Small actions create a big impact. Let's keep our rivers clean.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&h=200&fit=crop",
    type: "Image",
    status: "Scheduled",
    date: "Apr 16, 2025",
    time: "10:00 AM",
    impressions: "—",
    engagement: "—",
    hasVideo: false,
  },
  {
    id: 5,
    title: "Join the Movement",
    subtitle: "Be a part of our upcoming clean-up drive this weekend. Register now!",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=300&h=200&fit=crop",
    type: "Image",
    status: "Scheduled",
    date: "Apr 18, 2025",
    time: "02:00 PM",
    impressions: "—",
    engagement: "—",
    hasVideo: false,
  },
  {
    id: 6,
    title: "5 Simple Ways to Save Water",
    subtitle: "Conserve water. Protect life. #WaterConservation",
    image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=300&h=200&fit=crop",
    type: "Carousel",
    status: "Draft",
    date: "—",
    time: "",
    impressions: "—",
    engagement: "—",
    hasVideo: false,
  },
  {
    id: 7,
    title: "Namo Gange – Community Outreach",
    subtitle: "Watch how communities are coming together for a cleaner tomorrow.",
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=300&h=200&fit=crop",
    type: "Video",
    status: "Draft",
    date: "—",
    time: "",
    impressions: "—",
    engagement: "—",
    hasVideo: true,
  },
  {
    id: 8,
    title: "Clean Rivers Healthy Communities",
    subtitle: "Cleaner rivers. Healthier communities. Brighter tomorrow.",
    image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&h=200&fit=crop",
    type: "Text",
    status: "Failed",
    date: "Apr 2, 2025",
    time: "09:15 AM",
    impressions: "—",
    engagement: "—",
    hasVideo: false,
  },
];

function PostsTab() {
  const [filterTab, setFilterTab] = useState<"All" | "Published" | "Scheduled" | "Draft" | "Failed" | "Newsletters">("All");
  const [advocacyRecommended, setAdvocacyRecommended] = useState<Record<number, boolean>>({ 1: true, 2: true });

  const toggleAdvocacy = (id: number) => {
    setAdvocacyRecommended((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredPosts = postsList.filter((p) => {
    if (filterTab === "All") return true;
    if (filterTab === "Newsletters") return p.type === "Carousel" || p.title.includes("Ganga");
    return p.status === filterTab;
  });

  return (
    <div className="space-y-4">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-bold text-[#111B43]">Posts & Content</h2>
          <p className="text-[12px] text-[#687797]">
            Create, schedule, manage articles, newsletters, and recommend posts to employees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-[36px] items-center gap-1.5 rounded-lg border border-[#E9D5FF] bg-[#FAF5FF] px-3.5 text-[12px] font-semibold text-[#7E22CE] shadow-sm transition-colors hover:bg-[#F3E8FF]">
            <Sparkles className="size-3.5 text-[#9333EA]" />
            <span>AI Generate</span>
          </button>
          <button className="flex h-[36px] items-center gap-1.5 rounded-lg border border-[#D7E0EB] bg-white px-3.5 text-[12px] font-semibold text-[#425273] shadow-sm transition-colors hover:bg-[#F8FAFD]">
            <UploadCloud className="size-3.5 text-[#687797]" />
            <span>Bulk Upload</span>
          </button>
          <button className="flex h-[36px] items-center gap-1.5 rounded-lg bg-[#0A66C2] px-4 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#0958A8]">
            <Plus className="size-3.5" />
            <span>Create Post</span>
            <ChevronDown className="size-3 ml-0.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* LinkedIn Native Newsletter & Employee Advocacy Spotlight Card */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Newsletter Banner */}
        <div className="flex items-center justify-between rounded-xl border border-[#DDE4ED] bg-gradient-to-r from-[#F0F7FF] to-[#FFFFFF] p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#0A66C2] text-white shadow-sm">
              <BookOpen className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#172044]">Clean Ganga Monthly Digest</span>
                <span className="rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[10.5px] font-bold text-[#16A34A]">Edition #18 Live</span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                <b>4,120</b> subscribers • <b>42.8%</b> read rate • +312 new this month
              </p>
            </div>
          </div>
          <button className="shrink-0 rounded-lg border border-[#0A66C2] bg-white px-3 py-1.5 text-[11px] font-bold text-[#0A66C2] hover:bg-[#EFF6FF]">
            + Draft Edition
          </button>
        </div>

        {/* Employee Advocacy Quick Summary */}
        <div className="flex items-center justify-between rounded-xl border border-[#DDE4ED] bg-gradient-to-r from-[#FAF5FF] to-[#FFFFFF] p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#7E22CE] text-white shadow-sm">
              <Award className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[#172044]">Employee Advocacy Program</span>
                <span className="rounded bg-[#FAF5FF] border border-[#E9D5FF] px-1.5 py-0.5 text-[10.5px] font-bold text-[#7E22CE]">48 Advocates</span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                <b>1,420</b> employee reshares generated <b>4,890</b> organic clicks
              </p>
            </div>
          </div>
          <button className="shrink-0 rounded-lg bg-[#7E22CE] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#6B21A8]">
            View Leaderboard
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterTab("All")}
            className={cn(
              "flex h-[32px] items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition-all",
              filterTab === "All"
                ? "bg-[#0A66C2] text-white shadow-sm"
                : "border border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]",
            )}
          >
            <span>All Posts</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                filterTab === "All" ? "bg-white/20 text-white" : "bg-[#EDF2F7] text-[#52617D]",
              )}
            >
              48
            </span>
          </button>

          <button
            onClick={() => setFilterTab("Published")}
            className={cn(
              "flex h-[32px] items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition-all",
              filterTab === "Published"
                ? "bg-[#0A66C2] text-white shadow-sm"
                : "border border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]",
            )}
          >
            <i className="size-2 rounded-full bg-[#10B981]" />
            <span>Published</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                filterTab === "Published" ? "bg-white/20 text-white" : "bg-[#EDF2F7] text-[#52617D]",
              )}
            >
              32
            </span>
          </button>

          <button
            onClick={() => setFilterTab("Scheduled")}
            className={cn(
              "flex h-[32px] items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition-all",
              filterTab === "Scheduled"
                ? "bg-[#0A66C2] text-white shadow-sm"
                : "border border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]",
            )}
          >
            <i className="size-2 rounded-full bg-[#3B82F6]" />
            <span>Scheduled</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                filterTab === "Scheduled" ? "bg-white/20 text-white" : "bg-[#EDF2F7] text-[#52617D]",
              )}
            >
              8
            </span>
          </button>

          <button
            onClick={() => setFilterTab("Draft")}
            className={cn(
              "flex h-[32px] items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition-all",
              filterTab === "Draft"
                ? "bg-[#0A66C2] text-white shadow-sm"
                : "border border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]",
            )}
          >
            <i className="size-2 rounded-full bg-[#9CA3AF]" />
            <span>Drafts</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                filterTab === "Draft" ? "bg-white/20 text-white" : "bg-[#EDF2F7] text-[#52617D]",
              )}
            >
              5
            </span>
          </button>

          <button
            onClick={() => setFilterTab("Newsletters")}
            className={cn(
              "flex h-[32px] items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition-all",
              filterTab === "Newsletters"
                ? "bg-[#0A66C2] text-white shadow-sm"
                : "border border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]",
            )}
          >
            <BookOpen className="size-3" />
            <span>Newsletters & Articles</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                filterTab === "Newsletters" ? "bg-white/20 text-white" : "bg-[#EDF2F7] text-[#52617D]",
              )}
            >
              12
            </span>
          </button>

          <button
            onClick={() => setFilterTab("Failed")}
            className={cn(
              "flex h-[32px] items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition-all",
              filterTab === "Failed"
                ? "bg-[#0A66C2] text-white shadow-sm"
                : "border border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]",
            )}
          >
            <i className="size-2 rounded-full bg-[#EF4444]" />
            <span>Failed</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                filterTab === "Failed" ? "bg-white/20 text-white" : "bg-[#EDF2F7] text-[#52617D]",
              )}
            >
              3
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8A97AF]" />
            <input
              type="text"
              placeholder="Search posts..."
              className="h-[32px] w-[200px] rounded-lg border border-[#DDE4ED] bg-white pl-8 pr-3 text-[11.5px] text-[#172044] outline-none placeholder:text-[#8A97AF] focus:border-[#0A66C2] focus:ring-1 focus:ring-[#0A66C2]"
            />
          </div>
          <button className="flex h-[32px] items-center gap-1.5 rounded-lg border border-[#DDE4ED] bg-white px-3 text-[11.5px] font-semibold text-[#425273] shadow-sm hover:bg-[#F8FAFD]">
            <SlidersHorizontal className="size-3.5 text-[#687797]" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      {/* Table (NO PLATFORM COLUMN as explicitly requested) */}
      <div className="overflow-hidden rounded-xl border border-[#DDE4ED] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11.5px] border-collapse">
            <thead>
              <tr className="border-b border-[#EDF1F5] bg-[#F8FAFD] text-[10.5px] font-bold text-[#687797]">
                <th className="w-[36px] px-3 py-3 text-center">
                  <input type="checkbox" className="rounded border-[#CBD5E1]" />
                </th>
                <th className="min-w-[280px] px-3 py-3">Post</th>
                <th className="w-[100px] px-3 py-3">Type</th>
                <th className="w-[105px] px-3 py-3">Status</th>
                <th className="w-[125px] px-3 py-3">
                  <span className="flex items-center gap-1 text-[#0A66C2]">
                    Date & Time
                    <span>↓</span>
                  </span>
                </th>
                <th className="w-[110px] px-3 py-3">Impressions</th>
                <th className="w-[110px] px-3 py-3">Engagement</th>
                <th className="w-[140px] px-3 py-3 text-center">Actions & Advocacy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5]">
              {filteredPosts.map((post) => (
                <tr key={post.id} className="transition-colors hover:bg-[#F9FBFE]">
                  <td className="px-3 py-2.5 text-center">
                    <input type="checkbox" className="rounded border-[#CBD5E1]" />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="relative h-[42px] w-[62px] shrink-0 overflow-hidden rounded-md bg-[#EDF2F7]">
                        <img
                          src={post.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        {post.hasVideo && (
                          <div className="absolute inset-0 grid place-items-center bg-black/30">
                            <span className="grid size-4 place-items-center rounded-full bg-white text-black shadow">
                              <Play className="size-2 fill-current pl-[1px]" />
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-bold text-[#172044]">
                          {post.title}
                        </p>
                        <p className="truncate text-[10px] text-[#687797]">
                          {post.subtitle}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="space-y-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold",
                          post.type === "Image" && "border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
                          post.type === "Video" && "border border-[#E9D5FF] bg-[#FAF5FF] text-[#7E22CE]",
                          post.type === "Carousel" && "border border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]",
                          post.type === "Text" && "border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]",
                        )}
                      >
                        {post.type === "Image" && <ImageIcon className="size-2.5" />}
                        {post.type === "Video" && <Video className="size-2.5" />}
                        {post.type === "Carousel" && <Layers className="size-2.5" />}
                        {post.type === "Text" && <FileText className="size-2.5" />}
                        {post.type}
                      </span>
                      {post.type === "Carousel" && (
                        <p className="text-[10px] font-semibold text-[#C2410C]">74% completion</p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {post.status === "Published" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10.5px] font-semibold text-[#047857]">
                        <i className="size-1.5 rounded-full bg-[#10B981]" />
                        Published
                      </span>
                    )}
                    {post.status === "Scheduled" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10.5px] font-semibold text-[#1D4ED8]">
                        <i className="size-1.5 rounded-full bg-[#3B82F6]" />
                        Scheduled
                      </span>
                    )}
                    {post.status === "Draft" && (
                      <span className="text-[10.5px] font-medium text-[#64748B]">Draft</span>
                    )}
                    {post.status === "Failed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10.5px] font-semibold text-[#B91C1C]">
                        <i className="size-1.5 rounded-full bg-[#EF4444]" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-[#425273]">
                    {post.date !== "—" ? (
                      <div>
                        <p className="font-semibold text-[#172044]">{post.date}</p>
                        <p className="text-[10.5px] text-[#8A97AF]">{post.time}</p>
                      </div>
                    ) : (
                      <span className="text-[#9CA3AF]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {post.impressions !== "—" ? (
                      <div>
                        <p className="font-bold text-[#172044]">{post.impressions}</p>
                        <p className="text-[10.5px] font-semibold text-[#10B981]">{post.impressionsTrend}</p>
                      </div>
                    ) : (
                      <span className="text-[#9CA3AF]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {post.engagement !== "—" ? (
                      <div>
                        <p className="font-bold text-[#172044]">{post.engagement}</p>
                        <p className="text-[10.5px] font-semibold text-[#10B981]">{post.engagementTrend}</p>
                      </div>
                    ) : (
                      <span className="text-[#9CA3AF]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 text-[#687797]">
                      {post.status === "Published" && (
                        <button
                          onClick={() => toggleAdvocacy(post.id)}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] font-bold transition-all",
                            advocacyRecommended[post.id]
                              ? "bg-[#FAF5FF] text-[#7E22CE] border border-[#E9D5FF]"
                              : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
                          )}
                          title="Recommend this post to team employees for personal sharing"
                        >
                          <Award className="size-3 text-[#9333EA]" />
                          <span>{advocacyRecommended[post.id] ? "Advocated" : "Advocate"}</span>
                        </button>
                      )}
                      <button className="rounded p-1 hover:bg-[#EDF2F7] hover:text-[#0A66C2]" title="View Analytics">
                        <BarChart3 className="size-3.5" />
                      </button>
                      <button className="rounded p-1 hover:bg-[#EDF2F7] hover:text-[#172044]" title="Edit Post">
                        <Pencil className="size-3.5" />
                      </button>
                      <button className="rounded p-1 hover:bg-[#EDF2F7] hover:text-[#172044]" title="More">
                        <MoreHorizontal className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF1F5] px-4 py-2.5 text-[11px] text-[#687797]">
          <span>Showing 1-8 of 48 posts</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button className="grid size-6 place-items-center rounded border border-[#DDE4ED] text-[#687797] hover:bg-[#F8FAFD]">
                <ChevronLeft className="size-3" />
              </button>
              <button className="grid size-6 place-items-center rounded bg-[#0A66C2] text-[10px] font-bold text-white shadow-sm">
                1
              </button>
              <button className="grid size-6 place-items-center rounded border border-[#DDE4ED] text-[10px] text-[#52617D] hover:bg-[#F8FAFD]">
                2
              </button>
              <button className="grid size-6 place-items-center rounded border border-[#DDE4ED] text-[10px] text-[#52617D] hover:bg-[#F8FAFD]">
                3
              </button>
              <button className="grid size-6 place-items-center rounded border border-[#DDE4ED] text-[10px] text-[#52617D] hover:bg-[#F8FAFD]">
                4
              </button>
              <button className="grid size-6 place-items-center rounded border border-[#DDE4ED] text-[10px] text-[#52617D] hover:bg-[#F8FAFD]">
                5
              </button>
              <button className="grid size-6 place-items-center rounded border border-[#DDE4ED] text-[10px] text-[#52617D] hover:bg-[#F8FAFD]">
                6
              </button>
              <button className="grid size-6 place-items-center rounded border border-[#DDE4ED] text-[#687797] hover:bg-[#F8FAFD]">
                <ChevronRight className="size-3" />
              </button>
            </div>
            <button className="flex h-6 items-center gap-1 rounded border border-[#DDE4ED] bg-white px-2 text-[10px] text-[#52617D]">
              <span>8 per page</span>
              <ChevronDown className="size-2.5 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 2: AUDIENCE TAB (Screenshot 2)
// ----------------------------------------------------

const audienceGrowthData = [
  { label: "Mar 15", total: 10400, new: 210, unfollow: 40 },
  { label: "Mar 20", total: 10900, new: 260, unfollow: 45 },
  { label: "Mar 25", total: 11400, new: 290, unfollow: 50 },
  { label: "Mar 30", total: 11900, new: 310, unfollow: 42 },
  { label: "Apr 5", total: 12100, new: 280, unfollow: 48 },
  { label: "Apr 10", total: 12350, new: 300, unfollow: 55 },
  { label: "Apr 14", total: 12482, new: 248, unfollow: 38 },
];

const demographicTabs = ["Job Function", "Industry", "Location", "Seniority"] as const;
type DemographicTab = (typeof demographicTabs)[number];

interface DemographicSlice {
  name: string;
  value: number;
  count: string;
  color: string;
}

interface DemographicGroup {
  totalFollowers: string;
  items: DemographicSlice[];
}

const demographicsData: Record<DemographicTab, DemographicGroup> = {
  "Job Function": {
    totalFollowers: "12,482",
    items: [
      { name: "Operations", value: 28, count: "3,495", color: "#0A66C2" },
      { name: "Education", value: 18, count: "2,247", color: "#21C56A" },
      { name: "Community & Social S...", value: 14, count: "1,747", color: "#8B5CF6" },
      { name: "Government", value: 12, count: "1,498", color: "#F5A524" },
      { name: "Healthcare", value: 10, count: "1,248", color: "#F43F63" },
      { name: "Other", value: 18, count: "2,247", color: "#94A3B8" },
    ],
  },
  Industry: {
    totalFollowers: "11,840",
    items: [
      { name: "Non-Profit & NGO", value: 34, count: "4,025", color: "#0A66C2" },
      { name: "Environmental Services", value: 22, count: "2,605", color: "#21C56A" },
      { name: "Education & Research", value: 16, count: "1,894", color: "#8B5CF6" },
      { name: "Government Admin", value: 12, count: "1,421", color: "#F5A524" },
      { name: "Renewables & Ecology", value: 9, count: "1,066", color: "#F43F63" },
      { name: "Other Industries", value: 7, count: "829", color: "#94A3B8" },
    ],
  },
  Location: {
    totalFollowers: "12,482",
    items: [
      { name: "New Delhi Area", value: 42, count: "5,242", color: "#0A66C2" },
      { name: "Varanasi Area", value: 24, count: "2,996", color: "#21C56A" },
      { name: "Haridwar & UK", value: 14, count: "1,747", color: "#8B5CF6" },
      { name: "Mumbai Area", value: 10, count: "1,248", color: "#F5A524" },
      { name: "Bengaluru Area", value: 6, count: "749", color: "#F43F63" },
      { name: "Other Regions", value: 4, count: "500", color: "#94A3B8" },
    ],
  },
  Seniority: {
    totalFollowers: "10,920",
    items: [
      { name: "Senior / Lead", value: 32, count: "3,494", color: "#0A66C2" },
      { name: "Entry / Associate", value: 24, count: "2,621", color: "#21C56A" },
      { name: "Manager", value: 20, count: "2,184", color: "#8B5CF6" },
      { name: "Director", value: 12, count: "1,310", color: "#F5A524" },
      { name: "VP / CXO / Exec", value: 8, count: "874", color: "#F43F63" },
      { name: "Founder / Owner", value: 4, count: "437", color: "#94A3B8" },
    ],
  },
};

function AudienceDemographics({ onNavigateToAudience }: { onNavigateToAudience?: () => void }) {
  const [activeDemographicTab, setActiveDemographicTab] = useState<DemographicTab>("Job Function");
  const [hoveredSlice, setHoveredSlice] = useState<DemographicSlice | null>(null);

  const currentGroup = demographicsData[activeDemographicTab];

  return (
    <Card
      title="Audience Demographics"
      action={onNavigateToAudience ? <CardLink label="View Details" onClick={onNavigateToAudience} /> : undefined}
    >
      <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-3.5">
        <div className="scrollbar-thin flex shrink-0 gap-4 overflow-x-auto border-b border-[#E8EDF3]">
          {demographicTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveDemographicTab(tab);
                setHoveredSlice(null);
              }}
              className={cn(
                "shrink-0 border-b-2 pb-2 text-[11.5px] font-semibold transition-colors cursor-pointer",
                activeDemographicTab === tab
                  ? "border-[#0A66C2] text-[#0A66C2]"
                  : "border-transparent text-[#8A97AF] hover:text-[#172044]",
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[130px_1fr] sm:grid-cols-[148px_1fr] items-center gap-3 pt-2">
          <div className="relative size-[130px] sm:size-[148px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentGroup.items}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={70}
                  strokeWidth={0}
                  isAnimationActive={false}
                  onMouseEnter={(_, index) => setHoveredSlice(currentGroup.items[index] ?? null)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  {currentGroup.items.map((slice) => (
                    <Cell
                      key={slice.name}
                      fill={slice.color}
                      opacity={hoveredSlice && hoveredSlice.name !== slice.name ? 0.35 : 1}
                      className="transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center text-center pointer-events-none px-1">
              {hoveredSlice ? (
                <div>
                  <b className="block text-[15px] leading-5 font-bold text-[#142044] truncate max-w-[90px]">
                    {hoveredSlice.count}
                  </b>
                  <small className="block text-[10px] text-[#0A66C2] font-semibold leading-tight truncate max-w-[90px]">
                    {hoveredSlice.name} ({hoveredSlice.value}%)
                  </small>
                </div>
              ) : (
                <div>
                  <b className="block text-[18px] leading-5 font-bold text-[#142044]">
                    {currentGroup.totalFollowers}
                  </b>
                  <small className="text-[10.5px] text-[#75829D]">Followers</small>
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 space-y-[6px]">
            {currentGroup.items.map((slice) => {
              const isHovered = hoveredSlice?.name === slice.name;
              return (
                <div
                  key={slice.name}
                  onMouseEnter={() => setHoveredSlice(slice)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-1.5 py-0.5 text-[11.5px] transition-colors cursor-pointer",
                    isHovered ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate text-[#52617D]">
                    <i className="size-2 shrink-0 rounded-full" style={{ background: slice.color }} />
                    <span className="truncate">{slice.name}</span>
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="font-semibold text-[#172044]">{slice.count}</span>
                    <span className="text-[10.5px] font-medium text-[#8A97AF]">({slice.value}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

const ageGenderData = [
  { age: "18-24", men: 18, women: 12 },
  { age: "25-34", men: 42, women: 28 },
  { age: "35-44", men: 26, women: 20 },
  { age: "45-54", men: 15, women: 18 },
  { age: "55-64", men: 10, women: 8 },
  { age: "65+", men: 6, women: 4 },
];

const topFollowersList = [
  { name: "Green India Initiative", title: "Non-profit Organization", followers: "52.4K", icon: "🌱" },
  { name: "Dr. Priya Sharma", title: "Environmental Researcher", followers: "24.8K", icon: "👩‍🔬" },
  { name: "Eco Warriors", title: "Community Organization", followers: "18.6K", icon: "🌿" },
  { name: "Sustainable Bharat", title: "NGO", followers: "16.2K", icon: "🌏" },
  { name: "Nature Connect", title: "Digital Creator", followers: "12.9K", icon: "📸" },
];

function AudienceTab() {
  return (
    <div className="space-y-4">
      {/* 5 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="flex items-center gap-3 rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
            <Users className="size-5" />
          </span>
          <div>
            <p className="text-[10.5px] text-[#687797]">Total Followers</p>
            <p className="flex items-baseline gap-1.5">
              <b className="text-[19px] font-bold text-[#111B43]">12,482</b>
              <span className="text-[10.5px] font-bold text-[#10B981]">↑ 18%</span>
            </p>
            <p className="text-[10.5px] text-[#8A97AF]">+1,900 vs last month</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#ECFDF5] text-[#059669]">
            <UserPlus className="size-5" />
          </span>
          <div>
            <p className="text-[10.5px] text-[#687797]">New Followers</p>
            <p className="flex items-baseline gap-1.5">
              <b className="text-[19px] font-bold text-[#111B43]">248</b>
              <span className="text-[10.5px] font-bold text-[#10B981]">↑ 52%</span>
            </p>
            <p className="text-[10.5px] text-[#8A97AF]">+85 vs last month</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#FAF5FF] text-[#7E22CE]">
            <Eye className="size-5" />
          </span>
          <div>
            <p className="text-[10.5px] text-[#687797]">Profile Views</p>
            <p className="flex items-baseline gap-1.5">
              <b className="text-[19px] font-bold text-[#111B43]">86,452</b>
              <span className="text-[10.5px] font-bold text-[#10B981]">↑ 22%</span>
            </p>
            <p className="text-[10.5px] text-[#8A97AF]">+15.6K vs last month</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
            <BarChart3 className="size-5" />
          </span>
          <div>
            <p className="text-[10.5px] text-[#687797]">Post Impressions</p>
            <p className="flex items-baseline gap-1.5">
              <b className="text-[19px] font-bold text-[#111B43]">124.6K</b>
              <span className="text-[10.5px] font-bold text-[#10B981]">↑ 28%</span>
            </p>
            <p className="text-[10.5px] text-[#8A97AF]">+27.1K vs last month</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#FFF1F2] text-[#E11D48]">
            <Heart className="size-5" />
          </span>
          <div>
            <p className="text-[10.5px] text-[#687797]">Engagement Rate</p>
            <p className="flex items-baseline gap-1.5">
              <b className="text-[19px] font-bold text-[#111B43]">6.8%</b>
              <span className="text-[10.5px] font-bold text-[#10B981]">↑ 16%</span>
            </p>
            <p className="text-[10.5px] text-[#8A97AF]">+0.9% vs last month</p>
          </div>
        </div>
      </div>

      {/* Row 1: Audience Growth, Demographics, Top Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Audience Growth */}
        <Card title="Audience Growth" filter="Last 30 days">
          <div className="flex min-h-0 flex-1 flex-col p-3.5">
            <div className="mb-2 flex items-center gap-3 text-[10.5px] text-[#687797]">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[#0A66C2]" />
                Total Followers
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[#10B981]" />
                New Followers
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[#EF4444]" />
                Unfollows
              </span>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={audienceGrowthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8A97AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8A97AF" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #DDE4ED" }} />
                  <Line type="monotone" dataKey="total" stroke="#0A66C2" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="new" stroke="#10B981" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="unfollow" stroke="#EF4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Audience Demographics */}
        <AudienceDemographics />

        {/* Top Locations */}
        <Card title="Top Locations" filter="Cities">
          <div className="space-y-2.5 p-3.5">
            {[
              { name: "New Delhi, India", pct: 28.4 },
              { name: "Mumbai, India", pct: 12.6 },
              { name: "Bengaluru, India", pct: 8.4 },
              { name: "Pune, India", pct: 6.8 },
              { name: "Hyderabad, India", pct: 5.2 },
              { name: "Others", pct: 38.6 },
            ].map((loc) => (
              <div key={loc.name} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="font-medium text-[#425273]">{loc.name}</span>
                  <b className="text-[#172044]">{loc.pct}%</b>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDF2F7]">
                  <div className="h-full rounded-full bg-[#0A66C2]" style={{ width: `${loc.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: Follower Demographics, Audience Interests, Company Size */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Follower Demographics */}
        <Card title="Follower Demographics">
          <div className="flex min-h-0 flex-1 flex-col p-3.5">
            <div className="mb-2 flex items-center justify-between border-b border-[#EDF1F5] pb-2 text-[10.5px]">
              <div className="flex gap-2 font-semibold">
                <span className="border-b-2 border-[#0A66C2] pb-1 text-[#0A66C2]">Age & Gender</span>
                <span className="text-[#8A97AF]">Device</span>
                <span className="text-[#8A97AF]">Language</span>
              </div>
              <div className="flex gap-2 text-[10.5px]">
                <span className="flex items-center gap-1 text-[#0A66C2]">
                  <i className="size-1.5 rounded-full bg-[#0A66C2]" /> Men 62%
                </span>
                <span className="flex items-center gap-1 text-[#8B5CF6]">
                  <i className="size-1.5 rounded-full bg-[#8B5CF6]" /> Women 38%
                </span>
              </div>
            </div>
            <div className="h-[170px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageGenderData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="age" tick={{ fontSize: 9, fill: "#8A97AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#8A97AF" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="men" fill="#0A66C2" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="women" fill="#8B5CF6" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Audience Interests */}
        <Card title="Audience Interests" action={<CardLink label="View All" />}>
          <div className="space-y-1.5 p-3.5">
            {[
              { label: "Environment & Conservation", pct: 23.8 },
              { label: "Sustainable Living", pct: 17.7 },
              { label: "Nature & Wildlife", pct: 15.5 },
              { label: "Climate Change", pct: 11.8 },
              { label: "Outdoor Activities", pct: 8.2 },
              { label: "Social Causes", pct: 6.4 },
              { label: "Travel & Adventure", pct: 5.4 },
              { label: "Education", pct: 3.6 },
            ].map((item) => (
              <div key={item.label} className="space-y-0.5">
                <div className="flex justify-between text-[10.5px]">
                  <span className="truncate text-[#52617D]">{item.label}</span>
                  <b className="text-[#172044]">{item.pct}%</b>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDF2F7]">
                  <div className="h-full rounded-full bg-[#0A66C2]" style={{ width: `${item.pct * 3}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Audience by Company Size */}
        <Card title="Audience by Company Size">
          <div className="space-y-2 p-3.5">
            {[
              { size: "1-10 employees", pct: 28 },
              { size: "11-50 employees", pct: 22 },
              { size: "51-200 employees", pct: 18 },
              { size: "201-500 employees", pct: 12 },
              { size: "501-1,000 employees", pct: 8 },
              { size: "1,001-5,000 employees", pct: 7 },
              { size: "5,001+ employees", pct: 5 },
            ].map((item) => (
              <div key={item.size} className="space-y-0.5">
                <div className="flex justify-between text-[10.5px]">
                  <span className="text-[#52617D]">{item.size}</span>
                  <b className="text-[#172044]">{item.pct}%</b>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDF2F7]">
                  <div className="h-full rounded-full bg-[#8B5CF6]" style={{ width: `${item.pct * 3}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: Top Followers, Growth Insights, Audience Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Top Followers */}
        <Card title="Top Followers" action={<CardLink label="View All" />}>
          <div className="divide-y divide-[#EDF1F5] px-3.5 py-1">
            {topFollowersList.map((f) => (
              <div key={f.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-7 place-items-center rounded-full bg-[#F1F5F9] text-[13px]">
                    {f.icon}
                  </span>
                  <div>
                    <p className="text-[11.5px] font-bold text-[#172044]">{f.name}</p>
                    <p className="text-[11.5px] text-[#8A97AF]">{f.title}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#0A66C2]">{f.followers}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Audience Growth Insights */}
        <Card title="Audience Growth Insights">
          <div className="space-y-3 p-3.5">
            <div className="flex items-start gap-2.5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-2.5">
              <Lightbulb className="size-4 shrink-0 text-[#16A34A] mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-[#166534]">
                  Your audience is growing 18% faster than similar LinkedIn pages in the Non-profit sector.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-[#334155]">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-[#16A34A] mt-0.5" />
                <span>Most of your new followers are from New Delhi, Mumbai and Bengaluru.</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-[#16A34A] mt-0.5" />
                <span>Your content about river conservation gets <strong>3x more engagement</strong>.</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-[#16A34A] mt-0.5" />
                <span>Posting between <strong>9 AM – 11 AM</strong> leads to higher follower growth.</span>
              </p>
            </div>

            <button className="text-[11.5px] font-bold text-[#0A66C2] hover:underline">
              View Detailed Insights →
            </button>
          </div>
        </Card>

        {/* Audience Actions */}
        <Card title="Audience Actions">
          <div className="space-y-2 p-3.5">
            {[
              { label: "Profile Visits", val: "8,642", trend: "↑ 32%", icon: Eye, color: "text-[#0A66C2] bg-[#EFF6FF]" },
              { label: "Website Clicks", val: "312", trend: "↑ 26%", icon: MousePointerClick, color: "text-[#8B5CF6] bg-[#FAF5FF]" },
              { label: "Contact Clicks", val: "48", trend: "↑ 52%", icon: Users, color: "text-[#EC4899] bg-[#FDF2F8]" },
              { label: "Followed from Post", val: "186", trend: "↑ 34%", icon: Heart, color: "text-[#10B981] bg-[#ECFDF5]" },
              { label: "Followed from Profile", val: "62", trend: "↑ 18%", icon: UserCheck, color: "text-[#F59E0B] bg-[#FFFBEB]" },
            ].map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.label} className="flex items-center justify-between rounded-lg border border-[#EDF1F5] p-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("grid size-6 place-items-center rounded-md", act.color)}>
                      <Icon className="size-3.5" />
                    </span>
                    <span className="text-[11px] font-medium text-[#425273]">{act.label}</span>
                  </div>
                  <div className="text-right">
                    <b className="text-[12px] text-[#172044]">{act.val}</b>
                    <span className="ml-1 text-[11.5px] font-semibold text-[#10B981]">{act.trend}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 3: CAMPAIGNS TAB (Screenshot 3)
// ----------------------------------------------------

const campaignTrendData = [
  { label: "Mar 15", reach: 20000, leads: 24, conversions: 5, spend: 12000 },
  { label: "Mar 20", reach: 28000, leads: 38, conversions: 8, spend: 19000 },
  { label: "Mar 25", reach: 35000, leads: 52, conversions: 11, spend: 26000 },
  { label: "Mar 30", reach: 48000, leads: 65, conversions: 14, spend: 34000 },
  { label: "Apr 5", reach: 62000, leads: 78, conversions: 16, spend: 40000 },
  { label: "Apr 10", reach: 76000, leads: 88, conversions: 17, spend: 45000 },
  { label: "Apr 14", reach: 86500, leads: 93, conversions: 18, spend: 48250 },
];

const campaignStatusData = [
  { name: "Active", value: 6, color: "#10B981" },
  { name: "Paused", value: 3, color: "#F59E0B" },
  { name: "Completed", value: 2, color: "#EF4444" },
  { name: "Draft", value: 1, color: "#94A3B8" },
];

const allCampaignsList = [
  {
    id: 1,
    name: "Save Rivers, Save Lives 2025",
    subtitle: "A cleaner tomorrow",
    status: "Active",
    startDate: "Mar 15, 2025",
    endDate: "Apr 30, 2025",
    budget: "₹50,000",
    spend: "₹48,250",
    reach: "28.4K",
    leads: 93,
    conversions: 18,
    image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=100&h=100&fit=crop",
  },
  {
    id: 2,
    name: "Community Clean-up Drive",
    subtitle: "People for Cleaner Rivers",
    status: "Active",
    startDate: "Mar 20, 2025",
    endDate: "Apr 30, 2025",
    budget: "₹10,000",
    spend: "₹8,600",
    reach: "18.6K",
    leads: 46,
    conversions: 7,
    image: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=100&h=100&fit=crop",
  },
  {
    id: 3,
    name: "Volunteer Stories",
    subtitle: "Real People, Real Change",
    status: "Paused",
    startDate: "Mar 25, 2025",
    endDate: "Apr 30, 2025",
    budget: "₹8,000",
    spend: "₹3,250",
    reach: "16.2K",
    leads: 42,
    conversions: 7,
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=100&h=100&fit=crop",
  },
  {
    id: 4,
    name: "World Water Day 2025",
    subtitle: "Every Drop Counts",
    status: "Completed",
    startDate: "Mar 10, 2025",
    endDate: "Mar 31, 2025",
    budget: "₹5,000",
    spend: "₹4,800",
    reach: "12.8K",
    leads: 38,
    conversions: 6,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&h=100&fit=crop",
  },
  {
    id: 5,
    name: "WhatsApp Outreach",
    subtitle: "Spread the Word",
    status: "Active",
    startDate: "Mar 22, 2025",
    endDate: "Apr 30, 2025",
    budget: "₹5,000",
    spend: "₹5,200",
    reach: "10.5K",
    leads: 24,
    conversions: 4,
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&h=100&fit=crop",
  },
];

function CampaignsTab() {
  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#FFF1F2] text-[#E11D48]">
            <Megaphone className="size-5" />
          </span>
          <div>
            <h2 className="text-[19px] font-bold text-[#111B43]">Campaigns</h2>
            <p className="text-[12px] text-[#687797]">
              Plan, manage and track your multi-channel marketing campaigns.
            </p>
          </div>
        </div>
        <button className="flex h-[36px] items-center gap-1.5 rounded-lg bg-[#0A66C2] px-4 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#0958A8]">
          <Plus className="size-3.5" />
          <span>Create Campaign</span>
        </button>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
            <Megaphone className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Total Campaigns</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">12</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 20%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+2 vs last month</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#ECFDF5] text-[#059669]">
            <Play className="size-4 fill-current pl-0.5" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Active Campaigns</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">6</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 50%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+2 vs last month</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#FFFBEB] text-[#D97706]">
            <Pause className="size-4 fill-current" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Paused Campaigns</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">3</b>
            <span className="text-[11.5px] font-bold text-[#EF4444]">↓ 25%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">-1 vs last month</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
            <CheckCircle className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Completed Campaigns</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">2</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 100%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+2 vs last month</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#FAF5FF] text-[#7E22CE]">
            <Users className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Total Reach</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">86.5K</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 24%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+16.8K vs last month</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#FFF7ED] text-[#EA580C]">
            <IndianRupee className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Total Spend</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">₹48,250</b>
            <span className="text-[11.5px] font-bold text-[#EF4444]">↓ 8%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">8% under budget</p>
        </div>
      </div>

      {/* Row 1: Trend, Status, Top Channels */}
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_1fr]">
        {/* Trend */}
        <Card title="Campaign Performance Trend" filter="Last 30 days">
          <div className="flex min-h-0 flex-1 flex-col p-3.5">
            <div className="mb-2 flex items-center gap-3 text-[10.5px] text-[#687797]">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[#0A66C2]" /> Reach
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[#10B981]" /> Leads
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[#8B5CF6]" /> Conversions
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-[#EF4444]" /> Spend (₹)
              </span>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={campaignTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: "#8A97AF" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9.5, fill: "#8A97AF" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="reach" stroke="#0A66C2" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="spend" stroke="#10B981" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="leads" stroke="#8B5CF6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="conversions" stroke="#EF4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Campaign Status */}
        <Card title="Campaign Status">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-3.5">
            <div className="relative size-[120px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={campaignStatusData} dataKey="value" innerRadius={38} outerRadius={56} strokeWidth={0} isAnimationActive={false}>
                    {campaignStatusData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <b className="block text-[14px] text-[#111B43]">12</b>
                  <span className="text-[11px] text-[#8A97AF]">Campaigns</span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <span className="flex items-center gap-1.5 text-[#52617D]">
                <i className="size-2 rounded-full bg-[#10B981]" /> Active <strong>6 (50%)</strong>
              </span>
              <span className="flex items-center gap-1.5 text-[#52617D]">
                <i className="size-2 rounded-full bg-[#F59E0B]" /> Paused <strong>3 (25%)</strong>
              </span>
              <span className="flex items-center gap-1.5 text-[#52617D]">
                <i className="size-2 rounded-full bg-[#EF4444]" /> Completed <strong>2 (17%)</strong>
              </span>
              <span className="flex items-center gap-1.5 text-[#52617D]">
                <i className="size-2 rounded-full bg-[#94A3B8]" /> Draft <strong>1 (8%)</strong>
              </span>
            </div>
          </div>
        </Card>

        {/* Top Performing Channel */}
        <Card title="Top Performing Channels" action={<CardLink label="View Details" />}>
          <div className="space-y-2 p-3.5">
            {[
              { name: "Meta & Instagram", reach: "28.4K Reach", trend: "↑ 34%", icon: "📷", pct: 85 },
              { name: "LinkedIn", reach: "18.6K Reach", trend: "↑ 22%", icon: "💼", pct: 65 },
              { name: "Google Business", reach: "16.2K Reach", trend: "↑ 18%", icon: "📍", pct: 55 },
              { name: "YouTube", reach: "12.8K Reach", trend: "↑ 12%", icon: "▶️", pct: 45 },
              { name: "Website (Direct)", reach: "10.5K Reach", trend: "↑ 10%", icon: "🌐", pct: 35 },
            ].map((ch) => (
              <div key={ch.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium text-[#172044]">
                    <span>{ch.icon}</span> {ch.name}
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-[#172044]">{ch.reach}</span>
                    <span className="ml-1 text-[11.5px] font-semibold text-[#10B981]">{ch.trend}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDF2F7]">
                  <div className="h-full rounded-full bg-[#0A66C2]" style={{ width: `${ch.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 2: All Campaigns Table (NO PLATFORM COLUMN) */}
      <div className="overflow-hidden rounded-xl border border-[#DDE4ED] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF1F5] p-3.5">
          <h3 className="text-[14px] font-bold text-[#172044]">All Campaigns (12)</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8A97AF]" />
              <input
                type="text"
                placeholder="Search campaigns..."
                className="h-[30px] w-[180px] rounded-lg border border-[#DDE4ED] bg-white pl-8 pr-3 text-[11px] text-[#172044] outline-none placeholder:text-[#8A97AF]"
              />
            </div>
            <button className="flex h-[30px] items-center gap-1 rounded-lg border border-[#DDE4ED] bg-white px-2.5 text-[11px] font-medium text-[#425273]">
              <span>All Status</span>
              <ChevronDown className="size-3 opacity-70" />
            </button>
            <button className="flex h-[30px] items-center gap-1 rounded-lg border border-[#DDE4ED] bg-white px-2.5 text-[11px] font-semibold text-[#425273]">
              <Download className="size-3 text-[#687797]" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[#EDF1F5] bg-[#F8FAFD] text-[10px] font-bold text-[#687797]">
                <th className="w-[36px] px-3 py-2.5 text-center">
                  <input type="checkbox" className="rounded border-[#CBD5E1]" />
                </th>
                <th className="min-w-[220px] px-3 py-2.5">Campaign Name</th>
                <th className="w-[90px] px-3 py-2.5">Status</th>
                <th className="w-[95px] px-3 py-2.5">Start Date</th>
                <th className="w-[95px] px-3 py-2.5">End Date</th>
                <th className="w-[85px] px-3 py-2.5">Budget</th>
                <th className="w-[85px] px-3 py-2.5">Spend</th>
                <th className="w-[80px] px-3 py-2.5">Reach</th>
                <th className="w-[70px] px-3 py-2.5">Leads</th>
                <th className="w-[85px] px-3 py-2.5">Conversions</th>
                <th className="w-[80px] px-3 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5]">
              {allCampaignsList.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-[#F9FBFE]">
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" className="rounded border-[#CBD5E1]" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <img src={c.image} alt="" className="size-8 shrink-0 rounded object-cover" />
                      <div>
                        <p className="font-bold text-[#172044]">{c.name}</p>
                        <p className="text-[11.5px] text-[#8A97AF]">{c.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
                        c.status === "Active" && "bg-[#ECFDF5] text-[#047857]",
                        c.status === "Paused" && "bg-[#FFFBEB] text-[#B45309]",
                        c.status === "Completed" && "bg-[#FEF2F2] text-[#B91C1C]",
                      )}
                    >
                      <i
                        className={cn(
                          "size-1.5 rounded-full",
                          c.status === "Active" && "bg-[#10B981]",
                          c.status === "Paused" && "bg-[#F59E0B]",
                          c.status === "Completed" && "bg-[#EF4444]",
                        )}
                      />
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#52617D]">{c.startDate}</td>
                  <td className="px-3 py-2 text-[#52617D]">{c.endDate}</td>
                  <td className="px-3 py-2 font-semibold text-[#172044]">{c.budget}</td>
                  <td className="px-3 py-2 font-semibold text-[#172044]">{c.spend}</td>
                  <td className="px-3 py-2 font-semibold text-[#0A66C2]">{c.reach}</td>
                  <td className="px-3 py-2 text-[#172044]">{c.leads}</td>
                  <td className="px-3 py-2 text-[#172044]">{c.conversions}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-[#687797]">
                      <button className="rounded p-1 hover:text-[#0A66C2]"><BarChart3 className="size-3" /></button>
                      <button className="rounded p-1 hover:text-[#172044]"><Pencil className="size-3" /></button>
                      <button className="rounded p-1 hover:text-[#172044]"><MoreHorizontal className="size-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Calendar, Creatives, Quick Actions */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1.1fr_1.1fr]">
        {/* Campaign Calendar */}
        <Card title="Campaign Calendar" action={<CardLink label="View Calendar" />}>
          <div className="space-y-2 p-3.5">
            {[
              { month: "APR", day: "15", title: "Save Rivers, Save Lives 2025", time: "10:00 AM", status: "Active" },
              { month: "APR", day: "18", title: "Volunteer Stories – Reel", time: "02:00 PM", status: "Active" },
              { month: "APR", day: "22", title: "Community Clean-up Drive", time: "11:00 AM", status: "Paused" },
              { month: "APR", day: "25", title: "World Water Day Recap", time: "03:00 PM", status: "Draft" },
            ].map((cal) => (
              <div key={cal.title} className="flex items-center gap-2.5 rounded-lg border border-[#EDF1F5] p-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#FFF1F2] text-center leading-none text-[#E11D48]">
                  <small className="text-[10.5px] font-bold">{cal.month}</small>
                  <b className="text-[12px] font-bold">{cal.day}</b>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#172044]">{cal.title}</p>
                  <p className="text-[11.5px] text-[#8A97AF]">{cal.time}</p>
                </div>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                    cal.status === "Active" && "bg-[#ECFDF5] text-[#059669]",
                    cal.status === "Paused" && "bg-[#FFFBEB] text-[#D97706]",
                    cal.status === "Draft" && "bg-[#F1F5F9] text-[#64748B]",
                  )}
                >
                  {cal.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Performing Creatives */}
        <Card title="Top Performing Creatives" action={<CardLink label="View All" />}>
          <div className="space-y-2 p-3.5">
            {[
              { title: "Save Rivers Poster", type: "Image", reach: "12.4K", eng: "842 Engagements", img: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=100&h=100&fit=crop" },
              { title: "Volunteer Reel", type: "Video", reach: "9.8K", eng: "612 Engagements", img: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=100&h=100&fit=crop" },
              { title: "Infographic – Water Tips", type: "Image", reach: "8.1K", eng: "540 Engagements", img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=100&h=100&fit=crop" },
              { title: "Community Event", type: "Carousel", reach: "6.9K", eng: "468 Engagements", img: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=100&h=100&fit=crop" },
            ].map((cr) => (
              <div key={cr.title} className="flex items-center gap-2.5 rounded-lg border border-[#EDF1F5] p-1.5">
                <img src={cr.img} alt="" className="size-9 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-[#172044]">{cr.title}</p>
                  <span className="text-[11px] text-[#0A66C2] bg-[#EFF6FF] px-1 rounded">{cr.type}</span>
                </div>
                <div className="text-right">
                  <b className="text-[11px] text-[#172044]">{cr.reach}</b>
                  <p className="text-[11px] text-[#8A97AF]">{cr.eng}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions & Recent Activity */}
        <div className="space-y-3">
          <Card title="Quick Actions">
            <div className="grid grid-cols-3 gap-1.5 p-3">
              {[
                { label: "Create Campaign", icon: Plus, color: "text-[#0A66C2]" },
                { label: "Boost Existing Post", icon: Sparkles, color: "text-[#8B5CF6]" },
                { label: "Schedule Campaign", icon: Calendar, color: "text-[#059669]" },
                { label: "Manage Ad Sets", icon: Layers, color: "text-[#D97706]" },
                { label: "View Reports", icon: BarChart3, color: "text-[#2563EB]" },
                { label: "Campaign Settings", icon: Settings, color: "text-[#64748B]" },
              ].map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.label}
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border border-[#EDF1F5] p-2 text-center text-[11.5px] font-semibold text-[#425273] hover:bg-[#F8FAFD]"
                  >
                    <Icon className={cn("size-3.5", q.color)} />
                    <span className="leading-tight">{q.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Recent Activity" action={<CardLink label="View All" />}>
            <div className="space-y-2 p-3 text-[10.5px]">
              <div className="flex items-start gap-2">
                <i className="size-2 shrink-0 rounded-full bg-[#10B981] mt-1" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#172044]">Campaign created</p>
                  <p className="truncate text-[#8A97AF]">Save Rivers, Save Lives 2025</p>
                </div>
                <span className="text-[11px] text-[#9CA3AF]">10 min ago</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="size-2 shrink-0 rounded-full bg-[#0A66C2] mt-1" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#172044]">Ad set updated</p>
                  <p className="truncate text-[#8A97AF]">Community Clean-up Drive</p>
                </div>
                <span className="text-[11px] text-[#9CA3AF]">2 hours ago</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="size-2 shrink-0 rounded-full bg-[#8B5CF6] mt-1" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#172044]">Budget changed</p>
                  <p className="truncate text-[#8A97AF]">Volunteer Stories</p>
                </div>
                <span className="text-[11px] text-[#9CA3AF]">5 hours ago</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 4: ANALYTICS TAB (Screenshot 4)
// ----------------------------------------------------

const topPostsAnalytics = [
  { id: 1, title: "Clean Ganga Drive – A Step ...", type: "Image", impressions: "12.4K", engagements: "842", er: "6.8%", img: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=100&h=100&fit=crop" },
  { id: 2, title: "Volunteer Spotlight – Real ...", type: "Video", impressions: "9.8K", engagements: "612", er: "6.2%", img: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=100&h=100&fit=crop" },
  { id: 3, title: "World Water Day 2025 | E...", type: "Image", impressions: "8.1K", engagements: "540", er: "6.6%", img: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=100&h=100&fit=crop" },
  { id: 4, title: "Join the Movement for a C...", type: "Carousel", impressions: "6.9K", engagements: "468", er: "6.3%", img: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100&h=100&fit=crop" },
  { id: 5, title: "Namo Gange at Community ...", type: "Video", impressions: "5.7K", engagements: "390", er: "6.8%", img: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=100&h=100&fit=crop" },
];

function AnalyticsTab() {
  return (
    <div className="space-y-4">
      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
            <Eye className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Total Impressions</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">86,452</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 28%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+18.7K vs previous period</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
            <Users className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Total Followers</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">12,482</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 18%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+1.9K vs previous period</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#ECFDF5] text-[#059669]">
            <MousePointerClick className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Post Clicks</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">4,218</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 32%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+1.0K vs previous period</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#FFF1F2] text-[#E11D48]">
            <Heart className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Engagements</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">6,248</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 32%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+1.6K vs previous period</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#FAF5FF] text-[#7E22CE]">
            <Eye className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Profile Views</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">248</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 22%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+45 vs previous period</p>
        </div>

        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3 shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
          <span className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
            <BarChart3 className="size-4" />
          </span>
          <p className="mt-2 text-[10px] text-[#687797]">Avg. Engagement Rate</p>
          <p className="flex items-baseline gap-1">
            <b className="text-[17px] font-bold text-[#111B43]">7.2%</b>
            <span className="text-[11.5px] font-bold text-[#10B981]">↑ 18%</span>
          </p>
          <p className="text-[11px] text-[#8A97AF]">+1.1% vs previous period</p>
        </div>
      </div>

      {/* Row 1: Performance Trend & Audience Demographics */}
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <PerformanceTrend />
        <AudienceDemographics />
      </div>

      {/* Row 2: Content Performance, Follower Growth, Audience Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Content Performance */}
        <Card title="Content Performance" action={<CardLink label="View All" />}>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="mb-2 flex gap-3 border-b border-[#EDF1F5] pb-2 text-[10px] font-semibold">
              <span className="border-b-2 border-[#0A66C2] pb-1 text-[#0A66C2]">Top Posts</span>
              <span className="text-[#8A97AF]">Post Types</span>
              <span className="text-[#8A97AF]">Hashtags</span>
              <span className="text-[#8A97AF]">Best Time to Post</span>
            </div>
            <div className="divide-y divide-[#EDF1F5] text-[10.5px]">
              {topPostsAnalytics.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#8A97AF]">{p.id}</span>
                    <img src={p.img} alt="" className="size-6 rounded object-cover" />
                    <div>
                      <p className="truncate max-w-[120px] font-bold text-[#172044]">{p.title}</p>
                      <span className="text-[11px] text-[#0A66C2]">{p.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span>{p.impressions}</span>
                    <span>{p.engagements}</span>
                    <b className="text-[#10B981]">{p.er}</b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Follower Growth */}
        <Card title="Follower Growth" filter="Last 30 days">
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="mb-1">
              <span className="text-[16px] font-bold text-[#111B43]">12,482</span>
              <span className="ml-1.5 text-[10px] font-bold text-[#10B981]">↑ 18%</span>
              <p className="text-[11px] text-[#8A97AF]">+1,892 new followers</p>
            </div>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pageGrowth} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <Bar dataKey="gained" fill="#0A66C2" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[#EDF1F5] pt-2 text-[10px]">
              <div>
                <span className="text-[#8A97AF]">New Followers</span>
                <p className="font-bold text-[#172044]">2,146 <span className="text-[#10B981]">↑52%</span></p>
              </div>
              <div className="text-right">
                <span className="text-[#8A97AF]">Unfollows</span>
                <p className="font-bold text-[#172044]">254 <span className="text-[#EF4444]">↓8%</span></p>
              </div>
            </div>
          </div>
        </Card>

        {/* Audience Insights */}
        <Card title="Audience Insights" action={<CardLink label="View All" />}>
          <div className="space-y-2 p-3">
            <div className="flex items-start gap-2 rounded-lg border border-[#EDF1F5] p-2">
              <MapPin className="size-4 shrink-0 text-[#0A66C2] mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-[#172044]">Your audience is mostly from India</p>
                <p className="text-[11.5px] text-[#687797]">68% of your followers are from India.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-[#EDF1F5] p-2">
              <Users className="size-4 shrink-0 text-[#8B5CF6] mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-[#172044]">Operations is your top audience segment</p>
                <p className="text-[11.5px] text-[#687797]">28% of your followers work in Operations.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-[#EDF1F5] p-2">
              <Calendar className="size-4 shrink-0 text-[#F59E0B] mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-[#172044]">Your content performs best on weekdays</p>
                <p className="text-[11.5px] text-[#687797]">Highest engagement between 10 AM – 1 PM.</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-[#EDF1F5] p-2">
              <Video className="size-4 shrink-0 text-[#10B981] mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-[#172044]">Video posts get 2.3x more engagement</p>
                <p className="text-[11.5px] text-[#687797]">Videos perform better than images.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 3: Hashtags, Post Type Distribution, Engagement by Day & Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Top Performing Hashtags */}
        <Card title="Top Performing Hashtags">
          <div className="space-y-2 p-3.5">
            {[
              { tag: "#CleanGanga", count: "4.2K", pct: 95 },
              { tag: "#WaterConservation", count: "3.1K", pct: 75 },
              { tag: "#SustainableIndia", count: "2.8K", pct: 65 },
              { tag: "#NamoGange", count: "2.4K", pct: 55 },
              { tag: "#CommunityAction", count: "1.9K", pct: 45 },
            ].map((h) => (
              <div key={h.tag} className="space-y-0.5">
                <div className="flex justify-between text-[11px]">
                  <span className="font-semibold text-[#0A66C2]">{h.tag}</span>
                  <b className="text-[#172044]">{h.count}</b>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDF2F7]">
                  <div className="h-full rounded-full bg-[#0A66C2]" style={{ width: `${h.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Post Type Distribution */}
        <Card title="Post Type Distribution">
          <div className="flex min-h-0 flex-1 items-center justify-between p-3.5">
            <div className="relative size-[110px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Image", value: 42, color: "#0A66C2" },
                      { name: "Video", value: 28, color: "#8B5CF6" },
                      { name: "Carousel", value: 18, color: "#F59E0B" },
                      { name: "Text/Link", value: 12, color: "#94A3B8" },
                    ]}
                    dataKey="value"
                    innerRadius={35}
                    outerRadius={52}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {[
                      { color: "#0A66C2" },
                      { color: "#8B5CF6" },
                      { color: "#F59E0B" },
                      { color: "#94A3B8" },
                    ].map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <b className="block text-[13px] text-[#111B43]">482</b>
                  <span className="text-[10.5px] text-[#8A97AF]">Total Posts</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <i className="size-2 rounded-full bg-[#0A66C2]" />
                <span className="text-[#52617D]">Image</span>
                <b className="ml-auto text-[#172044]">42%</b>
              </div>
              <div className="flex items-center gap-2">
                <i className="size-2 rounded-full bg-[#8B5CF6]" />
                <span className="text-[#52617D]">Video</span>
                <b className="ml-auto text-[#172044]">28%</b>
              </div>
              <div className="flex items-center gap-2">
                <i className="size-2 rounded-full bg-[#F59E0B]" />
                <span className="text-[#52617D]">Carousel</span>
                <b className="ml-auto text-[#172044]">18%</b>
              </div>
              <div className="flex items-center gap-2">
                <i className="size-2 rounded-full bg-[#94A3B8]" />
                <span className="text-[#52617D]">Text/Link</span>
                <b className="ml-auto text-[#172044]">12%</b>
              </div>
            </div>
          </div>
        </Card>

        {/* Engagement by Day & Time */}
        <Card title="Engagement by Day & Time" action={<CardLink label="View Details" />}>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#8A97AF]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="mt-1 space-y-1">
              {[
                [1, 2, 4, 5, 3, 1, 1],
                [1, 3, 5, 5, 4, 2, 1],
                [2, 4, 5, 4, 3, 2, 1],
                [1, 2, 3, 4, 2, 1, 1],
              ].map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-7 gap-1">
                  {row.map((intensity, cIdx) => (
                    <div
                      key={cIdx}
                      className={cn(
                        "h-4 rounded-[3px]",
                        intensity === 1 && "bg-[#EFF6FF]",
                        intensity === 2 && "bg-[#BFDBFE]",
                        intensity === 3 && "bg-[#60A5FA]",
                        intensity === 4 && "bg-[#2563EB]",
                        intensity === 5 && "bg-[#1E40AF]",
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-[#8A97AF]">
              <span>12 AM</span>
              <span>4 AM</span>
              <span>8 AM</span>
              <span>12 PM</span>
              <span>4 PM</span>
              <span>8 PM</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 4: LinkedIn 6-Reactions Breakdown, Document/PDF Carousel Engagement, Employee Advocacy Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* LinkedIn 6-Reactions Breakdown */}
        <Card title="LinkedIn Reactions Breakdown" action={<span className="text-[10px] font-bold text-[#0A66C2]">6,248 Total</span>}>
          <div className="space-y-2 p-3.5">
            {[
              { name: "Like", emoji: "👍", count: "3,024", pct: 48.4, color: "bg-[#0A66C2]" },
              { name: "Celebrate", emoji: "👏", count: "1,312", pct: 21.0, color: "bg-[#10B981]" },
              { name: "Insightful", emoji: "💡", count: "874", pct: 14.0, color: "bg-[#F59E0B]" },
              { name: "Love", emoji: "❤️", count: "687", pct: 11.0, color: "bg-[#EF4444]" },
              { name: "Support", emoji: "🤍", count: "281", pct: 4.5, color: "bg-[#8B5CF6]" },
              { name: "Funny", emoji: "😄", count: "94", pct: 1.5, color: "bg-[#06B6D4]" },
            ].map((rx) => (
              <div key={rx.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium text-[#172044]">
                    <span className="text-[13px]">{rx.emoji}</span>
                    <span>{rx.name}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#687797]">{rx.count}</span>
                    <b className="text-[11px] text-[#172044] w-9 text-right">{rx.pct}%</b>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDF2F7]">
                  <div className={cn("h-full rounded-full", rx.color)} style={{ width: `${rx.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Document / PDF Carousel Engagement */}
        <Card title="Document & Carousel Engagement" action={<CardLink label="View Reports" />}>
          <div className="space-y-3 p-3.5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#EDF1F5] bg-[#F8FAFD] p-2">
                <p className="text-[11.5px] text-[#687797]">Completion Rate</p>
                <b className="text-[15px] font-bold text-[#0A66C2]">74.2%</b>
                <p className="text-[11px] text-[#10B981]">↑ 6.4% MoM</p>
              </div>
              <div className="rounded-lg border border-[#EDF1F5] bg-[#F8FAFD] p-2">
                <p className="text-[11.5px] text-[#687797]">Avg Slides Read</p>
                <b className="text-[15px] font-bold text-[#172044]">7.4 / 10</b>
                <p className="text-[11px] text-[#8A97AF]">slides / user</p>
              </div>
              <div className="rounded-lg border border-[#EDF1F5] bg-[#F8FAFD] p-2">
                <p className="text-[11.5px] text-[#687797]">Downloads</p>
                <b className="text-[15px] font-bold text-[#8B5CF6]">842</b>
                <p className="text-[11px] text-[#10B981]">↑ 24% vs last mo</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-[#EDF1F5] pt-2.5">
              <p className="text-[10.5px] font-bold text-[#172044]">Top Document Posts</p>
              {[
                { title: "10 Steps to Save Local Water Bodies (PDF)", views: "4.2K reads", completion: "92% rate", icon: "📄" },
                { title: "Ganga Biodiversity Action Plan 2025 (Doc)", views: "2.8K reads", completion: "78% rate", icon: "📑" },
                { title: "Community Volunteer Guidebook (Slide Deck)", views: "1.9K reads", completion: "69% rate", icon: "📊" },
              ].map((doc) => (
                <div key={doc.title} className="flex items-center justify-between rounded-lg border border-[#EDF1F5] p-2 text-[10.5px]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[14px]">{doc.icon}</span>
                    <p className="truncate font-semibold text-[#172044]">{doc.title}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[10px] text-[#687797]">{doc.views}</span>
                    <b className="block text-[10px] text-[#10B981]">{doc.completion}</b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Employee Advocacy Impact & Top Advocates */}
        <Card title="Employee Advocacy Impact" action={<span className="rounded bg-[#FAF5FF] px-1.5 py-0.5 text-[11.5px] font-bold text-[#7E22CE]">48 Advocates</span>}>
          <div className="space-y-3 p-3.5">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg border border-[#E9D5FF] bg-[#FAF5FF] p-2">
                <span className="text-[11.5px] font-medium text-[#7E22CE]">Employee Reshares</span>
                <p className="text-[16px] font-bold text-[#7E22CE]">1,420</p>
                <span className="text-[11px] font-semibold text-[#10B981]">↑ 42% organic boost</span>
              </div>
              <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-2">
                <span className="text-[11.5px] font-medium text-[#047857]">Advocacy Clicks</span>
                <p className="text-[16px] font-bold text-[#047857]">3,420</p>
                <span className="text-[11px] font-semibold text-[#10B981]">71 clicks / advocate</span>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[10.5px] font-bold text-[#172044]">Top Employee Advocates</p>
              <div className="divide-y divide-[#EDF1F5]">
                {[
                  { rank: "🥇", name: "Priya Sharma", role: "Marketing Manager", shares: 28, clicks: "840 clicks" },
                  { rank: "🥈", name: "Manish Sirohi", role: "Program Director", shares: 22, clicks: "610 clicks" },
                  { rank: "🥉", name: "Amit Kumar", role: "Community Lead", shares: 19, clicks: "490 clicks" },
                ].map((adv) => (
                  <div key={adv.name} className="flex items-center justify-between py-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px]">{adv.rank}</span>
                      <div>
                        <p className="font-bold text-[#172044] leading-tight">{adv.name}</p>
                        <p className="text-[11px] text-[#8A97AF]">{adv.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <b className="text-[#0A66C2]">{adv.shares} shares</b>
                      <p className="text-[11px] text-[#687797]">{adv.clicks}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 5: Competitor Benchmarking (LinkedIn Page Analytics Native Tracking) */}
      <div className="overflow-hidden rounded-xl border border-[#DDE4ED] bg-white shadow-[0_1px_4px_rgb(31_50_81/0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF1F5] p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
              <Trophy className="size-4" />
            </span>
            <div>
              <h3 className="text-[14px] font-bold text-[#172044]">Competitor Benchmarking</h3>
              <p className="text-[11px] text-[#687797]">
                Compare Namo Gange Trust against industry peers in organic LinkedIn reach & engagement.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] px-2.5 py-1 text-[11px] font-semibold text-[#52617D]">
              Last 30 Days
            </span>
            <button className="flex h-[30px] items-center gap-1 rounded-lg bg-[#0A66C2] px-3 text-[11px] font-semibold text-white shadow-sm hover:bg-[#0958A8]">
              <Plus className="size-3" />
              <span>Add Competitor</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-[#EDF1F5] bg-[#F8FAFD] text-[10.5px] font-bold text-[#687797]">
                <th className="min-w-[220px] px-3.5 py-3">Organization</th>
                <th className="w-[120px] px-3.5 py-3">Total Followers</th>
                <th className="w-[130px] px-3.5 py-3">Follower Growth</th>
                <th className="w-[130px] px-3.5 py-3">Monthly Posts</th>
                <th className="w-[130px] px-3.5 py-3">Engagement Rate</th>
                <th className="w-[120px] px-3.5 py-3">Est. Impressions</th>
                <th className="w-[90px] px-3.5 py-3 text-center">Benchmark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5]">
              {[
                {
                  name: "Namo Gange Trust (You)",
                  tag: "Your Page",
                  isYou: true,
                  followers: "12,482",
                  growth: "+18.2%",
                  posts: "42 posts/mo",
                  er: "6.8%",
                  impressions: "86.5K",
                  badge: "Leader in ER",
                  avatar: "/namogange.webp",
                },
                {
                  name: "Namami Gange Mission",
                  tag: "Government Initiative",
                  isYou: false,
                  followers: "48,200",
                  growth: "+8.4%",
                  posts: "28 posts/mo",
                  er: "4.2%",
                  impressions: "210K",
                  badge: "High Reach",
                  avatar: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=100&h=100&fit=crop",
                },
                {
                  name: "WWF India",
                  tag: "Global Non-profit",
                  isYou: false,
                  followers: "184,500",
                  growth: "+12.1%",
                  posts: "36 posts/mo",
                  er: "5.1%",
                  impressions: "680K",
                  badge: "Top Follower Base",
                  avatar: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=100&h=100&fit=crop",
                },
                {
                  name: "Clean Rivers Network",
                  tag: "Regional Alliance",
                  isYou: false,
                  followers: "8,920",
                  growth: "+6.0%",
                  posts: "14 posts/mo",
                  er: "3.4%",
                  impressions: "42K",
                  badge: "Emerging",
                  avatar: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=100&h=100&fit=crop",
                },
              ].map((comp) => (
                <tr
                  key={comp.name}
                  className={cn(
                    "transition-colors",
                    comp.isYou ? "bg-[#EFF6FF]/60 hover:bg-[#EFF6FF]" : "hover:bg-[#F9FBFE]"
                  )}
                >
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <img src={comp.avatar} alt="" className="size-7 rounded-lg object-cover border border-[#DDE4ED]" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-[#172044]">{comp.name}</p>
                          {comp.isYou && (
                            <span className="rounded bg-[#0A66C2] px-1.5 py-0.2 text-[11px] font-bold text-white">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-[#8A97AF]">{comp.tag}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 font-bold text-[#172044]">{comp.followers}</td>
                  <td className="px-3.5 py-3">
                    <span className="font-bold text-[#10B981]">{comp.growth}</span>
                    <span className="ml-1 text-[11px] text-[#8A97AF]">growth</span>
                  </td>
                  <td className="px-3.5 py-3 text-[#52617D]">{comp.posts}</td>
                  <td className="px-3.5 py-3">
                    <span className="font-bold text-[#0A66C2]">{comp.er}</span>
                    {comp.isYou && <span className="ml-1 text-[11px] font-bold text-[#10B981]">★ Highest</span>}
                  </td>
                  <td className="px-3.5 py-3 font-semibold text-[#172044]">{comp.impressions}</td>
                  <td className="px-3.5 py-3 text-center">
                    <span className="inline-block rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11.5px] font-semibold text-[#475569]">
                      {comp.badge}
                    </span>
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

// ----------------------------------------------------
// TAB 0: OVERVIEW TAB (Default Dashboard Layout)
// ----------------------------------------------------

const keyMetrics = [
  { label: "Total Followers", value: "12,482", trend: "18%", icon: UsersRound, color: "blue" },
  { label: "Profile Views", value: "248", trend: "22%", icon: Eye, color: "purple" },
  { label: "Post Impressions", value: "86,452", trend: "28%", icon: BarChart3, color: "indigo" },
  { label: "Post Engagements", value: "6,248", trend: "34%", icon: Heart, color: "rose" },
  { label: "Website Clicks", value: "312", trend: "26%", icon: MousePointerClick, color: "amber" },
  { label: "New Followers", value: "48", trend: "52%", icon: UserPlus, color: "green" },
] as const;

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

function OverviewTab({ onNavigateTab }: { onNavigateTab?: (tab: TabType) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid items-start gap-3 [&>section]:h-[318px] xl:grid-cols-[1.18fr_1fr_1fr]">
        <PageOverview />
        <KeyMetrics />
        <AudienceDemographics onNavigateToAudience={() => onNavigateTab?.("Audience")} />
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
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <PageCustomCtaAnalytics />
        <LinkedInLiveEvents />
      </div>
    </div>
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
              <span className="mt-1 rounded bg-[#0A66C2] px-1.5 py-0.5 text-[11px] font-semibold">
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
              <small className="text-[10.5px] font-bold">{item.month}</small>
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
              <p className="truncate text-[11.5px] leading-3 text-[#7A87A0]">{tile.label}</p>
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
                "flex h-[42px] flex-col items-center justify-center gap-1 rounded-lg border text-[11.5px] font-semibold leading-3 transition-colors",
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
              <span className="shrink-0 whitespace-nowrap text-[11.5px] text-[#9AA6BC]">{time}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PageCustomCtaAnalytics() {
  return (
    <Card
      title="Custom Action Button (Page CTA)"
      action={
        <span className="flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[10px] font-bold text-[#0A66C2]">
          <MousePointerClick className="size-3" />
          Visit Website
        </span>
      }
    >
      <div className="space-y-3 p-3.5">
        <div className="flex items-center justify-between rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] p-2.5">
          <div>
            <span className="text-[10px] font-semibold text-[#687797]">Active Button Target</span>
            <p className="font-bold text-[#172044] text-[12px]">https://namogangetrust.org</p>
          </div>
          <button className="rounded-md border border-[#CBD5E1] bg-white px-2.5 py-1 text-[10.5px] font-semibold text-[#425273] hover:bg-[#F1F5F9]">
            Change CTA
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-[#EDF1F5] bg-white p-2">
            <span className="text-[11.5px] text-[#687797]">Total Clicks</span>
            <p className="text-[17px] font-bold text-[#0A66C2]">1,842</p>
            <span className="text-[11px] font-semibold text-[#10B981]">↑ 38.4% MoM</span>
          </div>
          <div className="rounded-lg border border-[#EDF1F5] bg-white p-2">
            <span className="text-[11.5px] text-[#687797]">Click-Through Rate</span>
            <p className="text-[17px] font-bold text-[#172044]">4.8%</p>
            <span className="text-[11px] text-[#10B981]">↑ 1.2% vs avg</span>
          </div>
          <div className="rounded-lg border border-[#EDF1F5] bg-white p-2">
            <span className="text-[11.5px] text-[#687797]">Top Device</span>
            <p className="text-[17px] font-bold text-[#8B5CF6]">64%</p>
            <span className="text-[11px] text-[#8A97AF]">Desktop users</span>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-[#EDF1F5] pt-2">
          <p className="text-[10.5px] font-bold text-[#172044]">CTA Click Sources</p>
          {[
            { source: "Organic Page Header", clicks: "1,142 clicks", pct: 62 },
            { source: "Sponsored Post CTAs", clicks: "515 clicks", pct: 28 },
            { source: "Employee Reshare Direct Links", clicks: "185 clicks", pct: 10 },
          ].map((src) => (
            <div key={src.source} className="space-y-0.5">
              <div className="flex justify-between items-center gap-2 text-[10.5px]">
                <span className="whitespace-nowrap text-[#52617D]">{src.source}</span>
                <b className="whitespace-nowrap text-[#172044]">{src.clicks} ({src.pct}%)</b>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EDF2F7]">
                <div className="h-full rounded-full bg-[#0A66C2]" style={{ width: `${src.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function LinkedInLiveEvents() {
  return (
    <Card
      title="LinkedIn Live & Events"
      action={
        <button className="flex items-center gap-1 rounded-md bg-[#0A66C2] px-2.5 py-1 text-[10.5px] font-semibold text-white hover:bg-[#0958A8]">
          <Plus className="size-3" />
          Create Event
        </button>
      }
    >
      <div className="space-y-2.5 p-3.5">
        {/* Event 1 */}
        <div className="rounded-lg border border-[#EDF1F5] p-2.5 transition-colors hover:bg-[#F9FBFE]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-bold text-[#DC2626]">
                <Radio className="size-2.5 animate-pulse text-[#DC2626]" />
                Live Webinar
              </span>
              <span className="text-[10px] font-medium text-[#687797]">Apr 20, 2025 • 11:00 AM IST</span>
            </div>
            <span className="rounded bg-[#ECFDF5] px-1.5 py-0.2 text-[11.5px] font-bold text-[#059669]">
              384 RSVPs
            </span>
          </div>
          <p className="mt-1 font-bold text-[#172044] text-[11.5px]">
            Youth for Ganga: Digital Cleanliness & Community Revitalization
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#687797]">
            <span>3 Guest Speakers • LinkedIn Stream</span>
            <div className="flex items-center gap-2">
              <button className="font-semibold text-[#0A66C2] hover:underline">View RSVPs</button>
              <span>·</span>
              <button className="font-semibold text-[#425273] hover:underline">Broadcast Studio</button>
            </div>
          </div>
        </div>

        {/* Event 2 */}
        <div className="rounded-lg border border-[#EDF1F5] p-2.5 transition-colors hover:bg-[#F9FBFE]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-bold text-[#0A66C2]">
                <Users className="size-2.5 text-[#0A66C2]" />
                Audio Event
              </span>
              <span className="text-[10px] font-medium text-[#687797]">Apr 27, 2025 • 04:00 PM IST</span>
            </div>
            <span className="rounded bg-[#ECFDF5] px-1.5 py-0.2 text-[11.5px] font-bold text-[#059669]">
              192 RSVPs
            </span>
          </div>
          <p className="mt-1 font-bold text-[#172044] text-[11.5px]">
            River Conservation Policy Dialogues – Open Mic & Q&A
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#687797]">
            <span>Co-host: Namo Gange x WWF Network</span>
            <div className="flex items-center gap-2">
              <button className="font-semibold text-[#0A66C2] hover:underline">View RSVPs</button>
              <span>·</span>
              <button className="font-semibold text-[#425273] hover:underline">Edit Details</button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ----------------------------------------------------
// TAB 5: LEADS TAB
// ----------------------------------------------------

function LeadsTab() {
  const [subTab, setSubTab] = useState<"All Leads" | "New Leads">("All Leads");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");

  const leadsTrendData = [
    { date: "Mar 15", total: 24, qualified: 8, converted: 2 },
    { date: "Mar 20", total: 28, qualified: 10, converted: 3 },
    { date: "Mar 25", total: 38, qualified: 14, converted: 4 },
    { date: "Mar 30", total: 46, qualified: 17, converted: 5 },
    { date: "Apr 5", total: 64, qualified: 24, converted: 7 },
    { date: "Apr 10", total: 82, qualified: 31, converted: 10 },
    { date: "Apr 14", total: 100, qualified: 38, converted: 12 },
  ];

  const sourceDonutData = [
    { name: "Lead Gen Forms", value: 45, color: "#0A66C2" },
    { name: "Messages", value: 26, color: "#10B981" },
    { name: "Organic Profile", value: 15, color: "#8B5CF6" },
    { name: "Sponsored Content", value: 10, color: "#F59E0B" },
    { name: "Other", value: 4, color: "#EF4444" },
  ];

  const leadsTableData = [
    {
      id: "1",
      name: "Priya Sharma",
      connection: "Connected 2nd",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      company: "GreenStep India",
      companyIconColor: "bg-[#DCFCE7] text-[#16A34A]",
      designation: "Marketing Manager",
      source: "Lead Gen Form",
      sourceColor: "bg-[#EFF6FF] text-[#0A66C2]",
      status: "New",
      statusColor: "bg-[#EFF6FF] text-[#0A66C2]",
      date: "Apr 14, 2025 10:24 AM",
    },
    {
      id: "2",
      name: "Rajesh Malhotra",
      connection: "Connected 2nd",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80",
      company: "Malhotra Enterprises",
      companyIconColor: "bg-[#EFF6FF] text-[#2563EB]",
      designation: "Managing Director",
      source: "Lead Gen Form",
      sourceColor: "bg-[#EFF6FF] text-[#0A66C2]",
      status: "New",
      statusColor: "bg-[#EFF6FF] text-[#0A66C2]",
      date: "Apr 14, 2025 09:15 AM",
    },
    {
      id: "3",
      name: "Sneha Kapur",
      connection: "Connected 1st",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
      company: "Green Ventures India",
      companyIconColor: "bg-[#DCFCE7] text-[#16A34A]",
      designation: "Sustainability Officer",
      source: "Sponsored Content",
      sourceColor: "bg-[#FFFBEB] text-[#D97706]",
      status: "New",
      statusColor: "bg-[#EFF6FF] text-[#0A66C2]",
      date: "Apr 13, 2025 04:45 PM",
    },
    {
      id: "4",
      name: "Rahul Mehta",
      connection: "Connected 2nd",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      company: "EcoBuild Solutions",
      companyIconColor: "bg-[#EFF6FF] text-[#2563EB]",
      designation: "Founder & CEO",
      source: "Message",
      sourceColor: "bg-[#ECFDF5] text-[#059669]",
      status: "Qualified",
      statusColor: "bg-[#F5F3FF] text-[#7C3AED]",
      date: "Apr 13, 2025 03:18 PM",
    },
    {
      id: "5",
      name: "Aditi Verma",
      connection: "Connected 3rd",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      company: "CleanEarth Foundation",
      companyIconColor: "bg-[#DCFCE7] text-[#16A34A]",
      designation: "CSR Manager",
      source: "Sponsored Content",
      sourceColor: "bg-[#FFFBEB] text-[#D97706]",
      status: "Contacted",
      statusColor: "bg-[#FEF3C7] text-[#D97706]",
      date: "Apr 12, 2025 11:45 AM",
    },
    {
      id: "6",
      name: "Vikram Singh",
      connection: "Connected 2nd",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
      company: "Riverside Corp",
      companyIconColor: "bg-[#EFF6FF] text-[#2563EB]",
      designation: "Operations Head",
      source: "Organic",
      sourceColor: "bg-[#F5F3FF] text-[#7C3AED]",
      status: "Nurturing",
      statusColor: "bg-[#EEF2FF] text-[#4F46E5]",
      date: "Apr 11, 2025 02:30 PM",
    },
    {
      id: "7",
      name: "Neha Kapoor",
      connection: "Connected 2nd",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
      company: "WaterCare NGO",
      companyIconColor: "bg-[#E0F2FE] text-[#0284C7]",
      designation: "Program Director",
      source: "Lead Gen Form",
      sourceColor: "bg-[#EFF6FF] text-[#0A66C2]",
      status: "Qualified",
      statusColor: "bg-[#F5F3FF] text-[#7C3AED]",
      date: "Apr 10, 2025 01:15 PM",
    },
    {
      id: "8",
      name: "Arjun Malhotra",
      connection: "Connected 3rd",
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80",
      company: "Sustain India",
      companyIconColor: "bg-[#DCFCE7] text-[#16A34A]",
      designation: "Business Development",
      source: "Message",
      sourceColor: "bg-[#ECFDF5] text-[#059669]",
      status: "Converted",
      statusColor: "bg-[#ECFDF5] text-[#059669]",
      date: "Apr 9, 2025 05:20 PM",
    },
    {
      id: "9",
      name: "Ritika Sinha",
      connection: "Connected 2nd",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      company: "Blue Planet Media",
      companyIconColor: "bg-[#EFF6FF] text-[#2563EB]",
      designation: "Content Strategist",
      source: "Organic",
      sourceColor: "bg-[#F5F3FF] text-[#7C3AED]",
      status: "Contacted",
      statusColor: "bg-[#FEF3C7] text-[#D97706]",
      date: "Apr 8, 2025 12:10 PM",
    },
    {
      id: "10",
      name: "Karan Patel",
      connection: "Connected 3rd",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80",
      company: "EarthFirst Initiative",
      companyIconColor: "bg-[#FFFBEB] text-[#D97706]",
      designation: "Partnerships Lead",
      source: "Sponsored Content",
      sourceColor: "bg-[#FFFBEB] text-[#D97706]",
      status: "Lost",
      statusColor: "bg-[#FEF2F2] text-[#DC2626]",
      date: "Apr 7, 2025 09:40 AM",
    },
  ];

  const filteredLeads = leadsTableData.filter((row) => {
    if (subTab === "New Leads" && row.status !== "New") return false;
    if (statusFilter !== "All" && row.status !== statusFilter) return false;
    if (sourceFilter !== "All" && row.source !== sourceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        row.company.toLowerCase().includes(q) ||
        row.designation.toLowerCase().includes(q) ||
        row.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* TOP 6 KPI CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Card 1: Total Leads */}
        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-[#687797]">Total Leads</p>
            <span className="grid size-7 place-items-center rounded-lg bg-[#E7F1FC] text-[#0A66C2]">
              <Users className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 text-[20px] font-bold text-[#111B43]">248</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
            <span className="font-bold text-[#10B981]">↑ 36%</span>
            <span className="text-[#8A97AF]">+66 vs last month</span>
          </div>
        </div>

        {/* Card 2: Form Submissions */}
        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-[#687797]">Form Submissions</p>
            <span className="grid size-7 place-items-center rounded-lg bg-[#F1E9FE] text-[#7C3AED]">
              <FileText className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 text-[20px] font-bold text-[#111B43]">142</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
            <span className="font-bold text-[#10B981]">↑ 28%</span>
            <span className="text-[#8A97AF]">+31 vs last month</span>
          </div>
        </div>

        {/* Card 3: Message Leads */}
        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-[#687797]">Message Leads</p>
            <span className="grid size-7 place-items-center rounded-lg bg-[#E1F8EC] text-[#0F9D58]">
              <MessageSquare className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 text-[20px] font-bold text-[#111B43]">64</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
            <span className="font-bold text-[#10B981]">↑ 42%</span>
            <span className="text-[#8A97AF]">+19 vs last month</span>
          </div>
        </div>

        {/* Card 4: Qualified Leads */}
        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-[#687797]">Qualified Leads</p>
            <span className="grid size-7 place-items-center rounded-lg bg-[#FFF3DC] text-[#D97706]">
              <UserCheck className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 text-[20px] font-bold text-[#111B43]">38</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
            <span className="font-bold text-[#10B981]">↑ 27%</span>
            <span className="text-[#8A97AF]">+8 vs last month</span>
          </div>
        </div>

        {/* Card 5: Converted */}
        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-[#687797]">Converted</p>
            <span className="grid size-7 place-items-center rounded-lg bg-[#E1F8EC] text-[#059669]">
              <CheckCircle2 className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 text-[20px] font-bold text-[#111B43]">12</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
            <span className="font-bold text-[#10B981]">↑ 50%</span>
            <span className="text-[#8A97AF]">+4 vs last month</span>
          </div>
        </div>

        {/* Card 6: Lead Ad Reach */}
        <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-[#687797]">Lead Ad Reach</p>
            <span className="grid size-7 place-items-center rounded-lg bg-[#F1E9FE] text-[#7C3AED]">
              <Eye className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 text-[20px] font-bold text-[#111B43]">86.4K</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
            <span className="font-bold text-[#10B981]">↑ 18%</span>
            <span className="text-[#8A97AF]">+13.2K vs last month</span>
          </div>
        </div>
      </div>

      {/* MIDDLE VISUALIZATIONS ROW */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1.15fr_0.85fr]">
        {/* Card 1: Leads Trend */}
        <Card
          title="Leads Trend"
          filter="Last 30 days"
          action={
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-[#425273]">
                <span className="size-2 rounded-full bg-[#0A66C2]" />
                Total Leads
              </span>
              <span className="flex items-center gap-1 text-[#425273]">
                <span className="size-2 rounded-full bg-[#10B981]" />
                Qualified Leads
              </span>
              <span className="flex items-center gap-1 text-[#425273]">
                <span className="size-2 rounded-full bg-[#8B5CF6]" />
                Converted
              </span>
            </div>
          }
        >
          <div className="p-3.5">
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={leadsTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8A97AF" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8A97AF" }} axisLine={{ stroke: "#E2E8F0" }} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "1px solid #E2E8F0" }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#0A66C2" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="qualified" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="converted" stroke="#8B5CF6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Card 2: Leads by Source */}
        <Card title="Leads by Source">
          <div className="flex h-[230px] items-center justify-between gap-3 p-3.5">
            <div className="relative size-[135px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {sourceDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[17px] font-bold text-[#111B43]">248</span>
                <span className="text-[11px] text-[#8A97AF]">Total Leads</span>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2 text-[11px]">
              {sourceDonutData.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="whitespace-nowrap text-[11px] font-medium text-[#52617D]">{s.name}</span>
                  </div>
                  <span className="shrink-0 font-bold text-[#172044]">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Card 3: Lead Status */}
        <Card
          title="Lead Status"
          action={<CardLink label="View All" />}
        >
          <div className="space-y-2.5 p-3.5 text-[11.5px]">
            {[
              { label: "New", count: 96, color: "bg-[#0A66C2]" },
              { label: "Contacted", count: 64, color: "bg-[#F59E0B]" },
              { label: "Qualified", count: 38, color: "bg-[#8B5CF6]" },
              { label: "Nurturing", count: 28, color: "bg-[#6366F1]" },
              { label: "Converted", count: 12, color: "bg-[#10B981]" },
              { label: "Lost", count: 10, color: "bg-[#EF4444]" },
            ].map((st) => (
              <div key={st.label} className="flex items-center justify-between border-b border-[#F8FAFD] pb-1.5 last:border-none">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", st.color)} />
                  <span className="text-[#52617D]">{st.label}</span>
                </div>
                <span className="font-bold text-[#172044]">{st.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* BOTTOM SECTION: Leads Table & Sidebars */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* LEFT / CENTER: Leads Table Card */}
        <div className="overflow-hidden rounded-xl border border-[#DDE4ED] bg-white shadow-sm">
          {/* Row 1: All Leads (248) & New Leads (96) Tab Pills + Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDF1F5] p-3.5 bg-white">
            <div className="flex items-center gap-2">
              {(["All Leads", "New Leads"] as const).map((tab) => {
                const count = tab === "All Leads" ? 248 : 96;
                const isSelected = subTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setSubTab(tab)}
                    className={cn(
                      "flex h-[32px] items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition-all",
                      isSelected
                        ? "bg-[#0A66C2] text-white shadow-sm"
                        : "border border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]"
                    )}
                  >
                    <span>{tab}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px]",
                        isSelected ? "bg-white/20 text-white" : "bg-[#EDF2F7] text-[#52617D]"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button className="flex h-[32px] items-center gap-1.5 rounded-lg border border-[#DDE4ED] bg-white px-3 text-[11.5px] font-semibold text-[#425273] shadow-sm hover:bg-[#F8FAFD]">
                <Download className="size-3.5 text-[#8A97AF]" />
                <span>Export Leads</span>
              </button>
              <button className="flex h-[32px] items-center gap-1.5 rounded-lg bg-[#0A66C2] px-3.5 text-[11.5px] font-bold text-white shadow-sm hover:bg-[#0958A8]">
                <Plus className="size-3.5" />
                <span>Add Lead</span>
              </button>
            </div>
          </div>

          {/* Row 2: Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EDF1F5] bg-[#FAFBFD] p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8A97AF]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads..."
                className="h-[32px] w-[180px] rounded-lg border border-[#DDE4ED] bg-white pl-8 pr-2.5 text-[11.5px] text-[#172044] outline-none placeholder:text-[#8A97AF] focus:border-[#0A66C2]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[32px] rounded-lg border border-[#DDE4ED] bg-white px-2.5 text-[11px] font-medium text-[#425273] shadow-sm outline-none hover:bg-[#F8FAFD]"
            >
              <option value="All">Status: All</option>
              <option value="New">New</option>
              <option value="Qualified">Qualified</option>
              <option value="Contacted">Contacted</option>
              <option value="Nurturing">Nurturing</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="h-[32px] rounded-lg border border-[#DDE4ED] bg-white px-2.5 text-[11px] font-medium text-[#425273] shadow-sm outline-none hover:bg-[#F8FAFD]"
            >
              <option value="All">Source: All</option>
              <option value="Lead Gen Form">Lead Gen Form</option>
              <option value="Message">Message</option>
              <option value="Sponsored Content">Sponsored Content</option>
              <option value="Organic">Organic</option>
            </select>

            <button className="flex h-[32px] items-center gap-1.5 rounded-lg border border-[#DDE4ED] bg-white px-2.5 text-[11px] font-medium text-[#425273] shadow-sm hover:bg-[#F8FAFD]">
              <span>Date Range</span>
              <ChevronDown className="size-3 text-[#8A97AF]" />
            </button>

            <button className="flex h-[32px] items-center gap-1 rounded-lg border border-dashed border-[#DDE4ED] bg-white px-2.5 text-[11px] font-medium text-[#0A66C2] hover:bg-[#F8FAFD]">
              <Plus className="size-3" />
              <span>Add Filter</span>
            </button>
          </div>

          {/* Table Element (No Platform Column) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-[#EDF1F5] bg-[#F8FAFD] text-[10px] font-bold text-[#687797]">
                  <th className="w-8 px-3 py-2.5 text-center">
                    <input type="checkbox" className="rounded text-[#0A66C2]" />
                  </th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Name</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Company</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Designation</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Source</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
                  <th className="px-3 py-2.5 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1F5]">
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((row) => (
                    <tr key={row.id} className="hover:bg-[#FAFBFD]">
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" className="rounded text-[#0A66C2]" />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={row.avatar}
                            alt={row.name}
                            className="size-7 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-bold text-[#172044]">{row.name}</p>
                            <p className="text-[11px] text-[#8A97AF]">{row.connection}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("grid size-5 place-items-center rounded-full text-[11px] font-bold", row.companyIconColor)}>
                            ●
                          </span>
                          <span className="font-medium text-[#172044]">{row.company}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[#52617D]">{row.designation}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold", row.sourceColor)}>
                          {row.source}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold", row.statusColor)}>
                          {row.status === "New" ? "● New" : row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-[#8A97AF]">{row.date}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button className="text-[#8A97AF] hover:text-[#172044]">
                          <MoreVertical className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[12px] text-[#8A97AF]">
                      No leads found matching current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Top Converting Campaigns & Recent Lead Activity */}
        <div className="space-y-4">
          {/* Top Converting Campaigns Card */}
          <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-[#172044]">Top Converting Campaigns</h4>
              <CardLink label="View All" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-[#EDF1F5] text-[11.5px] font-bold text-[#8A97AF]">
                    <th className="pb-1.5">Campaign</th>
                    <th className="pb-1.5 text-center">Leads</th>
                    <th className="pb-1.5 text-center">Converted</th>
                    <th className="pb-1.5 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1F5]">
                  {[
                    { name: "Clean Ganga Drive", leads: 84, conv: 6, rate: "7.1%" },
                    { name: "Volunteer Stories", leads: 62, conv: 4, rate: "6.5%" },
                    { name: "World Water Day", leads: 48, conv: 3, rate: "6.3%" },
                    { name: "Community Outreach", leads: 36, conv: 2, rate: "5.6%" },
                    { name: "Awareness Series", leads: 18, conv: 1, rate: "5.6%" },
                  ].map((c) => (
                    <tr key={c.name} className="hover:bg-[#FAFBFD]">
                      <td className="py-2 font-medium text-[#172044]">{c.name}</td>
                      <td className="py-2 text-center text-[#52617D]">{c.leads}</td>
                      <td className="py-2 text-center text-[#52617D]">{c.conv}</td>
                      <td className="py-2 text-right font-bold text-[#10B981]">{c.rate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Lead Activity Card */}
          <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-[#172044]">Recent Lead Activity</h4>
              <CardLink label="View All" />
            </div>
            <div className="space-y-2.5 divide-y divide-[#EDF1F5] text-[11px]">
              {[
                { name: "Priya Sharma", action: "Submitted a lead form", time: "10 min ago", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80", inBadge: true },
                { name: "Rahul Mehta", action: "Sent a message", time: "2 hours ago", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80", inBadge: true },
                { name: "Aditi Verma", action: "Viewed your profile", time: "4 hours ago", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80", inBadge: false },
                { name: "Vikram Singh", action: "Engaged with your post", time: "6 hours ago", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80", inBadge: true },
                { name: "Neha Kapoor", action: "Submitted a lead form", time: "1 day ago", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&auto=format&fit=crop&q=80", inBadge: true },
              ].map((act, i) => (
                <div key={i} className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative shrink-0">
                      <img
                        src={act.avatar}
                        alt={act.name}
                        className="size-7 rounded-full object-cover"
                      />
                      {act.inBadge && (
                        <div className="absolute -bottom-0.5 -right-0.5 grid size-3 place-items-center rounded bg-[#0A66C2] text-[10px] font-bold text-white">
                          in
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[#172044]">{act.name}</p>
                      <p className="text-[11.5px] text-[#8A97AF]">{act.action}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#8A97AF] whitespace-nowrap">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 6: INBOX TAB
// ----------------------------------------------------

function InboxTab() {
  const [subTab, setSubTab] = useState<"Inbox" | "Comments" | "Mentions" | "Leads" | "Archived">("Inbox");
  const [filterPill, setFilterPill] = useState<"All" | "Unread" | "Leads" | "Starred">("All");
  const [selectedConversation, setSelectedConversation] = useState("Priya Sharma");
  const [replyText, setReplyText] = useState("");

  const conversationList = [
    {
      id: "1",
      name: "Priya Sharma",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
      preview: "This is such an important initiative!...",
      time: "10:24 AM",
      badge: "Lead",
      badgeColor: "bg-[#DCFCE7] text-[#16A34A]",
      unread: true,
      hasLinkedInBadge: false,
    },
    {
      id: "2",
      name: "Rahul Mehta",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      preview: "Great campaign! Are there any events...",
      time: "09:18 AM",
      badge: "General",
      badgeColor: "bg-[#F1F5F9] text-[#64748B]",
      unread: true,
      hasLinkedInBadge: true,
    },
    {
      id: "3",
      name: "Green Earth Club",
      isClub: true,
      preview: "We are interested in collaborating...",
      time: "Yesterday",
      badge: "Partnership",
      badgeColor: "bg-[#EFF6FF] text-[#2563EB]",
      unread: false,
    },
    {
      id: "4",
      name: "Aditi Verma",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      preview: "Amazing work! Keep it up! 💚",
      time: "Yesterday",
      badge: "Compliment",
      badgeColor: "bg-[#F3E8FF] text-[#9333EA]",
      unread: false,
    },
    {
      id: "5",
      name: "Vikram Singh",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
      preview: "Can you share more details about...",
      time: "Apr 12",
      badge: "Lead",
      badgeColor: "bg-[#DCFCE7] text-[#16A34A]",
      unread: false,
      hasLinkedInBadge: true,
    },
    {
      id: "6",
      name: "Neha Kapoor",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
      preview: "Will you be posting more videos...",
      time: "Apr 11",
      badge: "General",
      badgeColor: "bg-[#F1F5F9] text-[#64748B]",
      unread: false,
      hasInstagramBadge: true,
    },
    {
      id: "7",
      name: "Sustainable India",
      isClub: true,
      preview: "Loved the recent post on water...",
      time: "Apr 10",
      badge: "Compliment",
      badgeColor: "bg-[#F3E8FF] text-[#9333EA]",
      unread: false,
    },
    {
      id: "8",
      name: "Arjun Malhotra",
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80",
      preview: "Interested in volunteering. Please...",
      time: "Apr 9",
      badge: "Lead",
      badgeColor: "bg-[#DCFCE7] text-[#16A34A]",
      unread: false,
      hasLinkedInBadge: true,
    },
    {
      id: "9",
      name: "Eco Warriors Network",
      isClub: true,
      preview: "Let's explore a collaboration...",
      time: "Apr 8",
      badge: "Partnership",
      badgeColor: "bg-[#EFF6FF] text-[#2563EB]",
      unread: false,
    },
    {
      id: "10",
      name: "Karan Patel",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80",
      preview: "Do you have any internship programs?",
      time: "Apr 7",
      badge: "General",
      badgeColor: "bg-[#F1F5F9] text-[#64748B]",
      unread: false,
      hasLinkedInBadge: true,
    },
    {
      id: "11",
      name: "Ritika Sinha",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
      preview: "This initiative is truly inspiring!",
      time: "Apr 6",
      badge: "Compliment",
      badgeColor: "bg-[#F3E8FF] text-[#9333EA]",
      unread: false,
      hasInstagramBadge: true,
    },
    {
      id: "12",
      name: "Clean India Today",
      isClub: true,
      preview: "Can we feature this on our page?",
      time: "Apr 5",
      badge: "Partnership",
      badgeColor: "bg-[#EFF6FF] text-[#2563EB]",
      unread: false,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Subtabs: Inbox, Comments, Mentions, Leads, Archived */}
      <div className="flex items-center gap-6 border-b border-[#E2E8F0] pb-2 text-[12.5px]">
        {(["Inbox", "Comments", "Mentions", "Leads", "Archived"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={cn(
              "pb-1 font-semibold transition-colors",
              subTab === tab
                ? "border-b-2 border-[#0A66C2] text-[#0A66C2]"
                : "text-[#64748B] hover:text-[#172044]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr_290px] xl:grid-cols-[310px_1fr_310px]">
        {/* LEFT COLUMN: Conversation List */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[#DDE4ED] bg-white shadow-sm">
          <div className="border-b border-[#EDF1F5] p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8A97AF]" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="h-[32px] w-full rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] pl-8 pr-2.5 text-[11.5px] text-[#172044] outline-none placeholder:text-[#8A97AF] focus:border-[#0A66C2]"
                />
              </div>
              <button className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]">
                <Filter className="size-3.5" />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[
                { label: "All (36)", key: "All" },
                { label: "Unread (8)", key: "Unread" },
                { label: "Leads (12)", key: "Leads" },
                { label: "Starred (4)", key: "Starred" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  onClick={() => setFilterPill(pill.key as any)}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-medium transition-colors",
                    filterPill === pill.key
                      ? "bg-[#0A66C2] text-white"
                      : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[640px] divide-y divide-[#EDF1F5] overflow-y-auto">
            {conversationList.map((item) => {
              const isSelected = selectedConversation === item.name;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedConversation(item.name)}
                  className={cn(
                    "relative flex cursor-pointer items-start gap-2.5 p-3 transition-colors hover:bg-[#F8FAFD]",
                    isSelected ? "bg-[#F0F7FF] border-l-4 border-l-[#0A66C2]" : "",
                    !isSelected && item.unread ? "bg-[#FAFBFD]" : ""
                  )}
                >
                  <div className="relative shrink-0">
                    {item.isClub ? (
                      <div className="grid size-9 place-items-center rounded-full bg-[#E1F8EC] text-[#0F9D58]">
                        <Sparkles className="size-4" />
                      </div>
                    ) : (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="size-9 rounded-full object-cover"
                      />
                    )}
                    {item.hasLinkedInBadge && (
                      <div className="absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-[#0A66C2] text-white">
                        <span className="text-[10px] font-bold">in</span>
                      </div>
                    )}
                    {item.hasInstagramBadge && (
                      <div className="absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full bg-[#E11D48] text-white">
                        <span className="text-[10px] font-bold">●</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={cn("truncate text-[12px] font-bold", isSelected ? "text-[#0A66C2]" : "text-[#172044]")}>
                        {item.name}
                      </p>
                      <span className="text-[11.5px] text-[#8A97AF]">{item.time}</span>
                    </div>
                    <p className="truncate text-[10.5px] text-[#52617D]">{item.preview}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", item.badgeColor)}>
                        {item.badge}
                      </span>
                      {item.unread && (
                        <span className="size-2 rounded-full bg-[#0A66C2]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Active Chat */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[#DDE4ED] bg-white shadow-sm min-h-[640px]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-[#EDF1F5] p-3.5">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                alt="Priya Sharma"
                className="size-10 rounded-full object-cover"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[13.5px] font-bold text-[#172044]">Priya Sharma</h3>
                  <span className="grid size-3.5 place-items-center rounded bg-[#0A66C2] text-white text-[10.5px] font-bold">
                    in
                  </span>
                </div>
                <p className="text-[10px] text-[#64748B]">Marketing Manager at GreenStep India</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 rounded-md border border-[#DDE4ED] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#425273] shadow-sm hover:bg-[#F8FAFD]">
                <UserCheck className="size-3 text-[#0A66C2]" />
                <span>Mark as Lead</span>
              </button>
              <button className="grid size-7 place-items-center rounded-md border border-[#DDE4ED] bg-white text-[#8A97AF] hover:bg-[#F8FAFD] hover:text-[#D97706]">
                <Heart className="size-3.5" />
              </button>
              <button className="grid size-7 place-items-center rounded-md border border-[#DDE4ED] bg-white text-[#8A97AF] hover:bg-[#F8FAFD]">
                <MoreHorizontal className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[#FAFBFD] p-4">
            <div className="text-center">
              <span className="rounded-full bg-[#E2E8F0] px-3 py-1 text-[11.5px] font-semibold text-[#64748B]">
                Today
              </span>
            </div>

            {/* Inbound Message 1 */}
            <div className="flex items-start gap-2.5">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                alt="Priya"
                className="size-7 rounded-full object-cover"
              />
              <div className="max-w-[70%] rounded-2xl rounded-tl-none bg-white p-3 text-[11.5px] text-[#1E293B] shadow-sm border border-[#E2E8F0]">
                <p>Hi! I came across your campaign and it's truly inspiring. 🌱</p>
                <p className="mt-1">This is such an important initiative!</p>
                <span className="mt-1.5 block text-right text-[11px] text-[#94A3B8]">10:24 AM</span>
              </div>
            </div>

            {/* Outbound Message 1 */}
            <div className="flex items-start justify-end gap-2.5">
              <div className="max-w-[70%] rounded-2xl rounded-tr-none bg-[#0A66C2] p-3 text-[11.5px] text-white shadow-sm">
                <p>Thank you so much, Priya! 🙏</p>
                <p className="mt-1">We're glad you found it inspiring. Our goal is to bring more people together for cleaner rivers and healthier communities.</p>
                <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-blue-100">
                  <span>10:26 AM</span>
                  <Check className="size-3" />
                </div>
              </div>
              <div className="grid size-7 place-items-center rounded-full bg-[#111B43] text-[11px] font-bold text-white">
                NG
              </div>
            </div>

            {/* Inbound Message 2 */}
            <div className="flex items-start gap-2.5">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                alt="Priya"
                className="size-7 rounded-full object-cover"
              />
              <div className="max-w-[70%] rounded-2xl rounded-tl-none bg-white p-3 text-[11.5px] text-[#1E293B] shadow-sm border border-[#E2E8F0]">
                <p>I would love to know how I can volunteer for the upcoming river clean-up events. Do you have a form or registration link?</p>
                <span className="mt-1.5 block text-right text-[11px] text-[#94A3B8]">10:28 AM</span>
              </div>
            </div>

            {/* Outbound Message 2 */}
            <div className="flex items-start justify-end gap-2.5">
              <div className="max-w-[70%] rounded-2xl rounded-tr-none bg-[#0A66C2] p-3 text-[11.5px] text-white shadow-sm">
                <p>Yes! You can register as a volunteer through this link:</p>
                <p className="mt-1 underline">https://namogange.org/volunteer</p>
                <p className="mt-1">We'll also be sharing upcoming event dates soon. Stay tuned! 💙</p>
                <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-blue-100">
                  <span>10:29 AM</span>
                  <Check className="size-3" />
                </div>
              </div>
              <div className="grid size-7 place-items-center rounded-full bg-[#111B43] text-[11px] font-bold text-white">
                NG
              </div>
            </div>

            {/* Inbound Message 3 */}
            <div className="flex items-start gap-2.5">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                alt="Priya"
                className="size-7 rounded-full object-cover"
              />
              <div className="max-w-[70%] rounded-2xl rounded-tl-none bg-white p-3 text-[11.5px] text-[#1E293B] shadow-sm border border-[#E2E8F0]">
                <p>Great! I've just registered. Looking forward to being a part of this. Keep up the amazing work! 💚</p>
                <span className="mt-1.5 block text-right text-[11px] text-[#94A3B8]">10:31 AM</span>
              </div>
            </div>

            {/* Outbound Message 3 */}
            <div className="flex items-start justify-end gap-2.5">
              <div className="max-w-[70%] rounded-2xl rounded-tr-none bg-[#0A66C2] p-3 text-[11.5px] text-white shadow-sm">
                <p>That's wonderful! 🎉</p>
                <p className="mt-1">Together we can make a bigger impact. If you have any more questions, feel free to reach out.</p>
                <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-blue-100">
                  <span>10:32 AM</span>
                  <Check className="size-3" />
                </div>
              </div>
              <div className="grid size-7 place-items-center rounded-full bg-[#111B43] text-[11px] font-bold text-white">
                NG
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="border-t border-[#EDF1F5] bg-white p-3 space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type a message..."
              rows={2}
              className="w-full resize-none rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] p-2.5 text-[11.5px] text-[#172044] outline-none placeholder:text-[#8A97AF] focus:border-[#0A66C2]"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#64748B]">
                <button className="rounded p-1 hover:bg-[#F1F5F9]"><SmileIcon className="size-4" /></button>
                <button className="rounded p-1 hover:bg-[#F1F5F9]"><LinkIcon className="size-4" /></button>
                <button className="rounded p-1 hover:bg-[#F1F5F9]"><ImageIcon className="size-4" /></button>
                <button className="rounded p-1 text-[10px] font-bold uppercase hover:bg-[#F1F5F9]">GIF</button>
                <button className="rounded p-1 hover:bg-[#F1F5F9]"><Layers className="size-4" /></button>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg bg-[#0A66C2] px-4 py-1.5 text-[12px] font-bold text-white shadow-sm hover:bg-[#0958A8]">
                <Send className="size-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Contact Details & Info */}
        <div className="space-y-3">
          {/* Contact Details Card */}
          <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <h4 className="text-[13px] font-bold text-[#172044]">Contact Details</h4>
              <button className="text-[#8A97AF] hover:text-[#172044]"><MoreHorizontal className="size-3.5" /></button>
            </div>
            <div className="flex flex-col items-center text-center">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80"
                alt="Priya"
                className="size-14 rounded-full object-cover"
              />
              <div className="mt-2 flex items-center gap-1">
                <p className="text-[13px] font-bold text-[#172044]">Priya Sharma</p>
                <span className="grid size-3 place-items-center rounded bg-[#0A66C2] text-[10px] font-bold text-white">in</span>
              </div>
              <p className="text-[10px] text-[#64748B]">Marketing Manager at GreenStep India</p>
            </div>

            <div className="space-y-2 border-t border-[#EDF1F5] pt-3 text-[11px] text-[#475569]">
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-[#8A97AF]" />
                <span>New Delhi, India</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="size-3.5 text-[#8A97AF]" />
                <span>GreenStep India</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-3.5 text-[#8A97AF]" />
                <span>1,240 followers</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="size-3.5 text-[#8A97AF]" />
                <span>500+ connections</span>
              </div>
            </div>

            <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#DDE4ED] bg-white py-1.5 text-[11.5px] font-semibold text-[#0A66C2] hover:bg-[#F8FAFD]">
              <span>View LinkedIn Profile</span>
              <ExternalLink className="size-3" />
            </button>
          </div>

          {/* Conversation Details Card */}
          <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm space-y-2.5">
            <h4 className="text-[13px] font-bold text-[#172044]">Conversation Details</h4>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Channel</span>
                <span className="flex items-center gap-1 font-semibold text-[#172044]">
                  <span className="grid size-3.5 place-items-center rounded bg-[#0A66C2] text-white text-[10.5px] font-bold">in</span>
                  LinkedIn
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">First Message</span>
                <span className="font-medium text-[#172044]">Apr 14, 2025, 10:24 AM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Status</span>
                <span className="flex items-center gap-1 rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#16A34A]">
                  ● Open <ChevronDown className="size-2.5" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Category</span>
                <span className="flex items-center gap-1 font-semibold text-[#172044]">
                  Lead <ChevronDown className="size-2.5 text-[#8A97AF]" />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Assigned To</span>
                <span className="flex items-center gap-1 font-semibold text-[#172044]">
                  <span className="grid size-4 place-items-center rounded-full bg-[#111B43] text-[10.5px] text-white font-bold">MS</span>
                  Manish Sirohi <ChevronDown className="size-2.5 text-[#8A97AF]" />
                </span>
              </div>
              <div className="flex items-start justify-between pt-1">
                <span className="text-[#64748B]">Tags</span>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">Volunteer</span>
                  <span className="rounded bg-[#F3E8FF] px-2 py-0.5 text-[10px] font-semibold text-[#9333EA]">Interested</span>
                  <button className="text-[10px] font-semibold text-[#0A66C2] hover:underline">+ Add Tag</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm space-y-2.5">
            <h4 className="text-[13px] font-bold text-[#172044]">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center gap-1.5 rounded-lg border border-[#DDE4ED] bg-white p-2 text-left text-[11px] font-semibold text-[#425273] shadow-sm hover:bg-[#F8FAFD]">
                <UserCheck className="size-3.5 text-[#0A66C2]" />
                <span>Mark as Lead</span>
              </button>
              <button className="flex items-center gap-1.5 rounded-lg border border-[#DDE4ED] bg-white p-2 text-left text-[11px] font-semibold text-[#425273] shadow-sm hover:bg-[#F8FAFD]">
                <FileText className="size-3.5 text-[#425273]" />
                <span>Add Note</span>
              </button>
              <button className="flex items-center gap-1.5 rounded-lg border border-[#DDE4ED] bg-white p-2 text-left text-[11px] font-semibold text-[#425273] shadow-sm hover:bg-[#F8FAFD]">
                <Calendar className="size-3.5 text-[#425273]" />
                <span>Create Task</span>
              </button>
              <button className="flex items-center gap-1.5 rounded-lg border border-[#DDE4ED] bg-white p-2 text-left text-[11px] font-semibold text-[#425273] shadow-sm hover:bg-[#F8FAFD]">
                <Download className="size-3.5 text-[#425273]" />
                <span>Move to Archive</span>
              </button>
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-bold text-[#172044]">Recent Conversations</h4>
              <CardLink label="View All" />
            </div>
            <div className="space-y-2 divide-y divide-[#EDF1F5] text-[11px]">
              <div className="pt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80"
                    alt="Rahul"
                    className="size-6 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-bold text-[#172044]">Rahul Mehta</p>
                    <p className="text-[11.5px] text-[#8A97AF]">Are there any events happening?</p>
                  </div>
                </div>
                <span className="text-[11px] text-[#8A97AF]">2h ago</span>
              </div>
              <div className="pt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid size-6 place-items-center rounded-full bg-[#E1F8EC] text-[#0F9D58]">
                    <Sparkles className="size-3" />
                  </div>
                  <div>
                    <p className="font-bold text-[#172044]">Green Earth Club</p>
                    <p className="text-[11.5px] text-[#8A97AF]">Collaboration opportunity</p>
                  </div>
                </div>
                <span className="text-[11px] text-[#8A97AF]">1d ago</span>
              </div>
              <div className="pt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"
                    alt="Aditi"
                    className="size-6 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-bold text-[#172044]">Aditi Verma</p>
                    <p className="text-[11.5px] text-[#8A97AF]">Amazing work!</p>
                  </div>
                </div>
                <span className="text-[11px] text-[#8A97AF]">1d ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 7: SETTINGS TAB
// ----------------------------------------------------

function SettingsTab() {
  const [activeSubnav, setActiveSubnav] = useState<
    "General" | "Page Settings" | "Publishing" | "Team & Permissions" | "Notifications" | "Lead Sync" | "Advanced"
  >("General");

  // General state
  const [channelName, setChannelName] = useState("LinkedIn");
  const project = "Moksha Sewa";
  const timezone = "Asia/Kolkata (GMT+5:30)";
  const [description, setDescription] = useState(
    "Working towards a cleaner Ganga through awareness, action and community participation."
  );

  // Page settings state
  const [vanityUrl, setVanityUrl] = useState("linkedin.com/company/namogangetrust");
  const [industry, setIndustry] = useState("Non-Profit Organization Management");
  const [companySize, setCompanySize] = useState("11-50 employees");
  const [websiteUrl, setWebsiteUrl] = useState("https://namogange.org");
  const [tagline, setTagline] = useState("Clean Rivers • Healthy Communities • Brighter Tomorrow");
  const [autoSyncFreq, setAutoSyncFreq] = useState("Every 1 hour");

  // Publishing state
  const [autoPublish, setAutoPublish] = useState(true);
  const [showPreviews, setShowPreviews] = useState(true);
  const [enableUtm, setEnableUtm] = useState(true);
  const [postVisibility, setPostVisibility] = useState("Public");
  const [contentCategory, setContentCategory] = useState("Awareness");
  const [defaultHashtags, setDefaultHashtags] = useState("#CleanGanga #NamoGange #SustainableIndia #RiverConservation");
  const [postFooter, setPostFooter] = useState("🌿 Join the movement at namogange.org | #GangaForFuture");
  const [autoAppendFooter, setAutoAppendFooter] = useState(true);
  const [compressMedia, setCompressMedia] = useState(true);
  const [aiAltText, setAiAltText] = useState(true);

  // Notifications state
  const [notifyPublish, setNotifyPublish] = useState(true);
  const [notifyEngagement, setNotifyEngagement] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(true);
  const [notifyFollowers, setNotifyFollowers] = useState(false);
  const [notifyCampaigns, setNotifyCampaigns] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [alertEmail, setAlertEmail] = useState("admin@namogange.org");
  const [slackWebhook, setSlackWebhook] = useState("https://hooks.slack.com/services/T00/B00/XXXX");
  const [deliverySchedule, setDeliverySchedule] = useState("Instant");

  // Lead sync state
  const [salesforceConnected, setSalesforceConnected] = useState(false);
  const [zohoConnected, setZohoConnected] = useState(false);
  const [autoLeadSync, setAutoLeadSync] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("https://api.namogange.org/v1/leads/webhook");

  // Advanced state
  const [apiVersion] = useState("LinkedIn Marketing API v2 (202504)");
  const [webhookSecret] = useState("whsec_9f823a89e81b3c99042a42b109e23");
  const [retentionPeriod, setRetentionPeriod] = useState("1 Year");
  const [autoPurgeArchived, setAutoPurgeArchived] = useState(true);

  const subNavItems = [
    { label: "General", desc: "Basic channel settings", icon: Settings },
    { label: "Page Settings", desc: "Connected page details", icon: FileText },
    { label: "Publishing", desc: "Content & posting options", icon: Send },
    { label: "Team & Permissions", desc: "Manage access and roles", icon: Users },
    { label: "Notifications", desc: "Alerts and updates", icon: Megaphone },
    { label: "Lead Sync", desc: "Sync leads to CRM", icon: Layers },
    { label: "Advanced", desc: "Additional configuration", icon: SlidersHorizontal },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[230px_1fr]">
      {/* Settings Left Vertical Sidebar */}
      <div className="space-y-1 rounded-xl border border-[#DDE4ED] bg-white p-2 shadow-sm h-fit">
        {subNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSubnav === item.label;
          return (
            <button
              key={item.label}
              onClick={() => setActiveSubnav(item.label as any)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors",
                isActive
                  ? "bg-[#EFF6FF] text-[#0A66C2]"
                  : "text-[#475569] hover:bg-[#F8FAFD]"
              )}
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", isActive ? "text-[#0A66C2]" : "text-[#8A97AF]")} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-[12px] font-bold leading-none", isActive ? "text-[#0A66C2]" : "text-[#172044]")}>
                  {item.label}
                </p>
                <p className="mt-1 truncate text-[10px] text-[#8A97AF]">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Settings Body */}
      <div className="space-y-4">
        {/* ==================================================== */}
        {/* SUBTAB 1: GENERAL */}
        {/* ==================================================== */}
        {activeSubnav === "General" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.9fr]">
              {/* General Settings Card */}
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                      <Settings className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-bold text-[#172044]">General Settings</h3>
                      <p className="text-[10.5px] text-[#8A97AF]">Basic configuration for your LinkedIn channel.</p>
                    </div>
                  </div>
                  <button className="rounded-lg bg-[#0A66C2] px-3.5 py-1.5 text-[11.5px] font-bold text-white shadow-sm hover:bg-[#0958A8]">
                    Save Changes
                  </button>
                </div>

                <div className="space-y-3 text-[11.5px]">
                  <div>
                    <label className="block font-bold text-[#172044]">Channel Name</label>
                    <input
                      type="text"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      className="mt-1 h-[34px] w-full rounded-lg border border-[#DDE4ED] bg-white px-3 text-[#172044] outline-none focus:border-[#0A66C2]"
                    />
                    <p className="mt-1 text-[10px] text-[#8A97AF]">This name will be used internally in your dashboard.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block font-bold text-[#172044]">Connected Page</label>
                      <div className="mt-1 flex items-center justify-between rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] px-2.5 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="grid size-6 place-items-center rounded bg-[#0A66C2] text-white text-[11px] font-bold">in</div>
                          <div>
                            <p className="text-[11px] font-bold text-[#172044]">Namo Gange Trust</p>
                            <p className="text-[11px] text-[#8A97AF]">12,482 followers</p>
                          </div>
                        </div>
                        <button className="text-[#8A97AF] hover:text-[#0A66C2]">
                          <LinkIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[#172044]">Project</label>
                      <div className="mt-1 flex h-[34px] items-center justify-between rounded-lg border border-[#DDE4ED] bg-white px-3">
                        <span className="flex items-center gap-1.5 font-medium text-[#172044]">
                          <Briefcase className="size-3.5 text-[#8A97AF]" />
                          {project}
                        </span>
                        <ChevronDown className="size-3 text-[#8A97AF]" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#172044]">Timezone</label>
                    <div className="mt-1 flex h-[34px] items-center justify-between rounded-lg border border-[#DDE4ED] bg-white px-3">
                      <span className="flex items-center gap-1.5 font-medium text-[#172044]">
                        <span className="text-[#8A97AF]">🌐</span>
                        {timezone}
                      </span>
                      <ChevronDown className="size-3 text-[#8A97AF]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[#172044]">Description <span className="font-normal text-[#8A97AF]">(Optional)</span></label>
                      <span className="text-[10px] text-[#8A97AF]">{description.length}/250 characters</span>
                    </div>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 w-full resize-none rounded-lg border border-[#DDE4ED] bg-white p-2.5 text-[#172044] outline-none focus:border-[#0A66C2]"
                    />
                  </div>
                </div>
              </div>

              {/* Connection Status Card */}
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-[#16A34A]" />
                      <h3 className="text-[13.5px] font-bold text-[#172044]">Connection Status</h3>
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-[#16A34A]">Connected</p>
                    <p className="text-[10px] text-[#8A97AF]">Your LinkedIn page is connected and working properly.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] p-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-lg bg-[#0A66C2] text-white">
                      <span className="text-[16px] font-bold">in</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-[#172044]">Namo Gange Trust</p>
                      <p className="text-[10px] text-[#8A97AF]">@namogangetrust</p>
                    </div>
                  </div>
                  <ExternalLink className="size-3.5 text-[#8A97AF]" />
                </div>

                <div className="space-y-2 divide-y divide-[#EDF1F5] text-[11px]">
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#64748B]">Followers</span>
                    <span className="font-bold text-[#172044]">12,482</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5">
                    <span className="text-[#64748B]">Page Type</span>
                    <span className="font-medium text-[#172044]">Non-profit Organization</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5">
                    <span className="text-[#64748B]">Location</span>
                    <span className="font-medium text-[#172044]">New Delhi, India</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5">
                    <span className="text-[#64748B]">Connected On</span>
                    <span className="font-medium text-[#172044]">Mar 10, 2025, 11:24 AM</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5">
                    <span className="text-[#64748B]">Last Synced</span>
                    <span className="font-medium text-[#172044]">Apr 14, 2025, 10:32 AM</span>
                  </div>
                </div>

                <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#DDE4ED] bg-white py-1.5 text-[11.5px] font-bold text-[#172044] hover:bg-[#F8FAFD]">
                  <RefreshCcw className="size-3 text-[#0A66C2]" />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2]/40 p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-[#FEE2E2] text-[#DC2626]">
                  <AlertTriangle className="size-4" />
                </div>
                <div>
                  <h3 className="text-[13.5px] font-bold text-[#DC2626]">Danger Zone</h3>
                  <p className="text-[10px] text-[#991B1B]">These actions are irreversible. Please proceed with caution.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-[#FCA5A5] bg-white p-3">
                  <div>
                    <p className="text-[11.5px] font-bold text-[#172044]">Reconnect LinkedIn Page</p>
                    <p className="text-[10px] text-[#8A97AF]">Disconnect and reconnect your OAuth access token.</p>
                  </div>
                  <button className="rounded-lg border border-[#DC2626] bg-white px-3 py-1 text-[11px] font-bold text-[#DC2626] hover:bg-[#FEF2F2]">
                    Reconnect
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#FCA5A5] bg-white p-3">
                  <div>
                    <p className="text-[11.5px] font-bold text-[#172044]">Disconnect Channel</p>
                    <p className="text-[10px] text-[#8A97AF]">Stop syncing analytics & automated posting.</p>
                  </div>
                  <button className="rounded-lg bg-[#DC2626] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#B91C1C]">
                    Disconnect
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SUBTAB 2: PAGE SETTINGS */}
        {/* ==================================================== */}
        {activeSubnav === "Page Settings" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.9fr]">
              {/* Organization Profile Details */}
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-bold text-[#172044]">Organization Profile</h3>
                      <p className="text-[10px] text-[#8A97AF]">Public LinkedIn organization information.</p>
                    </div>
                  </div>
                  <button className="rounded-lg bg-[#0A66C2] px-3.5 py-1.5 text-[11.5px] font-bold text-white shadow-sm hover:bg-[#0958A8]">
                    Update Profile
                  </button>
                </div>

                <div className="space-y-3 text-[11.5px]">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block font-bold text-[#172044]">Page Name</label>
                      <input
                        type="text"
                        defaultValue="Namo Gange Trust"
                        className="mt-1 h-[34px] w-full rounded-lg border border-[#DDE4ED] bg-white px-3 text-[#172044] outline-none focus:border-[#0A66C2]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#172044]">Organization ID</label>
                      <input
                        type="text"
                        disabled
                        value="urn:li:organization:84920491"
                        className="mt-1 h-[34px] w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFD] px-3 font-mono text-[10px] text-[#64748B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#172044]">LinkedIn Vanity URL</label>
                    <div className="mt-1 flex h-[34px] items-center rounded-lg border border-[#DDE4ED] bg-white px-3">
                      <span className="text-[#8A97AF] mr-1">https://</span>
                      <input
                        type="text"
                        value={vanityUrl}
                        onChange={(e) => setVanityUrl(e.target.value)}
                        className="w-full bg-transparent text-[#172044] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block font-bold text-[#172044]">Industry</label>
                      <input
                        type="text"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="mt-1 h-[34px] w-full rounded-lg border border-[#DDE4ED] bg-white px-3 text-[#172044] outline-none focus:border-[#0A66C2]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#172044]">Company Size</label>
                      <input
                        type="text"
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="mt-1 h-[34px] w-full rounded-lg border border-[#DDE4ED] bg-white px-3 text-[#172044] outline-none focus:border-[#0A66C2]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#172044]">Website URL</label>
                    <input
                      type="text"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="mt-1 h-[34px] w-full rounded-lg border border-[#DDE4ED] bg-white px-3 text-[#172044] outline-none focus:border-[#0A66C2]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#172044]">Tagline</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="mt-1 h-[34px] w-full rounded-lg border border-[#DDE4ED] bg-white px-3 text-[#172044] outline-none focus:border-[#0A66C2]"
                    />
                  </div>
                </div>
              </div>

              {/* OAuth & Admin Access Card */}
              <div className="space-y-4">
                <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-bold text-[#172044]">OAuth Access & Admin Role</h3>
                      <p className="text-[10px] text-[#8A97AF]">Current authenticated LinkedIn Administrator.</p>
                    </div>
                  </div>

                  <div className="space-y-2 divide-y divide-[#EDF1F5] text-[11px]">
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[#64748B]">Authenticated Admin</span>
                      <span className="font-bold text-[#172044]">Manish Sirohi (Owner)</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5">
                      <span className="text-[#64748B]">Admin Role</span>
                      <span className="rounded bg-[#DCFCE7] px-2 py-0.5 text-[11.5px] font-bold text-[#16A34A]">Super Admin</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5">
                      <span className="text-[#64748B]">Access Token Expiry</span>
                      <span className="font-medium text-[#172044]">June 28, 2025 (Active)</span>
                    </div>
                    <div className="flex items-start justify-between pt-1.5">
                      <span className="text-[#64748B]">Permissions</span>
                      <div className="flex flex-wrap justify-end gap-1">
                        <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#0A66C2]">w_member_social</span>
                        <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#0A66C2]">rw_organization_admin</span>
                        <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#0A66C2]">r_ads_lead</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button className="flex-1 rounded-lg border border-[#DDE4ED] bg-white py-1.5 text-[11px] font-bold text-[#172044] hover:bg-[#F8FAFD]">
                      Test Permissions
                    </button>
                    <button className="flex-1 rounded-lg bg-[#0A66C2] py-1.5 text-[11px] font-bold text-white hover:bg-[#0958A8]">
                      Refresh Token
                    </button>
                  </div>
                </div>

                {/* Sync Schedule Card */}
                <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3">
                  <h3 className="text-[13px] font-bold text-[#172044]">Automatic Sync Frequency</h3>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    {["Every 30 mins", "Every 1 hour", "Daily once"].map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setAutoSyncFreq(freq)}
                        className={cn(
                          "rounded-lg border py-2 font-semibold transition-colors",
                          autoSyncFreq === freq
                            ? "border-[#0A66C2] bg-[#EFF6FF] text-[#0A66C2]"
                            : "border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]"
                        )}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#8A97AF]">Last successful background sync was 12 minutes ago.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SUBTAB 3: PUBLISHING */}
        {/* ==================================================== */}
        {activeSubnav === "Publishing" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Publishing Automation Settings */}
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                    <Send className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-bold text-[#172044]">Publishing Controls</h3>
                    <p className="text-[10px] text-[#8A97AF]">Rules and defaults for publishing posts to LinkedIn.</p>
                  </div>
                </div>

                <div className="space-y-3 text-[11.5px]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Auto-publish approved content</p>
                      <p className="text-[10px] text-[#8A97AF]">Automatically publish scheduled posts once approved</p>
                    </div>
                    <button
                      onClick={() => setAutoPublish(!autoPublish)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", autoPublish ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", autoPublish ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Show post preview before publishing</p>
                      <p className="text-[10px] text-[#8A97AF]">Requires manual visual confirmation before live publish</p>
                    </div>
                    <button
                      onClick={() => setShowPreviews(!showPreviews)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", showPreviews ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", showPreviews ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Enable UTM tracking parameters</p>
                      <p className="text-[10px] text-[#8A97AF]">Automatically append UTM tags to outbound links</p>
                    </div>
                    <button
                      onClick={() => setEnableUtm(!enableUtm)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", enableUtm ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", enableUtm ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="font-bold text-[#172044]">Default Post Visibility</p>
                      <p className="text-[10px] text-[#8A97AF]">Target audience for standard posts</p>
                    </div>
                    <select
                      value={postVisibility}
                      onChange={(e) => setPostVisibility(e.target.value)}
                      className="h-[32px] rounded-lg border border-[#DDE4ED] bg-white px-2 text-[11px] font-medium text-[#172044] outline-none"
                    >
                      <option value="Public">Public (Anyone)</option>
                      <option value="Followers only">Followers only</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Default Content Category</p>
                      <p className="text-[10px] text-[#8A97AF]">Primary classification for new draft posts</p>
                    </div>
                    <select
                      value={contentCategory}
                      onChange={(e) => setContentCategory(e.target.value)}
                      className="h-[32px] rounded-lg border border-[#DDE4ED] bg-white px-2 text-[11px] font-medium text-[#172044] outline-none"
                    >
                      <option value="Awareness">Awareness</option>
                      <option value="Community">Community</option>
                      <option value="Events">Events</option>
                      <option value="Volunteering">Volunteering</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Default Hashtags & Footers */}
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-bold text-[#172044]">Hashtags & Post Templates</h3>
                      <p className="text-[10px] text-[#8A97AF]">Defaults automatically applied to new posts.</p>
                    </div>
                  </div>
                  <button className="rounded-lg bg-[#0A66C2] px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-[#0958A8]">
                    Save
                  </button>
                </div>

                <div className="space-y-3 text-[11.5px]">
                  <div>
                    <label className="block font-bold text-[#172044]">Default Hashtags</label>
                    <input
                      type="text"
                      value={defaultHashtags}
                      onChange={(e) => setDefaultHashtags(e.target.value)}
                      className="mt-1 h-[34px] w-full rounded-lg border border-[#DDE4ED] bg-white px-3 text-[#172044] outline-none focus:border-[#0A66C2]"
                    />
                    <p className="mt-1 text-[10px] text-[#8A97AF]">Pre-filled when drafting posts in the editor.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-[#172044]">Default Post Footer Signature</label>
                      <button
                        onClick={() => setAutoAppendFooter(!autoAppendFooter)}
                        className={cn("text-[10px] font-semibold", autoAppendFooter ? "text-[#16A34A]" : "text-[#8A97AF]")}
                      >
                        {autoAppendFooter ? "● Auto-append Enabled" : "○ Disabled"}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={postFooter}
                      onChange={(e) => setPostFooter(e.target.value)}
                      className="mt-1 w-full resize-none rounded-lg border border-[#DDE4ED] bg-white p-2 text-[#172044] outline-none focus:border-[#0A66C2]"
                    />
                  </div>

                  <div className="divide-y divide-[#EDF1F5] pt-1">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-bold text-[#172044]">Auto-compress high resolution media</p>
                        <p className="text-[10px] text-[#8A97AF]">Optimizes image file sizes for rapid loading</p>
                      </div>
                      <button
                        onClick={() => setCompressMedia(!compressMedia)}
                        className={cn("relative h-5 w-9 rounded-full transition-colors", compressMedia ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                      >
                        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", compressMedia ? "right-0.5" : "left-0.5")} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-bold text-[#172044]">AI-generated Alt text for images</p>
                        <p className="text-[10px] text-[#8A97AF]">Improves accessibility and post reach</p>
                      </div>
                      <button
                        onClick={() => setAiAltText(!aiAltText)}
                        className={cn("relative h-5 w-9 rounded-full transition-colors", aiAltText ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                      >
                        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", aiAltText ? "right-0.5" : "left-0.5")} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SUBTAB 4: TEAM & PERMISSIONS */}
        {/* ==================================================== */}
        {activeSubnav === "Team & Permissions" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-bold text-[#172044]">Team Members & Access Levels</h3>
                    <p className="text-[10px] text-[#8A97AF]">Control who can create, schedule, approve, and publish LinkedIn content.</p>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 rounded-lg bg-[#0A66C2] px-3.5 py-1.5 text-[11.5px] font-bold text-white shadow-sm hover:bg-[#0958A8]">
                  <UserPlus className="size-3.5" />
                  <span>Invite Member</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#EDF1F5] text-[10px] font-bold text-[#8A97AF]">
                      <th className="py-2.5">Name & Email</th>
                      <th className="py-2.5">Channel Role</th>
                      <th className="py-2.5">Permissions Granted</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF1F5]">
                    {[
                      { name: "Manish Sirohi", email: "manish@namogange.org", isYou: true, role: "Owner", roleColor: "bg-[#EFF6FF] text-[#0A66C2]", perms: "Full Admin, Publish, Delete, Billing", status: "Active" },
                      { name: "Priya Sharma", email: "priya.s@namogange.org", role: "Manager", roleColor: "bg-[#F3E8FF] text-[#9333EA]", perms: "Create, Edit, Approve, Publish, Leads", status: "Active" },
                      { name: "Amit Kumar", email: "amit.k@namogange.org", role: "Editor", roleColor: "bg-[#EFF6FF] text-[#0A66C2]", perms: "Create Drafts, Edit Posts, View Analytics", status: "Active" },
                      { name: "Rohan Singh", email: "rohan.s@namogange.org", role: "Viewer", roleColor: "bg-[#F1F5F9] text-[#64748B]", perms: "Read-only Analytics & Reports", status: "Active" },
                      { name: "Kavita Rao", email: "kavita.r@namogange.org", role: "Editor", roleColor: "bg-[#EFF6FF] text-[#0A66C2]", perms: "Draft & Campaign Management", status: "Invited" },
                    ].map((row) => (
                      <tr key={row.name} className="hover:bg-[#FAFBFD]">
                        <td className="py-2.5">
                          <p className="font-bold text-[#172044]">
                            {row.name} {row.isYou && <span className="font-normal text-[#8A97AF]">(you)</span>}
                          </p>
                          <p className="text-[10px] text-[#8A97AF]">{row.email}</p>
                        </td>
                        <td className="py-2.5">
                          <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold", row.roleColor)}>
                            {row.role}
                          </span>
                        </td>
                        <td className="py-2.5 text-[#52617D]">{row.perms}</td>
                        <td className="py-2.5">
                          <span className={cn("inline-flex items-center gap-1 font-semibold", row.status === "Active" ? "text-[#16A34A]" : "text-[#D97706]")}>
                            ● {row.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button className="text-[#8A97AF] hover:text-[#172044]">
                            <MoreVertical className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Permissions Policy Card */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-2">
                <h4 className="text-[12.5px] font-bold text-[#172044]">Mandatory Approval Workflow</h4>
                <p className="text-[10.5px] text-[#8A97AF]">Require Manager or Owner approval for posts drafted by Editors before they can go live.</p>
                <div className="pt-2">
                  <span className="rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[10px] font-bold text-[#16A34A]">✓ Active Enforced</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-2">
                <h4 className="text-[12.5px] font-bold text-[#172044]">Two-Factor Authentication (2FA)</h4>
                <p className="text-[10.5px] text-[#8A97AF]">All team members accessing the LinkedIn publishing suite must have 2FA enabled on their accounts.</p>
                <div className="pt-2">
                  <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-bold text-[#0A66C2]">Enforced for All Roles</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SUBTAB 5: NOTIFICATIONS */}
        {/* ==================================================== */}
        {activeSubnav === "Notifications" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Event Triggers Card */}
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                    <Megaphone className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-bold text-[#172044]">Notification Triggers</h3>
                    <p className="text-[10px] text-[#8A97AF]">Select which events generate alerts.</p>
                  </div>
                </div>

                <div className="space-y-3 text-[11.5px]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Post publishing alerts</p>
                      <p className="text-[10px] text-[#8A97AF]">Get notified when scheduled posts go live</p>
                    </div>
                    <button
                      onClick={() => setNotifyPublish(!notifyPublish)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", notifyPublish ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", notifyPublish ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Engagement spike alerts</p>
                      <p className="text-[10px] text-[#8A97AF]">Get notified when post reactions exceed 500 likes</p>
                    </div>
                    <button
                      onClick={() => setNotifyEngagement(!notifyEngagement)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", notifyEngagement ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", notifyEngagement ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">New Leads notifications</p>
                      <p className="text-[10px] text-[#8A97AF]">Immediate alert when a new lead form is submitted</p>
                    </div>
                    <button
                      onClick={() => setNotifyCampaigns(!notifyCampaigns)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", notifyCampaigns ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", notifyCampaigns ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Weekly performance summary</p>
                      <p className="text-[10px] text-[#8A97AF]">Receive weekly analytics report PDF via email</p>
                    </div>
                    <button
                      onClick={() => setNotifyWeekly(!notifyWeekly)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", notifyWeekly ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", notifyWeekly ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Follower milestone alerts</p>
                      <p className="text-[10px] text-[#8A97AF]">Get notified on reaching 15k, 20k, etc.</p>
                    </div>
                    <button
                      onClick={() => setNotifyFollowers(!notifyFollowers)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", notifyFollowers ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", notifyFollowers ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Delivery Channels Card */}
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                    <Bell className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-bold text-[#172044]">Delivery Channels</h3>
                    <p className="text-[10px] text-[#8A97AF]">Where and how notifications are sent.</p>
                  </div>
                </div>

                <div className="space-y-3 text-[11.5px]">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[#172044]">Email Alerts</label>
                      <button
                        onClick={() => setEmailAlerts(!emailAlerts)}
                        className={cn("text-[10px] font-semibold", emailAlerts ? "text-[#16A34A]" : "text-[#8A97AF]")}
                      >
                        {emailAlerts ? "Enabled" : "Disabled"}
                      </button>
                    </div>
                    <input
                      type="email"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      className="mt-1 h-[34px] w-full rounded-lg border border-[#DDE4ED] bg-white px-3 text-[#172044] outline-none focus:border-[#0A66C2]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[#172044]">Slack / Webhook Notification URL</label>
                      <span className="text-[10px] text-[#8A97AF]">Optional</span>
                    </div>
                    <input
                      type="text"
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                      className="mt-1 h-[34px] w-full rounded-lg border border-[#DDE4ED] bg-white px-3 font-mono text-[10.5px] text-[#172044] outline-none focus:border-[#0A66C2]"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="block font-bold text-[#172044]">Delivery Frequency</label>
                    <div className="mt-1.5 grid grid-cols-3 gap-2">
                      {["Instant", "Hourly Digest", "Daily Summary"].map((sched) => (
                        <button
                          key={sched}
                          onClick={() => setDeliverySchedule(sched)}
                          className={cn(
                            "rounded-lg border py-1.5 text-[11px] font-semibold transition-colors",
                            deliverySchedule === sched
                              ? "border-[#0A66C2] bg-[#EFF6FF] text-[#0A66C2]"
                              : "border-[#DDE4ED] bg-white text-[#52617D] hover:bg-[#F8FAFD]"
                          )}
                        >
                          {sched}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SUBTAB 6: LEAD SYNC */}
        {/* ==================================================== */}
        {activeSubnav === "Lead Sync" && (
          <div className="space-y-4">
            {/* Top CRM Integrations Grid */}
            <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                    <Layers className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-bold text-[#172044]">CRM & Webhook Lead Sync</h3>
                    <p className="text-[10px] text-[#8A97AF]">Automatically send LinkedIn lead form submissions to your CRM in real time.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#172044]">Instant Auto-Sync:</span>
                  <button
                    onClick={() => setAutoLeadSync(!autoLeadSync)}
                    className={cn("relative h-5 w-9 rounded-full transition-colors", autoLeadSync ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                  >
                    <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", autoLeadSync ? "right-0.5" : "left-0.5")} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* HubSpot */}
                <div className="rounded-xl border border-[#DDE4ED] bg-[#F8FAFD] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#172044]">HubSpot CRM</span>
                    <span className="rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[11px] font-bold text-[#16A34A]">Connected</span>
                  </div>
                  <p className="text-[10px] text-[#8A97AF]">142 leads synced • Last sync 10m ago</p>
                  <button className="w-full rounded-lg border border-[#DDE4ED] bg-white py-1 text-[10.5px] font-bold text-[#172044] hover:bg-[#F8FAFD]">
                    Configure Mapping
                  </button>
                </div>

                {/* Google Sheets */}
                <div className="rounded-xl border border-[#DDE4ED] bg-[#F8FAFD] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#172044]">Google Sheets</span>
                    <span className="rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[11px] font-bold text-[#16A34A]">Live Stream</span>
                  </div>
                  <p className="text-[10px] text-[#8A97AF]">Sheet: "LinkedIn Leads 2025"</p>
                  <button className="w-full rounded-lg border border-[#DDE4ED] bg-white py-1 text-[10.5px] font-bold text-[#172044] hover:bg-[#F8FAFD]">
                    Open Spreadsheet
                  </button>
                </div>

                {/* Salesforce */}
                <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#172044]">Salesforce</span>
                    <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-bold text-[#64748B]">Not Linked</span>
                  </div>
                  <p className="text-[10px] text-[#8A97AF]">Sync leads as Contacts/Opportunities</p>
                  <button
                    onClick={() => setSalesforceConnected(!salesforceConnected)}
                    className="w-full rounded-lg bg-[#0A66C2] py-1 text-[10.5px] font-bold text-white hover:bg-[#0958A8]"
                  >
                    Connect
                  </button>
                </div>

                {/* Zoho CRM */}
                <div className="rounded-xl border border-[#DDE4ED] bg-white p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#172044]">Zoho CRM</span>
                    <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-bold text-[#64748B]">Not Linked</span>
                  </div>
                  <p className="text-[10px] text-[#8A97AF]">Sync to Zoho CRM Leads Module</p>
                  <button
                    onClick={() => setZohoConnected(!zohoConnected)}
                    className="w-full rounded-lg bg-[#0A66C2] py-1 text-[10.5px] font-bold text-white hover:bg-[#0958A8]"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Custom Webhook Card */}
              <div className="border-t border-[#EDF1F5] pt-3 text-[11.5px]">
                <label className="block font-bold text-[#172044]">Custom Webhook Endpoint</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="h-[34px] flex-1 rounded-lg border border-[#DDE4ED] bg-white px-3 font-mono text-[11px] text-[#172044] outline-none focus:border-[#0A66C2]"
                  />
                  <button className="h-[34px] rounded-lg border border-[#DDE4ED] bg-white px-3 text-[11px] font-bold text-[#172044] hover:bg-[#F8FAFD]">
                    Send Test Ping
                  </button>
                </div>
              </div>
            </div>

            {/* Sync Activity Logs Table */}
            <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-bold text-[#172044]">Recent Lead Sync Logs</h4>
                <button className="text-[11px] font-semibold text-[#0A66C2] hover:underline">Export Full Log</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#EDF1F5] text-[10px] font-bold text-[#8A97AF]">
                      <th className="py-2">Lead Name</th>
                      <th className="py-2">Form Source</th>
                      <th className="py-2">Destination</th>
                      <th className="py-2">Synced Timestamp</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF1F5]">
                    {[
                      { name: "Priya Sharma", source: "Clean Ganga Volunteer Form", dest: "HubSpot CRM", time: "Apr 14, 2025 10:24 AM", status: "Success" },
                      { name: "Rajesh Malhotra", source: "Corporate Partnership Form", dest: "HubSpot CRM", time: "Apr 14, 2025 09:15 AM", status: "Success" },
                      { name: "Sneha Kapur", source: "Earth Day Campaign", dest: "Google Sheets", time: "Apr 13, 2025 04:45 PM", status: "Success" },
                      { name: "Rahul Mehta", source: "Direct Message Inquiry", dest: "Custom Webhook", time: "Apr 13, 2025 03:18 PM", status: "Success" },
                    ].map((log, i) => (
                      <tr key={i} className="hover:bg-[#FAFBFD]">
                        <td className="py-2 font-bold text-[#172044]">{log.name}</td>
                        <td className="py-2 text-[#52617D]">{log.source}</td>
                        <td className="py-2 font-medium text-[#172044]">{log.dest}</td>
                        <td className="py-2 text-[#8A97AF]">{log.time}</td>
                        <td className="py-2">
                          <span className="rounded bg-[#DCFCE7] px-2 py-0.5 text-[11.5px] font-bold text-[#16A34A]">
                            ✓ {log.status}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <button className="text-[10px] font-bold text-[#0A66C2] hover:underline">View Payload</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SUBTAB 7: ADVANCED */}
        {/* ==================================================== */}
        {activeSubnav === "Advanced" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* API Configuration */}
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                    <Key className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-bold text-[#172044]">API & Webhook Secrets</h3>
                    <p className="text-[10px] text-[#8A97AF]">Developer credentials and endpoint configurations.</p>
                  </div>
                </div>

                <div className="space-y-3 text-[11.5px]">
                  <div>
                    <label className="block font-bold text-[#172044]">API Version</label>
                    <input
                      type="text"
                      disabled
                      value={apiVersion}
                      className="mt-1 h-[34px] w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFD] px-3 font-mono text-[10.5px] text-[#64748B]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-[#172044]">Webhook Signature Secret</label>
                      <button className="text-[10px] font-bold text-[#0A66C2] hover:underline">Regenerate</button>
                    </div>
                    <div className="mt-1 flex items-center justify-between rounded-lg border border-[#DDE4ED] bg-[#F8FAFD] px-3 py-1.5 font-mono text-[10.5px] text-[#172044]">
                      <span>{webhookSecret}</span>
                      <Copy className="size-3.5 cursor-pointer text-[#8A97AF] hover:text-[#0A66C2]" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="font-bold text-[#172044]">Rate Limits & Quotas</p>
                    <div className="mt-2 space-y-1.5 text-[10.5px]">
                      <div className="flex justify-between text-[#52617D]">
                        <span>Read Requests (LinkedIn API):</span>
                        <span className="font-bold text-[#172044]">4,210 / 10,000 daily</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#E2E8F0]">
                        <div className="h-1.5 rounded-full bg-[#0A66C2]" style={{ width: "42%" }} />
                      </div>

                      <div className="flex justify-between text-[#52617D] pt-1">
                        <span>Write / Post Requests:</span>
                        <span className="font-bold text-[#172044]">142 / 1,000 daily</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#E2E8F0]">
                        <div className="h-1.5 rounded-full bg-[#10B981]" style={{ width: "14%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Retention & Diagnostics */}
              <div className="rounded-xl border border-[#DDE4ED] bg-white p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#EFF6FF] text-[#0A66C2]">
                    <Database className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-[13.5px] font-bold text-[#172044]">Data Retention & Cache</h3>
                    <p className="text-[10px] text-[#8A97AF]">Manage local storage, history retention and diagnostic tests.</p>
                  </div>
                </div>

                <div className="space-y-3 text-[11.5px]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Historical Data Retention</p>
                      <p className="text-[10px] text-[#8A97AF]">How long analytics logs are preserved locally</p>
                    </div>
                    <select
                      value={retentionPeriod}
                      onChange={(e) => setRetentionPeriod(e.target.value)}
                      className="h-[32px] rounded-lg border border-[#DDE4ED] bg-white px-2 text-[11px] font-medium text-[#172044] outline-none"
                    >
                      <option value="6 Months">6 Months</option>
                      <option value="1 Year">1 Year</option>
                      <option value="2 Years">2 Years</option>
                      <option value="Indefinite">Indefinite</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#172044]">Auto-purge archived messages</p>
                      <p className="text-[10px] text-[#8A97AF]">Delete archived inbox items older than 90 days</p>
                    </div>
                    <button
                      onClick={() => setAutoPurgeArchived(!autoPurgeArchived)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", autoPurgeArchived ? "bg-[#16A34A]" : "bg-[#CBD5E1]")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", autoPurgeArchived ? "right-0.5" : "left-0.5")} />
                    </button>
                  </div>

                  <div className="border-t border-[#EDF1F5] pt-3 space-y-2">
                    <button className="flex w-full items-center justify-between rounded-lg border border-[#DDE4ED] bg-white p-2 text-left hover:bg-[#F8FAFD]">
                      <div>
                        <p className="text-[11px] font-bold text-[#172044]">Clear Channel Cache</p>
                        <p className="text-[11.5px] text-[#8A97AF]">Purges locally cached thumbnails and post metrics</p>
                      </div>
                      <RefreshCcw className="size-3.5 text-[#0A66C2]" />
                    </button>

                    <button className="flex w-full items-center justify-between rounded-lg border border-[#DDE4ED] bg-white p-2 text-left hover:bg-[#F8FAFD]">
                      <div>
                        <p className="text-[11px] font-bold text-[#172044]">Download GDPR / Channel Export</p>
                        <p className="text-[11.5px] text-[#8A97AF]">Export all raw post, campaign & lead data as JSON/ZIP</p>
                      </div>
                      <Download className="size-3.5 text-[#0A66C2]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SmileIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

