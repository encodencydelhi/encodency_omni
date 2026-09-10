"use client";

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
  Clock,
  Database,
  ExternalLink,
  Eye,
  FileText,
  MousePointerClick,
  Percent,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Box, Delta, Filter, Meter, Pill, SeoShell, Stat, ViewAll, chartTooltip } from "./seo-shell";
import { cn } from "@/lib/utils/cn";

const stats = [
  { label: "Indexed Pages", value: "124", trend: "↑ 6%", sub: "out of 128 submitted", icon: FileText, color: "blue" },
  { label: "Total Clicks", value: "12,482", trend: "↑ 28%", sub: "vs last 30 days", icon: MousePointerClick, color: "purple" },
  { label: "Impressions", value: "248,914", trend: "↑ 18%", sub: "vs last 30 days", icon: Eye, color: "teal" },
  { label: "Avg. CTR", value: "4.9%", trend: "↑ 0.8%", sub: "vs last 30 days", icon: Percent, color: "orange" },
  { label: "Pages with Issues", value: "18", trend: "↓ 4", sub: "14.5% of indexed", icon: AlertTriangle, color: "red" },
  { label: "Avg. Load Time", value: "1.8s", trend: "↑ 0.3s", sub: "Good", icon: Clock, color: "green", subTone: "text-[#10B981] font-semibold" },
];

const clicksTrend = [
  { d: "Mar 15", clicks: 8200, impressions: 168000 },
  { d: "Mar 20", clicks: 9100, impressions: 184000 },
  { d: "Mar 25", clicks: 9800, impressions: 198000 },
  { d: "Mar 30", clicks: 10600, impressions: 212000 },
  { d: "Apr 5", clicks: 11400, impressions: 226000 },
  { d: "Apr 10", clicks: 12000, impressions: 238000 },
  { d: "Apr 14", clicks: 12482, impressions: 248914 },
];

const pageTypes = [
  { name: "Blog posts", value: 48, color: "#3186F3" },
  { name: "Landing pages", value: 22, color: "#8B5CF6" },
  { name: "Campaign pages", value: 16, color: "#10B981" },
  { name: "Static / info", value: 10, color: "#F59E0B" },
  { name: "Other", value: 4, color: "#CBD5E1" },
];

const indexation = [
  { label: "Indexed", count: 124, tone: "#10B981" },
  { label: "Crawled, not indexed", count: 6, tone: "#F59E0B" },
  { label: "Discovered, not crawled", count: 3, tone: "#3186F3" },
  { label: "Excluded by noindex", count: 8, tone: "#8B5CF6" },
  { label: "Blocked by robots.txt", count: 2, tone: "#EF4444" },
];

const pages = [
  { path: "/", title: "Namo Gange Trust | Cleaner Ganga", clicks: "4,820", impressions: "78,400", ctr: "6.1%", pos: 4.2, change: 22, health: 96, issues: 0, vitals: "Good" },
  { path: "/about-us", title: "About Namo Gange Trust", clicks: "1,940", impressions: "38,200", ctr: "5.1%", pos: 6.8, change: 18, health: 92, issues: 1, vitals: "Good" },
  { path: "/our-work", title: "Our Work — River Conservation", clicks: "1,532", impressions: "34,600", ctr: "4.4%", pos: 8.1, change: 35, health: 88, issues: 2, vitals: "Good" },
  { path: "/blog/clean-ganga-initiative", title: "The Clean Ganga Initiative Explained", clicks: "1,220", impressions: "31,800", ctr: "3.8%", pos: 9.4, change: 28, health: 84, issues: 2, vitals: "Needs work" },
  { path: "/donate", title: "Support Our Mission", clicks: "980", impressions: "22,400", ctr: "4.4%", pos: 7.6, change: 12, health: 91, issues: 1, vitals: "Good" },
  { path: "/volunteer", title: "Volunteer With Us", clicks: "864", impressions: "19,600", ctr: "4.4%", pos: 11.2, change: 9, health: 78, issues: 3, vitals: "Needs work" },
  { path: "/campaigns", title: "Active Campaigns", clicks: "642", impressions: "16,800", ctr: "3.8%", pos: 13.5, change: -6, health: 81, issues: 2, vitals: "Good" },
  { path: "/blog/world-water-day", title: "World Water Day 2025", clicks: "518", impressions: "14,200", ctr: "3.6%", pos: 15.1, change: 14, health: 86, issues: 1, vitals: "Good" },
  { path: "/contact", title: "Contact Namo Gange Trust", clicks: "412", impressions: "9,800", ctr: "4.2%", pos: 10.4, change: 4, health: 94, issues: 0, vitals: "Good" },
  { path: "/events/old", title: "Page not found", clicks: "38", impressions: "1,200", ctr: "3.2%", pos: 42.8, change: -18, health: 32, issues: 5, vitals: "Poor" },
];

const slowest = [
  { path: "/blog/clean-ganga-initiative", lcp: "3.4s", cls: "0.18", inp: "240ms" },
  { path: "/volunteer", lcp: "2.9s", cls: "0.12", inp: "180ms" },
  { path: "/campaigns", lcp: "2.7s", cls: "0.09", inp: "160ms" },
  { path: "/gallery", lcp: "2.6s", cls: "0.14", inp: "210ms" },
];

const pageIssues = [
  { issue: "Missing meta description", pages: 12, tone: "high" },
  { issue: "Images without alt text", pages: 28, tone: "high" },
  { issue: "Title exceeds 60 characters", pages: 6, tone: "medium" },
  { issue: "Thin content (< 300 words)", pages: 4, tone: "medium" },
  { issue: "Missing canonical tag", pages: 3, tone: "low" },
];

function healthColor(score: number) {
  if (score >= 90) return "#10B981";
  if (score >= 75) return "#F59E0B";
  return "#EF4444";
}

const vitalTone: Record<string, string> = {
  Good: "good",
  "Needs work": "medium",
  Poor: "critical",
};

const cols = "grid-cols-[2fr_.6fr_.7fr_.44fr_.5fr_.52fr_.72fr_.44fr_.68fr]";

export function SeoPagesPage() {
  return (
    <SeoShell
      view="pages"
      title="Pages"
      description="See which pages earn traffic, which need work and how each one is indexed."
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} down={stat.label === "Pages with Issues"} />
        ))}
      </div>

      <div className="grid items-start gap-2 [&>section]:h-[214px] xl:grid-cols-[1.6fr_.9fr_.9fr]">
        <Box title="Clicks & Impressions" action={<Filter label="Last 30 days" />}>
          <div className="flex h-full flex-col px-3 pb-2 pt-1">
            <div className="flex gap-3 text-[8.5px] font-semibold text-[#52617D]">
              <span className="flex items-center gap-1.5">
                <i className="size-1.5 rounded-full bg-[#3186F3]" /> Clicks
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-1.5 rounded-full bg-[#8B5CF6]" /> Impressions
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer>
                <AreaChart data={clicksTrend} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pgClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3186F3" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3186F3" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EDF1F7" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="l"
                    tick={{ fontSize: 8, fill: "#71809D" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => (v ? `${v / 1000}K` : "0")}
                  />
                  <YAxis
                    yAxisId="r"
                    orientation="right"
                    tick={{ fontSize: 8, fill: "#71809D" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => (v ? `${v / 1000}K` : "0")}
                  />
                  <Tooltip {...chartTooltip} formatter={(v) => Number(v).toLocaleString("en-IN")} />
                  <Area yAxisId="r" dataKey="impressions" name="Impressions" stroke="#8B5CF6" strokeWidth={1.6} fill="transparent" dot={{ r: 1.8, strokeWidth: 0, fill: "#8B5CF6" }} isAnimationActive={false} />
                  <Area yAxisId="l" dataKey="clicks" name="Clicks" stroke="#3186F3" strokeWidth={1.7} fill="url(#pgClicks)" dot={{ r: 1.8, strokeWidth: 0, fill: "#3186F3" }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Pages by Type">
          <div className="flex h-full items-center gap-2 px-3 pb-2">
            <div className="relative size-[104px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pageTypes} dataKey="value" innerRadius={31} outerRadius={48} strokeWidth={0} isAnimationActive={false}>
                    {pageTypes.map((type) => (
                      <Cell key={type.name} fill={type.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[15px] leading-4 text-[#172044]">124</b>
                  <small className="text-[7.5px] text-[#71809D]">Pages</small>
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              {pageTypes.map((type) => (
                <span key={type.name} className="flex items-center gap-1.5 text-[8.5px]">
                  <i className="size-1.5 shrink-0 rounded-full" style={{ background: type.color }} />
                  <span className="min-w-0 flex-1 truncate text-[#52617D]">{type.name}</span>
                  <b className="text-[#172044]">{type.value}</b>
                </span>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Indexation Status" action={<Database className="size-3 text-[#9AA6BC]" />}>
          <div className="space-y-1.5 px-3 py-2">
            {indexation.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-[8.5px]">
                  <span className="truncate text-[#52617D]">{row.label}</span>
                  <b className="text-[#172044]">{row.count}</b>
                </div>
                <Meter value={row.count} max={124} color={row.tone} className="mt-0.5" />
              </div>
            ))}
          </div>
        </Box>
      </div>

      <Box
        title="Page Performance"
        className="h-[492px]"
        action={
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-[150px] items-center gap-1.5 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5">
              <Search className="size-3 text-[#9AA6BC]" />
              <input
                className="w-full bg-transparent text-[8.5px] outline-none placeholder:text-[#9AA6BC]"
                placeholder="Search pages..."
              />
            </span>
            <button className="flex h-6 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5 text-[8.5px] font-semibold text-[#52617D]">
              <SlidersHorizontal className="size-2.5" />
              Filters
            </button>
            <Filter label="Sort: Clicks" />
          </div>
        }
      >
        <div className="px-3">
          <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[8px] font-bold text-[#71809D]", cols)}>
            <span>Page</span>
            <span className="text-right">Clicks</span>
            <span className="text-right">Impressions</span>
            <span className="text-right">CTR</span>
            <span className="text-right">Avg. Pos</span>
            <span className="text-right">Change</span>
            <span>Health</span>
            <span className="text-right">Issues</span>
            <span>Web Vitals</span>
          </div>
          {pages.map((page) => (
            <div
              key={page.path}
              className={cn("grid items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[9px] text-[#52617D]", cols)}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-[9px] font-semibold text-[#2C6FD1]">
                  <span className="truncate">{page.path}</span>
                  <ExternalLink className="size-2.5 shrink-0" />
                </span>
                <small className="block truncate text-[8px] text-[#8A97AF]">{page.title}</small>
              </span>
              <b className="text-right text-[#172044]">{page.clicks}</b>
              <span className="text-right">{page.impressions}</span>
              <span className="text-right">{page.ctr}</span>
              <span className="text-right">{page.pos}</span>
              <span className="text-right">
                <Delta value={page.change} suffix="%" />
              </span>
              <span className="flex items-center gap-1.5">
                <Meter value={page.health} color={healthColor(page.health)} className="min-w-0 flex-1" />
                <b className="w-4 shrink-0 text-right text-[8.5px] text-[#172044]">{page.health}</b>
              </span>
              <span className="text-right">
                {page.issues === 0 ? (
                  <b className="text-[#10B981]">0</b>
                ) : (
                  <b className={page.issues > 2 ? "text-[#EF4444]" : "text-[#F59E0B]"}>{page.issues}</b>
                )}
              </span>
              <Pill tone={vitalTone[page.vitals]}>{page.vitals}</Pill>
            </div>
          ))}
        </div>
      </Box>

      <div className="grid items-start gap-2 [&>section]:h-[208px] xl:grid-cols-2">
        <Box title="Slowest Pages (Core Web Vitals)" action={<ViewAll />}>
          <div className="px-3">
            <div className="grid grid-cols-[2fr_.6fr_.6fr_.6fr] gap-1.5 py-1.5 text-[8px] font-bold text-[#71809D]">
              <span>Page</span>
              <span className="text-right">LCP</span>
              <span className="text-right">CLS</span>
              <span className="text-right">INP</span>
            </div>
            {slowest.map((row) => (
              <div
                key={row.path}
                className="grid grid-cols-[2fr_.6fr_.6fr_.6fr] items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[9px]"
              >
                <span className="truncate font-semibold text-[#2C6FD1]">{row.path}</span>
                <b className="text-right text-[#EF4444]">{row.lcp}</b>
                <span className="text-right text-[#52617D]">{row.cls}</span>
                <span className="text-right text-[#52617D]">{row.inp}</span>
              </div>
            ))}
          </div>
        </Box>

        <Box title="On-Page Issues by Type" action={<ViewAll label="Fix all" />}>
          <div className="px-3">
            {pageIssues.map((row) => (
              <div
                key={row.issue}
                className="flex items-center gap-2 border-b border-[#EDF1F5] py-2 last:border-b-0"
              >
                <AlertTriangle
                  className={cn(
                    "size-3.5 shrink-0",
                    row.tone === "high" ? "text-[#EF4444]" : row.tone === "medium" ? "text-[#F59E0B]" : "text-[#3186F3]",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-[#172044]">
                  {row.issue}
                </span>
                <span className="shrink-0 text-[8.5px] text-[#52617D]">{row.pages} pages</span>
                <Pill tone={row.tone}>{row.tone === "high" ? "High" : row.tone === "medium" ? "Medium" : "Low"}</Pill>
              </div>
            ))}
          </div>
        </Box>
      </div>
    </SeoShell>
  );
}
