"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, Search, Star, Target, Trophy, Users } from "lucide-react";
import { Box, Delta, Filter, Meter, Pill, SeoShell, Stat, ViewAll, chartTooltip } from "./seo-shell";
import { cn } from "@/lib/utils/cn";

const stats = [
  { label: "Share of Voice", value: "32.4%", trend: "↑ 4.1%", sub: "rank 1 of 5 tracked", icon: Trophy, color: "green" },
  { label: "Competitors Tracked", value: "4", trend: "↑ 1", sub: "added Ganga Sewa Trust", icon: Users, color: "blue" },
  { label: "Keyword Overlap", value: "486", trend: "↑ 38", sub: "shared keywords", icon: Target, color: "purple" },
  { label: "Keyword Gaps", value: "212", trend: "↑ 24", sub: "they rank, you don't", icon: Search, color: "orange" },
  { label: "Domain Rating", value: "58", trend: "↑ 3", sub: "2nd highest in set", icon: Star, color: "teal" },
];

const us = { name: "Namo Gange Trust", color: "#EB0711" };

const competitors = [
  { name: "Namo Gange Trust", domain: "namogangetrust.org", dr: 58, traffic: "12.4K", keywords: 1245, backlinks: "1,248", top3: 42, sov: 32.4, change: 4.1, self: true, color: "#EB0711" },
  { name: "Ganga Action Parivar", domain: "gangaaction.org", dr: 64, traffic: "18.6K", keywords: 1862, backlinks: "2,410", top3: 68, sov: 28.1, change: -1.8, self: false, color: "#3186F3" },
  { name: "Clean Ganga Mission", domain: "nmcg.nic.in", dr: 72, traffic: "9.8K", keywords: 964, backlinks: "3,180", top3: 34, sov: 18.6, change: 0.9, self: false, color: "#8B5CF6" },
  { name: "River Care India", domain: "rivercare.in", dr: 41, traffic: "5.2K", keywords: 612, backlinks: "684", top3: 18, sov: 12.8, change: -2.4, self: false, color: "#F59E0B" },
  { name: "Ganga Sewa Trust", domain: "gangasewa.org", dr: 34, traffic: "3.1K", keywords: 428, backlinks: "412", top3: 11, sov: 8.1, change: 1.2, self: false, color: "#10B981" },
];

const visibility = [
  { d: "Mar 15", you: 24.8, gap: 30.2, cgm: 19.4, rci: 15.1 },
  { d: "Mar 20", you: 26.4, gap: 29.6, cgm: 19.1, rci: 14.6 },
  { d: "Mar 25", you: 28.1, gap: 29.1, cgm: 18.8, rci: 14.2 },
  { d: "Mar 30", you: 29.6, gap: 28.8, cgm: 18.6, rci: 13.6 },
  { d: "Apr 5", you: 30.8, gap: 28.4, cgm: 18.7, rci: 13.1 },
  { d: "Apr 10", you: 31.7, gap: 28.2, cgm: 18.6, rci: 12.9 },
  { d: "Apr 14", you: 32.4, gap: 28.1, cgm: 18.6, rci: 12.8 },
];

const radar = [
  { metric: "Traffic", you: 67, comp: 100 },
  { metric: "Keywords", you: 67, comp: 100 },
  { metric: "Backlinks", you: 52, comp: 100 },
  { metric: "Authority", you: 81, comp: 100 },
  { metric: "Top-3 KWs", you: 62, comp: 100 },
  { metric: "Content", you: 88, comp: 100 },
];

const comparison = [
  { metric: "Organic Traffic", you: 124, gap: 186, cgm: 98, rci: 52 },
  { metric: "Keywords", you: 125, gap: 186, cgm: 96, rci: 61 },
  { metric: "Backlinks", you: 125, gap: 241, cgm: 318, rci: 68 },
  { metric: "Domain Rating", you: 58, gap: 64, cgm: 72, rci: 41 },
];

const gaps = [
  { kw: "river cleaning volunteer program", vol: "2,400", you: null, gap: 3, cgm: 8, priority: "high" },
  { kw: "ganga pollution statistics", vol: "1,900", you: 42, gap: 5, cgm: 2, priority: "high" },
  { kw: "water conservation csr", vol: "1,600", you: null, gap: 7, cgm: 14, priority: "high" },
  { kw: "river restoration projects india", vol: "1,300", you: 38, gap: 4, cgm: 11, priority: "medium" },
  { kw: "ngo water treatment plant", vol: "980", you: null, gap: 9, cgm: 6, priority: "medium" },
  { kw: "ganga aarti donation", vol: "870", you: 26, gap: 2, cgm: 18, priority: "medium" },
  { kw: "environment ngo internship", vol: "740", you: null, gap: 12, cgm: 21, priority: "low" },
  { kw: "river cleanup equipment", vol: "620", you: 31, gap: 6, cgm: 9, priority: "low" },
];

const wins = [
  { kw: "clean ganga", you: 3, best: 6, competitor: "Ganga Action Parivar" },
  { kw: "namo gange trust", you: 1, best: 24, competitor: "River Care India" },
  { kw: "donate for river cleaning", you: 6, best: 11, competitor: "Clean Ganga Mission" },
  { kw: "volunteer for environment", you: 14, best: 19, competitor: "Ganga Sewa Trust" },
];

const cols = "grid-cols-[1.6fr_.5fr_.62fr_.6fr_.66fr_.5fr_.72fr_.5fr]";
const gapCols = "grid-cols-[2fr_.6fr_.5fr_.56fr_.56fr_.6fr]";

export function SeoCompetitorsPage() {
  return (
    <SeoShell
      view="competitors"
      title="Competitors"
      description="Benchmark visibility against the organisations chasing the same searches."
      action={
        <button className="flex h-8 items-center gap-1.5 rounded bg-[#EB0711] px-3 text-[9.5px] font-semibold text-white shadow-sm hover:bg-[#C90610]">
          <Plus className="size-3.5" />
          Add Competitor
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Stat key={stat.label} {...stat} down={stat.label === "Keyword Gaps"} />
        ))}
      </div>

      <Box title="Competitive Landscape" className="h-[282px]" action={<Filter label="Google · India" />}>
        <div className="px-3">
          <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[8px] font-bold text-[#71809D]", cols)}>
            <span>Competitor</span>
            <span className="text-right">DR</span>
            <span className="text-right">Traffic</span>
            <span className="text-right">Keywords</span>
            <span className="text-right">Backlinks</span>
            <span className="text-right">Top 3</span>
            <span>Share of Voice</span>
            <span className="text-right">Change</span>
          </div>
          {competitors.map((row) => (
            <div
              key={row.domain}
              className={cn(
                "grid items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[9px] text-[#52617D]",
                cols,
                row.self && "bg-[#FFF7F7]",
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <i className="size-2 shrink-0 rounded-full" style={{ background: row.color }} />
                <span className="min-w-0">
                  <b className="flex items-center gap-1 truncate text-[9px] text-[#172044]">
                    {row.name}
                    {row.self && <Pill tone="critical">You</Pill>}
                  </b>
                  <small className="block truncate text-[8px] text-[#8A97AF]">{row.domain}</small>
                </span>
              </span>
              <b className="text-right text-[#172044]">{row.dr}</b>
              <span className="text-right">{row.traffic}</span>
              <span className="text-right">{row.keywords.toLocaleString("en-IN")}</span>
              <span className="text-right">{row.backlinks}</span>
              <b className="text-right text-[#172044]">{row.top3}</b>
              <span className="flex items-center gap-1.5">
                <Meter value={row.sov} max={35} color={row.color} className="min-w-0 flex-1" />
                <b className="w-8 shrink-0 text-right text-[8.5px] text-[#172044]">{row.sov}%</b>
              </span>
              <span className="text-right">
                <Delta value={row.change} suffix="%" />
              </span>
            </div>
          ))}
        </div>
      </Box>

      <div className="grid items-start gap-2 [&>section]:h-[236px] xl:grid-cols-[1.5fr_.9fr_.85fr]">
        <Box title="Visibility Trend" action={<Filter label="Share of voice" />}>
          <div className="flex h-full flex-col px-3 pb-2 pt-1">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[8.5px] font-semibold text-[#52617D]">
              {competitors.slice(0, 4).map((row) => (
                <span key={row.domain} className="flex items-center gap-1.5">
                  <i className="size-1.5 rounded-full" style={{ background: row.color }} />
                  {row.name}
                </span>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              <ResponsiveContainer>
                <AreaChart data={visibility} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cmpYou" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EB0711" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#EB0711" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EDF1F7" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 8, fill: "#71809D" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip {...chartTooltip} formatter={(v) => `${v}%`} />
                  <Area dataKey="you" name={us.name} stroke="#EB0711" strokeWidth={1.8} fill="url(#cmpYou)" dot={{ r: 1.8, strokeWidth: 0, fill: "#EB0711" }} isAnimationActive={false} />
                  <Area dataKey="gap" name="Ganga Action Parivar" stroke="#3186F3" strokeWidth={1.5} fill="transparent" dot={{ r: 1.6, strokeWidth: 0, fill: "#3186F3" }} isAnimationActive={false} />
                  <Area dataKey="cgm" name="Clean Ganga Mission" stroke="#8B5CF6" strokeWidth={1.5} fill="transparent" dot={{ r: 1.6, strokeWidth: 0, fill: "#8B5CF6" }} isAnimationActive={false} />
                  <Area dataKey="rci" name="River Care India" stroke="#F59E0B" strokeWidth={1.5} fill="transparent" dot={{ r: 1.6, strokeWidth: 0, fill: "#F59E0B" }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Box>

        <Box title="Metric Comparison" action={<Filter label="Indexed" />}>
          <div className="h-full px-3 pb-2 pt-1">
            <ResponsiveContainer>
              <BarChart data={comparison} margin={{ top: 6, right: 6, left: -22, bottom: 0 }} barGap={1}>
                <CartesianGrid stroke="#EDF1F7" vertical={false} />
                <XAxis dataKey="metric" tick={{ fontSize: 7, fill: "#71809D" }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 8, fill: "#71809D" }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 7.5, paddingTop: 2 }} iconSize={6} />
                <Bar dataKey="you" name="You" fill="#EB0711" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="gap" name="G. Action" fill="#3186F3" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="cgm" name="C. Ganga" fill="#8B5CF6" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="rci" name="R. Care" fill="#F59E0B" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Box>

        <Box title="You vs Best in Set" action={<span className="text-[#8A97AF]">100 = leader</span>}>
          <div className="h-full px-2 pb-1 pt-1">
            <ResponsiveContainer>
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#E8EDF3" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 7.5, fill: "#71809D" }} />
                <Tooltip {...chartTooltip} />
                <Radar name="Leader" dataKey="comp" stroke="#CBD5E1" fill="#CBD5E1" fillOpacity={0.28} isAnimationActive={false} />
                <Radar name="You" dataKey="you" stroke="#EB0711" fill="#EB0711" fillOpacity={0.22} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Box>
      </div>

      <div className="grid items-start gap-2 xl:grid-cols-[2fr_1fr]">
        <Box
          title="Keyword Gap Analysis"
          className="h-[346px]"
          action={
            <div className="flex items-center gap-1.5">
              <Filter label="Missing + Weak" />
              <ViewAll label="Export" />
            </div>
          }
        >
          <div className="px-3">
            <div className={cn("sticky top-0 z-10 grid gap-1.5 bg-white py-1.5 text-[8px] font-bold text-[#71809D]", gapCols)}>
              <span>Keyword</span>
              <span className="text-right">Volume</span>
              <span className="text-right">You</span>
              <span className="text-right">G. Action</span>
              <span className="text-right">C. Ganga</span>
              <span>Priority</span>
            </div>
            {gaps.map((row) => (
              <div
                key={row.kw}
                className={cn("grid items-center gap-1.5 border-t border-[#EDF1F5] py-2 text-[9px] text-[#52617D]", gapCols)}
              >
                <span className="truncate font-semibold text-[#172044]">{row.kw}</span>
                <span className="text-right">{row.vol}</span>
                <span className="text-right">
                  {row.you === null ? (
                    <b className="text-[#EF4444]">—</b>
                  ) : (
                    <b className="text-[#172044]">{row.you}</b>
                  )}
                </span>
                <b className="text-right text-[#2C6FD1]">{row.gap}</b>
                <b className="text-right text-[#7C3AED]">{row.cgm}</b>
                <Pill tone={row.priority}>
                  {row.priority === "high" ? "High" : row.priority === "medium" ? "Medium" : "Low"}
                </Pill>
              </div>
            ))}
          </div>
        </Box>

        <div className="space-y-2">
          <Box title="Share of Voice" className="h-[142px]">
            <div className="flex h-full items-center gap-2 px-3 pb-2">
              <div className="relative size-[94px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={competitors} dataKey="sov" innerRadius={28} outerRadius={43} strokeWidth={0} isAnimationActive={false}>
                      {competitors.map((row) => (
                        <Cell key={row.domain} fill={row.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <span>
                    <b className="block text-[14px] leading-4 text-[#EB0711]">32.4%</b>
                    <small className="text-[7px] text-[#71809D]">You</small>
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-[3px]">
                {competitors.map((row) => (
                  <span key={row.domain} className="flex items-center gap-1.5 text-[8px]">
                    <i className="size-1.5 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="min-w-0 flex-1 truncate text-[#52617D]">{row.name}</span>
                    <b className="text-[#172044]">{row.sov}%</b>
                  </span>
                ))}
              </div>
            </div>
          </Box>

          <Box title="Where You Lead" className="h-[196px]" action={<ViewAll />}>
            {wins.map((row) => (
              <div
                key={row.kw}
                className="flex items-center gap-2 border-b border-[#EDF1F5] px-3 py-[6px] last:border-b-0"
              >
                <Trophy className="size-3 shrink-0 text-[#10B981]" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[9px] font-semibold text-[#172044]">{row.kw}</b>
                  <small className="block truncate text-[8px] text-[#8A97AF]">
                    best rival: {row.competitor}
                  </small>
                </span>
                <span className="shrink-0 text-[8.5px] text-[#8A97AF]">
                  <b className="text-[#10B981]">#{row.you}</b> vs #{row.best}
                </span>
              </div>
            ))}
          </Box>
        </div>
      </div>
    </SeoShell>
  );
}
