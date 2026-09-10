"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  ArrowDownRight,
  ArrowUpRight,
  Award,
  ExternalLink,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Box, Delta, Filter, Meter, Pill, SeoShell, Stat, ViewAll, chartTooltip } from "./seo-shell";
import { cn } from "@/lib/utils/cn";

const stats = [
  { label: "Tracked Keywords", value: "1,245", trend: "↑ 86", sub: "62 added this month", icon: Target, color: "blue" },
  { label: "Top 3 Positions", value: "42", trend: "↑ 9", sub: "3.4% of tracked", icon: Trophy, color: "green" },
  { label: "Top 10 Positions", value: "128", trend: "↑ 18", sub: "10.3% of tracked", icon: Award, color: "purple" },
  { label: "Avg. Position", value: "14.6", trend: "↑ 3.2", sub: "(lower is better)", icon: TrendingUp, color: "teal" },
  { label: "Est. Traffic Value", value: "₹4.8L", trend: "↑ 24%", sub: "per month", icon: TrendingUp, color: "orange" },
];

const distribution = [
  { bucket: "1-3", count: 42, color: "#10B981" },
  { bucket: "4-10", count: 86, color: "#3186F3" },
  { bucket: "11-20", count: 164, color: "#8B5CF6" },
  { bucket: "21-50", count: 388, color: "#F59E0B" },
  { bucket: "51-100", count: 565, color: "#CBD5E1" },
];

const positionTrend = [
  { d: "Mar 15", top3: 28, top10: 96, top50: 520 },
  { d: "Mar 20", top3: 31, top10: 104, top50: 548 },
  { d: "Mar 25", top3: 34, top10: 112, top50: 572 },
  { d: "Mar 30", top3: 36, top10: 118, top50: 596 },
  { d: "Apr 5", top3: 38, top10: 121, top50: 628 },
  { d: "Apr 10", top3: 40, top10: 125, top50: 656 },
  { d: "Apr 14", top3: 42, top10: 128, top50: 680 },
];

const intents = [
  { name: "Informational", value: 46, color: "#3186F3" },
  { name: "Commercial", value: 24, color: "#8B5CF6" },
  { name: "Transactional", value: 18, color: "#10B981" },
  { name: "Navigational", value: 12, color: "#F59E0B" },
];

const keywords = [
  { kw: "clean ganga", pos: 3, change: 12, vol: "4,400", kd: 42, cpc: "₹18", traffic: "18.4%", url: "/", intent: "Informational" },
  { kw: "ganga river conservation", pos: 5, change: 8, vol: "2,900", kd: 38, cpc: "₹22", traffic: "12.1%", url: "/our-work", intent: "Informational" },
  { kw: "donate for river cleaning", pos: 6, change: 5, vol: "1,900", kd: 54, cpc: "₹46", traffic: "9.8%", url: "/donate", intent: "Transactional" },
  { kw: "water pollution control", pos: 7, change: 6, vol: "1,600", kd: 48, cpc: "₹26", traffic: "8.2%", url: "/our-work", intent: "Informational" },
  { kw: "ngo in delhi", pos: 9, change: -3, vol: "1,300", kd: 61, cpc: "₹34", traffic: "6.4%", url: "/about-us", intent: "Commercial" },
  { kw: "river cleaning initiative", pos: 11, change: 4, vol: "880", kd: 35, cpc: "₹19", traffic: "5.1%", url: "/blog/clean-ganga-initiative", intent: "Informational" },
  { kw: "volunteer for environment", pos: 14, change: 7, vol: "1,100", kd: 44, cpc: "₹21", traffic: "4.6%", url: "/volunteer", intent: "Commercial" },
  { kw: "namo gange trust", pos: 1, change: 0, vol: "720", kd: 12, cpc: "₹8", traffic: "4.2%", url: "/", intent: "Navigational" },
  { kw: "ganga cleaning ngo", pos: 8, change: 2, vol: "640", kd: 40, cpc: "₹24", traffic: "3.4%", url: "/about-us", intent: "Commercial" },
  { kw: "save rivers campaign", pos: 18, change: -5, vol: "590", kd: 33, cpc: "₹16", traffic: "2.2%", url: "/campaigns", intent: "Informational" },
  { kw: "environmental awareness program", pos: 22, change: 9, vol: "1,450", kd: 57, cpc: "₹28", traffic: "1.8%", url: "/programs", intent: "Informational" },
  { kw: "csr partner india", pos: 26, change: 3, vol: "980", kd: 66, cpc: "₹58", traffic: "1.2%", url: "/partners", intent: "Commercial" },
];

const gainers = [
  { kw: "environmental awareness program", from: 31, to: 22 },
  { kw: "clean ganga", from: 15, to: 3 },
  { kw: "ganga river conservation", from: 13, to: 5 },
  { kw: "volunteer for environment", from: 21, to: 14 },
  { kw: "water pollution control", from: 13, to: 7 },
];

const losers = [
  { kw: "save rivers campaign", from: 13, to: 18 },
  { kw: "ngo in delhi", from: 6, to: 9 },
  { kw: "river tourism india", from: 19, to: 24 },
  { kw: "ganga aarti timings", from: 8, to: 12 },
];

const opportunities = [
  { kw: "river cleanup volunteer delhi", vol: "1,700", kd: 28, pos: 12 },
  { kw: "how to save rivers", vol: "2,400", kd: 31, pos: 15 },
  { kw: "water conservation tips", vol: "3,100", kd: 34, pos: 17 },
  { kw: "ngo donation tax benefit", vol: "1,250", kd: 39, pos: 19 },
];

const intentTint: Record<string, string> = {
  Informational: "low",
  Commercial: "purple",
  Transactional: "good",
  Navigational: "medium",
};

function kdColor(kd: number) {
  if (kd < 35) return "#10B981";
  if (kd < 55) return "#F59E0B";
  return "#EF4444";
}

const cols = "grid-cols-[1.7fr_.44fr_.5fr_.52fr_.66fr_.4fr_.5fr_1.1fr_.76fr]";

export function SeoKeywordsPage() {
  return (
    <SeoShell
      view="keywords"
      title="Keywords"
      description="Track rankings, spot movement and find the queries worth targeting next."
      action={
        <button className="flex h-8 items-center gap-1.5 rounded bg-[#EB0711] px-3 text-[9.5px] font-semibold text-white shadow-sm hover:bg-[#C90610]">
          <Plus className="size-3.5" />
          Add Keywords
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid items-start gap-2 [&>section]:h-[228px] xl:grid-cols-[.9fr_1.5fr_.8fr]">
        <Box title="Ranking Distribution" action={<Filter label="All" />}>
          <div className="flex h-full flex-col px-3 pb-2 pt-1">
            <div className="h-[104px]">
              <ResponsiveContainer>
                <BarChart data={distribution} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
                  <CartesianGrid stroke="#EDF1F7" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {distribution.map((bucket) => (
                      <Cell key={bucket.bucket} fill={bucket.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
              {distribution.map((bucket) => (
                <span key={bucket.bucket} className="flex items-center gap-1.5 text-[8.5px]">
                  <i className="size-1.5 rounded-full" style={{ background: bucket.color }} />
                  <span className="flex-1 text-[#52617D]">Pos {bucket.bucket}</span>
                  <b className="text-[#172044]">{bucket.count}</b>
                </span>
              ))}
            </div>
          </div>
        </Box>

        <Box title="Ranking Progress" action={<Filter label="Last 30 days" />}>
          <div className="flex h-full flex-col px-3 pb-2 pt-1">
            <div className="flex gap-3 text-[8.5px] font-semibold text-[#52617D]">
              <span className="flex items-center gap-1.5">
                <i className="size-1.5 rounded-full bg-[#10B981]" /> Top 3
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-1.5 rounded-full bg-[#3186F3]" /> Top 10
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-1.5 rounded-full bg-[#8B5CF6]" /> Top 50
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer>
                <AreaChart data={positionTrend} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kwTop50" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EDF1F7" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltip} />
                  <Area dataKey="top50" name="Top 50" stroke="#8B5CF6" strokeWidth={1.6} fill="url(#kwTop50)" dot={{ r: 1.8, strokeWidth: 0, fill: "#8B5CF6" }} isAnimationActive={false} />
                  <Area dataKey="top10" name="Top 10" stroke="#3186F3" strokeWidth={1.6} fill="transparent" dot={{ r: 1.8, strokeWidth: 0, fill: "#3186F3" }} isAnimationActive={false} />
                  <Area dataKey="top3" name="Top 3" stroke="#10B981" strokeWidth={1.6} fill="transparent" dot={{ r: 1.8, strokeWidth: 0, fill: "#10B981" }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Search Intent">
          <div className="flex h-full flex-col items-center justify-center px-3 pb-2">
            <div className="relative size-[104px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={intents} dataKey="value" innerRadius={32} outerRadius={49} strokeWidth={0} isAnimationActive={false}>
                    {intents.map((intent) => (
                      <Cell key={intent.name} fill={intent.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                  <b className="block text-[15px] leading-4 text-[#172044]">1,245</b>
                  <small className="text-[7.5px] text-[#71809D]">Keywords</small>
                </span>
              </div>
            </div>
            <div className="mt-1.5 w-full space-y-0.5">
              {intents.map((intent) => (
                <span key={intent.name} className="flex items-center gap-1.5 text-[8.5px]">
                  <i className="size-1.5 rounded-full" style={{ background: intent.color }} />
                  <span className="flex-1 text-[#52617D]">{intent.name}</span>
                  <b className="text-[#172044]">{intent.value}%</b>
                </span>
              ))}
            </div>
          </div>
        </Box>
      </div>

      <div className="grid items-start gap-2 xl:grid-cols-[2.5fr_1fr]">
        <Box
          title="Tracked Keywords"
          className="h-[508px]"
          action={
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-[150px] items-center gap-1.5 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5">
                <Search className="size-3 text-[#9AA6BC]" />
                <input
                  className="w-full bg-transparent text-[8.5px] outline-none placeholder:text-[#9AA6BC]"
                  placeholder="Search keywords..."
                />
              </span>
              <button className="flex h-6 items-center gap-1 rounded border border-[#E4E8ED] bg-[#FAFBFC] px-1.5 text-[8.5px] font-semibold text-[#52617D]">
                <SlidersHorizontal className="size-2.5" />
                Filters
              </button>
              <Filter label="Google · India" />
            </div>
          }
        >
          <div className="px-3">
            <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[8px] font-bold text-[#71809D]", cols)}>
              <span>Keyword</span>
              <span className="text-right">Pos.</span>
              <span className="text-right">Change</span>
              <span className="text-right">Volume</span>
              <span>Difficulty</span>
              <span className="text-right">CPC</span>
              <span className="text-right">Traffic</span>
              <span>Ranking URL</span>
              <span>Intent</span>
            </div>
            {keywords.map((row) => (
              <div
                key={row.kw}
                className={cn("grid items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[9px] text-[#52617D]", cols)}
              >
                <span className="truncate font-semibold text-[#172044]">{row.kw}</span>
                <b className="text-right text-[#172044]">{row.pos}</b>
                <span className="text-right">
                  <Delta value={row.change} />
                </span>
                <span className="text-right">{row.vol}</span>
                <span className="flex items-center gap-1.5">
                  <Meter value={row.kd} color={kdColor(row.kd)} className="min-w-0 flex-1" />
                  <b className="w-4 shrink-0 text-right text-[8.5px] text-[#172044]">{row.kd}</b>
                </span>
                <span className="text-right">{row.cpc}</span>
                <span className="text-right">{row.traffic}</span>
                <span className="flex min-w-0 items-center gap-1 text-[#2C6FD1]">
                  <span className="truncate">{row.url}</span>
                  <ExternalLink className="size-2.5 shrink-0" />
                </span>
                <Pill tone={intentTint[row.intent]}>{row.intent}</Pill>
              </div>
            ))}
          </div>
        </Box>

        <div className="space-y-2">
          <Box title="Top Gainers" className="h-[184px]" action={<ViewAll />}>
            {gainers.map((row) => (
              <div
                key={row.kw}
                className="flex items-center gap-2 border-b border-[#EDF1F5] px-3 py-[7px] last:border-b-0"
              >
                <ArrowUpRight className="size-3 shrink-0 text-[#10B981]" />
                <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-[#172044]">
                  {row.kw}
                </span>
                <span className="shrink-0 text-[8.5px] text-[#8A97AF]">
                  {row.from} → <b className="text-[#10B981]">{row.to}</b>
                </span>
              </div>
            ))}
          </Box>

          <Box title="Top Losers" className="h-[156px]" action={<ViewAll />}>
            {losers.map((row) => (
              <div
                key={row.kw}
                className="flex items-center gap-2 border-b border-[#EDF1F5] px-3 py-[7px] last:border-b-0"
              >
                <ArrowDownRight className="size-3 shrink-0 text-[#EF4444]" />
                <span className="min-w-0 flex-1 truncate text-[9px] font-semibold text-[#172044]">
                  {row.kw}
                </span>
                <span className="shrink-0 text-[8.5px] text-[#8A97AF]">
                  {row.from} → <b className="text-[#EF4444]">{row.to}</b>
                </span>
              </div>
            ))}
          </Box>

          <Box title="Quick Win Opportunities" className="h-[152px]" action={<ViewAll />}>
            {opportunities.map((row) => (
              <div
                key={row.kw}
                className="grid grid-cols-[1.5fr_.5fr_.45fr_.4fr] items-center gap-1.5 border-b border-[#EDF1F5] px-3 py-[7px] text-[8.5px] last:border-b-0"
              >
                <span className="truncate font-semibold text-[#172044]">{row.kw}</span>
                <span className="text-right text-[#52617D]">{row.vol}</span>
                <span className="text-right" style={{ color: kdColor(row.kd) }}>
                  KD {row.kd}
                </span>
                <b className="text-right text-[#172044]">#{row.pos}</b>
              </div>
            ))}
          </Box>
        </div>
      </div>
    </SeoShell>
  );
}
